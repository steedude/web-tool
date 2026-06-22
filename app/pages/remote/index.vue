<script setup lang="ts">
import QRCode from 'qrcode'

const { locale, t } = useI18n()
const localePath = useLocalePath()
const roomId = ref('')
const phoneUrl = ref('')
const qrCode = ref('')
const copied = ref(false)
const currentSlide = ref(0)
const slideBody = useTemplateRef<HTMLElement>('slideBody')
const pointer = reactive({ x: 50, y: 50 })
const pointerVisible = ref(false)
const spotlight = ref(false)
let pointerTimer: ReturnType<typeof setTimeout> | null = null

const { latestMessage, peerConnected, status } = useRealtimeRoom(roomId, 'desktop')

const slides = computed(() => [
  {
    accent: 'bg-coral',
    body: t('remote.slides.one.body'),
    kicker: t('remote.slides.one.kicker'),
    title: t('remote.slides.one.title'),
  },
  {
    accent: 'bg-sky',
    body: t('remote.slides.two.body'),
    kicker: t('remote.slides.two.kicker'),
    title: t('remote.slides.two.title'),
  },
  {
    accent: 'bg-violet',
    body: t('remote.slides.three.body'),
    kicker: t('remote.slides.three.kicker'),
    title: t('remote.slides.three.title'),
  },
])

const connectionLabel = computed(() => {
  if (peerConnected.value)
    return t('remote.connected')
  if (status.value === 'connecting' || status.value === 'idle')
    return t('remote.connecting')
  if (status.value === 'offline')
    return t('remote.offline')
  return t('remote.waiting')
})

function createRoomId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(values, value => alphabet[value % alphabet.length]).join('')
}

function changeSlide(direction: number) {
  currentSlide.value = (currentSlide.value + direction + slides.value.length) % slides.value.length
  slideBody.value?.scrollTo({ behavior: 'smooth', top: 0 })
}

function handleCommand(command: unknown) {
  if (command === 'previous')
    changeSlide(-1)
  else if (command === 'next')
    changeSlide(1)
  else if (command === 'scroll-up')
    slideBody.value?.scrollBy({ behavior: 'smooth', top: -160 })
  else if (command === 'scroll-down')
    slideBody.value?.scrollBy({ behavior: 'smooth', top: 160 })
  else if (command === 'spotlight-toggle')
    spotlight.value = !spotlight.value
}

function handleKeydown(event: KeyboardEvent) {
  const commandMap: Record<string, string> = {
    ArrowDown: 'scroll-down',
    ArrowLeft: 'previous',
    ArrowRight: 'next',
    ArrowUp: 'scroll-up',
  }
  const command = commandMap[event.key]
  if (command) {
    event.preventDefault()
    handleCommand(command)
  }
}

async function copyPhoneUrl() {
  await navigator.clipboard.writeText(phoneUrl.value)
  copied.value = true
  setTimeout(() => copied.value = false, 1600)
}

watch(latestMessage, (message) => {
  if (!message)
    return

  if (message.type === 'remote:command')
    handleCommand(message.payload?.command)

  if (message.type === 'remote:pointer') {
    const x = Number(message.payload?.x)
    const y = Number(message.payload?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y))
      return

    pointer.x = Math.min(100, Math.max(0, x))
    pointer.y = Math.min(100, Math.max(0, y))
    pointerVisible.value = true
    if (pointerTimer)
      clearTimeout(pointerTimer)
    pointerTimer = setTimeout(() => pointerVisible.value = false, 2200)
  }
})

onMounted(async () => {
  roomId.value = createRoomId()
  const localePrefix = locale.value === 'en' ? '/en' : ''
  phoneUrl.value = `${window.location.origin}${localePrefix}/remote/control/${roomId.value}`
  qrCode.value = await QRCode.toDataURL(phoneUrl.value, {
    color: { dark: '#171714', light: '#ffffff' },
    margin: 2,
    width: 360,
  })
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (pointerTimer)
    clearTimeout(pointerTimer)
})

