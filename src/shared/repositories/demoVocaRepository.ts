import { DEFAULT_SETTINGS, normalizeSettings } from '@/shared/models/review'
import { emptyDraft, normalizeDraft, type SavedWord } from '@/shared/models/word'
import { scheduleReview } from '@/shared/models/study'
import type { VocaRepository, VocaSnapshot } from './vocaRepository'

const STORAGE_KEY = 'voca-note:demo:v1'
const samples = [
  ['serendipity', '뜻밖의 행운', 'Finding this book was pure serendipity.', 'noun'],
  ['embrace', '받아들이다, 포용하다', 'Embrace the small changes in your life.', 'verb'],
  ['resilient', '회복력이 있는', 'She remained resilient through difficult times.', 'adjective'],
  ['linger', '오래 머무르다', 'The scent of coffee lingered in the room.', 'verb'],
  ['perspective', '관점, 시각', 'Travel gives us a new perspective.', 'noun'],
  ['deliberately', '의도적으로, 신중하게', 'He spoke slowly and deliberately.', 'adverb'],
  ['curiosity', '호기심', 'Curiosity is the beginning of learning.', 'noun'],
  ['subtle', '미묘한, 은은한', 'There is a subtle difference between the two.', 'adjective'],
  ['flourish', '번창하다, 잘 자라다', 'These plants flourish in sunlight.', 'verb'],
  ['tranquil', '고요한, 평온한', 'We enjoyed a tranquil morning by the lake.', 'adjective'],
  ['endeavor', '노력, 시도', 'Learning is a lifelong endeavor.', 'noun'],
  ['appreciate', '감사하다, 진가를 알아보다', 'I appreciate your patience.', 'verb'],
] as const

export function createDemoRepository(): VocaRepository {
  let data: VocaSnapshot = {
    words: samples.map(([word, meaning, example, partOfSpeech], index): SavedWord => ({
      ...emptyDraft(),
      id: `sample-${index}`,
      word,
      meaning,
      example,
      partOfSpeech,
      correctCount: 0,
      incorrectCount: 0,
      reviewStreak: 0,
      reviewIntervalDays: 0,
      createdAt: Date.now() - index * 3600000,
      updatedAt: Date.now(),
      lastReviewedAt: null,
      nextReviewAt: null,
    })),
    settings: DEFAULT_SETTINGS,
    sessions: [],
    pending: false,
    fromCache: false,
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as VocaSnapshot | null
    if (saved && Array.isArray(saved.words) && Array.isArray(saved.sessions) && saved.settings)
      data = {
        ...saved,
        settings: normalizeSettings(saved.settings),
        pending: false,
        fromCache: false,
      }
  } catch {
    /* An unavailable or old demo cache falls back to the sample set. */
  }
  const listeners = new Set<(snapshot: VocaSnapshot) => void>()
  const publish = (next: VocaSnapshot) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    data = next
    listeners.forEach((listener) => listener(data))
  }
  return {
    subscribe(onChange) {
      listeners.add(onChange)
      onChange(data)
      return () => {
        listeners.delete(onChange)
      }
    },
    async saveWord(draft, id) {
      const wordId = id ?? crypto.randomUUID()
      const previous = data.words.find((w) => w.id === wordId)
      const word: SavedWord = {
        id: wordId,
        correctCount: 0,
        incorrectCount: 0,
        reviewStreak: 0,
        reviewIntervalDays: 0,
        createdAt: Date.now(),
        lastReviewedAt: null,
        nextReviewAt: null,
        ...previous,
        ...normalizeDraft(draft),
        updatedAt: Date.now(),
      }
      publish({
        ...data,
        words: [...data.words.filter((w) => w.id !== wordId), word].sort((a, b) =>
          a.word.localeCompare(b.word),
        ),
      })
      return wordId
    },
    async deleteWord(id) {
      publish({ ...data, words: data.words.filter((w) => w.id !== id) })
    },
    async saveSettings(settings) {
      publish({ ...data, settings: normalizeSettings(settings) })
    },
    async saveSession(id, mode, answers) {
      if (data.sessions.some((session) => session.id === id)) return
      const now = Date.now()
      publish({
        ...data,
        words: data.words.map((word) => {
          const answer = answers.find((a) => a.wordId === word.id)
          return answer
            ? {
                ...word,
                ...scheduleReview(word, answer.isCorrect, now),
                correctCount: word.correctCount + Number(answer.isCorrect),
                incorrectCount: word.incorrectCount + Number(!answer.isCorrect),
                lastReviewedAt: now,
                updatedAt: now,
              }
            : word
        }),
        sessions: [
          {
            id,
            mode,
            questionCount: answers.length,
            correctCount: answers.filter((a) => a.isCorrect).length,
            wordIds: answers.map((a) => a.wordId),
            incorrectWordIds: answers.filter((a) => !a.isCorrect).map((a) => a.wordId),
            completedAt: now,
          },
          ...data.sessions,
        ].slice(0, 120),
      })
    },
  }
}
