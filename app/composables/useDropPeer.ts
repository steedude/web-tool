import type { DropChatItem, DropDataMessage, DropDebugStats, IncomingDropFile, OutgoingDropFileProgress } from '~/types/drop.type'
import type { RealtimeMessage } from '~/types/realtime.type'
import { DROP_FILE_TRANSFER_CONFIG, DROP_RTC_CONFIG } from '~/configs/realtime.config'
import { DropFileTransferStatus, DropMessageKind } from '~/types/drop.type'
import { RealtimeMessageType, RealtimeRole } from '~/types/realtime.type'

export function useDropPeer(roomId: Ref<string>, role: Ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>) {
  const { t } = useI18n()
  const room = useRealtimeRoom(roomId, role)
  const messages = ref<DropChatItem[]>([])
  const connectionState = ref<RTCPeerConnectionState>('new')
  const channelState = ref<RTCDataChannelState>('closed')
  const debugStats = ref<DropDebugStats>({
    availableOutgoingBitrate: null,
    bufferedAmount: 0,
    bytesReceived: 0,
    bytesSent: 0,
    channelState: 'closed',
    connectionState: 'new',
    currentRoundTripTime: null,
    localCandidateType: '',
    packetsLost: 0,
    packetsReceived: 0,
    packetsSent: 0,
    receiveBytesPerSecond: 0,
    remoteCandidateType: '',
    selectedCandidatePairState: '',
    sendBytesPerSecond: 0,
  })

  let peer: RTCPeerConnection | null = null
  let channel: RTCDataChannel | null = null
  let incomingFile: IncomingDropFile | null = null
  let lastProgressAt = 0
  let statsTimer: ReturnType<typeof setInterval> | null = null
  let lastStatsSnapshot = { bytesReceived: 0, bytesSent: 0, timestamp: 0 }
  const outgoingProgressMap = new Map<string, OutgoingDropFileProgress>()

  const isReady = computed(() => channelState.value === 'open' && connectionState.value === 'connected')

  function addSystem(text: string) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.System, mine: false, text })
  }

  function addText(text: string, mine: boolean) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.Text, mine, text })
  }

  function addFile(file: Pick<DropChatItem, 'id' | 'name' | 'progress' | 'receivedBytes' | 'size' | 'speedBytesPerSecond' | 'status' | 'url'>, mine: boolean) {
    messages.value.push({ kind: DropMessageKind.File, mine, ...file })
  }

  function updateFileMessage(id: string, patch: Partial<DropChatItem>) {
    const message = messages.value.find(item => item.id === id)
    if (message)
      Object.assign(message, patch)
  }

  function sendControlMessage(data: DropDataMessage) {
    if (channel?.readyState === 'open')
      channel.send(JSON.stringify(data))
  }

  function finishIncomingFile() {
    if (!incomingFile)
      return

    const blob = new Blob(incomingFile.chunks, { type: incomingFile.type })
    updateFileMessage(incomingFile.id, {
      progress: 100,
      receivedBytes: incomingFile.size,
      speedBytesPerSecond: 0,
      status: DropFileTransferStatus.Complete,
      url: URL.createObjectURL(blob),
    })
    sendControlMessage({ id: incomingFile.id, kind: DropMessageKind.FileProgress, received: incomingFile.size, size: incomingFile.size })
    incomingFile = null
  }

  function updateTransferProgress(file: IncomingDropFile, force = false) {
    const now = Date.now()
    if (!force && now - lastProgressAt < DROP_FILE_TRANSFER_CONFIG.progressIntervalMs)
      return

    const elapsedSeconds = Math.max((now - file.lastProgressAt) / 1000, 0.001)
    const bytesDelta = file.received - file.lastReceived
    file.speedBytesPerSecond = bytesDelta / elapsedSeconds
    file.lastProgressAt = now
    file.lastReceived = file.received
    lastProgressAt = now
    updateFileMessage(file.id, {
      progress: Math.min(100, Math.round((file.received / file.size) * 100)),
      receivedBytes: file.received,
      speedBytesPerSecond: file.speedBytesPerSecond,
    })
    sendControlMessage({ id: file.id, kind: DropMessageKind.FileProgress, received: file.received, size: file.size })
  }

  function handleDataMessage(data: DropDataMessage) {
    if (data.kind === DropMessageKind.Text && data.text) {
      addText(data.text, false)
    }
    else if (data.kind === DropMessageKind.FileStart && data.id && data.name && data.size !== undefined) {
      const now = Date.now()
      incomingFile = { chunks: [], id: data.id, lastProgressAt: now, lastReceived: 0, name: data.name, received: 0, size: data.size, speedBytesPerSecond: 0, startedAt: now, type: data.type || 'application/octet-stream' }
      lastProgressAt = 0
      addFile({
        id: data.id,
        name: data.name,
        progress: 0,
        receivedBytes: 0,
        size: data.size,
        speedBytesPerSecond: 0,
        status: DropFileTransferStatus.Receiving,
      }, false)
    }
    else if (data.kind === DropMessageKind.FileProgress && data.id && data.received !== undefined && data.size) {
      const now = Date.now()
      const progressSnapshot = outgoingProgressMap.get(data.id)
      const elapsedSeconds = progressSnapshot ? Math.max((now - progressSnapshot.lastProgressAt) / 1000, 0.001) : 0
      const speedBytesPerSecond = progressSnapshot ? Math.max(0, (data.received - progressSnapshot.lastReceived) / elapsedSeconds) : 0
      outgoingProgressMap.set(data.id, { lastProgressAt: now, lastReceived: data.received })

      updateFileMessage(data.id, {
        progress: Math.min(100, Math.round((data.received / data.size) * 100)),
        receivedBytes: data.received,
        speedBytesPerSecond: data.received >= data.size ? 0 : speedBytesPerSecond,
        status: data.received >= data.size ? DropFileTransferStatus.Complete : DropFileTransferStatus.Sending,
      })

      if (data.received >= data.size)
        outgoingProgressMap.delete(data.id)
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
      updateTransferProgress(incomingFile)
    })
  }

  async function updateDebugStats() {
    if (!peer)
      return

    const report = await peer.getStats()
    const stats = [...report.values()] as Array<Record<string, any>>
    const selectedPair = stats.find(item => item.type === 'candidate-pair' && (item.selected || item.nominated || item.state === 'succeeded'))
    const dataChannelStats = stats.find(item => item.type === 'data-channel')
    const localCandidate = selectedPair?.localCandidateId ? report.get(selectedPair.localCandidateId) as Record<string, any> | undefined : undefined
    const remoteCandidate = selectedPair?.remoteCandidateId ? report.get(selectedPair.remoteCandidateId) as Record<string, any> | undefined : undefined
    const bytesSent = Number(dataChannelStats?.bytesSent ?? selectedPair?.bytesSent ?? debugStats.value.bytesSent)
    const bytesReceived = Number(dataChannelStats?.bytesReceived ?? selectedPair?.bytesReceived ?? debugStats.value.bytesReceived)
    const timestamp = Number(dataChannelStats?.timestamp ?? selectedPair?.timestamp ?? Date.now())
    const elapsedSeconds = Math.max((timestamp - lastStatsSnapshot.timestamp) / 1000, 0.001)
    const sendBytesPerSecond = lastStatsSnapshot.timestamp ? Math.max(0, (bytesSent - lastStatsSnapshot.bytesSent) / elapsedSeconds) : 0
    const receiveBytesPerSecond = lastStatsSnapshot.timestamp ? Math.max(0, (bytesReceived - lastStatsSnapshot.bytesReceived) / elapsedSeconds) : 0

    lastStatsSnapshot = { bytesReceived, bytesSent, timestamp }
    debugStats.value = {
      availableOutgoingBitrate: selectedPair?.availableOutgoingBitrate ?? null,
      bufferedAmount: channel?.bufferedAmount ?? 0,
      bytesReceived,
      bytesSent,
      channelState: channelState.value,
      connectionState: connectionState.value,
      currentRoundTripTime: selectedPair?.currentRoundTripTime ?? null,
      localCandidateType: localCandidate?.candidateType || '',
      packetsLost: Number(selectedPair?.packetsLost ?? 0),
      packetsReceived: Number(selectedPair?.packetsReceived ?? 0),
      packetsSent: Number(selectedPair?.packetsSent ?? 0),
      receiveBytesPerSecond,
      remoteCandidateType: remoteCandidate?.candidateType || '',
      selectedCandidatePairState: selectedPair?.state || '',
      sendBytesPerSecond,
    }
  }

  function startDebugStats() {
    if (statsTimer)
      clearInterval(statsTimer)
    lastStatsSnapshot = { bytesReceived: 0, bytesSent: 0, timestamp: 0 }
    statsTimer = setInterval(() => {
      updateDebugStats().catch(() => {})
    }, 1000)
  }

  function createPeer() {
    peer?.close()
    channel = null
    channelState.value = 'closed'
    peer = new RTCPeerConnection(DROP_RTC_CONFIG)
    connectionState.value = peer.connectionState
    startDebugStats()
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
      if (!activeChannel) {
        resolve()
        return
      }

      let settled = false
      let pollTimer: ReturnType<typeof setInterval> | null = null

      const cleanup = () => {
        if (pollTimer)
          clearInterval(pollTimer)
        activeChannel.removeEventListener('bufferedamountlow', finish)
        activeChannel.removeEventListener('close', finish)
        activeChannel.removeEventListener('error', finish)
      }

      const hasRoomToSend = () =>
        activeChannel.readyState !== 'open'
        || activeChannel.bufferedAmount <= DROP_FILE_TRANSFER_CONFIG.bufferLowThreshold

      function finish() {
        if (settled)
          return
        settled = true
        cleanup()
        resolve()
      }

      pollTimer = setInterval(() => {
        if (hasRoomToSend())
          finish()
      }, DROP_FILE_TRANSFER_CONFIG.bufferPollIntervalMs)

      activeChannel.addEventListener('bufferedamountlow', finish)
      activeChannel.addEventListener('close', finish)
      activeChannel.addEventListener('error', finish)
    })
  }

  async function sendFile(file: File) {
    if (!channel || channel.readyState !== 'open' || file.size > DROP_FILE_TRANSFER_CONFIG.maxFileSize)
      return

    const id = crypto.randomUUID()
    addFile({
      id,
      name: file.name,
      progress: 0,
      receivedBytes: 0,
      size: file.size,
      speedBytesPerSecond: 0,
      status: DropFileTransferStatus.Sending,
    }, true)
    channel.send(JSON.stringify({ id, kind: DropMessageKind.FileStart, name: file.name, size: file.size, type: file.type }))
    const chunkSize = DROP_FILE_TRANSFER_CONFIG.chunkSize
    lastProgressAt = 0
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const nextOffset = Math.min(offset + chunkSize, file.size)
      channel.send(await file.slice(offset, nextOffset).arrayBuffer())
      await waitForBuffer()
    }
    channel.send(JSON.stringify({ kind: DropMessageKind.FileEnd }))
  }

  function cleanup() {
    if (statsTimer)
      clearInterval(statsTimer)
    outgoingProgressMap.clear()
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
    debugStats,
    messages,
    sendFile,
    sendText,
  }
}
