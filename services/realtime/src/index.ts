import type { ClientMessage, RealtimeClient } from './realtime.type.js'
import { createServer } from 'node:http'
import process from 'node:process'
import { WebSocket, WebSocketServer } from 'ws'
import { REALTIME_SERVER_CONFIG } from './realtime.config.js'
import { RealtimeErrorCode, RealtimeMessageType, RealtimeRole } from './realtime.type.js'

const validRoles = new Set(Object.values(RealtimeRole))

const rooms = new Map<string, Set<RealtimeClient>>()

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
  maxPayload: REALTIME_SERVER_CONFIG.maxPayloadBytes,
})

function send(client: RealtimeClient, message: unknown) {
  if (client.readyState === WebSocket.OPEN)
    client.send(JSON.stringify(message))
}

function leaveRoom(client: RealtimeClient) {
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

function joinRoom(client: RealtimeClient, message: ClientMessage) {
  const roomId = message.roomId?.toUpperCase()

  if (!roomId || !REALTIME_SERVER_CONFIG.roomPattern.test(roomId) || !message.role || !validRoles.has(message.role)) {
    send(client, { type: RealtimeMessageType.Error, code: RealtimeErrorCode.InvalidJoin })
    return
  }

  leaveRoom(client)
  const room = rooms.get(roomId) ?? new Set<RealtimeClient>()

  // 目前 WebRTC 功能設計成一對一房間。第三個 socket 直接拒絕，
  // 避免多個 peer 的 offer / answer / ICE 訊息混在一起。
  if (room.size >= REALTIME_SERVER_CONFIG.maxRoomClients) {
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

function relay(client: RealtimeClient, message: ClientMessage) {
  if (!client.roomId) {
    send(client, { type: RealtimeMessageType.Error, code: RealtimeErrorCode.NotInRoom })
    return
  }

  rooms.get(client.roomId)?.forEach((peer) => {
    if (peer !== client)
      send(peer, { ...message, roomId: client.roomId, from: client.role })
  })
}

wss.on('connection', (client: RealtimeClient) => {
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
    const client = socket as RealtimeClient

    if (!client.isAlive) {
      client.terminate()
      return
    }

    client.isAlive = false
    client.ping()
  })
}, REALTIME_SERVER_CONFIG.heartbeatIntervalMs)

wss.on('close', () => clearInterval(heartbeat))

server.listen(REALTIME_SERVER_CONFIG.port, REALTIME_SERVER_CONFIG.host, () => {
  process.stdout.write(`Realtime server listening on http://${REALTIME_SERVER_CONFIG.host}:${REALTIME_SERVER_CONFIG.port}\n`)
})
