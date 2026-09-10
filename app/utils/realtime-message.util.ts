import type { RealtimeMessage } from '~/types/realtime.type'
import { DRAW_PROMPTS, DrawTurnOutcome } from '~/configs/draw.config'
import { RealtimeMessageType, RealtimeRole } from '~/configs/realtime.config'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDrawRole(value: unknown) {
  return value === RealtimeRole.DrawHost || value === RealtimeRole.DrawGuest
}

function isTurnResult(value: unknown) {
  return isRecord(value)
    && isDrawRole(value.actorRole)
    && isDrawRole(value.drawerRole)
    && DRAW_PROMPTS.some(prompt => prompt.answerKey === value.answerKey)
    && (value.outcome === DrawTurnOutcome.Correct || value.outcome === DrawTurnOutcome.Skip)
}

function isCoordinate(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function hasValidPayload(message: Record<string, unknown>) {
  const payload = message.payload
  switch (message.type) {
    case RealtimeMessageType.DrawState:
      return isRecord(payload) && isRecord(payload.state)
        && isDrawRole(payload.state.drawerRole)
        && typeof payload.state.promptIndex === 'number'
        && Number.isInteger(payload.state.promptIndex)
        && payload.state.promptIndex >= 0 && payload.state.promptIndex < DRAW_PROMPTS.length
        && (payload.result === undefined || isTurnResult(payload.result))
    case RealtimeMessageType.DrawStroke: {
      const stroke = isRecord(payload) ? payload.stroke : null
      return isRecord(stroke) && typeof stroke.id === 'string' && stroke.id.length > 0
        && ['x0', 'x1', 'y0', 'y1'].every(key => isCoordinate(stroke[key]))
    }
    case RealtimeMessageType.DrawGuess:
      return isRecord(payload) && typeof payload.guess === 'string'
    case RealtimeMessageType.DrawGiveUp:
      return isRecord(payload) && (payload.result === undefined || isTurnResult(payload.result))
    case RealtimeMessageType.DrawUndo:
      return isRecord(payload) && typeof payload.strokeId === 'string' && payload.strokeId.length > 0
    case RealtimeMessageType.SignalOffer:
    case RealtimeMessageType.SignalAnswer:
      return isRecord(payload) && isRecord(payload.sdp)
        && payload.sdp.type === (message.type === RealtimeMessageType.SignalOffer ? 'offer' : 'answer')
        && typeof payload.sdp.sdp === 'string'
    case RealtimeMessageType.SignalIce:
      return isRecord(payload) && isRecord(payload.candidate)
        && typeof payload.candidate.candidate === 'string'
        && (payload.candidate.sdpMid == null || typeof payload.candidate.sdpMid === 'string')
        && (payload.candidate.sdpMLineIndex == null || (typeof payload.candidate.sdpMLineIndex === 'number' && Number.isInteger(payload.candidate.sdpMLineIndex) && payload.candidate.sdpMLineIndex >= 0))
        && (payload.candidate.usernameFragment == null || typeof payload.candidate.usernameFragment === 'string')
    default:
      return payload === undefined
  }
}

const messageTypes = new Set<unknown>(Object.values(RealtimeMessageType))
const roles = new Set<unknown>(Object.values(RealtimeRole))

function isRealtimeMessage(message: unknown): message is RealtimeMessage {
  if (!isRecord(message) || !messageTypes.has(message.type))
    return false
  if ([message.role, message.from].some(role => role !== undefined && !roles.has(role)))
    return false
  return hasValidPayload(message)
}

/** 只在接收邊界解析及驗證；元件內可直接依 type 取得正確 payload。 */
export function parseRealtimeMessage(data: unknown): RealtimeMessage | null {
  if (typeof data !== 'string')
    return null
  try {
    const message: unknown = JSON.parse(data)
    return isRealtimeMessage(message) ? message : null
  }
  catch {
    return null
  }
}
