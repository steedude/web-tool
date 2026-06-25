import type { RealtimeRole } from '~/types/realtime.type'

/** 畫猜題目的分類，用來顯示給猜題者當提示。 */
export enum DrawPromptCategory {
  /** 動物類題目。 */
  Animal = 'animal',
  /** 水果類題目。 */
  Fruit = 'fruit',
  /** 蔬菜類題目。 */
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

/** 一題結束的結果，用來同步雙方提示與切換下一題。 */
export enum DrawTurnOutcome {
  /** 猜題者答對。 */
  Correct = 'correct',
  /** 任一方選擇跳過。 */
  Skip = 'skip',
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
