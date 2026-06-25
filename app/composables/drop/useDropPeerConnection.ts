import type { DropDataMessage } from '~/types/drop.type'
import type { RealtimeMessage, RealtimeSend } from '~/types/realtime.type'
import { DROP_CHANNEL_CONFIG, DROP_FILE_TRANSFER_CONFIG, DROP_RTC_CONFIG } from '~/configs/realtime.config'
import { DropMessageKind } from '~/types/drop.type'
import { RealtimeMessageType, RealtimeRole } from '~/types/realtime.type'
import { useDropDebugStats } from './useDropDebugStats'

export interface UseDropPeerConnectionOptions {
  addSystem: (text: string) => void
  handleDataMessage: (data: DropDataMessage) => void
  handleFileChunk: (chunk: ArrayBuffer) => void
  role: Ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>
  roomSend: RealtimeSend
  t: (key: string) => string
}

export function useDropPeerConnection(options: UseDropPeerConnectionOptions) {
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

  function setLastError(message: string) {
    debugStats.setLastError(message)
  }

  function updateChannelState() {
    const debug = debugStats.debug
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

  function setupControlChannel(nextChannel: RTCDataChannel) {
    controlChannel = nextChannel
    updateChannelState()

    controlChannel.addEventListener('open', updateChannelState)
    controlChannel.addEventListener('close', updateChannelState)
    controlChannel.addEventListener('error', (event) => {
      debugStats.debug.lastError = `control channel error: ${event.type}`
      updateChannelState()
    })

    controlChannel.addEventListener('open', () => options.addSystem(options.t('drop.system.connected')))
    controlChannel.addEventListener('close', () => options.addSystem(options.t('drop.system.offline')))
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
    fileChannel.addEventListener('error', (event) => {
      debugStats.debug.lastError = `file channel error: ${event.type}`
      updateChannelState()
    })
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
    peer = new RTCPeerConnection(DROP_RTC_CONFIG)
    debugStats.startStatsPolling()
    connectionState.value = peer.connectionState
    debugStats.updatePeerDebug()

    peer.addEventListener('connectionstatechange', () => {
      connectionState.value = peer?.connectionState ?? 'closed'
      debugStats.updatePeerDebug()
    })
    peer.addEventListener('iceconnectionstatechange', debugStats.updatePeerDebug)
    peer.addEventListener('icegatheringstatechange', debugStats.updatePeerDebug)
    peer.addEventListener('signalingstatechange', debugStats.updatePeerDebug)
    peer.addEventListener('icecandidateerror', (event) => {
      if (peer?.connectionState !== 'connected')
        debugStats.debug.lastError = `ice candidate error: ${event.errorCode} ${event.errorText}`
      debugStats.updatePeerDebug()
    })
    peer.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        debugStats.trackLocalCandidate(event.candidate.candidate)
        options.roomSend(RealtimeMessageType.SignalIce, { candidate: event.candidate.toJSON() })
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
    debugStats.trackPeerCandidate(candidate.candidate)

    if (!peer || !peer.remoteDescription)
      return

    await peer.addIceCandidate(candidate)
    debugStats.updatePeerDebug()
  }

  async function createOffer() {
    const pc = createPeer()

    setupControlChannel(pc.createDataChannel(DROP_CHANNEL_CONFIG.controlLabel, { ordered: true }))
    setupFileChannel(pc.createDataChannel(DROP_CHANNEL_CONFIG.fileLabel, { ordered: true }))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    debugStats.updatePeerDebug()
    options.roomSend(RealtimeMessageType.SignalOffer, { sdp: offer })
  }

  async function handleSignal(message: RealtimeMessage) {
    debugStats.debug.lastSignal = message.type

    if (message.type === RealtimeMessageType.PeerJoined && options.role.value === RealtimeRole.DropHost) {
      await createOffer()
      return
    }

    if (message.type === RealtimeMessageType.SignalOffer) {
      const pc = createPeer()
      await pc.setRemoteDescription(message.payload?.sdp as RTCSessionDescriptionInit)
      debugStats.updatePeerDebug()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      debugStats.updatePeerDebug()
      options.roomSend(RealtimeMessageType.SignalAnswer, { sdp: answer })
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
    setLastError,
  }
}
