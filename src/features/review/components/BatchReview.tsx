import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, CheckCheck } from 'lucide-react'
import { REVIEW_MODES } from '@/shared/models/review'
import PageHeader from '@/shared/components/PageHeader'
import type { useReviewSession } from '../hooks/useReviewSession'
import BatchReviewQuestion from './BatchReviewQuestion'
import ReviewSaveStatus from './ReviewSaveStatus'

export default function BatchReview({ session }: { session: ReturnType<typeof useReviewSession> }) {
  const [attempted, setAttempted] = useState(false)
  const submitButton = useRef<HTMLButtonElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const graded = session.phase === 'graded'
  const missing = session.questions.filter(({ word }) => !session.batchInputs[word.id]?.trim())
  const completedCount = session.questions.length - missing.length
  const correctCount = session.answers.filter((answer) => answer.isCorrect).length
  const results = new Map(session.answers.map((answer) => [answer.wordId, answer.isCorrect]))
  useEffect(() => {
    if (graded) resultHeading.current?.focus()
    else document.getElementById('batch-answer-0')?.focus({ preventScroll: true })
  }, [graded])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (graded) return
    setAttempted(true)
    if (missing.length) {
      const index = session.questions.findIndex(({ word }) => word.id === missing[0].word.id)
      document.getElementById(`batch-answer-${index}`)?.focus()
      return
    }
    session.checkBatch()
  }
  return (
    <>
      <PageHeader
        eyebrow={`${REVIEW_MODES[session.mode].english} · Worksheet`}
        title="한 번에 풀고, 함께 확인해요."
        description={`${session.questions.length}문제를 모두 풀고 정답을 한 번에 확인하세요.`}
      />
      {graded ? (
        <section className="card mb-6 p-6 text-center">
          <h2 ref={resultHeading} tabIndex={-1} className="text-xl font-semibold outline-none">
            {session.questions.length}문제 중 {correctCount}문제 정답
          </h2>
          <p className="mt-2 text-sm text-muted">아래에서 내 답과 정답을 비교해 보세요.</p>
          <ReviewSaveStatus session={session} />
          <button type="button" onClick={session.showSummary} className="btn btn-primary mt-5">
            학습 요약 보기
            <ArrowRight size={16} />
          </button>
        </section>
      ) : null}
      <form
        onSubmit={submit}
        noValidate
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            (event.repeat || event.nativeEvent.isComposing || event.keyCode === 229)
          )
            event.preventDefault()
        }}
      >
        <div className="sticky top-3 z-20 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 p-4 shadow-sm backdrop-blur">
          <p className="text-sm text-muted" aria-live="polite">
            {graded ? (
              '채점 완료'
            ) : (
              <>
                답 입력 <strong className="text-brand">{completedCount}</strong> /{' '}
                {session.questions.length}
              </>
            )}
          </p>
          {!graded ? (
            <button ref={submitButton} type="submit" className="btn btn-primary">
              <CheckCheck size={16} />
              전체 정답 확인
            </button>
          ) : null}
        </div>
        {attempted && missing.length > 0 && !graded ? (
          <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            아직 {missing.length}문제의 답을 입력하지 않았어요. 모두 입력한 뒤 채점해 주세요.
          </p>
        ) : null}
        <div className="space-y-4">
          {session.questions.map((question, index) => (
            <BatchReviewQuestion
              key={question.word.id}
              question={question}
              index={index}
              mode={session.mode}
              value={session.batchInputs[question.word.id] ?? ''}
              onChange={(value) => session.setBatchInput(question.word.id, value)}
              onNextInput={() => {
                const next = document.getElementById(`batch-answer-${index + 1}`)
                if (next) next.focus()
                else submitButton.current?.focus()
              }}
              graded={graded}
              correct={results.get(question.word.id) ?? false}
              missing={attempted && !graded && !session.batchInputs[question.word.id]?.trim()}
            />
          ))}
        </div>
        <p className="mt-5 text-center text-xs leading-6 text-muted">
          {graded
            ? '채점한 답안은 수정되지 않아요. 학습 요약에서 오답을 다시 연습할 수 있어요.'
            : 'Enter로 다음 입력칸으로 이동해요. 모든 답을 입력한 뒤 전체 정답 확인을 눌러주세요.'}
        </p>
      </form>
    </>
  )
}
