import process from 'node:process'

export enum RealtimeRole {
  DrawGuest = 'draw-guest',
  DrawHost = 'draw-host',
  DropGuest = 'drop-guest',
  DropHost = 'drop-host',
}

export enum RealtimeMessageType {
  Connected = 'connected',
  Error = 'error',
  PeerJoined = 'peer:joined',
  PeerLeft = 'peer:left',
  RoomFull = 'room:full',
  RoomJoin = 'room:join',
  RoomJoined = 'room:joined',
}

export enum RealtimeErrorCode {
  InvalidJoin = 'INVALID_JOIN',
  InvalidMessage = 'INVALID_MESSAGE',
  NotInRoom = 'NOT_IN_ROOM',
}

export const REALTIME_SERVER_CONFIG = {
  heartbeatIntervalMs: 30_000,
  host: process.env.HOST ?? '127.0.0.1',
  maxPayloadBytes: 64 * 1024,
  maxRoomClients: 2,
  port: Number(process.env.PORT ?? 3001),
  roomPattern: /^[A-Z0-9]{6}$/,
} as const
