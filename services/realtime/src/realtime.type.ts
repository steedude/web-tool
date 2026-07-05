import type { WebSocket } from 'ws'
import type { RealtimeRole } from './realtime.config.js'

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
