<script setup lang="ts">
import type { RealtimeMessage } from '~/types/realtime.type'
import type {
  RemoteDrawPayload,
  RemoteDrawStroke,
  RemoteGameState,
  RemoteGameStatePayload,
  RemoteGiveUpPayload,
  RemoteGuessPayload,
} from '~/types/remote.type'
import { REMOTE_DRAWING_PROMPTS, REMOTE_GAME_CONFIG } from '~/configs/remote.config'
import { RealtimeMessageType, RealtimeRole } from '~/types/realtime.type'
import { RemoteRoundStatus } from '~/types/remote.type'

const props = defineProps<{
  latestMessage: RealtimeMessage | null
  peerConnected: boolean
  role: RealtimeRole
  roomFull?: boolean
  send: (type: string, payload?: Record<string, unknown>) => boolean
}>()

const { t } = useI18n()

const state = ref<RemoteGameState>({
  drawerRole: props.role,
  promptIndex: REMOTE_GAME_CONFIG.initialPromptIndex,
  round: 1,
  status: RemoteRoundStatus.Drawing,
})
const strokes = ref<RemoteDrawStroke[]>([])
const guess = ref('')
const lastResult = ref('')

const currentPrompt = computed(() => REMOTE_DRAWING_PROMPTS[state.value.promptIndex] ?? REMOTE_DRAWING_PROMPTS[0])
const answer = computed(() => t(`remote.prompts.${currentPrompt.value.answerKey}`))
const categoryLabel = computed(() => t(`remote.categories.${currentPrompt.value.category}`))
const isDrawer = computed(() => state.value.drawerRole === props.role)
const canInteract = computed(() => props.peerConnected && !props.roomFull)
const canDraw = computed(() => canInteract.value && isDrawer.value)
const canGuess = computed(() => canInteract.value && !isDrawer.value)

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, '')
}

function isCorrectGuess(value: string) {
  const normalized = normalizeAnswer(value)
  return normalized === normalizeAnswer(answer.value) || normalized === normalizeAnswer(currentPrompt.value.answerKey)
}

function sendState() {
  props.send(RealtimeMessageType.RemoteGameState, { state: state.value })
}

function resetBoard() {
  strokes.value = []
  guess.value = ''
}

function nextRound(status: RemoteRoundStatus) {
  lastResult.value = status === RemoteRoundStatus.Solved
    ? t('remote.game.correctResult', { answer: answer.value })
    : t('remote.game.skipResult', { answer: answer.value })

  state.value = {
    drawerRole: state.value.drawerRole === props.role ? getPeerRole() : props.role,
    promptIndex: (state.value.promptIndex + 1) % REMOTE_DRAWING_PROMPTS.length,
    round: state.value.round + 1,
    status,
  }
  resetBoard()
  sendState()

  state.value.status = RemoteRoundStatus.Drawing
  sendState()
}

function getPeerRole() {
  return props.role === RealtimeRole.Desktop ? RealtimeRole.Remote : RealtimeRole.Desktop
}

function handleStroke(stroke: RemoteDrawStroke) {
  if (!canDraw.value)
    return

  strokes.value.push(stroke)
  props.send(RealtimeMessageType.RemoteDraw, { round: state.value.round, stroke })
}

function submitGuess() {
  if (!canGuess.value || !guess.value.trim())
    return

  props.send(RealtimeMessageType.RemoteGuess, { guess: guess.value, round: state.value.round })
  guess.value = ''
}

function giveUp() {
  if (!canInteract.value)
    return

  props.send(RealtimeMessageType.RemoteGiveUp, { round: state.value.round })
  nextRound(RemoteRoundStatus.Skipped)
}

function applyRemoteState(payload: RemoteGameStatePayload) {
  state.value = payload.state
  resetBoard()
}

function applyRemoteStroke(payload: RemoteDrawPayload) {
  if (payload.round !== state.value.round)
    return

  strokes.value.push(payload.stroke)
}

