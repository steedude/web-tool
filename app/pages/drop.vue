<script setup lang="ts">
import QRCode from 'qrcode'

type DropRole = 'drop-host' | 'drop-guest'

interface ChatItem {
  id: string
  kind: 'text' | 'file' | 'system'
  mine: boolean
  name?: string
  size?: number
  text?: string
  url?: string
}

interface IncomingFile {
  chunks: ArrayBuffer[]
  name: string
  received: number
  size: number
  type: string
}

const route = useRoute()
const router = useRouter()
const roomInput = ref(typeof route.query.room === 'string' ? route.query.room.toUpperCase() : '')
const roomId = ref('')
const role = ref<DropRole>('drop-host')
const started = ref(false)
const qrCode = ref('')
const copied = ref(false)
const textInput = ref('')
const transferProgress = ref<number | null>(null)
const messages = ref<ChatItem[]>([])
const connectionState = ref<RTCPeerConnectionState>('new')
const channelState = ref<RTCDataChannelState>('closed')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const { t } = useI18n()

const room = useRealtimeRoom(roomId, role)
let peer: RTCPeerConnection | null = null
let channel: RTCDataChannel | null = null
let incomingFile: IncomingFile | null = null

const isReady = computed(() => channelState.value === 'open' && connectionState.value === 'connected')
const joinUrl = computed(() => import.meta.client && roomId.value
  ? `${window.location.origin}/drop?room=${roomId.value}`
  : '')

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function addSystem(text: string) {
  messages.value.push({ id: crypto.randomUUID(), kind: 'system', mine: false, text })
}

function setupChannel(nextChannel: RTCDataChannel) {
  channel = nextChannel
  channelState.value = nextChannel.readyState
  channel.binaryType = 'arraybuffer'
  channel.bufferedAmountLowThreshold = 256 * 1024

  channel.addEventListener('open', () => {
    channelState.value = nextChannel.readyState
  })
  channel.addEventListener('close', () => {
    channelState.value = nextChannel.readyState
  })
  channel.addEventListener('error', () => {
    channelState.value = nextChannel.readyState
  })

  channel.addEventListener('open', () => addSystem(t('drop.system.connected')))
  channel.addEventListener('close', () => addSystem(t('drop.system.offline')))
  channel.addEventListener('message', (event) => {
    if (typeof event.data === 'string') {
      const data = JSON.parse(event.data) as { kind: string, name?: string, size?: number, text?: string, type?: string }

      if (data.kind === 'text' && data.text) {
        messages.value.push({ id: crypto.randomUUID(), kind: 'text', mine: false, text: data.text })
      }
      else if (data.kind === 'file:start' && data.name && data.size !== undefined) {
        incomingFile = { chunks: [], name: data.name, received: 0, size: data.size, type: data.type || 'application/octet-stream' }
        transferProgress.value = 0
      }
      else if (data.kind === 'file:end' && incomingFile) {
        const blob = new Blob(incomingFile.chunks, { type: incomingFile.type })
        messages.value.push({
          id: crypto.randomUUID(),
          kind: 'file',
          mine: false,
          name: incomingFile.name,
          size: incomingFile.size,
          url: URL.createObjectURL(blob),
        })
        incomingFile = null
        transferProgress.value = null
      }
      return
    }

    if (incomingFile) {
      const chunk = event.data as ArrayBuffer
      incomingFile.chunks.push(chunk)
      incomingFile.received += chunk.byteLength
      transferProgress.value = Math.min(100, Math.round((incomingFile.received / incomingFile.size) * 100))
    }
  })
}

function createPeer() {
  peer?.close()
  channel = null
  channelState.value = 'closed'
  peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] })
  connectionState.value = peer.connectionState
  peer.addEventListener('connectionstatechange', () => {
    connectionState.value = peer?.connectionState ?? 'closed'
  })
  peer.addEventListener('icecandidate', (event) => {
    if (event.candidate)
      room.send('signal:ice', { candidate: event.candidate.toJSON() })
  })
  peer.addEventListener('datachannel', event => setupChannel(event.channel))
  return peer
}

async function createOffer() {
  const pc = createPeer()
  setupChannel(pc.createDataChannel('drop', { ordered: true }))
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  room.send('signal:offer', { sdp: offer })
}

async function handleSignal(message: { type: string, payload?: Record<string, unknown> }) {
  if (message.type === 'peer:joined' && role.value === 'drop-host') {
    await createOffer()
  }
  else if (message.type === 'signal:offer') {
    const pc = createPeer()
    await pc.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    room.send('signal:answer', { sdp: answer })
  }
  else if (message.type === 'signal:answer' && peer) {
    await peer.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
  }
  else if (message.type === 'signal:ice' && peer && message.payload?.candidate) {
    await peer.addIceCandidate(message.payload.candidate as RTCIceCandidateInit)
  }
}

