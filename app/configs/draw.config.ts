import { DrawPromptCategory } from '~/types/draw.type'

export const DRAW_PROMPTS = [
  { answerKey: 'cat', category: DrawPromptCategory.Animal },
  { answerKey: 'dog', category: DrawPromptCategory.Animal },
  { answerKey: 'rabbit', category: DrawPromptCategory.Animal },
  { answerKey: 'fish', category: DrawPromptCategory.Animal },
  { answerKey: 'bird', category: DrawPromptCategory.Animal },
  { answerKey: 'apple', category: DrawPromptCategory.Fruit },
  { answerKey: 'banana', category: DrawPromptCategory.Fruit },
  { answerKey: 'grape', category: DrawPromptCategory.Fruit },
  { answerKey: 'watermelon', category: DrawPromptCategory.Fruit },
  { answerKey: 'carrot', category: DrawPromptCategory.Vegetable },
  { answerKey: 'tomato', category: DrawPromptCategory.Vegetable },
  { answerKey: 'corn', category: DrawPromptCategory.Vegetable },
] as const

export const DRAW_CANVAS_CONFIG = {
  lineColor: '#171714',
  lineWidth: 5,
} as const

export const DRAW_GAME_CONFIG = {
  initialPromptIndex: 0,
} as const
