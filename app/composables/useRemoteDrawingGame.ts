import type { RealtimeMessage, RealtimeRole } from '~/types/realtime.type'
import type {
  RemoteDrawPayload,
  RemoteDrawStroke,
  RemoteGameState,
  RemoteGameStatePayload,
  RemoteGiveUpPayload,
  RemoteGuessPayload,
  RemoteUndoPayload,
} from '~/types/remote.type'
import { REMOTE_DRAWING_PROMPTS, REMOTE_GAME_CONFIG } from '~/configs/remote.config'
import { RealtimeMessageType, RealtimeRole as RealtimeRoleValue } from '~/types/realtime.type'

export interface UseRemoteDrawingGameOptions {
  latestMessage: Ref<RealtimeMessage | null>
  peerConnected: Ref<boolean>
  role: RealtimeRole
  roomFull: Ref<boolean | undefined>
  send: (type: string, payload?: Record<string, unknown>) => boolean
}

export function useRemoteDrawingGame(options: UseRemoteDrawingGameOptions) {
  const { t } = useI18n()
  const state = ref<RemoteGameState>({
    drawerRole: options.role,
    promptIndex: REMOTE_GAME_CONFIG.initialPromptIndex,
  })
  const strokes = ref<RemoteDrawStroke[]>([])
  const boardVersion = ref(0)
  const guess = ref('')
  const lastResult = ref('')

  const currentPrompt = computed(() => REMOTE_DRAWING_PROMPTS[state.value.promptIndex] ?? REMOTE_DRAWING_PROMPTS[0])
  const answer = computed(() => t(`remote.prompts.${currentPrompt.value.answerKey}`))
  const categoryLabel = computed(() => t(`remote.categories.${currentPrompt.value.category}`))
  const isDrawer = computed(() => state.value.drawerRole === options.role)
  const canInteract = computed(() => options.peerConnected.value && !options.roomFull.value)
  const canDraw = computed(() => canInteract.value && isDrawer.value)
  const canGuess = computed(() => canInteract.value && !isDrawer.value)
  const canUndo = computed(() => canDraw.value && strokes.value.length > 0)

  // 筆畫以小指令同步，而不是同步整張 canvas。
  // 這樣復原時只要在兩台裝置移除最後一筆，不需要從圖片快照重畫。
  function handleStroke(stroke: RemoteDrawStroke) {
    if (!canDraw.value)
      return

    strokes.value.push(stroke)
    options.send(RealtimeMessageType.RemoteDraw, { stroke })
  }

  function undoLastStroke() {
    if (!canUndo.value)
      return

    const strokeId = strokes.value.at(-1)?.id
    if (!strokeId)
      return

    removeStroke(strokeId)
    options.send(RealtimeMessageType.RemoteUndo, { strokeId })
  }

  function submitGuess() {
    if (!canGuess.value || !guess.value.trim())
      return

    options.send(RealtimeMessageType.RemoteGuess, { guess: guess.value })
    guess.value = ''
  }

  function giveUp() {
    if (!canInteract.value)
      return

    options.send(RealtimeMessageType.RemoteGiveUp, {})
    nextTurn(false)
  }

  watch(options.latestMessage, (message) => {
    if (!message?.payload)
      return

    if (message.type === RealtimeMessageType.RemoteGameState)
      applyRemoteState(message.payload as unknown as RemoteGameStatePayload)
    else if (message.type === RealtimeMessageType.RemoteDraw)
      applyRemoteStroke(message.payload as unknown as RemoteDrawPayload)
    else if (message.type === RealtimeMessageType.RemoteGuess)
      applyRemoteGuess(message.payload as unknown as RemoteGuessPayload)
    else if (message.type === RealtimeMessageType.RemoteGiveUp)
      applyRemoteGiveUp(message.payload as unknown as RemoteGiveUpPayload)
    else if (message.type === RealtimeMessageType.RemoteUndo)
      applyRemoteUndo(message.payload as unknown as RemoteUndoPayload)
  })

  watch(options.peerConnected, (connected) => {
    // Desktop 負責保存初始遊戲狀態。第二台裝置加入或重連時，
    // 重新送一次狀態，讓兩邊維持相同題目與畫畫者。
    if (connected && options.role === RealtimeRoleValue.Desktop)
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
    options.send(RealtimeMessageType.RemoteGameState, { state: state.value })
  }

  function resetBoard() {
    strokes.value = []
    guess.value = ''
    boardVersion.value += 1
  }

  function nextTurn(solved: boolean) {
    lastResult.value = solved
      ? t('remote.game.correctResult', { answer: answer.value })
      : t('remote.game.skipResult', { answer: answer.value })

    // 下一位畫畫者就是這題沒有畫的那台裝置。
    // 這樣不用為了判斷輪到誰，額外維護 round/status。
    state.value = {
      drawerRole: state.value.drawerRole === options.role ? getPeerRole() : options.role,
      promptIndex: (state.value.promptIndex + 1) % REMOTE_DRAWING_PROMPTS.length,
    }
    resetBoard()
    sendState()
  }

  function getPeerRole() {
    return options.role === RealtimeRoleValue.Desktop ? RealtimeRoleValue.Remote : RealtimeRoleValue.Desktop
  }

  function removeStroke(strokeId: string) {
    strokes.value = strokes.value.filter(stroke => stroke.id !== strokeId)
  }

  function applyRemoteState(payload: RemoteGameStatePayload) {
    state.value = payload.state
    resetBoard()
  }

  function applyRemoteStroke(payload: RemoteDrawPayload) {
    strokes.value.push(payload.stroke)
  }

  function applyRemoteGuess(payload: RemoteGuessPayload) {
    if (!isDrawer.value)
      return

    if (isCorrectGuess(payload.guess))
      nextTurn(true)
  }

  function applyRemoteGiveUp(_payload: RemoteGiveUpPayload) {
    nextTurn(false)
  }

  function applyRemoteUndo(payload: RemoteUndoPayload) {
    removeStroke(payload.strokeId)
  }
}
