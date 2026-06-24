import type { DropChatItem, DropDataMessage, DropDebugStats, IncomingDropFile, OutgoingDropFileProgress } from '~/types/drop.type'
import type { RealtimeMessage } from '~/types/realtime.type'
import { DROP_CHANNEL_CONFIG, DROP_FILE_TRANSFER_CONFIG, DROP_RTC_CONFIG } from '~/configs/realtime.config'
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
    controlBufferedAmount: 0,
    controlChannelState: 'missing',
    currentRoundTripTime: null,
    fileBufferedAmount: 0,
    fileChannelState: 'missing',
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
  let controlChannel: RTCDataChannel | null = null
  let fileChannel: RTCDataChannel | null = null
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

  function addFile(file: Pick<DropChatItem, 'averageBytesPerSecond' | 'elapsedMs' | 'id' | 'lastProgressGapMs' | 'name' | 'peakBytesPerSecond' | 'progress' | 'receivedBytes' | 'size' | 'speedBytesPerSecond' | 'stalledCount' | 'startedAt' | 'status' | 'url'>, mine: boolean) {
    messages.value.push({ kind: DropMessageKind.File, mine, ...file })
  }

  function updateFileMessage(id: string, patch: Partial<DropChatItem>) {
    const message = messages.value.find(item => item.id === id)
    if (message)
      Object.assign(message, patch)
  }

  function sendControlMessage(data: DropDataMessage) {
    if (controlChannel?.readyState === 'open')
      controlChannel.send(JSON.stringify(data))
  }

  function getAcknowledgedBytes(fileId: string) {
    return outgoingProgressMap.get(fileId)?.lastReceived ?? 0
  }

  function isRemoteReadyForFile(fileId: string) {
    return outgoingProgressMap.get(fileId)?.ready ?? false
  }

  function finishIncomingFile() {
    if (!incomingFile)
      return

    const completedAt = Date.now()
    const elapsedMs = completedAt - incomingFile.startedAt
    const blob = new Blob(incomingFile.chunks, { type: incomingFile.type })
    updateFileMessage(incomingFile.id, {
      averageBytesPerSecond: incomingFile.size / Math.max(elapsedMs / 1000, 0.001),
      completedAt,
      elapsedMs,
      progress: 100,
      receivedBytes: incomingFile.size,
      speedBytesPerSecond: 0,
      status: DropFileTransferStatus.Complete,
      url: URL.createObjectURL(blob),
    })
    sendControlMessage({ id: incomingFile.id, kind: DropMessageKind.FileProgress, received: incomingFile.size, size: incomingFile.size })
    incomingFile = null
  }

  function sendFileProgressAck(file: IncomingDropFile) {
    sendControlMessage({ id: file.id, kind: DropMessageKind.FileProgress, received: file.received, size: file.size })
  }

  function updateTransferProgress(file: IncomingDropFile, force = false) {
    const now = Date.now()
    if (!force && now - lastProgressAt < DROP_FILE_TRANSFER_CONFIG.progressIntervalMs)
      return

    const progressGapMs = now - file.lastProgressAt
    const elapsedSeconds = Math.max(progressGapMs / 1000, 0.001)
    const bytesDelta = file.received - file.lastReceived
    file.speedBytesPerSecond = bytesDelta / elapsedSeconds
    file.peakBytesPerSecond = Math.max(file.peakBytesPerSecond, file.speedBytesPerSecond)
    file.averageBytesPerSecond = file.received / Math.max((now - file.startedAt) / 1000, 0.001)
    file.lastProgressGapMs = progressGapMs
    if (progressGapMs >= DROP_FILE_TRANSFER_CONFIG.stallThresholdMs && bytesDelta > 0)
      file.stalledCount += 1
    file.lastProgressAt = now
    file.lastReceived = file.received
    lastProgressAt = now
    updateFileMessage(file.id, {
      averageBytesPerSecond: file.averageBytesPerSecond,
      elapsedMs: now - file.startedAt,
      lastProgressGapMs: file.lastProgressGapMs,
      peakBytesPerSecond: file.peakBytesPerSecond,
      progress: Math.min(100, Math.round((file.received / file.size) * 100)),
      receivedBytes: file.received,
      speedBytesPerSecond: file.speedBytesPerSecond,
      stalledCount: file.stalledCount,
    })
  }

  function handleDataMessage(data: DropDataMessage) {
    if (data.kind === DropMessageKind.Text && data.text) {
      addText(data.text, false)
    }
    else if (data.kind === DropMessageKind.FileStart && data.id && data.name && data.size !== undefined) {
      const now = Date.now()
      incomingFile = { averageBytesPerSecond: 0, chunks: [], id: data.id, lastProgressAt: now, lastProgressGapMs: 0, lastReceived: 0, name: data.name, peakBytesPerSecond: 0, received: 0, size: data.size, speedBytesPerSecond: 0, stalledCount: 0, startedAt: now, type: data.type || 'application/octet-stream' }
      lastProgressAt = 0
      addFile({
        averageBytesPerSecond: 0,
        id: data.id,
        lastProgressGapMs: 0,
        name: data.name,
        peakBytesPerSecond: 0,
        progress: 0,
        receivedBytes: 0,
        size: data.size,
        speedBytesPerSecond: 0,
        stalledCount: 0,
        startedAt: now,
        status: DropFileTransferStatus.Receiving,
      }, false)
      sendControlMessage({ id: data.id, kind: DropMessageKind.FileReady })
    }
    else if (data.kind === DropMessageKind.FileReady && data.id) {
      const snapshot = outgoingProgressMap.get(data.id)
      if (snapshot)
        outgoingProgressMap.set(data.id, { ...snapshot, ready: true })
    }
    else if (data.kind === DropMessageKind.FileProgress && data.id && data.received !== undefined && data.size) {
      const now = Date.now()
      const progressSnapshot = outgoingProgressMap.get(data.id)
      const elapsedSeconds = progressSnapshot ? Math.max((now - progressSnapshot.lastProgressAt) / 1000, 0.001) : 0
      const speedBytesPerSecond = progressSnapshot ? Math.max(0, (data.received - progressSnapshot.lastReceived) / elapsedSeconds) : 0
      const startedAt = progressSnapshot?.startedAt ?? now
      const lastProgressGapMs = progressSnapshot ? now - progressSnapshot.lastProgressAt : 0
      const stalledCount = progressSnapshot
        ? progressSnapshot.stalledCount + (lastProgressGapMs >= DROP_FILE_TRANSFER_CONFIG.stallThresholdMs && data.received > progressSnapshot.lastReceived ? 1 : 0)
        : 0
      const averageBytesPerSecond = data.received / Math.max((now - startedAt) / 1000, 0.001)
      const peakBytesPerSecond = Math.max(progressSnapshot?.peakBytesPerSecond ?? 0, speedBytesPerSecond)

      outgoingProgressMap.set(data.id, { averageBytesPerSecond, lastProgressAt: now, lastProgressGapMs, lastReceived: data.received, peakBytesPerSecond, ready: progressSnapshot?.ready ?? false, stalledCount, startedAt })

      updateFileMessage(data.id, {
        averageBytesPerSecond,
        completedAt: data.received >= data.size ? now : undefined,
        elapsedMs: now - startedAt,
        lastProgressGapMs,
        peakBytesPerSecond,
        progress: Math.min(100, Math.round((data.received / data.size) * 100)),
        receivedBytes: data.received,
        speedBytesPerSecond: data.received >= data.size ? 0 : speedBytesPerSecond,
        stalledCount,
        status: data.received >= data.size ? DropFileTransferStatus.Complete : DropFileTransferStatus.Sending,
      })
    }
    else if (data.kind === DropMessageKind.FileEnd) {
      if (!data.id || incomingFile?.id === data.id)
        finishIncomingFile()
    }
  }

  function updateChannelState() {
    const controlState = controlChannel?.readyState ?? 'closed'
    const fileState = fileChannel?.readyState ?? 'closed'

    if (controlState === 'open' && fileState === 'open') {
      channelState.value = 'open'
      return
    }

    if (controlState === 'connecting' || fileState === 'connecting') {
      channelState.value = 'connecting'
      return
    }

    channelState.value = controlState === 'closing' || fileState === 'closing' ? 'closing' : 'closed'
  }

  function setupControlChannel(nextChannel: RTCDataChannel) {
    controlChannel = nextChannel
    updateChannelState()

    controlChannel.addEventListener('open', updateChannelState)
    controlChannel.addEventListener('close', updateChannelState)
    controlChannel.addEventListener('error', updateChannelState)

    controlChannel.addEventListener('open', () => addSystem(t('drop.system.connected')))
    controlChannel.addEventListener('close', () => addSystem(t('drop.system.offline')))
    controlChannel.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        handleDataMessage(JSON.parse(event.data) as DropDataMessage)
      }
    })
  }

  function setupFileChannel(nextChannel: RTCDataChannel) {
    fileChannel = nextChannel
    fileChannel.binaryType = 'arraybuffer'
    fileChannel.bufferedAmountLowThreshold = DROP_FILE_TRANSFER_CONFIG.bufferLowThreshold
    updateChannelState()

    fileChannel.addEventListener('open', updateChannelState)
    fileChannel.addEventListener('close', updateChannelState)
    fileChannel.addEventListener('error', updateChannelState)
    fileChannel.addEventListener('message', (event) => {
      if (!incomingFile || typeof event.data === 'string')
        return
      const chunk = event.data as ArrayBuffer
      incomingFile.chunks.push(chunk)
      incomingFile.received += chunk.byteLength
      const file = incomingFile
      sendFileProgressAck(file)
      updateTransferProgress(file, file.received >= file.size)
      if (file.received >= file.size)
        finishIncomingFile()
    })
  }

  async function updateDebugStats() {
    if (!peer)
      return

    const report = await peer.getStats()
    const stats = [...report.values()] as Array<Record<string, any>>
    const selectedPair = stats.find(item => item.type === 'candidate-pair' && (item.selected || item.nominated || item.state === 'succeeded'))
    const dataChannelStats = stats.filter(item => item.type === 'data-channel')
    const localCandidate = selectedPair?.localCandidateId ? report.get(selectedPair.localCandidateId) as Record<string, any> | undefined : undefined
    const remoteCandidate = selectedPair?.remoteCandidateId ? report.get(selectedPair.remoteCandidateId) as Record<string, any> | undefined : undefined
    const dataChannelBytesSent = dataChannelStats.reduce((sum, item) => sum + Number(item.bytesSent ?? 0), 0)
    const dataChannelBytesReceived = dataChannelStats.reduce((sum, item) => sum + Number(item.bytesReceived ?? 0), 0)
    const dataChannelTimestamp = dataChannelStats.reduce((latest, item) => Math.max(latest, Number(item.timestamp ?? 0)), 0)
    const bytesSent = Number(dataChannelStats.length ? dataChannelBytesSent : (selectedPair?.bytesSent ?? debugStats.value.bytesSent))
    const bytesReceived = Number(dataChannelStats.length ? dataChannelBytesReceived : (selectedPair?.bytesReceived ?? debugStats.value.bytesReceived))
    const timestamp = Number(dataChannelTimestamp || selectedPair?.timestamp || Date.now())
    const elapsedSeconds = Math.max((timestamp - lastStatsSnapshot.timestamp) / 1000, 0.001)
    const sendBytesPerSecond = lastStatsSnapshot.timestamp ? Math.max(0, (bytesSent - lastStatsSnapshot.bytesSent) / elapsedSeconds) : 0
    const receiveBytesPerSecond = lastStatsSnapshot.timestamp ? Math.max(0, (bytesReceived - lastStatsSnapshot.bytesReceived) / elapsedSeconds) : 0

    lastStatsSnapshot = { bytesReceived, bytesSent, timestamp }
    debugStats.value = {
      availableOutgoingBitrate: selectedPair?.availableOutgoingBitrate ?? null,
      bufferedAmount: (controlChannel?.bufferedAmount ?? 0) + (fileChannel?.bufferedAmount ?? 0),
      bytesReceived,
      bytesSent,
      channelState: channelState.value,
      connectionState: connectionState.value,
      controlBufferedAmount: controlChannel?.bufferedAmount ?? 0,
      controlChannelState: controlChannel?.readyState ?? 'missing',
      currentRoundTripTime: selectedPair?.currentRoundTripTime ?? null,
      fileBufferedAmount: fileChannel?.bufferedAmount ?? 0,
      fileChannelState: fileChannel?.readyState ?? 'missing',
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
    controlChannel = null
    fileChannel = null
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
    peer.addEventListener('datachannel', (event) => {
      if (event.channel.label === DROP_CHANNEL_CONFIG.fileLabel)
        setupFileChannel(event.channel)
      else
        setupControlChannel(event.channel)
    })
    return peer
  }

  async function createOffer() {
    const pc = createPeer()
    setupControlChannel(pc.createDataChannel(DROP_CHANNEL_CONFIG.controlLabel, { ordered: true }))
    setupFileChannel(pc.createDataChannel(DROP_CHANNEL_CONFIG.fileLabel, { ordered: true }))
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
    if (!trimmed || controlChannel?.readyState !== 'open')
      return false

    controlChannel.send(JSON.stringify({ kind: DropMessageKind.Text, text: trimmed }))
    addText(trimmed, true)
    return true
  }

  function waitForBuffer(targetChannel: RTCDataChannel | null) {
    if (!targetChannel || targetChannel.bufferedAmount < DROP_FILE_TRANSFER_CONFIG.maxBufferedAmount)
      return Promise.resolve()

    return new Promise<void>((resolve) => {
      const activeChannel = targetChannel

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

  function waitForRemoteWindow(fileId: string, sentBytes: number, waitForFullAck = false) {
    const hasEnoughAcknowledgement = () => {
      const acknowledgedBytes = getAcknowledgedBytes(fileId)
      if (waitForFullAck)
        return acknowledgedBytes >= sentBytes
      return sentBytes - acknowledgedBytes <= DROP_FILE_TRANSFER_CONFIG.maxUnackedBytes
    }

    if (hasEnoughAcknowledgement())
      return Promise.resolve()

    return new Promise<void>((resolve) => {
      let settled = false
      const pollTimer = setInterval(() => {
        if (hasEnoughAcknowledgement() || controlChannel?.readyState !== 'open' || fileChannel?.readyState !== 'open')
          finish()
      }, DROP_FILE_TRANSFER_CONFIG.ackPollIntervalMs)

      function finish() {
        if (settled)
          return
        settled = true
        clearInterval(pollTimer)
        resolve()
      }
    })
  }

  function waitForRemoteReady(fileId: string) {
    if (isRemoteReadyForFile(fileId))
      return Promise.resolve()

    return new Promise<void>((resolve) => {
      let settled = false
      const pollTimer = setInterval(() => {
        if (isRemoteReadyForFile(fileId) || controlChannel?.readyState !== 'open' || fileChannel?.readyState !== 'open')
          finish()
      }, DROP_FILE_TRANSFER_CONFIG.ackPollIntervalMs)

      function finish() {
        if (settled)
          return
        settled = true
        clearInterval(pollTimer)
        resolve()
      }
    })
  }

  async function sendFile(file: File) {
    if (!controlChannel || !fileChannel || controlChannel.readyState !== 'open' || fileChannel.readyState !== 'open' || file.size > DROP_FILE_TRANSFER_CONFIG.maxFileSize)
      return

    const id = crypto.randomUUID()
    const startedAt = Date.now()
    outgoingProgressMap.set(id, {
      averageBytesPerSecond: 0,
      lastProgressAt: startedAt,
      lastProgressGapMs: 0,
      lastReceived: 0,
      peakBytesPerSecond: 0,
      ready: false,
      stalledCount: 0,
      startedAt,
    })
    addFile({
      averageBytesPerSecond: 0,
      id,
      lastProgressGapMs: 0,
      name: file.name,
      peakBytesPerSecond: 0,
      progress: 0,
      receivedBytes: 0,
      size: file.size,
      speedBytesPerSecond: 0,
      stalledCount: 0,
      startedAt,
      status: DropFileTransferStatus.Sending,
    }, true)
    controlChannel.send(JSON.stringify({ id, kind: DropMessageKind.FileStart, name: file.name, size: file.size, type: file.type }))
    await waitForRemoteReady(id)
    const chunkSize = DROP_FILE_TRANSFER_CONFIG.chunkSize
    lastProgressAt = 0
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const nextOffset = Math.min(offset + chunkSize, file.size)
      fileChannel.send(await file.slice(offset, nextOffset).arrayBuffer())
      await waitForBuffer(fileChannel)
      await waitForRemoteWindow(id, nextOffset)
    }
    await waitForRemoteWindow(id, file.size, true)
    controlChannel.send(JSON.stringify({ id, kind: DropMessageKind.FileEnd }))
    outgoingProgressMap.delete(id)
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
