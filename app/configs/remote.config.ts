import { RemotePromptCategory } from '~/types/remote.type'

export const REMOTE_DRAWING_PROMPTS = [
  { answerKey: 'cat', category: RemotePromptCategory.Animal },
  { answerKey: 'dog', category: RemotePromptCategory.Animal },
  { answerKey: 'rabbit', category: RemotePromptCategory.Animal },
  { answerKey: 'fish', category: RemotePromptCategory.Animal },
  { answerKey: 'bird', category: RemotePromptCategory.Animal },
  { answerKey: 'apple', category: RemotePromptCategory.Fruit },
  { answerKey: 'banana', category: RemotePromptCategory.Fruit },
  { answerKey: 'grape', category: RemotePromptCategory.Fruit },
  { answerKey: 'watermelon', category: RemotePromptCategory.Fruit },
  { answerKey: 'carrot', category: RemotePromptCategory.Vegetable },
  { answerKey: 'tomato', category: RemotePromptCategory.Vegetable },
  { answerKey: 'corn', category: RemotePromptCategory.Vegetable },
] as const

export const REMOTE_CANVAS_CONFIG = {
  lineColor: '#171714',
  lineWidth: 5,
} as const

export const REMOTE_GAME_CONFIG = {
  initialPromptIndex: 0,
} as const