function applyRemoteGuess(payload: RemoteGuessPayload) {
  if (!isDrawer.value || payload.round !== state.value.round)
    return

  if (isCorrectGuess(payload.guess))
    nextRound(RemoteRoundStatus.Solved)
}

function applyRemoteGiveUp(payload: RemoteGiveUpPayload) {
  if (payload.round === state.value.round)
    nextRound(RemoteRoundStatus.Skipped)
}

watch(() => props.latestMessage, (message) => {
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
})

watch(() => props.peerConnected, (connected) => {
  if (connected && props.role === 'desktop')
    sendState()
})
</script>

<template>
  <section class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div class="overflow-hidden border-2 border-ink bg-white shadow-[8px_8px_0_#171714]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-5 py-4">
        <div>
          <p class="font-mono text-xs font-black tracking-[0.25em]">
            {{ t('remote.game.round', { round: state.round }) }}
          </p>
          <h2 class="mt-1 text-2xl font-black">
            {{ isDrawer ? t('remote.game.drawTitle') : t('remote.game.guessTitle') }}
          </h2>
        </div>
        <span class="border-2 border-ink bg-acid px-3 py-2 text-xs font-black">
          {{ isDrawer ? t('remote.game.yourTurn') : t('remote.game.partnerTurn') }}
        </span>
      </div>

      <div class="border-b-2 border-ink bg-violet/20 px-5 py-4">
        <p v-if="isDrawer" class="text-lg font-black">
          {{ t('remote.game.prompt') }}{{ t('common.colon') }}{{ answer }}
        </p>
        <p v-else class="text-lg font-black">
          {{ t('remote.game.category') }}{{ t('common.colon') }}{{ categoryLabel }}
        </p>
        <p class="mt-1 text-sm font-semibold text-black/55">
          {{ isDrawer ? t('remote.game.drawerHint') : t('remote.game.guesserHint') }}
        </p>
      </div>

      <div class="h-[min(62vh,34rem)] min-h-[22rem]">
        <RemoteDrawingCanvas :disabled="!canDraw" :reset-key="state.round" :strokes="strokes" @stroke="handleStroke" />
      </div>
    </div>

    <aside class="h-fit border-2 border-ink bg-sky p-5 shadow-[8px_8px_0_#171714]">
      <p class="font-mono text-xs font-black tracking-[0.25em]">
        {{ t('remote.game.panelEyebrow') }}
      </p>
      <h3 class="mt-2 text-3xl font-black">
        {{ t('remote.game.panelTitle') }}
      </h3>

      <p v-if="lastResult" class="mt-5 border-2 border-ink bg-white px-4 py-3 text-sm font-black">
        {{ lastResult }}
      </p>

      <form v-if="canGuess" class="mt-5 space-y-3" @submit.prevent="submitGuess">
        <label class="text-sm font-black" for="remote-guess">{{ t('remote.game.guessLabel') }}</label>
        <input
          id="remote-guess"
          v-model="guess"
          class="focus-ring w-full border-2 border-ink bg-paper px-4 py-4 font-black"
          :placeholder="t('remote.game.guessPlaceholder')"
          autocomplete="off"
        >
        <button class="focus-ring w-full border-2 border-ink bg-ink px-5 py-4 font-black text-white disabled:opacity-40" :disabled="!guess.trim()">
          {{ t('remote.game.submitGuess') }}
        </button>
      </form>

      <div v-else class="mt-5 border-2 border-ink bg-white px-4 py-4 text-sm font-black">
        {{ canInteract ? t('remote.game.waitForGuess') : t('remote.game.waitingForPeer') }}
      </div>

      <button
        class="focus-ring mt-4 w-full border-2 border-ink bg-coral px-5 py-4 font-black disabled:opacity-40"
        :disabled="!canInteract"
        type="button"
        @click="giveUp"
      >
        {{ t('remote.game.giveUp') }}
      </button>

      <p class="mt-4 text-xs leading-5 font-semibold text-black/55">
        {{ t('remote.game.ruleHint') }}
      </p>
    </aside>
  </section>
</template>
