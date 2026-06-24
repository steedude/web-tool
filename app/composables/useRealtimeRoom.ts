import type { RealtimeMessage, RealtimeRole } from '~/types/realtime.type'
import { REALTIME_RETRY_CONFIG } from '~/configs/realtime.config'
import { RealtimeMessageType, RealtimeStatus } from '~/types/realtime.type'

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
    socket = new WebSocket(config.public.realtimeUrl)

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as RealtimeMessage

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
      // Exponential backoff keeps reconnects quick at first without hammering the VM.
      const delay = Math.min(REALTIME_RETRY_CONFIG.baseDelayMs * 2 ** retryCount, REALTIME_RETRY_CONFIG.maxDelayMs)
      retryCount += 1
      retryTimer = setTimeout(connect, delay)
    })

    socket.addEventListener('error', () => socket?.close())
  }

  function send(type: string, payload?: Record<string, unknown>) {
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
