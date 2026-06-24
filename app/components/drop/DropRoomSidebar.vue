<script setup lang="ts">
import { RealtimeRole } from '~/types/realtime.type'

defineProps<{
  copied: boolean
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

function statusLabel(isReady: boolean, peerConnected: boolean) {
  if (isReady)
    return t('drop.status.ready')
  if (peerConnected)
    return t('drop.status.connectingPeer')
  return t('drop.status.waiting')
}
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
      {{ statusLabel(isReady, peerConnected) }}
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
  </aside>
</template>
