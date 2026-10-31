import type { SavedWord } from './word'
import type { ReviewSession } from './review'

export const DAY_MS = 86_400_000
export function scheduleReview(word: Pick<SavedWord, 'reviewIntervalDays' | 'reviewStreak'>, correct: boolean, now: number) {
  if (!correct) return { nextReviewAt: now + 600_000, reviewIntervalDays: 0, reviewStreak: 0 }
  const days = word.reviewIntervalDays <= 0 ? 1 : word.reviewIntervalDays === 1 ? 3 : Math.min(word.reviewIntervalDays * 2, 180)
  return { nextReviewAt: now + days * DAY_MS, reviewIntervalDays: days, reviewStreak: Math.min(word.reviewStreak + 1, 10000) }
}

export function dateKey(time: number) {
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function studyStats(sessions: ReviewSession[], now: number) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const byDate = new Map<string, { total: number; correct: number }>()
  for (const session of sessions) {
    if (session.completedAt > now) continue
    const key = dateKey(session.completedAt)
    const previous = byDate.get(key) ?? { total: 0, correct: 0 }
    byDate.set(key, { total: previous.total + session.questionCount, correct: previous.correct + session.correctCount })
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - 6 + i)
    return { date: date.getTime(), ...(byDate.get(dateKey(date.getTime())) ?? { total: 0, correct: 0 }) }
  })
  const cursor = new Date(today)
  if (!byDate.has(dateKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (byDate.has(dateKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  const total = week.reduce((sum, day) => sum + day.total, 0)
  const correct = week.reduce((sum, day) => sum + day.correct, 0)
  return { week, streak, todayCount: week[6].total, accuracy: total ? Math.round(correct / total * 100) : null, total }
}