async function start(nextRole: DropRole, code?: string) {
  const normalized = (code || makeRoomCode()).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  if (normalized.length !== 6)
    return

  role.value = nextRole
  roomId.value = normalized
  started.value = true
  await router.replace({ query: nextRole === 'drop-guest' ? { room: normalized } : {} })

  if (nextRole === 'drop-host') {
    await nextTick()
    qrCode.value = await QRCode.toDataURL(joinUrl.value, { margin: 1, width: 320, color: { dark: '#171714', light: '#ffffff' } })
  }
}

function sendText() {
  const text = textInput.value.trim()
  if (!text || channel?.readyState !== 'open')
    return
  channel.send(JSON.stringify({ kind: 'text', text }))
  messages.value.push({ id: crypto.randomUUID(), kind: 'text', mine: true, text })
  textInput.value = ''
}

function waitForBuffer() {
  if (!channel || channel.bufferedAmount < 512 * 1024)
    return Promise.resolve()
  return new Promise<void>((resolve) => {
    channel?.addEventListener('bufferedamountlow', () => resolve(), { once: true })
  })
}

async function sendFile(file: File) {
  if (!channel || channel.readyState !== 'open' || file.size > 50 * 1024 * 1024)
    return

  channel.send(JSON.stringify({ kind: 'file:start', name: file.name, size: file.size, type: file.type }))
  const chunkSize = 16 * 1024
  transferProgress.value = 0
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    await waitForBuffer()
    channel.send(await file.slice(offset, offset + chunkSize).arrayBuffer())
    transferProgress.value = Math.min(100, Math.round(((offset + chunkSize) / file.size) * 100))
  }
  channel.send(JSON.stringify({ kind: 'file:end' }))
  messages.value.push({ id: crypto.randomUUID(), kind: 'file', mine: true, name: file.name, size: file.size })
  transferProgress.value = null
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

