import type {
  DrawGameState,
  DrawGameStatePayload,
  DrawGiveUpPayload,
  DrawGuessPayload,
  DrawStroke,
  DrawStrokePayload,
  DrawTurnResult,
  DrawUndoPayload,
} from '~/types/draw.type'
import type { RealtimeMessage, RealtimeRole, RealtimeSend } from '~/types/realtime.type'
import { DRAW_GAME_CONFIG, DRAW_PROMPTS } from '~/configs/draw.config'
import { DrawTurnOutcome } from '~/types/draw.type'
import { RealtimeMessageType, RealtimeRole as RealtimeRoleValue } from '~/types/realtime.type'

export interface UseDrawGameOptions {
  latestMessage: Ref<RealtimeMessage | null>
  peerConnected: Ref<boolean>
  role: RealtimeRole
  roomFull: Ref<boolean | undefined>
  sendRealtimeMessage: RealtimeSend
}

export function useDrawGame(options: UseDrawGameOptions) {
  const { t } = useI18n()
  const state = ref<DrawGameState>({
    drawerRole: options.role,
    promptIndex: DRAW_GAME_CONFIG.initialPromptIndex,
  })
  const strokes = ref<DrawStroke[]>([])
  const boardVersion = ref(0)
  const guess = ref('')
  const lastResult = ref('')

  const currentPrompt = computed(() => DRAW_PROMPTS[state.value.promptIndex] ?? DRAW_PROMPTS[0])
  const answer = computed(() => t(`draw.prompts.${currentPrompt.value.answerKey}`))
  const categoryLabel = computed(() => t(`draw.categories.${currentPrompt.value.category}`))
  const isDrawer = computed(() => state.value.drawerRole === options.role)
  const canInteract = computed(() => options.peerConnected.value && !options.roomFull.value)
  const canDraw = computed(() => canInteract.value && isDrawer.value)
  const canGuess = computed(() => canInteract.value && !isDrawer.value)
  const canUndo = computed(() => canDraw.value && strokes.value.length > 0)

  // 畫布只同步筆畫座標，不同步整張圖片，降低每次傳輸的資料量。
  // 接收端收到同一筆座標後，用自己的 canvas 重畫出相同筆畫。
  function handleStroke(stroke: DrawStroke) {
    if (!canDraw.value)
      return

    strokes.value.push(stroke)
    options.sendRealtimeMessage(RealtimeMessageType.DrawStroke, { stroke })
  }

  function undoLastStroke() {
    if (!canUndo.value)
      return

    const strokeId = strokes.value.at(-1)?.id
    if (!strokeId)
      return

    removeStroke(strokeId)
    options.sendRealtimeMessage(RealtimeMessageType.DrawUndo, { strokeId })
  }

  function submitGuess() {
    if (!canGuess.value || !guess.value.trim())
      return

    options.sendRealtimeMessage(RealtimeMessageType.DrawGuess, { guess: guess.value })
    guess.value = ''
  }

  function giveUp() {
    if (!canInteract.value)
      return

    const result = createTurnResult(DrawTurnOutcome.Skip, options.role)
    nextTurn(result)
  }

  // 監聽 WebSocket 轉進來的最新訊息，依照 type 分派給對應的遊戲處理函式。
  // 這裡只負責「分流」，真正的更新邏輯會放在 applyDrawState / applyDrawStroke 等函式中。
  watch(options.latestMessage, (message) => {
    if (!message?.payload)
      return

    if (message.type === RealtimeMessageType.DrawState)
      applyDrawState(message.payload as unknown as DrawGameStatePayload)
    else if (message.type === RealtimeMessageType.DrawStroke)
      applyDrawStroke(message.payload as unknown as DrawStrokePayload)
    else if (message.type === RealtimeMessageType.DrawGuess)
      applyDrawGuess(message.payload as unknown as DrawGuessPayload, message.from)
    else if (message.type === RealtimeMessageType.DrawGiveUp)
      applyDrawGiveUp(message.payload as unknown as DrawGiveUpPayload, message.from)
    else if (message.type === RealtimeMessageType.DrawUndo)
      applyDrawUndo(message.payload as unknown as DrawUndoPayload)
  })

  watch(options.peerConnected, (connected) => {
    // Draw host 負責保存初始遊戲狀態。第二台裝置加入或重連時，
    // 重新送一次狀態，讓兩邊維持相同題目與畫畫者。
    if (connected && options.role === RealtimeRoleValue.DrawHost)
      sendState()
  })

  return {
    answer,
    boardVersion,
    canDraw,
    canGuess,
    canInteract,
    canUndo,
    categoryLabel,
    giveUp,
    guess,
    handleStroke,
    isDrawer,
    lastResult,
    strokes,
    submitGuess,
    undoLastStroke,
  }

  function normalizeAnswer(value: string) {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, '')
  }

  function isCorrectGuess(value: string) {
    // 只接受目前語系顯示在畫面上的答案，避免中文頁輸入英文 key 也被判定正確。
    return normalizeAnswer(value) === normalizeAnswer(answer.value)
  }

  function sendState(result?: DrawTurnResult) {
    options.sendRealtimeMessage(RealtimeMessageType.DrawState, { result, state: state.value })
  }

  function resetBoard() {
    strokes.value = []
    guess.value = ''
    boardVersion.value += 1
  }

  function nextTurn(result: DrawTurnResult) {
    lastResult.value = formatTurnResult(result)

    // 下一位畫畫者就是這題沒有畫的那台裝置。
    // 這樣不用為了判斷輪到誰，額外維護 round/status。
    state.value = {
      drawerRole: state.value.drawerRole === options.role ? getPeerRole() : options.role,
      promptIndex: (state.value.promptIndex + 1) % DRAW_PROMPTS.length,
    }
    resetBoard()
    sendState(result)
  }

  function getPeerRole() {
    return options.role === RealtimeRoleValue.DrawHost ? RealtimeRoleValue.DrawGuest : RealtimeRoleValue.DrawHost
  }

  function removeStroke(strokeId: string) {
    strokes.value = strokes.value.filter(stroke => stroke.id !== strokeId)
  }

  function applyDrawState(payload: DrawGameStatePayload) {
    state.value = payload.state
    resetBoard()
    lastResult.value = payload.result ? formatTurnResult(payload.result) : ''
  }

  function applyDrawStroke(payload: DrawStrokePayload) {
    strokes.value.push(payload.stroke)
  }

  function applyDrawGuess(payload: DrawGuessPayload, senderRole?: RealtimeRole) {
    if (!isDrawer.value)
      return

    if (isCorrectGuess(payload.guess))
      nextTurn(createTurnResult(DrawTurnOutcome.Correct, senderRole ?? getPeerRole()))
  }

  function applyDrawGiveUp(payload: DrawGiveUpPayload, senderRole?: RealtimeRole) {
    const result = payload.result ?? createTurnResult(DrawTurnOutcome.Skip, senderRole ?? getPeerRole())
    lastResult.value = formatTurnResult(result)
  }

  function applyDrawUndo(payload: DrawUndoPayload) {
    removeStroke(payload.strokeId)
  }

  function createTurnResult(outcome: DrawTurnOutcome, actorRole: RealtimeRole): DrawTurnResult {
    return {
      actorRole,
      answerKey: currentPrompt.value.answerKey,
      drawerRole: state.value.drawerRole,
      outcome,
    }
  }

  function formatTurnResult(result: DrawTurnResult) {
    const resultAnswer = t(`draw.prompts.${result.answerKey}`)

    if (result.outcome === DrawTurnOutcome.Correct) {
      return result.actorRole === options.role
        ? t('draw.game.youCorrectResult', { answer: resultAnswer })
        : t('draw.game.peerCorrectResult')
    }

    if (options.role === result.drawerRole) {
      return result.actorRole === options.role
        ? t('draw.game.youSkipped')
        : t('draw.game.peerSkipped')
    }

    return result.actorRole === options.role
      ? t('draw.game.youSkippedResult', { answer: resultAnswer })
      : t('draw.game.peerSkippedResult', { answer: resultAnswer })
  }
}
