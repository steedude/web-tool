import { describe, expect, it } from 'vitest'
import { createRoomRegistry } from '../src/realtime-room.js'
import { RealtimeErrorCode, RealtimeMessageType, RealtimeRole } from '../src/realtime.config.js'

interface TestPeer {
  id: string
  roomId?: string
  role?: RealtimeRole
}

function peer(id: string): TestPeer {
  return { id }
}

describe('realtime room store', () => {
  it('rejects invalid join messages', () => {
    const registry = createRoomRegistry<TestPeer>()
    const guest = peer('guest')

    expect(registry.join(guest, { type: RealtimeMessageType.RoomJoin, roomId: 'bad', role: RealtimeRole.DrawGuest })).toEqual([
      {
        client: guest,
        message: { type: RealtimeMessageType.Error, code: RealtimeErrorCode.InvalidJoin },
      },
    ])
    expect(registry.stats()).toEqual({ connections: 0, rooms: 0 })
  })

  it('announces peers when a second client joins a room', () => {
    const registry = createRoomRegistry<TestPeer>()
    const host = peer('host')
    const guest = peer('guest')

    registry.join(host, { type: RealtimeMessageType.RoomJoin, roomId: 'ABC123', role: RealtimeRole.DrawHost })
    const deliveries = registry.join(guest, { type: RealtimeMessageType.RoomJoin, roomId: 'ABC123', role: RealtimeRole.DrawGuest })

    expect(deliveries).toEqual([
      {
        client: guest,
        message: { type: RealtimeMessageType.RoomJoined, roomId: 'ABC123', role: RealtimeRole.DrawGuest },
      },
      {
        client: host,
        message: { type: RealtimeMessageType.PeerJoined, role: RealtimeRole.DrawGuest },
      },
      {
        client: guest,
        message: { type: RealtimeMessageType.PeerJoined, role: RealtimeRole.DrawHost },
      },
    ])
    expect(registry.stats()).toEqual({ connections: 2, rooms: 1 })
  })

  it('returns room full without replacing existing peers', () => {
    const registry = createRoomRegistry<TestPeer>({ maxRoomClients: 1 })
    const host = peer('host')
    const guest = peer('guest')

    registry.join(host, { type: RealtimeMessageType.RoomJoin, roomId: 'ABC123', role: RealtimeRole.DrawHost })

    expect(registry.join(guest, { type: RealtimeMessageType.RoomJoin, roomId: 'ABC123', role: RealtimeRole.DrawGuest })).toEqual([
      {
        client: guest,
        message: { type: RealtimeMessageType.RoomFull, roomId: 'ABC123' },
      },
    ])
    expect(guest.roomId).toBeUndefined()
    expect(registry.stats()).toEqual({ connections: 1, rooms: 1 })
  })

  it('relays messages only to peers in the same room', () => {
    const registry = createRoomRegistry<TestPeer>()
    const host = peer('host')
    const guest = peer('guest')
    const other = peer('other')

    registry.join(host, { type: RealtimeMessageType.RoomJoin, roomId: 'ABC123', role: RealtimeRole.DrawHost })
    registry.join(guest, { type: RealtimeMessageType.RoomJoin, roomId: 'ABC123', role: RealtimeRole.DrawGuest })
    registry.join(other, { type: RealtimeMessageType.RoomJoin, roomId: 'XYZ789', role: RealtimeRole.DropHost })

    expect(registry.relay(host, { type: 'signal', payload: { sdp: 'offer' } })).toEqual([
      {
        client: guest,
        message: {
          type: 'signal',
          payload: { sdp: 'offer' },
          roomId: 'ABC123',
          from: RealtimeRole.DrawHost,
        },
      },
    ])
  })

  it('announces peer departure and removes empty rooms', () => {
    const registry = createRoomRegistry<TestPeer>()
    const host = peer('host')
    const guest = peer('guest')

    registry.join(host, { type: RealtimeMessageType.RoomJoin, roomId: 'ABC123', role: RealtimeRole.DrawHost })
    registry.join(guest, { type: RealtimeMessageType.RoomJoin, roomId: 'ABC123', role: RealtimeRole.DrawGuest })

    expect(registry.leave(guest)).toEqual([
      {
        client: host,
        message: { type: RealtimeMessageType.PeerLeft, role: RealtimeRole.DrawGuest },
      },
    ])
    expect(registry.leave(host)).toEqual([])
    expect(registry.stats()).toEqual({ connections: 0, rooms: 0 })
  })
})
