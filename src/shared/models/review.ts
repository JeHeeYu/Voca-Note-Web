export type ReviewMode =
  'recall' | 'multiple_choice' | 'writing' | 'listening' | 'meaning_writing' | 'crossword'
export interface ReviewSettings {
  sessionSize: number
  dailyGoal: number
}
export interface ReviewAnswer {
  wordId: string
  isCorrect: boolean
}
export interface ReviewSession {
  id: string
  mode: ReviewMode
  questionCount: number
  correctCount: number
  wordIds: string[]
  incorrectWordIds: string[]
  completedAt: number
}
export const DEFAULT_SETTINGS: ReviewSettings = { sessionSize: 10, dailyGoal: 15 }
export const REVIEW_MODES: Record<
  ReviewMode,
  { label: string; description: string; english: string }
> = {
  recall: {
    label: '기억 카드',
    description: '뜻을 먼저 떠올리고, 기억을 확인해요.',
    english: 'Flashcards',
  },
  multiple_choice: {
    label: '뜻 고르기',
    description: '여러 뜻 중에서 알맞은 답을 골라요.',
    english: 'Multiple choice',
  },
  writing: {
    label: '직접 쓰기',
    description: '뜻과 예문을 보고 영어 단어를 써요.',
    english: 'Write it down',
  },
  meaning_writing: {
    label: '한글 뜻 맞히기',
    description: '영어를 보고 뜻 하나를 써요. 띄어쓰기는 자유롭게.',
    english: 'Write the meaning',
  },
  crossword: {
    label: '가로세로 낱말',
    description: '한글 힌트로 교차하는 영어 낱말을 채워요.',
    english: 'Crossword',
  },
  listening: {
    label: '듣고 쓰기',
    description: '발음을 듣고 정확한 철자를 써요.',
    english: 'Listen & spell',
  },
}
export function normalizeSettings(settings: ReviewSettings): ReviewSettings {
  const clamp = (value: number, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback
  return {
    sessionSize: clamp(settings.sessionSize, 5, 30, 10),
    dailyGoal: clamp(settings.dailyGoal, 5, 100, 15),
  }
}