useSeoMeta({
  title: () => `${t('features.remote.title')} — ${t('brand')}`,
  description: () => t('remote.description'),
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-5 pt-8 pb-16 sm:px-8 lg:px-12">
    <NuxtLink :to="localePath('/')" class="focus-ring inline-flex rounded-full py-2 text-xs font-black underline decoration-2 underline-offset-4">
      ← {{ t('common.backHome') }}
    </NuxtLink>

    <section class="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_21rem]">
      <div>
        <p class="font-mono text-xs font-black tracking-[0.2em] text-black/50">
          {{ t('remote.eyebrow') }}
        </p>
        <h1 class="mt-4 max-w-4xl text-5xl leading-[0.94] font-black tracking-[-0.065em] sm:text-7xl">
          {{ t('remote.title') }}
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-7 font-semibold text-black/60">
          {{ t('remote.description') }}
        </p>
      </div>

      <aside class="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_#171714]">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs font-black">{{ t('remote.room') }}</span>
          <span class="inline-flex items-center gap-2 text-[11px] font-black">
            <span :class="peerConnected ? 'bg-emerald-500' : 'bg-amber-400'" class="size-2 rounded-full" />
            {{ connectionLabel }}
          </span>
        </div>
        <p class="mt-3 font-mono text-3xl font-black tracking-[0.18em]">
          {{ roomId || '------' }}
        </p>
      </aside>
    </section>

    <section class="mt-12 grid gap-7 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside class="h-fit rounded-[2rem] border-2 border-ink bg-white p-5 shadow-[7px_7px_0_#171714]">
        <p class="text-center text-xs font-black tracking-wider uppercase">
          {{ t('remote.scan') }}
        </p>
        <div class="mt-4 aspect-square overflow-hidden rounded-2xl border-2 border-ink bg-white p-2">
          <img v-if="qrCode" :src="qrCode" :alt="t('remote.scan')" class="size-full" width="360" height="360">
          <div v-else class="size-full animate-pulse rounded-xl bg-black/5" />
        </div>
        <button
          type="button"
          class="focus-ring mt-4 w-full rounded-xl border-2 border-ink bg-acid px-4 py-3 text-sm font-black transition hover:-translate-y-0.5"
          :disabled="!phoneUrl"
          @click="copyPhoneUrl"
        >
          {{ copied ? t('remote.copied') : t('remote.copyLink') }}
        </button>
        <p class="mt-4 text-center text-[11px] leading-5 font-semibold text-black/45">
          {{ t('remote.desktopHint') }}
        </p>
      </aside>

      <div class="min-w-0">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p class="font-mono text-xs font-black">
            {{ t('remote.slideCounter', { current: currentSlide + 1, total: slides.length }) }}
          </p>
          <p class="text-xs font-bold text-black/45">
            {{ t('remote.keyboardHint') }}
          </p>
        </div>

        <div class="relative min-h-[31rem] overflow-hidden rounded-[2.25rem] border-2 border-ink bg-ink text-white shadow-[9px_9px_0_#ff735c]">
          <Transition name="slide" mode="out-in">
            <article :key="currentSlide" class="absolute inset-0 flex flex-col p-7 sm:p-12">
              <div :class="slides[currentSlide]?.accent" class="absolute -top-20 -right-16 size-64 rounded-full border-2 border-white/50 opacity-90" />
              <p class="relative font-mono text-xs font-black tracking-[0.2em] text-white/55">
                {{ slides[currentSlide]?.kicker }}
              </p>
              <div ref="slideBody" class="relative mt-auto max-h-80 overflow-y-auto pt-24 pr-2">
                <h2 class="max-w-3xl text-5xl leading-[0.94] font-black tracking-[-0.06em] sm:text-7xl">
                  {{ slides[currentSlide]?.title }}
                </h2>
                <p class="mt-7 max-w-2xl text-base leading-8 font-semibold text-white/65 sm:text-lg">
                  {{ slides[currentSlide]?.body }}
                </p>
                <p class="mt-6 text-sm leading-7 text-white/45">
                  WebSocket · QR pairing · Reconnect · Responsive controller · Pointer events
                </p>
              </div>
            </article>
          </Transition>

          <div
            v-show="pointerVisible"
            class="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75"
            :style="{ left: `${pointer.x}%`, top: `${pointer.y}%` }"
          >
            <span :class="spotlight ? 'size-28 bg-coral/25 blur-xl' : 'size-10 bg-coral/50 blur-md'" class="absolute top-1/2 left-1/2 -translate-1/2 rounded-full" />
            <span class="relative block size-4 rounded-full border-2 border-white bg-coral shadow-[0_0_18px_#ff735c]" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-2rem);
}
</style>
