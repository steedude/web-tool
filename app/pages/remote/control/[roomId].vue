<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const roomId = ref(String(route.params.roomId ?? '').toUpperCase())
const touchpadActive = ref(false)
const spotlightActive = ref(false)
const { connect, peerConnected, send, status } = useRealtimeRoom(roomId, 'remote')

const connected = computed(() => status.value === 'connected')

function haptic() {
  if ('vibrate' in navigator)
    navigator.vibrate(18)
}

function command(value: string) {
  haptic()
  send('remote:command', { command: value })
}

function toggleSpotlight() {
  spotlightActive.value = !spotlightActive.value
  command('spotlight-toggle')
}

function updatePointer(event: PointerEvent) {
  if (!touchpadActive.value)
    return

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  send('remote:pointer', { x, y })
}

function startPointer(event: PointerEvent) {
  touchpadActive.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  updatePointer(event)
}

function stopPointer() {
  touchpadActive.value = false
}

onMounted(connect)

useSeoMeta({
  title: () => `${t('remote.controller.title')} — ${roomId.value}`,
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
})
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md flex-col px-4 pt-4 pb-8 select-none">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="font-mono text-[10px] font-black tracking-[0.2em] text-black/45">
          {{ t('remote.controller.eyebrow') }}
        </p>
        <h1 class="mt-1 text-3xl font-black tracking-[-0.045em]">
          {{ t('remote.controller.title') }}
        </h1>
      </div>
      <span class="rounded-full border-2 border-ink bg-white px-3 py-2 font-mono text-xs font-black shadow-[3px_3px_0_#171714]">{{ roomId }}</span>
    </div>

    <div class="mt-5 flex items-center gap-2 rounded-2xl border-2 border-ink bg-white px-4 py-3 text-xs font-black shadow-[4px_4px_0_#171714]">
      <span :class="peerConnected ? 'bg-emerald-500' : connected ? 'bg-amber-400' : 'bg-red-400'" class="size-2.5 rounded-full" />
      {{ peerConnected ? t('remote.controller.connected') : t('remote.controller.waiting') }}
    </div>

    <div
      class="focus-ring relative mt-5 flex min-h-52 flex-1 touch-none items-center justify-center overflow-hidden rounded-[2rem] border-2 border-ink bg-ink text-white shadow-[7px_7px_0_#8fd7ff]"
      :class="touchpadActive ? 'cursor-grabbing' : 'cursor-grab'"
      role="application"
      :aria-label="t('remote.controller.touchpad')"
      tabindex="0"
      @pointerdown="startPointer"
      @pointermove="updatePointer"
      @pointerup="stopPointer"
      @pointercancel="stopPointer"
    >
      <div class="absolute size-56 rounded-full border border-white/10" />
      <div class="absolute size-32 rounded-full border border-white/10" />
      <div class="relative text-center">
        <span class="mx-auto block size-3 rounded-full bg-coral shadow-[0_0_18px_#ff735c]" />
        <p class="mt-4 text-xs font-black text-white/55">
          {{ t('remote.controller.touchpad') }}
        </p>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-3 gap-3">
      <span />
      <button class="remote-button bg-sky" type="button" :aria-label="t('remote.controller.scrollUp')" @click="command('scroll-up')">
        {{ t('common.arrowUp') }}
      </button>
      <span />
      <button class="remote-button bg-white" type="button" :aria-label="t('remote.controller.previous')" @click="command('previous')">
        {{ t('common.arrowLeft') }}
      </button>
      <button
        class="remote-button text-[10px]!"
        :class="spotlightActive ? 'bg-coral' : 'bg-acid'"
        type="button"
        @click="toggleSpotlight"
      >
        {{ t('remote.controller.spotlight') }}
      </button>
      <button class="remote-button bg-white" type="button" :aria-label="t('remote.controller.next')" @click="command('next')">
        {{ t('common.arrowRight') }}
      </button>
      <span />
      <button class="remote-button bg-sky" type="button" :aria-label="t('remote.controller.scrollDown')" @click="command('scroll-down')">
        {{ t('common.arrowDown') }}
      </button>
      <span />
    </div>

    <p class="mt-5 text-center text-[11px] font-bold text-black/45">
      {{ t('remote.controller.leaveOpen') }}
    </p>
  </div>
</template>

<style scoped>
.remote-button {
  display: grid;
  min-height: 4.25rem;
  place-items: center;
  border: 2px solid #171714;
  border-radius: 1.25rem;
  box-shadow: 4px 4px 0 #171714;
  font-size: 1.65rem;
  font-weight: 900;
  transition:
    transform 100ms ease,
    box-shadow 100ms ease;
}

.remote-button:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 #171714;
}

.remote-button:focus-visible {
  outline: 3px solid #171714;
  outline-offset: 3px;
}
</style>
