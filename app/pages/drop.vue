<script setup lang="ts">
import { DROP_FILE_TRANSFER_CONFIG, DROP_QR_CONFIG, RealtimeRole } from '~/configs/realtime.config'
import { formatBytes } from '~/utils/file.util'
import { createRoomCode, isRoomCode, normalizeRoomCode } from '~/utils/realtime.util'

const route = useRoute()
const router = useRouter()
const roomInput = ref(typeof route.query.room === 'string' ? route.query.room.toUpperCase() : '')
const roleInput = ref(typeof route.query.role === 'string' ? route.query.role : '')
const roomId = ref('')
const role = ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>(RealtimeRole.DropHost)
const started = ref(false)
const { copied, copy, copyFailed } = useCopyFeedback()
const textInput = ref('')
const fileErrorMessage = ref('')
const { t } = useI18n()

usePageSeo({
  title: () => `${t('features.drop.title')} — ${t('brand')}`,
  description: () => t('drop.description'),
})

const { debug, isReady, messages, peerConnected, roomFull, sendFile, sendText: sendDropText } = useDropPeer(roomId, role)
const joinUrl = useInviteUrl(() => roomId.value ? { path: '/drop', query: { room: roomId.value } } : null)
const { qrCode, qrFailed, retryQrCode } = useQrCode(() => role.value === RealtimeRole.DropHost ? joinUrl.value : '', DROP_QR_CONFIG)

async function start(selectedRole: RealtimeRole.DropHost | RealtimeRole.DropGuest, code?: string) {
  const normalized = normalizeRoomCode(code || createRoomCode())
  if (!isRoomCode(normalized))
    return

  role.value = selectedRole
  roomId.value = normalized
  started.value = true
  await router.replace({
    query: {
      role: selectedRole === RealtimeRole.DropHost ? 'host' : 'guest',
      room: normalized,
    },
  })
}

function sendText() {
  if (sendDropText(textInput.value))
    textInput.value = ''
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  fileErrorMessage.value = ''
  if (file) {
    if (file.size > DROP_FILE_TRANSFER_CONFIG.maxFileSize) {
      fileErrorMessage.value = t('drop.file.tooLarge', { size: formatBytes(DROP_FILE_TRANSFER_CONFIG.maxFileSize) })
    }
    else {
      sendFile(file)
    }
  }
  input.value = ''
}

function copyJoinUrl() {
  return copy(joinUrl.value)
}

onMounted(() => {
  if (!isRoomCode(roomInput.value))
    return

  const selectedRole = roleInput.value === 'host' ? RealtimeRole.DropHost : RealtimeRole.DropGuest
  start(selectedRole, roomInput.value)
})
</script>

<template>
  <PageContainer>
    <AppBackLink />

    <AppShareFeedback class="mt-4" :copy-failed="copyFailed" :qr-failed="qrFailed" @retry-qr="retryQrCode" />

    <DropStartPanel v-if="!started" v-model:room-input="roomInput" @start="start" />

    <section v-else class="mt-10 grid min-h-167.5 gap-6 lg:grid-cols-[360px_1fr]">
      <DropRoomSidebar :copied="copied" :debug="debug" :is-ready="isReady" :peer-connected="peerConnected" :qr-code="qrCode" :role="role" :room-id="roomId" @copy-invite="copyJoinUrl" />
      <div class="space-y-4">
        <AppAlert v-if="roomFull">
          {{ t('drop.status.full') }}
        </AppAlert>
        <AppAlert v-if="fileErrorMessage">
          {{ fileErrorMessage }}
        </AppAlert>
        <DropChatPanel v-model:text-input="textInput" :is-ready="isReady" :messages="messages" @choose-file="onFileChange" @send-text="sendText" />
      </div>
    </section>
  </PageContainer>
</template>
