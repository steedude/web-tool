import type { RealtimeMessageType, RealtimeRole } from '~/configs/realtime.config'

export interface RealtimeMessage {
  from?: RealtimeRole
  payload?: Record<string, unknown>
  role?: RealtimeRole
  type: RealtimeMessageType
}

export type RealtimeSend = (type: RealtimeMessageType, payload?: Record<string, unknown>) => boolean
