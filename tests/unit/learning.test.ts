import { describe, expect, it } from 'vitest'
import { emptyDraft, needsPractice, normalizeDraft, type SavedWord } from '@/shared/models/word'
import { normalizeSettings, type ReviewSession } from '@/shared/models/review'
import { DAY_MS, scheduleReview, studyStats } from '@/shared/models/study'
import { validateWord } from '@/features/editor/models/wordValidation'
import { answersMatch, buildQuestions } from '@/features/review/models/reviewEngine'
import { decodeWord } from '@/shared/repositories/firestoreVocaRepository'
import { Timestamp } from 'firebase/firestore'

const now = new Date(2026, 9, 31, 12).getTime()
function word(overrides: Partial<SavedWord> = {}): SavedWord {
  return { ...emptyDraft(), id: 'one', word: 'focus', meaning: '집중하다', createdAt: now, updatedAt: now, lastReviewedAt: null, nextReviewAt: null, correctCount: 0, incorrectCount: 0, reviewIntervalDays: 0, reviewStreak: 0, ...overrides }
}
function session(date: number, questionCount = 10, correctCount = 8): ReviewSession {
  return { id: String(date), mode: 'writing', questionCount, correctCount, completedAt: date, wordIds: [], incorrectWordIds: [] }
}

describe('Android-compatible learning rules', () => {
  it.each([[0, 1], [1, 3], [3, 6], [90, 180], [180, 180]])('grows %s days to %s', (previous, expected) => {
    expect(scheduleReview(word({ reviewIntervalDays: previous, reviewStreak: 3 }), true, now)).toEqual({ reviewIntervalDays: expected, reviewStreak: 4, nextReviewAt: now + expected * DAY_MS })
  })
  it('resets a wrong answer to ten minutes and caps the rules-compatible streak', () => {
    expect(scheduleReview(word({ reviewIntervalDays: 180, reviewStreak: 5 }), false, now)).toEqual({ reviewIntervalDays: 0, reviewStreak: 0, nextReviewAt: now + 600000 })
    expect(scheduleReview(word({ reviewStreak: 10000 }), true, now).reviewStreak).toBe(10000)
  })
  it('uses the app mistake threshold, including the 80% boundary', () => {
    expect(needsPractice(word({ correctCount: 4, incorrectCount: 1 }))).toBe(false)
    expect(needsPractice(word({ correctCount: 3, incorrectCount: 1 }))).toBe(true)
    expect(needsPractice(word())).toBe(false)
  })
  it('normalizes settings and rejects duplicate words without blocking self edits', () => {
    expect(normalizeSettings({ dailyGoal: NaN, sessionSize: 100 })).toEqual({ dailyGoal: 15, sessionSize: 30 })
    expect(validateWord({ ...emptyDraft(), word: ' FOCUS ', meaning: '집중하다' }, [word()]).word).toBeTruthy()
    expect(validateWord({ ...emptyDraft(), word: 'focus', meaning: '집중하다' }, [word()], 'one')).toEqual({})
    expect(validateWord({ ...emptyDraft(), word: 'a'.repeat(81), meaning: '뜻', synonyms: Array.from({ length: 21 }, (_, i) => `s${i}`) }, [])).toMatchObject({ word: expect.any(String), synonyms: expect.any(String) })
  })
  it('normalizes related terms in the same case-insensitive manner as the app', () => {
    expect(normalizeDraft({ ...emptyDraft(), word: ' focus ', synonyms: [' Calm ', '', 'calm', 'peace'] }).synonyms).toEqual(['Calm', 'peace'])
  })
  it('aggregates sessions, counts a streak from yesterday, and excludes future records', () => {
    const stats = studyStats([session(now - DAY_MS), session(now - 2 * DAY_MS), session(now - 4 * DAY_MS), session(now + DAY_MS)], now)
    expect(stats.streak).toBe(2)
    expect(stats.todayCount).toBe(0)
    expect(stats.accuracy).toBe(80)
    expect(stats.total).toBe(30)
    expect(studyStats([session(now, 5, 3), session(now - 1000, 10, 9)], now)).toMatchObject({ todayCount: 15, accuracy: 80, streak: 1 })
  })
  it('reads Android Firestore timestamps and absent optional fields', () => {
    const decoded = decodeWord('android', { word: 'hello', meaning: '안녕', partOfSpeech: 'interjection', nextReviewAt: Timestamp.fromMillis(now), synonyms: ['hi'], correctCount: 3 })
    expect(decoded).toMatchObject({ id: 'android', partOfSpeech: 'interjection', nextReviewAt: now, correctCount: 3, incorrectCount: 0, example: '', note: '', antonyms: [] })
  })
})

describe('four review modes', () => {
  const pool = [word(), word({ id: 'two', word: 'grow', meaning: '자라다' }), word({ id: 'three', word: 'learn', meaning: '배우다' }), word({ id: 'four', word: 'read', meaning: '읽다' }), word({ id: 'same', word: 'concentrate', meaning: '집중하다' })]
  it('prioritizes due words and selects a unique set of distractors', () => {
    const targets = [word({ id: 'later', nextReviewAt: now + DAY_MS }), word({ id: 'due', nextReviewAt: now, incorrectCount: 3 })]
    const questions = buildQuestions(pool, 'multiple_choice', 5, now, () => 0.5, targets)
    expect(questions[0].word.id).toBe('due')
    expect(questions[0].options).toContain(questions[0].answer)
    expect(new Set(questions[0].options).size).toBe(questions[0].options.length)
    expect(questions[0].options).toHaveLength(4)
  })
  it('hides a word containing regex metacharacters in writing/recall and never leaks listening context', () => {
    const words = [word({ word: 'C++', example: 'I use C++ and c++.', note: 'C++' })]
    expect(buildQuestions(words, 'writing', 5, now)[0]).toMatchObject({ prompt: '집중하다', answer: 'C++', context: 'I use _____ and _____.' })
    expect(buildQuestions(words, 'recall', 5, now)[0].answer).toBe('집중하다')
    expect(buildQuestions(words, 'listening', 5, now)[0]).toMatchObject({ context: '', prompt: '어떤 단어가 들리나요?', answer: 'C++' })
  })
  it('compares trimmed case-insensitive answers and obeys session limits', () => {
    expect(answersMatch(' FOCUS ', 'focus')).toBe(true)
    expect(answersMatch('focused', 'focus')).toBe(false)
    expect(buildQuestions(pool, 'writing', 0, now)).toHaveLength(0)
    expect(buildQuestions(pool, 'writing', 30, now)).toHaveLength(pool.length)
  })
})
