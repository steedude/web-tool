import type { WebSocket } from 'ws'

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

export interface RealtimeClient extends WebSocket {
  isAlive: boolean
  roomId?: string
  role?: RealtimeRole
}

export interface ClientMessage {
  payload?: unknown
  role?: RealtimeRole
  roomId?: string
  type: string
}
