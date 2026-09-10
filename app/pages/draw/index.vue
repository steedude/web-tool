<script setup lang="ts">
import { DRAW_QR_CONFIG, RealtimeRole, RealtimeStatus } from '~/configs/realtime.config'
import { createRoomCode, isRoomCode, normalizeRoomCode } from '~/utils/realtime.util'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const roomId = ref('')
const inviteUrl = useInviteUrl(() => roomId.value ? `/draw/play/${roomId.value}` : null)
const { qrCode, qrFailed, retryQrCode } = useQrCode(inviteUrl, DRAW_QR_CONFIG)
const { copied, copy, copyFailed } = useCopyFeedback()

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

function copyInviteUrl() {
  return copy(inviteUrl.value)
}

async function prepareRoom(code?: string) {
  const normalized = normalizeRoomCode(code || createRoomCode())
  if (!isRoomCode(normalized))
    return

  roomId.value = normalized

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
  title: () => `${t('features.draw.title')} - ${t('brand')}`,
  description: () => t('draw.description'),
})
</script>

<template>
  <PageContainer>
    <AppBackLink />

    <AppShareFeedback class="mt-4" :copy-failed="copyFailed" :qr-failed="qrFailed" @retry-qr="retryQrCode" />

    <PageHeader class="mt-10" :eyebrow="t('draw.eyebrow')" :title="t('draw.title')" :description="t('draw.description')" />

    <section class="mt-12 grid min-w-0 gap-7 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <DrawPairingCard
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
  </PageContainer>
</template>
