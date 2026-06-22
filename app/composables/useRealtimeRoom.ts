type RealtimeRole = 'desktop' | 'remote'

interface RealtimeMessage {
  type: string
  payload?: Record<string, unknown>
  role?: RealtimeRole
  from?: RealtimeRole
}

export function useRealtimeRoom(roomId: Ref<string>, role: RealtimeRole) {
  const config = useRuntimeConfig()
  const status = ref<'idle' | 'connecting' | 'connected' | 'offline'>('idle')
  const peerConnected = ref(false)
  const latestMessage = shallowRef<RealtimeMessage | null>(null)
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0
  let stopped = false

  function joinRoom() {
    if (!socket || socket.readyState !== WebSocket.OPEN || !roomId.value)
      return

    socket.send(JSON.stringify({
      type: 'room:join',
      roomId: roomId.value,
      role,
    }))
  }

  function connect() {
    if (!import.meta.client || !roomId.value || stopped)
      return

    socket?.close()
    status.value = 'connecting'
    socket = new WebSocket(config.public.realtimeUrl)

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as RealtimeMessage

      if (message.type === 'connected') {
        joinRoom()
      }
      else if (message.type === 'room:joined') {
        status.value = 'connected'
        retryCount = 0
      }
      else if (message.type === 'peer:joined') {
        peerConnected.value = true
      }
      else if (message.type === 'peer:left') {
        peerConnected.value = false
      }

      latestMessage.value = message
    })

    socket.addEventListener('close', () => {
      if (stopped)
        return

      status.value = 'offline'
      peerConnected.value = false
      const delay = Math.min(1000 * 2 ** retryCount, 10_000)
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
    send,
    status: readonly(status),
  }
}
