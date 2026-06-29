<script setup lang="ts">
import { RealtimeRole, RealtimeStatus } from '~/types/realtime.type'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const roomId = ref(String(route.params.roomId ?? '').toUpperCase())
const { connect, latestMessage, peerConnected, roomFull, send, status } = useRealtimeRoom(roomId, RealtimeRole.DrawGuest)

const connected = computed(() => status.value === RealtimeStatus.Connected)
const statusLabel = computed(() => {
  if (roomFull.value)
    return t('draw.player.roomFull')
  if (peerConnected.value)
    return t('draw.connected')
  if (connected.value)
    return t('draw.waiting')
  return t('draw.connecting')
})

onMounted(connect)

usePageSeo({
  title: () => `${t('draw.player.title')} — ${roomId.value}`,
  description: () => t('draw.description'),
  noindex: true,
})
useSeoMeta({
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
})
</script>

<template>
  <main class="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-5xl flex-col px-4 pt-4 pb-8 select-none lg:px-6">
    <div class="flex items-center justify-between gap-3">
      <NuxtLink :to="localePath('/')" class="focus-ring rounded-full py-2 text-xs font-black underline decoration-2 underline-offset-4">
        {{ t('common.arrowLeft') }} {{ t('common.backHome') }}
      </NuxtLink>
      <span class="rounded-full border-2 border-ink bg-white px-3 py-2 font-mono text-xs font-black shadow-[3px_3px_0_#171714]">{{ roomId }}</span>
    </div>

    <section class="mt-6">
      <p class="font-mono text-[10px] font-black tracking-[0.2em] text-black/45">
        {{ t('draw.player.eyebrow') }}
      </p>
      <h1 class="mt-2 text-[clamp(2.6rem,14vw,4.5rem)] leading-[0.9] font-black tracking-[-0.065em]">
        {{ t('draw.player.title') }}
      </h1>
    </section>

    <div class="mt-5 flex items-center gap-2 rounded-2xl border-2 border-ink bg-white px-4 py-3 text-xs font-black shadow-[4px_4px_0_#171714]">
      <span :class="peerConnected ? 'bg-emerald-500' : connected ? 'bg-amber-400' : 'bg-red-400'" class="size-2.5 rounded-full" />
      {{ statusLabel }}
    </div>

    <div v-if="roomFull" class="mt-4 rounded-2xl border-2 border-ink bg-red-100 px-4 py-3 text-sm font-black shadow-[4px_4px_0_#171714]">
      {{ t('draw.player.roomFullDescription') }}
    </div>

    <DrawGame
      class="mt-6"
      :latest-message="latestMessage"
      :peer-connected="peerConnected"
      :role="RealtimeRole.DrawGuest"
      :room-full="roomFull"
      :send-realtime-message="send"
    />
  </main>
</template>
