<script setup lang="ts">
import QRCode from 'qrcode'
import { DRAW_QR_CONFIG } from '~/configs/realtime.config'
import { RealtimeRole, RealtimeStatus } from '~/types/realtime.type'
import { createRoomCode, isRoomCode, normalizeRoomCode } from '~/utils/realtime.util'

const { locale, t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const roomId = ref('')
const inviteUrl = ref('')
const qrCode = ref('')
const copied = ref(false)

const { latestMessage, peerConnected, send, status } = useRealtimeRoom(roomId, RealtimeRole.DrawHost)

const connectionLabel = computed(() => {
  if (peerConnected.value)
    return t('draw.connected')
  if (status.value === RealtimeStatus.Connecting || status.value === RealtimeStatus.Idle)
    return t('draw.connecting')
  if (status.value === RealtimeStatus.Offline)
    return t('draw.offline')
  return t('draw.waiting')
})

async function copyInviteUrl() {
  await navigator.clipboard.writeText(inviteUrl.value)
  copied.value = true
  setTimeout(() => copied.value = false, 1600)
}

async function prepareRoom(code?: string) {
  const normalized = normalizeRoomCode(code || createRoomCode())
  if (!isRoomCode(normalized))
    return

  roomId.value = normalized
  const localePrefix = locale.value === 'en' ? '/en' : ''
  inviteUrl.value = `${window.location.origin}${localePrefix}/draw/play/${normalized}`
  qrCode.value = await QRCode.toDataURL(inviteUrl.value, DRAW_QR_CONFIG)

  if (route.query.room !== normalized) {
    await router.replace({
      query: {
        ...route.query,
        room: normalized,
      },
    })
  }
}

onMounted(() => {
  const queryRoom = typeof route.query.room === 'string' ? route.query.room : ''
  const normalizedQueryRoom = normalizeRoomCode(queryRoom)
  prepareRoom(isRoomCode(normalizedQueryRoom) ? normalizedQueryRoom : undefined)
})

usePageSeo({
  title: () => `${t('features.draw.title')} — ${t('brand')}`,
  description: () => t('draw.description'),
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-5 pt-8 pb-16 lg:px-12">
    <NuxtLink :to="localePath('/')" class="focus-ring inline-flex rounded-full py-2 text-xs font-black underline decoration-2 underline-offset-4">
      {{ t('common.arrowLeft') }} {{ t('common.backHome') }}
    </NuxtLink>

    <section class="mt-8 grid min-w-0 items-end gap-8 lg:grid-cols-[1fr_21rem]">
      <div class="min-w-0">
        <p class="wrap-break-word font-mono text-xs font-black tracking-[0.16em] text-black/50 lg:tracking-[0.2em]">
          {{ t('draw.eyebrow') }}
        </p>
        <h1 class="mt-4 max-w-4xl text-[clamp(3rem,13vw,4.5rem)] leading-[0.94] font-black tracking-[-0.065em] wrap-break-word lg:text-7xl">
          {{ t('draw.title') }}
        </h1>
        <p class="mt-6 max-w-2xl wrap-break-word text-base leading-7 font-semibold text-black/60">
          {{ t('draw.description') }}
        </p>
      </div>

      <DrawPairingCard
        class="lg:hidden"
        :connection-label="connectionLabel"
        :copied="copied"
        :peer-connected="peerConnected"
        :invite-url="inviteUrl"
        :qr-code="qrCode"
        :room-id="roomId"
        @copy-link="copyInviteUrl"
      />
    </section>

    <section class="mt-12 grid min-w-0 gap-7 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <DrawPairingCard
        class="hidden lg:block"
        :connection-label="connectionLabel"
        :copied="copied"
        :peer-connected="peerConnected"
        :invite-url="inviteUrl"
        :qr-code="qrCode"
        :room-id="roomId"
        @copy-link="copyInviteUrl"
      />

      <DrawGame
        :latest-message="latestMessage"
        :peer-connected="peerConnected"
        :role="RealtimeRole.DrawHost"
        :send-realtime-message="send"
      />
    </section>
  </div>
</template>
