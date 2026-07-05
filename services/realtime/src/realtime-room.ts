import type { ClientMessage } from './realtime.type.js'
import { REALTIME_SERVER_CONFIG, RealtimeErrorCode, RealtimeMessageType, RealtimeRole } from './realtime.config.js'

export interface RoomPeer {
  roomId?: string
  role?: RealtimeRole
}

export interface RoomDelivery<TPeer extends RoomPeer> {
  client: TPeer
  message: unknown
}

export interface RoomRegistryOptions {
  maxRoomClients?: number
  roomPattern?: RegExp
}

const validRoles = new Set(Object.values(RealtimeRole))

export function createRoomRegistry<TPeer extends RoomPeer>(options: RoomRegistryOptions = {}) {
  const maxRoomClients = options.maxRoomClients ?? REALTIME_SERVER_CONFIG.maxRoomClients
  const roomPattern = options.roomPattern ?? REALTIME_SERVER_CONFIG.roomPattern
  const rooms = new Map<string, Set<TPeer>>()

  function deliver(client: TPeer, message: unknown): RoomDelivery<TPeer> {
    return { client, message }
  }

  function leave(client: TPeer) {
    const deliveries: RoomDelivery<TPeer>[] = []
    if (!client.roomId)
      return deliveries

    const room = rooms.get(client.roomId)
    room?.delete(client)

    if (room?.size === 0) {
      rooms.delete(client.roomId)
    }
    else {
      room?.forEach(peer =>
        deliveries.push(deliver(peer, { type: RealtimeMessageType.PeerLeft, role: client.role })),
      )
    }

    client.roomId = undefined
    client.role = undefined
    return deliveries
  }

  function join(client: TPeer, message: ClientMessage) {
    const deliveries: RoomDelivery<TPeer>[] = []
    const roomId = message.roomId?.toUpperCase()

    if (!roomId || !roomPattern.test(roomId) || !message.role || !validRoles.has(message.role)) {
      deliveries.push(deliver(client, { type: RealtimeMessageType.Error, code: RealtimeErrorCode.InvalidJoin }))
      return deliveries
    }

    deliveries.push(...leave(client))
    const room = rooms.get(roomId) ?? new Set<TPeer>()

    if (room.size >= maxRoomClients) {
      deliveries.push(deliver(client, { type: RealtimeMessageType.RoomFull, roomId }))
      return deliveries
    }

    const existingPeers = [...room]
    room.add(client)
    rooms.set(roomId, room)
    client.roomId = roomId
    client.role = message.role

    deliveries.push(deliver(client, { type: RealtimeMessageType.RoomJoined, roomId, role: message.role }))
    existingPeers.forEach((peer) => {
      deliveries.push(deliver(peer, { type: RealtimeMessageType.PeerJoined, role: message.role }))
      deliveries.push(deliver(client, { type: RealtimeMessageType.PeerJoined, role: peer.role }))
    })
    return deliveries
  }

  function relay(client: TPeer, message: ClientMessage) {
    const deliveries: RoomDelivery<TPeer>[] = []
    if (!client.roomId) {
      deliveries.push(deliver(client, { type: RealtimeMessageType.Error, code: RealtimeErrorCode.NotInRoom }))
      return deliveries
    }

    rooms.get(client.roomId)?.forEach((peer) => {
      if (peer !== client)
        deliveries.push(deliver(peer, { ...message, roomId: client.roomId, from: client.role }))
    })
    return deliveries
  }

  function stats() {
    return {
      connections: [...rooms.values()].reduce((total, room) => total + room.size, 0),
      rooms: rooms.size,
    }
  }

  return {
    join,
    leave,
    relay,
    stats,
  }
}
