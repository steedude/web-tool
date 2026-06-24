import type { DropChatItem, DropConnectionDebug, DropDataMessage, IncomingDropFile, OutgoingDropFileProgress } from '~/types/drop.type'
import type { RealtimeMessage } from '~/types/realtime.type'
import { DROP_CHANNEL_CONFIG, DROP_DEBUG_CONFIG, DROP_FILE_TRANSFER_CONFIG, DROP_RTC_CONFIG } from '~/configs/realtime.config'
import { DropFileTransferStatus, DropMessageKind } from '~/types/drop.type'
import { RealtimeMessageType, RealtimeRole } from '~/types/realtime.type'
import { createDropFileMessage, getDropFileProgress, getTransferSpeed } from '~/utils/drop.util'
import { formatBytes } from '~/utils/file.util'

export function useDropPeer(roomId: Ref<string>, role: Ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>) {
  const { t } = useI18n()
  const room = useRealtimeRoom(roomId, role)
  const messages = ref<DropChatItem[]>([])
  const connectionState = ref<RTCPeerConnectionState>('new')
  const channelState = ref<RTCDataChannelState>('closed')
  const debug = reactive<DropConnectionDebug>({
    availableOutgoingBitrate: '—',
    bufferedAmount: '0 B',
    bytesSummary: '0 B / 0 B',
    candidatePath: '—',
    connectionState: 'new',
    controlChannelState: 'closed',
    fileChannelState: 'closed',
    iceConnectionState: 'new',
    iceGatheringState: 'new',
    lastError: '',
    lastSignal: '',
    localCandidateSummary: '0',
    localDescriptionSet: false,
    pendingIceCount: 0,
    packetsSummary: '0 / 0',
    remoteCandidateSummary: '0',
    remoteDescriptionSet: false,
    receiveRate: '0 B/s',
    roundTripTime: '—',
    sendRate: '0 B/s',
    signalingState: 'stable',
  })

  let peer: RTCPeerConnection | null = null
  let controlChannel: RTCDataChannel | null = null
  let fileChannel: RTCDataChannel | null = null
  let incomingFile: IncomingDropFile | null = null
  let lastProgressAt = 0
  let statsTimer: ReturnType<typeof setInterval> | null = null
  let lastStatsSnapshot = {
    bytesReceived: 0,
    bytesSent: 0,
    timestamp: 0,
  }
  const localCandidateCounts = new Map<string, number>()
  const remoteCandidateCounts = new Map<string, number>()

  // Sender-side state keyed by file id. We keep the latest receiver ACK here so the
  // sender can avoid getting too far ahead of the device that is actually receiving.
  const outgoingProgressMap = new Map<string, OutgoingDropFileProgress>()

  const isReady = computed(() => channelState.value === 'open' && connectionState.value === 'connected')

  function addSystem(text: string) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.System, mine: false, text })
  }

  function addText(text: string, mine: boolean) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.Text, mine, text })
  }

  function addFile(file: DropChatItem) {
    messages.value.push(file)
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

  function getCandidateType(candidate?: string) {
    return candidate?.match(/ typ ([a-z0-9]+)/i)?.[1] ?? 'unknown'
  }

  function formatCandidateSummary(counts: Map<string, number>) {
    if (!counts.size)
      return '0'

    return Array.from(counts.entries())
      .map(([type, count]) => `${type}:${count}`)
      .join(' ')
  }

  function trackCandidate(counts: Map<string, number>, candidate?: string) {
    const type = getCandidateType(candidate)
    counts.set(type, (counts.get(type) ?? 0) + 1)
    return formatCandidateSummary(counts)
  }

  function resetTransportDebug() {
    debug.availableOutgoingBitrate = '—'
    debug.bufferedAmount = '0 B'
    debug.bytesSummary = '0 B / 0 B'
    debug.candidatePath = '—'
    debug.packetsSummary = '0 / 0'
    debug.receiveRate = '0 B/s'
    debug.roundTripTime = '—'
    debug.sendRate = '0 B/s'
  }

  function formatRate(bytesPerSecond: number) {
    return `${formatBytes(Math.max(0, bytesPerSecond))}/s`
  }

  function formatBitrate(bitsPerSecond?: number) {
    if (!bitsPerSecond)
      return '—'

    return formatRate(bitsPerSecond / 8)
  }

  function getStatsNumber(report: RTCStats, key: string) {
    const value = (report as unknown as Record<string, unknown>)[key]
    return typeof value === 'number' ? value : 0
  }

  function getStatsString(report: RTCStats, key: string) {
    const value = (report as unknown as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : ''
  }

  function getSelectedCandidatePair(stats: RTCStatsReport) {
    for (const report of stats.values()) {
      if (report.type !== 'candidate-pair')
        continue

      const record = report as unknown as Record<string, unknown>
      const selected = record.selected === true
      const nominated = record.nominated === true && record.state === 'succeeded'
      if (selected || nominated)
        return report
    }
  }

  function getCandidatePath(stats: RTCStatsReport, pair: RTCStats) {
    const localCandidate = stats.get(getStatsString(pair, 'localCandidateId'))
    const remoteCandidate = stats.get(getStatsString(pair, 'remoteCandidateId'))
    const localType = localCandidate ? getStatsString(localCandidate, 'candidateType') : ''
    const remoteType = remoteCandidate ? getStatsString(remoteCandidate, 'candidateType') : ''

    if (!localType && !remoteType)
      return '—'

    return `${localType || '?'} → ${remoteType || '?'}`
  }

  async function updateTransportStats() {
    if (!peer)
      return

    const stats = await peer.getStats()
    const selectedPair = getSelectedCandidatePair(stats)
    const now = Date.now()
    const bufferedAmount = (controlChannel?.bufferedAmount ?? 0) + (fileChannel?.bufferedAmount ?? 0)

    debug.bufferedAmount = formatBytes(bufferedAmount)

    if (!selectedPair)
      return

    const bytesSent = getStatsNumber(selectedPair, 'bytesSent')
    const bytesReceived = getStatsNumber(selectedPair, 'bytesReceived')
    const packetsSent = getStatsNumber(selectedPair, 'packetsSent')
    const packetsReceived = getStatsNumber(selectedPair, 'packetsReceived')
    const rttSeconds = getStatsNumber(selectedPair, 'currentRoundTripTime')
    const elapsedSeconds = Math.max((now - lastStatsSnapshot.timestamp) / 1000, 0.001)

    debug.availableOutgoingBitrate = formatBitrate(getStatsNumber(selectedPair, 'availableOutgoingBitrate'))
    debug.bytesSummary = `${formatBytes(bytesSent)} / ${formatBytes(bytesReceived)}`
    debug.candidatePath = getCandidatePath(stats, selectedPair)
    debug.packetsSummary = `${packetsSent} / ${packetsReceived}`
    debug.roundTripTime = rttSeconds ? `${Math.round(rttSeconds * 1000)} ms` : '—'

    if (lastStatsSnapshot.timestamp) {
      debug.sendRate = formatRate((bytesSent - lastStatsSnapshot.bytesSent) / elapsedSeconds)
      debug.receiveRate = formatRate((bytesReceived - lastStatsSnapshot.bytesReceived) / elapsedSeconds)
    }

    lastStatsSnapshot = { bytesReceived, bytesSent, timestamp: now }
  }

  function stopStatsPolling() {
    if (statsTimer)
      clearInterval(statsTimer)

    statsTimer = null
  }

  function startStatsPolling() {
    stopStatsPolling()
    lastStatsSnapshot = { bytesReceived: 0, bytesSent: 0, timestamp: 0 }
    statsTimer = setInterval(() => {
      updateTransportStats().catch((error) => {
        debug.lastError = error instanceof Error ? error.message : String(error)
      })
    }, DROP_DEBUG_CONFIG.statsIntervalMs)
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

    const blob = new Blob(incomingFile.chunks, { type: incomingFile.type })
    updateFileMessage(incomingFile.id, {
      progress: 100,
      receivedBytes: incomingFile.size,
      speedBytesPerSecond: 0,
      status: DropFileTransferStatus.Complete,
      url: URL.createObjectURL(blob),
    })

    // Send one final ACK even if FileEnd is delayed or dropped behind binary chunks.
    // The sender waits for a full ACK before marking its own file as completed.
    sendFileProgressAck(incomingFile)
    incomingFile = null
  }

  function sendFileProgressAck(file: IncomingDropFile) {
    // This is application-level progress, not WebRTC reliability. DataChannel already
    // handles reliable delivery; this ACK tells our UI and pacing logic how much the
    // receiver's JavaScript has actually assembled.
    sendControlMessage({ id: file.id, kind: DropMessageKind.FileProgress, received: file.received, size: file.size })
  }

  function updateIncomingFileProgress(file: IncomingDropFile, force = false) {
    const now = Date.now()

    // UI rendering is throttled, but ACKs are not. Keeping these separate prevents the
    // sender from stalling while waiting for a progress message that the UI throttle held back.
    if (!force && now - lastProgressAt < DROP_FILE_TRANSFER_CONFIG.progressIntervalMs)
      return

    const speedBytesPerSecond = getTransferSpeed({
      currentBytes: file.received,
      currentTime: now,
      previousBytes: file.lastReceived,
      previousTime: file.lastProgressAt,
    })

    file.speedBytesPerSecond = speedBytesPerSecond
    file.lastProgressAt = now
    file.lastReceived = file.received
    lastProgressAt = now

    updateFileMessage(file.id, {
      progress: getDropFileProgress(file.received, file.size),
      receivedBytes: file.received,
      speedBytesPerSecond,
    })
  }

  function createIncomingFile(data: DropDataMessage) {
    const now = Date.now()
    const file: IncomingDropFile = {
      chunks: [],
      id: data.id!,
      lastProgressAt: now,
      lastReceived: 0,
      name: data.name!,
      received: 0,
      size: data.size!,
      speedBytesPerSecond: 0,
      type: data.type || 'application/octet-stream',
    }

    incomingFile = file
    lastProgressAt = 0
    addFile(createDropFileMessage({
      id: file.id,
      mine: false,
      name: file.name,
      size: file.size,
      status: DropFileTransferStatus.Receiving,
    }))

    // File chunks travel on a different DataChannel from FileStart. There is no ordering
    // guarantee between channels, so the sender waits for FileReady before sending binary data.
    sendControlMessage({ id: file.id, kind: DropMessageKind.FileReady })
  }

  function updateOutgoingFileProgress(data: DropDataMessage) {
    if (!data.id || data.received === undefined || !data.size)
      return

    const now = Date.now()
    const snapshot = outgoingProgressMap.get(data.id)
    const speedBytesPerSecond = snapshot
      ? getTransferSpeed({
          currentBytes: data.received,
          currentTime: now,
          previousBytes: snapshot.lastReceived,
          previousTime: snapshot.lastProgressAt,
        })
      : 0

    outgoingProgressMap.set(data.id, {
      lastProgressAt: now,
      lastReceived: data.received,
      ready: snapshot?.ready ?? false,
    })

    updateFileMessage(data.id, {
      progress: getDropFileProgress(data.received, data.size),
      receivedBytes: data.received,
      speedBytesPerSecond: data.received >= data.size ? 0 : speedBytesPerSecond,
      status: data.received >= data.size ? DropFileTransferStatus.Complete : DropFileTransferStatus.Sending,
    })
  }

  function handleDataMessage(data: DropDataMessage) {
    if (data.kind === DropMessageKind.Text && data.text) {
      addText(data.text, false)
      return
    }

    if (data.kind === DropMessageKind.FileStart && data.id && data.name && data.size !== undefined) {
      createIncomingFile(data)
      return
    }

    if (data.kind === DropMessageKind.FileReady && data.id) {
      const snapshot = outgoingProgressMap.get(data.id)
      if (snapshot)
        outgoingProgressMap.set(data.id, { ...snapshot, ready: true })
      return
    }

    if (data.kind === DropMessageKind.FileProgress) {
      updateOutgoingFileProgress(data)
      return
    }

    if (data.kind === DropMessageKind.FileEnd && (!data.id || incomingFile?.id === data.id))
      finishIncomingFile()
  }

  function updateChannelState() {
    const controlState = controlChannel?.readyState ?? 'closed'
    const fileState = fileChannel?.readyState ?? 'closed'
    debug.controlChannelState = controlState
    debug.fileChannelState = fileState

    if (controlState === 'open' && fileState === 'open') {
      channelState.value = 'open'
      debug.lastError = ''
      return
    }

    if (controlState === 'connecting' || fileState === 'connecting') {
      channelState.value = 'connecting'
      return
    }

    channelState.value = controlState === 'closing' || fileState === 'closing' ? 'closing' : 'closed'
  }

  function updatePeerDebug() {
    const nextConnectionState = peer?.connectionState ?? 'closed'
    const nextIceConnectionState = peer?.iceConnectionState ?? 'closed'

    debug.connectionState = nextConnectionState
    debug.iceConnectionState = nextIceConnectionState
    debug.iceGatheringState = peer?.iceGatheringState ?? 'complete'
    debug.localDescriptionSet = !!peer?.localDescription
    debug.remoteDescriptionSet = !!peer?.remoteDescription
    debug.pendingIceCount = 0
    debug.signalingState = peer?.signalingState ?? 'closed'

    if (nextConnectionState === 'connected' && ['connected', 'completed'].includes(nextIceConnectionState))
      debug.lastError = ''
  }

  function setupControlChannel(nextChannel: RTCDataChannel) {
    controlChannel = nextChannel
    updateChannelState()

    controlChannel.addEventListener('open', updateChannelState)
    controlChannel.addEventListener('close', updateChannelState)
    controlChannel.addEventListener('error', (event) => {
      debug.lastError = `control channel error: ${event.type}`
      updateChannelState()
    })

    controlChannel.addEventListener('open', () => addSystem(t('drop.system.connected')))
    controlChannel.addEventListener('close', () => addSystem(t('drop.system.offline')))
    controlChannel.addEventListener('message', (event) => {
      if (typeof event.data === 'string')
        handleDataMessage(JSON.parse(event.data) as DropDataMessage)
    })
  }

  function setupFileChannel(nextChannel: RTCDataChannel) {
    fileChannel = nextChannel
    fileChannel.binaryType = 'arraybuffer'
    fileChannel.bufferedAmountLowThreshold = DROP_FILE_TRANSFER_CONFIG.bufferLowThreshold
    updateChannelState()

    fileChannel.addEventListener('open', updateChannelState)
    fileChannel.addEventListener('close', updateChannelState)
    fileChannel.addEventListener('error', (event) => {
      debug.lastError = `file channel error: ${event.type}`
      updateChannelState()
    })
    fileChannel.addEventListener('message', (event) => {
      if (!incomingFile || typeof event.data === 'string')
        return

      const chunk = event.data as ArrayBuffer
      incomingFile.chunks.push(chunk)
      incomingFile.received += chunk.byteLength

      const file = incomingFile

      // ACK every chunk immediately. The UI may update only every 100ms, but pacing depends
      // on timely ACKs so the sender can continue as soon as the receiver has caught up.
      sendFileProgressAck(file)
      updateIncomingFileProgress(file, file.received >= file.size)

      if (file.received >= file.size)
        finishIncomingFile()
    })
  }

  function createPeer() {
    stopStatsPolling()
    resetTransportDebug()
    peer?.close()
    controlChannel = null
    fileChannel = null
    channelState.value = 'closed'
    peer = new RTCPeerConnection(DROP_RTC_CONFIG)
    startStatsPolling()
    connectionState.value = peer.connectionState
    updatePeerDebug()
    peer.addEventListener('connectionstatechange', () => {
      connectionState.value = peer?.connectionState ?? 'closed'
      updatePeerDebug()
    })
    peer.addEventListener('iceconnectionstatechange', updatePeerDebug)
    peer.addEventListener('icegatheringstatechange', updatePeerDebug)
    peer.addEventListener('signalingstatechange', updatePeerDebug)
    peer.addEventListener('icecandidateerror', (event) => {
      if (peer?.connectionState !== 'connected')
        debug.lastError = `ice candidate error: ${event.errorCode} ${event.errorText}`
      updatePeerDebug()
    })
    peer.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        debug.localCandidateSummary = trackCandidate(localCandidateCounts, event.candidate.candidate)
        room.send(RealtimeMessageType.SignalIce, { candidate: event.candidate.toJSON() })
      }
    })
    peer.addEventListener('datachannel', (event) => {
      if (event.channel.label === DROP_CHANNEL_CONFIG.fileLabel)
        setupFileChannel(event.channel)
      else
        setupControlChannel(event.channel)
    })
    return peer
  }

  async function addIceCandidate(candidate: RTCIceCandidateInit) {
    debug.remoteCandidateSummary = trackCandidate(remoteCandidateCounts, candidate.candidate)

    if (!peer || !peer.remoteDescription)
      return

    await peer.addIceCandidate(candidate)
    updatePeerDebug()
  }

  async function createOffer() {
    const pc = createPeer()

    // The offerer creates both negotiated channels. The answerer receives them through
    // the peer connection's `datachannel` event.
    setupControlChannel(pc.createDataChannel(DROP_CHANNEL_CONFIG.controlLabel, { ordered: true }))
    setupFileChannel(pc.createDataChannel(DROP_CHANNEL_CONFIG.fileLabel, { ordered: true }))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    updatePeerDebug()
    room.send(RealtimeMessageType.SignalOffer, { sdp: offer })
  }

  async function handleSignal(message: RealtimeMessage) {
    debug.lastSignal = message.type

    if (message.type === RealtimeMessageType.PeerJoined && role.value === RealtimeRole.DropHost) {
      await createOffer()
      return
    }

    if (message.type === RealtimeMessageType.SignalOffer) {
      const pc = createPeer()
      await pc.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
      updatePeerDebug()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      updatePeerDebug()
      room.send(RealtimeMessageType.SignalAnswer, { sdp: answer })
      return
    }

    if (message.type === RealtimeMessageType.SignalAnswer && peer) {
      await peer.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
      updatePeerDebug()
      return
    }

    if (message.type === RealtimeMessageType.SignalIce && message.payload?.candidate)
      await addIceCandidate(message.payload.candidate as RTCIceCandidateInit)
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
      let settled = false
      let pollTimer: ReturnType<typeof setInterval> | null = null

      const cleanup = () => {
        if (pollTimer)
          clearInterval(pollTimer)
        targetChannel.removeEventListener('bufferedamountlow', finish)
        targetChannel.removeEventListener('close', finish)
        targetChannel.removeEventListener('error', finish)
      }

      const hasRoomToSend = () =>
        targetChannel.readyState !== 'open'
        || targetChannel.bufferedAmount <= DROP_FILE_TRANSFER_CONFIG.bufferLowThreshold

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

      // Some mobile browsers do not fire `bufferedamountlow` consistently, so we listen
      // for the event and also poll as a fallback.
      targetChannel.addEventListener('bufferedamountlow', finish)
      targetChannel.addEventListener('close', finish)
      targetChannel.addEventListener('error', finish)
    })
  }

  function waitForRemoteWindow(fileId: string, sentBytes: number, waitForFullAck = false) {
    const hasEnoughAcknowledgement = () => {
      const acknowledgedBytes = getAcknowledgedBytes(fileId)
      if (waitForFullAck)
        return acknowledgedBytes >= sentBytes

      // Receiver-driven pacing: keep only a small amount of unacknowledged data in flight.
      // This avoids flooding Safari/WebKit with a large DataChannel queue.
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
    const now = Date.now()
    outgoingProgressMap.set(id, {
      lastProgressAt: now,
      lastReceived: 0,
      ready: false,
    })
    addFile(createDropFileMessage({
      id,
      mine: true,
      name: file.name,
      size: file.size,
      status: DropFileTransferStatus.Sending,
    }))
    controlChannel.send(JSON.stringify({ id, kind: DropMessageKind.FileStart, name: file.name, size: file.size, type: file.type }))

    // Wait until the receiver has created its incoming-file state before binary chunks
    // start moving on the file channel.
    await waitForRemoteReady(id)

    const chunkSize = DROP_FILE_TRANSFER_CONFIG.chunkSize
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
    stopStatsPolling()
    localCandidateCounts.clear()
    remoteCandidateCounts.clear()
    outgoingProgressMap.clear()
    debug.localCandidateSummary = '0'
    debug.pendingIceCount = 0
    debug.remoteCandidateSummary = '0'
    resetTransportDebug()
    peer?.close()
    messages.value.forEach((message) => {
      if (message.url) {
        URL.revokeObjectURL(message.url)
      }
    })
  }

  watch(room.latestMessage, (message) => {
    if (message) {
      handleSignal(message).catch((error) => {
        debug.lastError = error instanceof Error ? error.message : String(error)
        addSystem(t('drop.system.signalFailed'))
      })
    }
  })

  onBeforeUnmount(cleanup)

  return {
    isReady,
    debug: readonly(debug),
    messages,
    peerConnected: room.peerConnected,
    roomFull: room.roomFull,
    sendFile,
    sendText,
  }
}
