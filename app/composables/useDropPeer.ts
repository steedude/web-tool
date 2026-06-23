import type { DropChatItem, DropDataMessage, IncomingDropFile } from '~/types/drop.type'
import type { RealtimeMessage } from '~/types/realtime.type'
import { DROP_FILE_TRANSFER_CONFIG, DROP_RTC_CONFIG } from '~/configs/realtime.config'
import { DropMessageKind } from '~/types/drop.type'
import { RealtimeMessageType, RealtimeRole } from '~/types/realtime.type'

export function useDropPeer(roomId: Ref<string>, role: Ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>) {
  const { t } = useI18n()
  const room = useRealtimeRoom(roomId, role)
  const messages = ref<DropChatItem[]>([])
  const transferProgress = ref<number | null>(null)
  const connectionState = ref<RTCPeerConnectionState>('new')
  const channelState = ref<RTCDataChannelState>('closed')

  let peer: RTCPeerConnection | null = null
  let channel: RTCDataChannel | null = null
  let incomingFile: IncomingDropFile | null = null

  const isReady = computed(() => channelState.value === 'open' && connectionState.value === 'connected')

  function addSystem(text: string) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.System, mine: false, text })
  }

  function addText(text: string, mine: boolean) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.Text, mine, text })
  }

  function addFile(file: Pick<DropChatItem, 'name' | 'size' | 'url'>, mine: boolean) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.File, mine, ...file })
  }

  function finishIncomingFile() {
    if (!incomingFile)
      return

    const blob = new Blob(incomingFile.chunks, { type: incomingFile.type })
    addFile({
      name: incomingFile.name,
      size: incomingFile.size,
      url: URL.createObjectURL(blob),
    }, false)
    incomingFile = null
    transferProgress.value = null
  }

  function handleDataMessage(data: DropDataMessage) {
    if (data.kind === DropMessageKind.Text && data.text) {
      addText(data.text, false)
    }
    else if (data.kind === DropMessageKind.FileStart && data.name && data.size !== undefined) {
      incomingFile = { chunks: [], name: data.name, received: 0, size: data.size, type: data.type || 'application/octet-stream' }
      transferProgress.value = 0
    }
    else if (data.kind === DropMessageKind.FileEnd) {
      finishIncomingFile()
    }
  }

  function setupChannel(nextChannel: RTCDataChannel) {
    channel = nextChannel
    channelState.value = nextChannel.readyState
    channel.binaryType = 'arraybuffer'
    channel.bufferedAmountLowThreshold = DROP_FILE_TRANSFER_CONFIG.bufferLowThreshold

    const updateChannelState = () => {
      channelState.value = nextChannel.readyState
    }

    channel.addEventListener('open', updateChannelState)
    channel.addEventListener('close', updateChannelState)
    channel.addEventListener('error', updateChannelState)

    channel.addEventListener('open', () => addSystem(t('drop.system.connected')))
    channel.addEventListener('close', () => addSystem(t('drop.system.offline')))
    channel.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        handleDataMessage(JSON.parse(event.data) as DropDataMessage)
        return
      }

      if (!incomingFile)
        return

      const chunk = event.data as ArrayBuffer
      incomingFile.chunks.push(chunk)
      incomingFile.received += chunk.byteLength
      transferProgress.value = Math.min(100, Math.round((incomingFile.received / incomingFile.size) * 100))
    })
  }

  function createPeer() {
    peer?.close()
    channel = null
    channelState.value = 'closed'
    peer = new RTCPeerConnection(DROP_RTC_CONFIG)
    connectionState.value = peer.connectionState
    peer.addEventListener('connectionstatechange', () => {
      connectionState.value = peer?.connectionState ?? 'closed'
    })
    peer.addEventListener('icecandidate', (event) => {
      if (event.candidate)
        room.send(RealtimeMessageType.SignalIce, { candidate: event.candidate.toJSON() })
    })
    peer.addEventListener('datachannel', event => setupChannel(event.channel))
    return peer
  }

  async function createOffer() {
    const pc = createPeer()
    setupChannel(pc.createDataChannel('drop', { ordered: true }))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    room.send(RealtimeMessageType.SignalOffer, { sdp: offer })
  }

  async function handleSignal(message: RealtimeMessage) {
    if (message.type === RealtimeMessageType.PeerJoined && role.value === RealtimeRole.DropHost) {
      await createOffer()
    }
    else if (message.type === RealtimeMessageType.SignalOffer) {
      const pc = createPeer()
      await pc.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      room.send(RealtimeMessageType.SignalAnswer, { sdp: answer })
    }
    else if (message.type === RealtimeMessageType.SignalAnswer && peer) {
      await peer.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
    }
    else if (message.type === RealtimeMessageType.SignalIce && peer && message.payload?.candidate) {
      await peer.addIceCandidate(message.payload.candidate as RTCIceCandidateInit)
    }
  }

  function sendText(text: string) {
    const trimmed = text.trim()
    if (!trimmed || channel?.readyState !== 'open')
      return false

    channel.send(JSON.stringify({ kind: DropMessageKind.Text, text: trimmed }))
    addText(trimmed, true)
    return true
  }

  function waitForBuffer() {
    if (!channel || channel.bufferedAmount < DROP_FILE_TRANSFER_CONFIG.maxBufferedAmount)
      return Promise.resolve()
    return new Promise<void>((resolve) => {
      const activeChannel = channel
      const finish = () => resolve()
      activeChannel?.addEventListener('bufferedamountlow', finish, { once: true })
      activeChannel?.addEventListener('close', finish, { once: true })
      activeChannel?.addEventListener('error', finish, { once: true })
    })
  }

  async function sendFile(file: File) {
    if (!channel || channel.readyState !== 'open' || file.size > DROP_FILE_TRANSFER_CONFIG.maxFileSize)
      return

    channel.send(JSON.stringify({ kind: DropMessageKind.FileStart, name: file.name, size: file.size, type: file.type }))
    const chunkSize = DROP_FILE_TRANSFER_CONFIG.chunkSize
    transferProgress.value = 0
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const nextOffset = Math.min(offset + chunkSize, file.size)
      channel.send(await file.slice(offset, nextOffset).arrayBuffer())
      transferProgress.value = Math.min(100, Math.round((nextOffset / file.size) * 100))
      await waitForBuffer()
    }
    channel.send(JSON.stringify({ kind: DropMessageKind.FileEnd }))
    addFile({ name: file.name, size: file.size }, true)
    transferProgress.value = null
  }

  function cleanup() {
    peer?.close()
    messages.value.forEach((message) => {
      if (message.url)
        URL.revokeObjectURL(message.url)
    })
  }

  watch(room.latestMessage, (message) => {
    if (message)
      handleSignal(message).catch(() => addSystem(t('drop.system.signalFailed')))
  })

  onBeforeUnmount(cleanup)

  return {
    isReady,
    messages,
    sendFile,
    sendText,
    transferProgress,
  }
}
