import type {
  DrawGameState,
  DrawGameStatePayload,
  DrawGiveUpPayload,
  DrawGuessPayload,
  DrawStroke,
  DrawStrokePayload,
  DrawUndoPayload,
} from '~/types/draw.type'
import type { RealtimeMessage, RealtimeRole } from '~/types/realtime.type'
import { DRAW_GAME_CONFIG, DRAW_PROMPTS } from '~/configs/draw.config'
import { RealtimeMessageType, RealtimeRole as RealtimeRoleValue } from '~/types/realtime.type'

export interface UseDrawGameOptions {
  latestMessage: Ref<RealtimeMessage | null>
  peerConnected: Ref<boolean>
  role: RealtimeRole
  roomFull: Ref<boolean | undefined>
  send: (type: string, payload?: Record<string, unknown>) => boolean
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

  // 筆畫以小指令同步，而不是同步整張 canvas。
  // 這樣復原時只要在兩台裝置移除最後一筆，不需要從圖片快照重畫。
  function handleStroke(stroke: DrawStroke) {
    if (!canDraw.value)
      return

    strokes.value.push(stroke)
    options.send(RealtimeMessageType.DrawStroke, { stroke })
  }

  function undoLastStroke() {
    if (!canUndo.value)
      return

    const strokeId = strokes.value.at(-1)?.id
    if (!strokeId)
      return

    removeStroke(strokeId)
    options.send(RealtimeMessageType.DrawUndo, { strokeId })
  }

  function submitGuess() {
    if (!canGuess.value || !guess.value.trim())
      return

    options.send(RealtimeMessageType.DrawGuess, { guess: guess.value })
    guess.value = ''
  }

  function giveUp() {
    if (!canInteract.value)
      return

    options.send(RealtimeMessageType.DrawGiveUp, {})
    nextTurn(false)
  }

  watch(options.latestMessage, (message) => {
    if (!message?.payload)
      return

    if (message.type === RealtimeMessageType.DrawState)
      applyDrawState(message.payload as unknown as DrawGameStatePayload)
    else if (message.type === RealtimeMessageType.DrawStroke)
      applyDrawStroke(message.payload as unknown as DrawStrokePayload)
    else if (message.type === RealtimeMessageType.DrawGuess)
      applyDrawGuess(message.payload as unknown as DrawGuessPayload)
    else if (message.type === RealtimeMessageType.DrawGiveUp)
      applyDrawGiveUp(message.payload as unknown as DrawGiveUpPayload)
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
    const normalized = normalizeAnswer(value)
    return normalized === normalizeAnswer(answer.value) || normalized === normalizeAnswer(currentPrompt.value.answerKey)
  }

  function sendState() {
    options.send(RealtimeMessageType.DrawState, { state: state.value })
  }

  function resetBoard() {
    strokes.value = []
    guess.value = ''
    boardVersion.value += 1
  }

  function nextTurn(solved: boolean) {
    lastResult.value = solved
      ? t('draw.game.correctResult', { answer: answer.value })
      : t('draw.game.skipResult', { answer: answer.value })

    // 下一位畫畫者就是這題沒有畫的那台裝置。
    // 這樣不用為了判斷輪到誰，額外維護 round/status。
    state.value = {
      drawerRole: state.value.drawerRole === options.role ? getPeerRole() : options.role,
      promptIndex: (state.value.promptIndex + 1) % DRAW_PROMPTS.length,
    }
    resetBoard()
    sendState()
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
  }

  function applyDrawStroke(payload: DrawStrokePayload) {
    strokes.value.push(payload.stroke)
  }

  function applyDrawGuess(payload: DrawGuessPayload) {
    if (!isDrawer.value)
      return

    if (isCorrectGuess(payload.guess))
      nextTurn(true)
  }

  function applyDrawGiveUp(_payload: DrawGiveUpPayload) {
    nextTurn(false)
  }

  function applyDrawUndo(payload: DrawUndoPayload) {
    removeStroke(payload.strokeId)
  }
}
