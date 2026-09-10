import type { RealtimeMessageType, RealtimeRole } from '~/configs/realtime.config'
import type { DrawGameStatePayload, DrawGiveUpPayload, DrawGuessPayload, DrawStrokePayload, DrawUndoPayload } from '~/types/draw.type'

export interface RealtimePayloads {
  [RealtimeMessageType.DrawGiveUp]: DrawGiveUpPayload
  [RealtimeMessageType.DrawGuess]: DrawGuessPayload
  [RealtimeMessageType.DrawState]: DrawGameStatePayload
  [RealtimeMessageType.DrawStroke]: DrawStrokePayload
  [RealtimeMessageType.DrawUndo]: DrawUndoPayload
  [RealtimeMessageType.SignalAnswer]: { sdp: RTCSessionDescriptionInit }
  [RealtimeMessageType.SignalIce]: { candidate: RTCIceCandidateInit }
  [RealtimeMessageType.SignalOffer]: { sdp: RTCSessionDescriptionInit }
}

interface RealtimeMetadata {
  from?: RealtimeRole
  role?: RealtimeRole
}

export type RealtimeMessage = {
  [T in RealtimeMessageType]: RealtimeMetadata & { type: T } & (
    T extends keyof RealtimePayloads ? { payload: RealtimePayloads[T] } : { payload?: never }
  )
}[RealtimeMessageType]

export type RealtimeSend = <T extends keyof RealtimePayloads>(type: T, payload: RealtimePayloads[T]) => boolean
