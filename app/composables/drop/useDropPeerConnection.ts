import type { DropDataMessage } from '~/types/drop.type'
import type { RealtimeMessage, RealtimeSend } from '~/types/realtime.type'
import { DropMessageKind } from '~/configs/drop.config'
import { DROP_CHANNEL_CONFIG, DROP_FILE_TRANSFER_CONFIG, RealtimeMessageType, RealtimeRole } from '~/configs/realtime.config'
import { useDropDebugStats } from './useDropDebugStats'

interface UseDropPeerConnectionOptions {
  addSystemMessage: (text: string) => void
  handleDataMessage: (data: DropDataMessage) => void
  handleFileChunk: (chunk: ArrayBuffer) => void
  role: Ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>
  sendRealtimeMessage: RealtimeSend
}

export function useDropPeerConnection(options: UseDropPeerConnectionOptions) {
  const { t } = useI18n()
  const rtcConfiguration = useDropRtcConfiguration()
  const connectionState = ref<RTCPeerConnectionState>('new')
  const channelState = ref<RTCDataChannelState>('closed')

  let peer: RTCPeerConnection | null = null
  let controlChannel: RTCDataChannel | null = null
  let fileChannel: RTCDataChannel | null = null

  const debugStats = useDropDebugStats({
    getControlChannel: () => controlChannel,
    getFileChannel: () => fileChannel,
    getPeer: () => peer,
  })

  const isReady = computed(() => channelState.value === 'open' && connectionState.value === 'connected')

  function getControlChannel() {
    return controlChannel
  }

  function getFileChannel() {
    return fileChannel
  }

  function updateChannelState() {
    const debug = debugStats.debug
    const controlState = controlChannel?.readyState ?? 'closed'
    const fileState = fileChannel?.readyState ?? 'closed'
    debug.controlChannelState = controlState
    debug.fileChannelState = fileState

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

    controlChannel.addEventListener('open', () => options.addSystemMessage(t('drop.system.connected')))
    controlChannel.addEventListener('close', () => options.addSystemMessage(t('drop.system.offline')))
    controlChannel.addEventListener('message', (event) => {
      if (typeof event.data === 'string')
        options.handleDataMessage(JSON.parse(event.data) as DropDataMessage)
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
      if (typeof event.data !== 'string')
        options.handleFileChunk(event.data as ArrayBuffer)
    })
  }

  function createPeer() {
    debugStats.stopStatsPolling()
    debugStats.resetDebug()
    peer?.close()
    controlChannel = null
    fileChannel = null
    channelState.value = 'closed'
    peer = new RTCPeerConnection(rtcConfiguration.value)
    debugStats.startStatsPolling()
    connectionState.value = peer.connectionState
    debugStats.updatePeerDebug()

    // 更新整體 RTC 連線狀態，讓 UI 能判斷是否已連上或失敗。
    peer.addEventListener('connectionstatechange', () => {
      connectionState.value = peer?.connectionState ?? 'closed'
      debugStats.updatePeerDebug()
    })

    // ICE 連線狀態只用來更新診斷資訊，不直接驅動畫面流程。
    peer.addEventListener('iceconnectionstatechange', debugStats.updatePeerDebug)

    // 本機 candidate 收集進度，方便確認 ICE 是否已經收集完成。
    peer.addEventListener('icegatheringstatechange', debugStats.updatePeerDebug)

    // SDP offer / answer 狀態，方便排查協商流程卡在哪一步。
    peer.addEventListener('signalingstatechange', debugStats.updatePeerDebug)

    // STUN/TURN 或 candidate 收集錯誤保留在診斷區，方便排查網路問題。
    peer.addEventListener('icecandidateerror', debugStats.updatePeerDebug)

    // 本機 candidate 交給 WebSocket 後端轉發給對方。
    peer.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        debugStats.trackLocalCandidate(event.candidate.candidate)
        options.sendRealtimeMessage(RealtimeMessageType.SignalIce, { candidate: event.candidate.toJSON() })
      }
    })

    // guest 透過 offer 收到 host 建立的 channel，再依 label 接線。
    peer.addEventListener('datachannel', (event) => {
      if (event.channel.label === DROP_CHANNEL_CONFIG.fileLabel)
        setupFileChannel(event.channel)
      else
        setupControlChannel(event.channel)
    })

    return peer
  }

  async function addIceCandidate(candidate: RTCIceCandidateInit) {
    debugStats.trackPeerCandidate(candidate.candidate)

    if (!peer || !peer.remoteDescription)
      return

    await peer.addIceCandidate(candidate)
    debugStats.updatePeerDebug()
  }

  async function createOffer() {
    const peerConnection = createPeer()

    setupControlChannel(peerConnection.createDataChannel(DROP_CHANNEL_CONFIG.controlLabel, { ordered: true }))
    setupFileChannel(peerConnection.createDataChannel(DROP_CHANNEL_CONFIG.fileLabel, { ordered: true }))
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    debugStats.updatePeerDebug()
    options.sendRealtimeMessage(RealtimeMessageType.SignalOffer, { sdp: offer })
  }

  async function handleSignal(message: RealtimeMessage) {
    if (message.type === RealtimeMessageType.PeerJoined && options.role.value === RealtimeRole.DropHost) {
      await createOffer()
      return
    }

    if (message.type === RealtimeMessageType.SignalOffer) {
      const peerConnection = createPeer()
      await peerConnection.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
      debugStats.updatePeerDebug()
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      debugStats.updatePeerDebug()
      options.sendRealtimeMessage(RealtimeMessageType.SignalAnswer, { sdp: answer })
      return
    }

    if (message.type === RealtimeMessageType.SignalAnswer && peer) {
      await peer.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
      debugStats.updatePeerDebug()
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
    return true
  }

  function cleanupConnection() {
    debugStats.resetDebug()
    peer?.close()
    peer = null
    controlChannel = null
    fileChannel = null
    channelState.value = 'closed'
    connectionState.value = 'closed'
  }

  return {
    cleanupConnection,
    debug: debugStats.debug,
    getControlChannel,
    getFileChannel,
    handleSignal,
    isReady,
    sendText,
  }
}
