<script setup lang="ts">
import type { RealtimeMessage, RealtimeRole } from '~/types/realtime.type'

const props = defineProps<{
  latestMessage: RealtimeMessage | null
  peerConnected: boolean
  role: RealtimeRole
  roomFull?: boolean
  send: (type: string, payload?: Record<string, unknown>) => boolean
}>()

const { t } = useI18n()
const {
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
} = useDrawGame({
  latestMessage: toRef(props, 'latestMessage'),
  peerConnected: toRef(props, 'peerConnected'),
  role: props.role,
  roomFull: toRef(props, 'roomFull'),
  send: props.send,
})
</script>

<template>
  <section class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div class="overflow-hidden border-2 border-ink bg-white shadow-[8px_8px_0_#171714]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-5 py-4">
        <div>
          <h2 class="mt-1 text-2xl font-black">
            {{ isDrawer ? t('draw.game.drawTitle') : t('draw.game.guessTitle') }}
          </h2>
        </div>
        <span class="border-2 border-ink bg-acid px-3 py-2 text-xs font-black">
          {{ isDrawer ? t('draw.game.yourTurn') : t('draw.game.partnerTurn') }}
        </span>
      </div>

      <div class="border-b-2 border-ink bg-violet/20 px-5 py-4">
        <p v-if="isDrawer" class="text-lg font-black">
          {{ t('draw.game.prompt') }}{{ t('common.colon') }}{{ answer }}
        </p>
        <p v-else class="text-lg font-black">
          {{ t('draw.game.category') }}{{ t('common.colon') }}{{ categoryLabel }}
        </p>
        <p class="mt-1 text-sm font-semibold text-black/55">
          {{ isDrawer ? t('draw.game.drawerHint') : t('draw.game.guesserHint') }}
        </p>
      </div>

      <div class="h-[min(62vh,34rem)] min-h-[22rem]">
        <DrawCanvas :disabled="!canDraw" :reset-key="boardVersion" :strokes="strokes" @stroke="handleStroke" />
      </div>
    </div>

    <aside class="h-fit border-2 border-ink bg-sky p-5 shadow-[8px_8px_0_#171714]">
      <p class="font-mono text-xs font-black tracking-[0.25em]">
        {{ t('draw.game.panelEyebrow') }}
      </p>
      <h3 class="mt-2 text-3xl font-black">
        {{ t('draw.game.panelTitle') }}
      </h3>

      <p v-if="lastResult" class="mt-5 border-2 border-ink bg-white px-4 py-3 text-sm font-black">
        {{ lastResult }}
      </p>

      <form v-if="canGuess" class="mt-5 space-y-3" @submit.prevent="submitGuess">
        <label class="text-sm font-black" for="draw-guess">{{ t('draw.game.guessLabel') }}</label>
        <input
          id="draw-guess"
          v-model="guess"
          class="focus-ring w-full border-2 border-ink bg-paper px-4 py-4 font-black"
          :placeholder="t('draw.game.guessPlaceholder')"
          autocomplete="off"
        >
        <button class="focus-ring w-full border-2 border-ink bg-ink px-5 py-4 font-black text-white disabled:opacity-40" :disabled="!guess.trim()">
          {{ t('draw.game.submitGuess') }}
        </button>
      </form>

      <div v-else class="mt-5 border-2 border-ink bg-white px-4 py-4 text-sm font-black">
        {{ canInteract ? t('draw.game.waitForGuess') : t('draw.game.waitingForPeer') }}
      </div>

      <button
        v-if="isDrawer"
        class="focus-ring mt-4 w-full border-2 border-ink bg-white px-5 py-4 font-black disabled:opacity-40"
        :disabled="!canUndo"
        type="button"
        @click="undoLastStroke"
      >
        {{ t('draw.game.undo') }}
      </button>

      <button
        class="focus-ring mt-4 w-full border-2 border-ink bg-coral px-5 py-4 font-black disabled:opacity-40"
        :disabled="!canInteract"
        type="button"
        @click="giveUp"
      >
        {{ t('draw.game.giveUp') }}
      </button>

      <p class="mt-4 text-xs leading-5 font-semibold text-black/55">
        {{ t('draw.game.ruleHint') }}
      </p>
    </aside>
  </section>
</template>
