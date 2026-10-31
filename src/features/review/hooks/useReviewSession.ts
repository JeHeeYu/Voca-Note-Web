import { useRef, useState } from 'react'
import type { ReviewAnswer, ReviewMode } from '@/shared/models/review'
import type { SavedWord } from '@/shared/models/word'
import { useVocaStore } from '@/shared/stores/vocaStore'
import { errorMessage } from '@/shared/lib/errors'
import { answersMatch, buildQuestions, type ReviewQuestion } from '../models/reviewEngine'

export function useReviewSession() {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [mode, setMode] = useState<ReviewMode>('recall')
  const [answers, setAnswers] = useState<ReviewAnswer[]>([])
  const [phase, setPhase] = useState<'setup' | 'active' | 'finished'>('setup')
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; input: string } | null>(null)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const sessionId = useRef('')
  const saveLock = useRef(false)
  const answeredQuestionId = useRef('')
  const allowLeave = useRef(false)
  const current = questions[answers.length]
  const start = (pool: SavedWord[], targets: SavedWord[], nextMode: ReviewMode, count: number) => {
    const next = buildQuestions(pool, nextMode, count, Date.now(), Math.random, targets)
    if (!next.length) return
    sessionId.current = crypto.randomUUID()
    answeredQuestionId.current = ''
    allowLeave.current = false
    setQuestions(next)
    setMode(nextMode)
    setAnswers([])
    setInput('')
    setFeedback(null)
    setRevealed(false)
    setSaved(false)
    setError('')
    setPhase('active')
  }
  const save = async (results: ReviewAnswer[]) => {
    if (saveLock.current || saved) return
    const repository = useVocaStore.getState().repository
    if (!repository) {
      setError('계정 연결을 확인하고 다시 저장해 주세요.')
      return
    }
    saveLock.current = true
    setSaving(true)
    setError('')
    try {
      await repository.saveSession(sessionId.current, mode, results)
      setSaved(true)
      allowLeave.current = true
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }
  const next = (correct: boolean) => {
    if (!current || answeredQuestionId.current === current.word.id) return
    answeredQuestionId.current = current.word.id
    const results = [...answers, { wordId: current.word.id, isCorrect: correct }]
    setAnswers(results)
    setInput('')
    setFeedback(null)
    setRevealed(false)
    if (results.length === questions.length) {
      setPhase('finished')
      void save(results)
    }
  }
  const check = (value = input) => {
    if (feedback || !current || !value.trim()) return
    setInput(value)
    setFeedback({ correct: answersMatch(value, current.answer), input: value })
    setRevealed(true)
  }
  const incorrectIds = answers.filter((answer) => !answer.isCorrect).map((answer) => answer.wordId)
  return {
    mode,
    phase,
    questions,
    current,
    answers,
    input,
    setInput,
    revealed,
    reveal: () => setRevealed(true),
    feedback,
    check,
    next,
    start,
    saving,
    saved,
    error,
    retrySave: () => save(answers),
    incorrectIds,
    allowLeave,
    reset: () => setPhase('setup'),
  }
}
