import {
  buildCrossword,
  crosswordAnswer,
  crosswordComplete,
  crosswordInputs,
  entryCells,
  type CrosswordPuzzle,
} from '../models/crossword'
import { useRef, useState } from 'react'
import type { ReviewAnswer, ReviewMode } from '@/shared/models/review'
import type { SavedWord } from '@/shared/models/word'
import { useVocaStore } from '@/shared/stores/vocaStore'
import { errorMessage } from '@/shared/lib/errors'
import {
  questionMatches,
  buildQuestions,
  gradeBatch,
  type ReviewPresentation,
  type ReviewQuestion,
  type ReviewScope,
} from '../models/reviewEngine'

export function useReviewSession() {
  const [crossword, setCrossword] = useState<CrosswordPuzzle | null>(null)
  const [crosswordCells, setCrosswordCells] = useState<Record<string, string>>({})
  const [startError, setStartError] = useState('')
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [mode, setMode] = useState<ReviewMode>('recall')
  const [presentation, setPresentation] = useState<ReviewPresentation>('single')
  const [batchInputs, setBatchInputs] = useState<Record<string, string>>({})
  const [answers, setAnswers] = useState<ReviewAnswer[]>([])
  const [phase, setPhase] = useState<'setup' | 'active' | 'graded' | 'finished'>('setup')
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; input: string } | null>(null)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const sessionId = useRef('')
  const saveLock = useRef(false)
  const answeredQuestionId = useRef('')
  const batchGraded = useRef(false)
  const allowLeave = useRef(false)
  const current = questions[answers.length]
  const start = (
    pool: SavedWord[],
    targets: SavedWord[],
    nextMode: ReviewMode,
    count: number,
    nextPresentation: ReviewPresentation = presentation,
    scope: ReviewScope = 'all',
  ) => {
    setStartError('')
    const candidates = buildQuestions(
      pool,
      nextMode,
      nextMode === 'crossword' ? 30 : count,
      Date.now(),
      Math.random,
      targets,
      scope,
    )
    const puzzle =
      nextMode === 'crossword'
        ? buildCrossword(
            candidates.map((q) => ({ wordId: q.word.id, answer: q.answer })),
            count,
          )
        : null
    if (puzzle && !puzzle.entries.length) {
      setStartError(
        '서로 교차할 영어 단어가 부족해요. 공통 알파벳이 있는 단어를 추가하거나 다른 범위를 선택해 주세요.',
      )
      return
    }
    const next = puzzle
      ? candidates.filter((q) => puzzle.entries.some((e) => e.wordId === q.word.id))
      : candidates
    setCrossword(puzzle)
    setCrosswordCells({})
    if (!next.length) return
    sessionId.current = crypto.randomUUID()
    answeredQuestionId.current = ''
    batchGraded.current = false
    allowLeave.current = false
    setQuestions(next)
    setMode(nextMode)
    setPresentation(
      nextMode === 'recall' ? 'single' : nextMode === 'crossword' ? 'batch' : nextPresentation,
    )
    setBatchInputs({})
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
    setFeedback({ correct: questionMatches(value, current, mode), input: value })
    setRevealed(true)
  }
  const checkBatch = () => {
    if (presentation !== 'batch' || phase !== 'active' || batchGraded.current) return
    if (crossword && !crosswordComplete(crossword, crosswordCells)) return
    const results = gradeBatch(
      questions,
      crossword ? crosswordInputs(crossword, crosswordCells) : batchInputs,
      mode,
    )
    if (!results) return
    batchGraded.current = true
    setAnswers(results)
    setPhase('graded')
    void save(results)
  }
  const incorrectIds = answers.filter((answer) => !answer.isCorrect).map((answer) => answer.wordId)
  return {
    crossword,
    crosswordCells,
    startError,
    fillCrossword: (wordId: string, value: string) => {
      if (!crossword || phase !== 'active' || batchGraded.current) return
      const entry = crossword.entries.find((e) => e.wordId === wordId)
      const answer = crosswordAnswer(value)
      if (!entry || answer.length !== entry.answer.length) return
      setCrosswordCells((previous) => ({
        ...previous,
        ...Object.fromEntries(entryCells(entry).map(({ key }, i) => [key, answer[i]])),
      }))
    },
    mode,
    presentation,
    batchInputs,
    setBatchInput: (wordId: string, value: string) => {
      if (phase === 'active' && !batchGraded.current)
        setBatchInputs((previous) => ({ ...previous, [wordId]: value }))
    },
    checkBatch,
    showSummary: () => setPhase('finished'),
    showBatchResults: () => setPhase('graded'),
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
