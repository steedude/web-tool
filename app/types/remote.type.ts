import type { RealtimeRole } from '~/types/realtime.type'

export enum RemotePromptCategory {
  Animal = 'animal',
  Fruit = 'fruit',
  Vegetable = 'vegetable',
}

export enum RemoteRoundStatus {
  Drawing = 'drawing',
  Solved = 'solved',
  Skipped = 'skipped',
}

export interface RemoteDrawingPrompt {
  answerKey: string
  category: RemotePromptCategory
}

export interface RemoteDrawStroke {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface RemoteGameState {
  drawerRole: RealtimeRole
  promptIndex: number
  round: number
  status: RemoteRoundStatus
}

export interface RemoteGameStatePayload {
  state: RemoteGameState
}

export interface RemoteDrawPayload {
  round: number
  stroke: RemoteDrawStroke
}

export interface RemoteGuessPayload {
  guess: string
  round: number
}

export interface RemoteGiveUpPayload {
  round: number
}
