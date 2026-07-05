<script setup lang="ts">
import type { DropConnectionDebug } from '~/types/drop.type'
import { RealtimeRole } from '~/configs/realtime.config'

defineProps<{
  copied: boolean
  debug: DropConnectionDebug
  isReady: boolean
  peerConnected: boolean
  qrCode: string
  role: RealtimeRole.DropHost | RealtimeRole.DropGuest
  roomId: string
}>()

defineEmits<{
  copyInvite: []
}>()

const { t } = useI18n()
</script>

<template>
  <aside class="border-2 border-ink bg-sky p-5 shadow-[6px_6px_0_#171714]">
    <p class="text-xs font-black tracking-[.2em]">
      {{ t('drop.room') }}
    </p>
    <div class="mt-2 font-mono text-4xl font-black tracking-[.12em]">
      {{ roomId }}
    </div>
    <div class="mt-4 inline-flex items-center gap-2 border border-ink bg-white px-3 py-2 text-sm font-bold">
      <span class="size-2 rounded-full" :class="isReady ? 'bg-green-500' : 'animate-pulse bg-coral'" />
      {{ isReady ? t('drop.status.ready') : t('drop.status.waiting') }}
    </div>

    <template v-if="role === RealtimeRole.DropHost">
      <div class="mt-6 border-2 border-ink bg-white p-3">
        <img v-if="qrCode" :src="qrCode" :alt="t('drop.qrAlt')" class="w-full">
      </div>
      <button class="focus-ring mt-4 w-full border-2 border-ink bg-white px-4 py-3 font-black" @click="$emit('copyInvite')">
        {{ copied ? t('drop.actions.copied') : t('drop.actions.copyInvite') }}
      </button>
    </template>
    <p class="mt-5 text-sm leading-6">
      {{ t('drop.privacyHint') }}
    </p>
    <p class="mt-3 border border-ink/20 bg-white/70 px-3 py-2 text-xs leading-5 font-semibold text-black/60">
      {{ t('drop.networkHint') }}
    </p>

    <DropDebugPanel :debug="debug" :peer-connected="peerConnected" />
  </aside>
</template>
