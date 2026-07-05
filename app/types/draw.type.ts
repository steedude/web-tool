import type { DrawPromptCategory, DrawTurnOutcome } from '~/configs/draw.config'
import type { RealtimeRole } from '~/configs/realtime.config'

export interface DrawPrompt {
  answerKey: string
  category: DrawPromptCategory
}

export interface DrawStroke {
  id: string
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface DrawGameState {
  drawerRole: RealtimeRole
  promptIndex: number
}

export interface DrawTurnResult {
  actorRole: RealtimeRole
  answerKey: string
  drawerRole: RealtimeRole
  outcome: DrawTurnOutcome
}

export interface DrawGameStatePayload {
  result?: DrawTurnResult
  state: DrawGameState
}

export interface DrawStrokePayload {
  stroke: DrawStroke
}

export interface DrawGuessPayload {
  guess: string
}

export interface DrawGiveUpPayload {
  result?: DrawTurnResult
}

export interface DrawUndoPayload {
  strokeId: string
}
