import type { RoomDelivery } from './realtime-room.js'
import type { ClientMessage, RealtimeClient } from './realtime.type.js'
import { createServer } from 'node:http'
import process from 'node:process'
import { WebSocket, WebSocketServer } from 'ws'
import { createRoomRegistry } from './realtime-room.js'
import { REALTIME_SERVER_CONFIG, RealtimeErrorCode, RealtimeMessageType } from './realtime.config.js'
import { captureRealtimeException } from './sentry.js'

const roomRegistry = createRoomRegistry<RealtimeClient>()

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({
      ...roomRegistry.stats(),
      ok: true,
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

server.on('error', captureRealtimeException)
wss.on('error', captureRealtimeException)

function send(client: RealtimeClient, message: unknown) {
  if (client.readyState === WebSocket.OPEN)
    client.send(JSON.stringify(message))
}

function sendAll(deliveries: RoomDelivery<RealtimeClient>[]) {
  deliveries.forEach(({ client, message }) => send(client, message))
}

wss.on('connection', (client: RealtimeClient) => {
  client.isAlive = true
  client.on('pong', () => client.isAlive = true)

  client.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage

      if (message.type === RealtimeMessageType.RoomJoin)
        sendAll(roomRegistry.join(client, message))
      else
        sendAll(roomRegistry.relay(client, message))
    }
    catch {
      send(client, { type: RealtimeMessageType.Error, code: RealtimeErrorCode.InvalidMessage })
    }
  })

  client.on('close', () => sendAll(roomRegistry.leave(client)))
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
