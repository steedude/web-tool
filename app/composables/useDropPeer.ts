import type { DropChatItem, DropDataMessage, DropStatsSnapshot, IncomingDropFile, OutgoingDropFileProgress } from '~/types/drop.type'
import type { RealtimeMessage } from '~/types/realtime.type'
import { DROP_CHANNEL_CONFIG, DROP_DEBUG_CONFIG, DROP_FILE_TRANSFER_CONFIG, DROP_RTC_CONFIG } from '~/configs/realtime.config'
import { DropFileTransferStatus, DropMessageKind } from '~/types/drop.type'
import { RealtimeMessageType, RealtimeRole } from '~/types/realtime.type'
import { createDropConnectionDebug, createDropStatsSnapshot, resetDropTransportDebug, trackDropCandidate, updateDropTransportDebug } from '~/utils/drop-debug.util'
import { createDropFileMessage, getDropFileProgress, getTransferSpeed } from '~/utils/drop.util'

export function useDropPeer(roomId: Ref<string>, role: Ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>) {
  const { t } = useI18n()
  const room = useRealtimeRoom(roomId, role)
  const messages = ref<DropChatItem[]>([])
  const connectionState = ref<RTCPeerConnectionState>('new')
  const channelState = ref<RTCDataChannelState>('closed')
  const debug = reactive(createDropConnectionDebug())

  let peer: RTCPeerConnection | null = null
  let controlChannel: RTCDataChannel | null = null
  let fileChannel: RTCDataChannel | null = null
  let incomingFile: IncomingDropFile | null = null
  let lastProgressAt = 0
  let statsTimer: ReturnType<typeof setInterval> | null = null
  let lastStatsSnapshot: DropStatsSnapshot = createDropStatsSnapshot()
  const localCandidateCounts = new Map<string, number>()
  const remoteCandidateCounts = new Map<string, number>()

  // 以檔案 id 記錄傳送端狀態。這裡保存接收端最新 ACK，
  // 避免傳送端跑得太快，超過接收端實際處理進度太多。
  const outgoingProgressMap = new Map<string, OutgoingDropFileProgress>()

  const isReady = computed(() => channelState.value === 'open' && connectionState.value === 'connected')

  function waitUntil(condition: () => boolean, intervalMs = DROP_FILE_TRANSFER_CONFIG.ackPollIntervalMs) {
    if (condition())
      return Promise.resolve()

    return new Promise<void>((resolve) => {
      let settled = false
      const pollTimer = setInterval(() => {
        if (condition())
          finish()
      }, intervalMs)

      function finish() {
        if (settled)
          return

        settled = true
        clearInterval(pollTimer)
        resolve()
      }
    })
  }

  function areTransferChannelsClosed() {
    return controlChannel?.readyState !== 'open' || fileChannel?.readyState !== 'open'
  }

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

  async function updateTransportStats() {
    if (!peer)
      return

    lastStatsSnapshot = await updateDropTransportDebug({
      controlChannel,
      debug,
      fileChannel,
      peer,
      snapshot: lastStatsSnapshot,
    })
  }

  function stopStatsPolling() {
    if (statsTimer)
      clearInterval(statsTimer)

    statsTimer = null
  }

  function startStatsPolling() {
    stopStatsPolling()
    lastStatsSnapshot = createDropStatsSnapshot()
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

    // 即使 FileEnd 被 binary chunks 擋在後面，也先送最後一次 ACK。
    // 傳送端會等完整 ACK 後，才把自己的檔案標成完成。
    sendFileProgressAck(incomingFile)
    incomingFile = null
  }

  function sendFileProgressAck(file: IncomingDropFile) {
    // 這是應用層的進度 ACK，不是 WebRTC 可靠傳輸本身。
    // DataChannel 已經會處理可靠送達；這個 ACK 是告訴 UI 和節流邏輯：
    // 接收端 JavaScript 實際上已經組好多少資料。
    sendControlMessage({ id: file.id, kind: DropMessageKind.FileProgress, received: file.received, size: file.size })
  }

  function updateIncomingFileProgress(file: IncomingDropFile, force = false) {
    const now = Date.now()

    // UI 更新可以節流，但 ACK 不節流。兩者分開可以避免傳送端
    // 因為等不到被 UI throttle 壓住的進度訊息而卡住。
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

    // FileStart 和檔案 chunks 走不同 DataChannel，跨 channel 沒有順序保證。
    // 因此傳送端要等 FileReady，確認接收端狀態建好後才開始送 binary。
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

      // 每個 chunk 都立刻 ACK。UI 可以每 100ms 才更新一次，
      // 但傳送節奏需要即時 ACK，接收端追上後傳送端才能繼續送。
      sendFileProgressAck(file)
      updateIncomingFileProgress(file, file.received >= file.size)

      if (file.received >= file.size)
        finishIncomingFile()
    })
  }

  function createPeer() {
    stopStatsPolling()
    resetDropTransportDebug(debug)
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
        debug.localCandidateSummary = trackDropCandidate(localCandidateCounts, event.candidate.candidate)
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
    debug.remoteCandidateSummary = trackDropCandidate(remoteCandidateCounts, candidate.candidate)

    if (!peer || !peer.remoteDescription)
      return

    await peer.addIceCandidate(candidate)
    updatePeerDebug()
  }

  async function createOffer() {
    const pc = createPeer()

    // offerer 負責建立兩條 DataChannel。
    // answerer 會透過 peer connection 的 `datachannel` 事件收到它們。
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

      // 有些手機瀏覽器不一定穩定觸發 `bufferedamountlow`，
      // 所以除了監聽事件，也用輪詢作為 fallback。
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

      // 由接收端進度控制傳送節奏：只允許少量尚未 ACK 的資料在路上。
      // 這可以避免 Safari/WebKit 的 DataChannel 佇列被塞爆。
      return sentBytes - acknowledgedBytes <= DROP_FILE_TRANSFER_CONFIG.maxUnackedBytes
    }

    return waitUntil(() => hasEnoughAcknowledgement() || areTransferChannelsClosed())
  }

  function waitForRemoteReady(fileId: string) {
    return waitUntil(() => isRemoteReadyForFile(fileId) || areTransferChannelsClosed())
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

    // 等接收端建立好 incoming-file 狀態後，
    // 才開始在 file channel 上傳送 binary chunks。
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
    debug.remoteCandidateSummary = '0'
    resetDropTransportDebug(debug)
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
