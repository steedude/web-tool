<script setup lang="ts">
import QRCode from 'qrcode'
import { DROP_QR_CONFIG } from '~/configs/realtime.config'
import { RealtimeRole } from '~/types/realtime.type'
import { createRoomCode, isRoomCode, normalizeRoomCode } from '~/utils/realtime.util'

const route = useRoute()
const router = useRouter()
const roomInput = ref(typeof route.query.room === 'string' ? route.query.room.toUpperCase() : '')
const roleInput = ref(typeof route.query.role === 'string' ? route.query.role : '')
const roomId = ref('')
const role = ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>(RealtimeRole.DropHost)
const started = ref(false)
const qrCode = ref('')
const copied = ref(false)
const textInput = ref('')
const { t } = useI18n()
const localePath = useLocalePath()

const { debug, isReady, messages, peerConnected, roomFull, sendFile, sendText: sendDropText } = useDropPeer(roomId, role)
const joinUrl = computed(() => import.meta.client && roomId.value
  ? `${window.location.origin}/drop?room=${roomId.value}`
  : '')

async function start(nextRole: RealtimeRole.DropHost | RealtimeRole.DropGuest, code?: string) {
  const normalized = normalizeRoomCode(code || createRoomCode())
  if (!isRoomCode(normalized))
    return

  role.value = nextRole
  roomId.value = normalized
  started.value = true
  await router.replace({
    query: {
      role: nextRole === RealtimeRole.DropHost ? 'host' : 'guest',
      room: normalized,
    },
  })

  if (nextRole === RealtimeRole.DropHost) {
    await nextTick()
    qrCode.value = await QRCode.toDataURL(joinUrl.value, DROP_QR_CONFIG)
  }
}

function sendText() {
  if (sendDropText(textInput.value))
    textInput.value = ''
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file)
    sendFile(file)
  input.value = ''
}

async function copyJoinUrl() {
  await navigator.clipboard.writeText(joinUrl.value)
  copied.value = true
  setTimeout(() => copied.value = false, 1500)
}

onMounted(() => {
  if (!isRoomCode(roomInput.value))
    return

  const nextRole = roleInput.value === 'host' ? RealtimeRole.DropHost : RealtimeRole.DropGuest
  start(nextRole, roomInput.value)
})
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-16">
    <NuxtLink :to="localePath('/')" class="focus-ring inline-flex font-bold hover:underline">
      {{ t('common.arrowLeft') }} {{ t('common.backHome') }}
    </NuxtLink>

    <DropStartPanel v-if="!started" v-model:room-input="roomInput" @start="start" />

    <section v-else class="mt-10 grid min-h-[670px] gap-6 lg:grid-cols-[360px_1fr]">
      <DropRoomSidebar :copied="copied" :debug="debug" :is-ready="isReady" :peer-connected="peerConnected" :qr-code="qrCode" :role="role" :room-id="roomId" @copy-invite="copyJoinUrl" />
      <div class="space-y-4">
        <p v-if="roomFull" class="border-2 border-ink bg-red-100 px-5 py-4 font-black shadow-[6px_6px_0_#171714]">
          {{ t('drop.status.full') }}
        </p>
        <DropChatPanel v-model:text-input="textInput" :is-ready="isReady" :messages="messages" @choose-file="onFileChange" @send-text="sendText" />
      </div>
    </section>
  </main>
</template>
