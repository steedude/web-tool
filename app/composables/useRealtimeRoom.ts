import type { RealtimeRole } from '~/configs/realtime.config'
import type { RealtimeMessage, RealtimeSend } from '~/types/realtime.type'
import { REALTIME_RETRY_CONFIG, RealtimeMessageType, RealtimeStatus } from '~/configs/realtime.config'
import { parseRealtimeMessage } from '~/utils/realtime-message.util'

export function useRealtimeRoom(roomId: Ref<string>, role: MaybeRef<RealtimeRole>) {
  const config = useRuntimeConfig()
  const status = ref<RealtimeStatus>(RealtimeStatus.Idle)
  const peerConnected = ref(false)
  const roomFull = ref(false)
  const latestMessage = shallowRef<RealtimeMessage | null>(null)
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0
  let stopped = false

  function getRealtimeUrl() {
    if (config.public.realtimeUrl)
      return config.public.realtimeUrl

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  function joinRoom() {
    if (!socket || socket.readyState !== WebSocket.OPEN || !roomId.value)
      return

    socket.send(JSON.stringify({
      type: RealtimeMessageType.RoomJoin,
      roomId: roomId.value,
      role: toValue(role),
    }))
  }

  function connect() {
    if (!import.meta.client || !roomId.value || stopped)
      return

    socket?.close()
    status.value = RealtimeStatus.Connecting
    socket = new WebSocket(getRealtimeUrl())

    socket.addEventListener('message', (event) => {
      const message = parseRealtimeMessage(event.data)
      if (!message)
        return

      if (message.type === RealtimeMessageType.Connected) {
        joinRoom()
      }
      else if (message.type === RealtimeMessageType.RoomJoined) {
        status.value = RealtimeStatus.Connected
        roomFull.value = false
        retryCount = 0
      }
      else if (message.type === RealtimeMessageType.RoomFull) {
        status.value = RealtimeStatus.Offline
        roomFull.value = true
        peerConnected.value = false
      }
      else if (message.type === RealtimeMessageType.PeerJoined) {
        peerConnected.value = true
      }
      else if (message.type === RealtimeMessageType.PeerLeft) {
        peerConnected.value = false
      }

      latestMessage.value = message
    })

    socket.addEventListener('close', () => {
      if (stopped)
        return

      status.value = RealtimeStatus.Offline
      peerConnected.value = false
      // 使用遞增延遲重連，避免離線時一直重建 WebSocket。
      const delay = Math.min(REALTIME_RETRY_CONFIG.baseDelayMs * 2 ** retryCount, REALTIME_RETRY_CONFIG.maxDelayMs)
      retryCount += 1
      retryTimer = setTimeout(connect, delay)
    })

    socket.addEventListener('error', () => socket?.close())
  }

  const send: RealtimeSend = (type, payload) => {
    if (socket?.readyState !== WebSocket.OPEN)
      return false

    socket.send(JSON.stringify({ type, payload }))
    return true
  }

  watch(roomId, (value) => {
    if (value)
      connect()
  })

  onBeforeUnmount(() => {
    stopped = true
    if (retryTimer)
      clearTimeout(retryTimer)
    socket?.close()
  })

  return {
    connect,
    latestMessage: readonly(latestMessage),
    peerConnected: readonly(peerConnected),
    roomFull: readonly(roomFull),
    send,
    status: readonly(status),
  }
}
