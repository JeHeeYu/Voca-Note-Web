import { crosswordAnswer } from './crossword'
import {
  accuracy,
  isDue,
  wordMeanings,
  meaningText,
  type PartOfSpeech,
  type SavedWord,
} from '@/shared/models/word'
import type { ReviewAnswer, ReviewMode } from '@/shared/models/review'

export type ReviewPresentation = 'single' | 'batch'
export type ReviewScope = 'all' | 'due' | 'mistakes'

export interface ReviewQuestion {
  word: SavedWord
  prompt: string
  answer: string
  context: string
  options: string[]
  partOfSpeech: PartOfSpeech | null
}
export const answersMatch = (input: string, answer: string) =>
  input.trim().toLowerCase() === answer.trim().toLowerCase()

export const normalizeMeaningAnswer = (value: string) =>
  value.normalize('NFKC').replace(/\s/gu, '').toLowerCase()
export function meaningAnswersMatch(input: string, meanings: string[]) {
  const value = normalizeMeaningAnswer(input)
  return (
    Boolean(value) &&
    meanings.some((meaning) =>
      [meaning, ...meaning.split(/[,，;；/\n]/u)].some(
        (part) => normalizeMeaningAnswer(part) === value,
      ),
    )
  )
}
export function questionMatches(input: string, question: ReviewQuestion, mode: ReviewMode) {
  if (mode === 'meaning_writing')
    return meaningAnswersMatch(
      input,
      wordMeanings(question.word).map((entry) => entry.meaning),
    )
  if (mode === 'crossword') return crosswordAnswer(input) === crosswordAnswer(question.answer)
  return answersMatch(input, question.answer)
}

export function gradeBatch(
  questions: ReviewQuestion[],
  inputs: Record<string, string>,
  mode: ReviewMode = 'writing',
): ReviewAnswer[] | null {
  if (!questions.length || questions.some(({ word }) => !inputs[word.id]?.trim())) return null
  return questions.map((question) => ({
    wordId: question.word.id,
    isCorrect: questionMatches(inputs[question.word.id], question, mode),
  }))
}

function distractorsFor(word: SavedWord, words: SavedWord[]) {
  const own = new Set(wordMeanings(word).map((entry) => entry.meaning.trim().toLowerCase()))
  const unique = new Map<string, string>()
  for (const other of words) {
    if (other.id === word.id) continue
    for (const entry of wordMeanings(other)) {
      const meaning = entry.meaning.trim()
      const key = meaning.toLowerCase()
      if (meaning && !own.has(key)) unique.set(key, meaning)
    }
  }
  return [...unique.values()]
}

export const eligibleReviewWords = (words: SavedWord[], targets: SavedWord[], mode: ReviewMode) =>
  targets.filter(
    (word) =>
      word.word.trim() &&
      wordMeanings(word).some((entry) => entry.meaning.trim()) &&
      (mode !== 'crossword' || Boolean(crosswordAnswer(word.word))) &&
      (mode !== 'multiple_choice' || distractorsFor(word, words).length > 0),
  )

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
  scope: ReviewScope = 'all',
): ReviewQuestion[] {
  const eligible = shuffle(eligibleReviewWords(words, targets, mode), random)
  // In the all-words scope, every eligible word keeps the same chance of selection.
  // Review priority would otherwise push unstudied words ahead of learned words.
  if (scope !== 'all') {
    eligible.sort(
      (a, b) =>
        Number(isDue(b, now)) - Number(isDue(a, now)) ||
        accuracy(a) - accuracy(b) ||
        b.incorrectCount - a.incorrectCount,
    )
  }
  return eligible.slice(0, Math.min(30, Math.max(0, count))).map((word) => {
    const meaningMode =
      mode === 'recall' || mode === 'multiple_choice' || mode === 'meaning_writing'
    const meanings = wordMeanings(word).filter((entry) => entry.meaning.trim())
    const selected = meanings[Math.floor(random() * meanings.length)]
    const answer = (
      mode === 'recall' || mode === 'meaning_writing'
        ? meaningText(word)
        : mode === 'multiple_choice'
          ? selected.meaning
          : word.word
    ).trim()
    const distractors = mode === 'multiple_choice' ? distractorsFor(word, words) : []
    const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return {
      word,
      answer,
      partOfSpeech: mode === 'multiple_choice' || mode === 'writing' ? selected.partOfSpeech : null,
      prompt:
        mode === 'listening' ? '어떤 단어가 들리나요?' : meaningMode ? word.word : selected.meaning,
      context:
        mode === 'listening' || mode === 'meaning_writing' || mode === 'crossword'
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