function formatBytes(size = 0) {
  if (size < 1024)
    return `${size} B`
  if (size < 1024 ** 2)
    return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 ** 2).toFixed(1)} MB`
}

onMounted(() => {
  if (roomInput.value.length === 6)
    start('drop-guest', roomInput.value)
})

watch(room.latestMessage, (message) => {
  if (message)
    handleSignal(message).catch(() => addSystem('配對訊號處理失敗，請重新整理'))
})

onBeforeUnmount(() => {
  peer?.close()
  messages.value.forEach((message) => {
    if (message.url)
      URL.revokeObjectURL(message.url)
  })
})
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-16">
    <NuxtLink to="/" class="focus-ring inline-flex font-bold hover:underline">
      ← 回到實驗室
    </NuxtLink>

    <section v-if="!started" class="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
      <div>
        <p class="text-sm font-black tracking-[.24em]">
          {{ t('drop.eyebrow') }}
        </p>
        <h1 class="mt-5 max-w-4xl text-5xl leading-[.95] font-black tracking-[-.055em] sm:text-7xl">
          檔案不繞路，直接送到你手上。
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-8">
          建立臨時房間，讓另一台裝置掃描加入。文字與檔案透過 WebRTC 點對點傳輸，伺服器只負責讓雙方找到彼此。
        </p>
      </div>
      <div class="border-2 border-ink bg-white p-5 shadow-[8px_8px_0_#171714] sm:p-7">
        <button class="focus-ring w-full border-2 border-ink bg-sky px-5 py-5 text-left text-xl font-black transition hover:-translate-y-1" @click="start('drop-host')">
          建立新房間 <span class="float-right">→</span>
        </button>
        <div class="my-5 flex items-center gap-3 text-xs font-black tracking-[.2em]">
          <span class="h-px flex-1 bg-ink/30" />或輸入房間代碼<span class="h-px flex-1 bg-ink/30" />
        </div>
        <form class="flex gap-2" @submit.prevent="start('drop-guest', roomInput)">
          <input v-model="roomInput" maxlength="6" placeholder="ABC123" class="focus-ring min-w-0 flex-1 border-2 border-ink bg-paper px-4 py-4 font-mono text-xl font-black uppercase" @input="roomInput = roomInput.toUpperCase().replace(/[^A-Z0-9]/g, '')">
          <button class="focus-ring border-2 border-ink bg-ink px-5 font-black text-white disabled:opacity-40" :disabled="roomInput.length !== 6">
            加入
          </button>
        </form>
      </div>
    </section>

    <section v-else class="mt-10 grid min-h-[670px] gap-6 lg:grid-cols-[360px_1fr]">
      <aside class="border-2 border-ink bg-sky p-5 shadow-[6px_6px_0_#171714]">
        <p class="text-xs font-black tracking-[.2em]">
          ROOM
        </p>
        <div class="mt-2 font-mono text-4xl font-black tracking-[.12em]">
          {{ roomId }}
        </div>
        <div class="mt-4 inline-flex items-center gap-2 border border-ink bg-white px-3 py-2 text-sm font-bold">
          <span class="size-2 rounded-full" :class="isReady ? 'bg-green-500' : 'animate-pulse bg-coral'" />
          {{ isReady ? '點對點連線完成' : '等待另一台裝置' }}
        </div>

        <template v-if="role === 'drop-host'">
          <div class="mt-6 border-2 border-ink bg-white p-3">
            <img v-if="qrCode" :src="qrCode" alt="加入傳輸房間的 QR Code" class="w-full">
          </div>
          <button class="focus-ring mt-4 w-full border-2 border-ink bg-white px-4 py-3 font-black" @click="copyJoinUrl">
            {{ copied ? '已複製' : '複製邀請連結' }}
          </button>
        </template>
        <p class="mt-5 text-sm leading-6">
          檔案只存在兩台裝置的瀏覽器記憶體，不會上傳到本站。單檔上限 50 MB。
        </p>
      </aside>

      <div class="flex min-h-[620px] flex-col border-2 border-ink bg-white">
        <header class="flex items-center justify-between border-b-2 border-ink px-5 py-4">
          <div>
            <p class="text-xs font-black tracking-[.18em]">
              WEB AIRDROP
            </p><h1 class="text-2xl font-black">
              即時傳輸
            </h1>
          </div>
          <span class="hidden text-sm font-bold sm:block">WebRTC DataChannel</span>
        </header>
        <div class="flex-1 space-y-3 overflow-y-auto p-5">
          <div v-if="!messages.length" class="grid h-full min-h-72 place-items-center text-center text-ink/55">
            <div>
              <div class="text-5xl">
                ↗
              </div><p class="mt-3 font-bold">
                連線後，從這裡傳送文字或檔案
              </p>
            </div>
          </div>
          <div v-for="message in messages" :key="message.id" class="max-w-[85%]" :class="[message.mine ? 'ml-auto' : '', message.kind === 'system' ? 'mx-auto text-center' : '']">
            <p v-if="message.kind === 'system'" class="text-xs font-bold text-ink/55">
              {{ message.text }}
            </p>
            <div v-else class="border-2 border-ink px-4 py-3" :class="message.mine ? 'bg-acid' : 'bg-paper'">
              <p v-if="message.kind === 'text'" class="whitespace-pre-wrap break-words">
                {{ message.text }}
              </p>
              <a v-else-if="message.url" :href="message.url" :download="message.name" class="focus-ring block font-black underline">↓ {{ message.name }}<small class="ml-2 font-normal">{{ formatBytes(message.size) }}</small></a>
              <p v-else class="font-black">
                ↑ {{ message.name }} <small class="font-normal">{{ formatBytes(message.size) }}</small>
              </p>
            </div>
          </div>
        </div>
        <div v-if="transferProgress !== null" class="border-t-2 border-ink px-5 py-3">
          <div class="mb-1 flex justify-between text-xs font-black">
            <span>傳輸中</span><span>{{ transferProgress }}%</span>
          </div><div class="h-2 bg-ink/15">
            <div class="h-full bg-violet transition-all" :style="{ width: `${transferProgress}%` }" />
          </div>
        </div>
        <form class="flex gap-2 border-t-2 border-ink p-3 sm:p-4" @submit.prevent="sendText">
          <input ref="fileInput" type="file" class="hidden" @change="onFileChange">
          <button type="button" class="focus-ring border-2 border-ink px-4 text-xl font-black disabled:opacity-30" :disabled="!isReady" aria-label="選擇檔案" @click="fileInput?.click()">
            ＋
          </button>
          <input v-model="textInput" class="focus-ring min-w-0 flex-1 border-2 border-ink bg-paper px-4 py-3" placeholder="輸入訊息…" :disabled="!isReady">
          <button class="focus-ring border-2 border-ink bg-ink px-5 font-black text-white disabled:opacity-30" :disabled="!isReady || !textInput.trim()">
            傳送
          </button>
        </form>
      </div>
    </section>
  </main>
</template>
