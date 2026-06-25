import type { RealtimeRole } from '~/types/realtime.type'

export enum DrawPromptCategory {
  Animal = 'animal',
  Fruit = 'fruit',
  Vegetable = 'vegetable',
}

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

export interface DrawGameStatePayload {
  state: DrawGameState
}

export interface DrawStrokePayload {
  stroke: DrawStroke
}

export interface DrawGuessPayload {
  guess: string
}

export type DrawGiveUpPayload = Record<string, never>

export interface DrawUndoPayload {
  strokeId: string
}
