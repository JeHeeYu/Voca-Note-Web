import { accuracy, isDue, type SavedWord } from '@/shared/models/word'
import type { ReviewMode } from '@/shared/models/review'

export interface ReviewQuestion {
  word: SavedWord
  prompt: string
  answer: string
  context: string
  options: string[]
}
export const answersMatch = (input: string, answer: string) =>
  input.trim().toLowerCase() === answer.trim().toLowerCase()

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function buildQuestions(
  words: SavedWord[],
  mode: ReviewMode,
  count: number,
  now = Date.now(),
  random = Math.random,
  targets = words,
): ReviewQuestion[] {
  const eligible = shuffle(
    targets.filter((w) => w.word.trim() && w.meaning.trim()),
    random,
  )
    .sort(
      (a, b) =>
        Number(isDue(b, now)) - Number(isDue(a, now)) ||
        accuracy(a) - accuracy(b) ||
        b.incorrectCount - a.incorrectCount,
    )
    .slice(0, Math.min(30, Math.max(0, count)))
  return eligible.map((word) => {
    const meaningMode = mode === 'recall' || mode === 'multiple_choice'
    const answer = (meaningMode ? word.meaning : word.word).trim()
    const distractors = [
      ...new Set(
        words
          .filter((w) => w.id !== word.id && !answersMatch(w.meaning, answer))
          .map((w) => w.meaning.trim())
          .filter(Boolean),
      ),
    ]
    const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return {
      word,
      answer,
      prompt:
        mode === 'listening' ? '어떤 단어가 들리나요?' : meaningMode ? word.word : word.meaning,
      context:
        mode === 'listening'
          ? ''
          : mode === 'multiple_choice'
            ? word.example || word.note
            : word.example.replace(new RegExp(escaped, 'gi'), '_____'),
      options:
        mode === 'multiple_choice'
          ? shuffle([...shuffle(distractors, random).slice(0, 3), answer], random)
          : [],
    }
  })
}
