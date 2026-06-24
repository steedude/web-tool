import { createServer } from 'node:http'
import process from 'node:process'
import { WebSocket, WebSocketServer } from 'ws'

const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 3001)
const roomPattern = /^[A-Z0-9]{6}$/
const heartbeatIntervalMs = 30_000
const maxPayloadBytes = 64 * 1024
const maxRoomClients = 2

enum RealtimeRole {
  Desktop = 'desktop',
  DropGuest = 'drop-guest',
  DropHost = 'drop-host',
  Remote = 'remote',
}

enum RealtimeMessageType {
  Connected = 'connected',
  Error = 'error',
  PeerJoined = 'peer:joined',
  PeerLeft = 'peer:left',
  RoomFull = 'room:full',
  RoomJoin = 'room:join',
  RoomJoined = 'room:joined',
}

enum RealtimeErrorCode {
  InvalidJoin = 'INVALID_JOIN',
  InvalidMessage = 'INVALID_MESSAGE',
  NotInRoom = 'NOT_IN_ROOM',
}

const validRoles = new Set(Object.values(RealtimeRole))

interface Client extends WebSocket {
  isAlive: boolean
  roomId?: string
  role?: RealtimeRole
}

interface ClientMessage {
  type: string
  roomId?: string
  role?: RealtimeRole
  payload?: unknown
}

const rooms = new Map<string, Set<Client>>()

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({
      connections: [...rooms.values()].reduce((total, room) => total + room.size, 0),
      ok: true,
      rooms: rooms.size,
    }))
    return
  }

  response.writeHead(404)
  response.end('Not found')
})

const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: maxPayloadBytes,
})

function send(client: Client, message: unknown) {
  if (client.readyState === WebSocket.OPEN)
    client.send(JSON.stringify(message))
}

function leaveRoom(client: Client) {
  if (!client.roomId)
    return

  const room = rooms.get(client.roomId)
  room?.delete(client)

  if (room?.size === 0)
    rooms.delete(client.roomId)
  else
    room?.forEach(peer => send(peer, { type: RealtimeMessageType.PeerLeft, role: client.role }))

  client.roomId = undefined
  client.role = undefined
}

function joinRoom(client: Client, message: ClientMessage) {
  const roomId = message.roomId?.toUpperCase()

  if (!roomId || !roomPattern.test(roomId) || !message.role || !validRoles.has(message.role)) {
    send(client, { type: RealtimeMessageType.Error, code: RealtimeErrorCode.InvalidJoin })
    return
  }

  leaveRoom(client)
  const room = rooms.get(roomId) ?? new Set<Client>()

  // The current WebRTC features are designed as one-to-one rooms. Rejecting the third
  // socket here prevents offer / answer / ICE messages from multiple peers mixing together.
  if (room.size >= maxRoomClients) {
    send(client, { type: RealtimeMessageType.RoomFull, roomId })
    return
  }

  const existingPeers = [...room]
  room.add(client)
  rooms.set(roomId, room)
  client.roomId = roomId
  client.role = message.role

  send(client, { type: RealtimeMessageType.RoomJoined, roomId, role: message.role })
  existingPeers.forEach((peer) => {
    send(peer, { type: RealtimeMessageType.PeerJoined, role: message.role })
    send(client, { type: RealtimeMessageType.PeerJoined, role: peer.role })
  })
}

function relay(client: Client, message: ClientMessage) {
  if (!client.roomId) {
    send(client, { type: RealtimeMessageType.Error, code: RealtimeErrorCode.NotInRoom })
    return
  }

  rooms.get(client.roomId)?.forEach((peer) => {
    if (peer !== client)
      send(peer, { ...message, roomId: client.roomId, from: client.role })
  })
}

wss.on('connection', (client: Client) => {
  client.isAlive = true
  client.on('pong', () => client.isAlive = true)

  client.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage

      if (message.type === RealtimeMessageType.RoomJoin)
        joinRoom(client, message)
      else
        relay(client, message)
    }
    catch {
      send(client, { type: RealtimeMessageType.Error, code: RealtimeErrorCode.InvalidMessage })
    }
  })

  client.on('close', () => leaveRoom(client))
  send(client, { type: RealtimeMessageType.Connected })
})

const heartbeat = setInterval(() => {
  wss.clients.forEach((socket) => {
    const client = socket as Client

    if (!client.isAlive) {
      client.terminate()
      return
    }

    client.isAlive = false
    client.ping()
  })
}, heartbeatIntervalMs)

wss.on('close', () => clearInterval(heartbeat))

server.listen(port, host, () => {
  process.stdout.write(`Realtime server listening on http://${host}:${port}\n`)
})
