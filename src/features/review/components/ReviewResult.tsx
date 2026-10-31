import { Link } from 'react-router-dom'
import { Check, RotateCcw, ArrowRight, LoaderCircle, Leaf } from 'lucide-react'
import { useVocaStore } from '@/shared/stores/vocaStore'
import type { useReviewSession } from '../hooks/useReviewSession'

export default function ReviewResult({
  session,
}: {
  session: ReturnType<typeof useReviewSession>
}) {
  const words = useVocaStore((state) => state.words)
  const correct = session.answers.filter((a) => a.isCorrect).length
  const incorrect = session.questions.filter((q) => session.incorrectIds.includes(q.word.id))
  const remaining = words.filter((word) => session.incorrectIds.includes(word.id))
  return (
    <div className="mx-auto max-w-[640px]">
      <section className="card px-6 py-10 text-center sm:px-10">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
          <Leaf size={29} />
        </div>
        <p className="eyebrow text-brand">A little more, a little better</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">오늘의 기억이 쌓였어요.</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          한 번의 연습이, 오래가는 기억으로.
          <br />
          끝까지 집중한 나에게 작은 칭찬을 건네세요.
        </p>
        <div className="mt-8 grid grid-cols-3 divide-x divide-line rounded-xl bg-canvas py-5">
          {[
            { label: '연습한 단어', value: `${session.answers.length}개` },
            { label: '기억한 단어', value: `${correct}개` },
            { label: '정확도', value: `${Math.round((correct / session.answers.length) * 100)}%` },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-brand">{item.value}</p>
            </div>
          ))}
        </div>
        <div
          role="status"
          className="mt-6 flex items-center justify-center gap-2 text-xs text-muted"
        >
          {session.saving ? (
            <>
              <LoaderCircle size={15} className="animate-spin" />
              학습 기록을 저장하고 있어요.
            </>
          ) : session.saved ? (
            <>
              <Check size={15} className="text-brand" />
              학습 기록과 다음 복습 시간을 저장했어요.
            </>
          ) : null}
        </div>
        {session.error ? (
          <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <p>{session.error}</p>
            <button
              disabled={session.saving}
              className="btn btn-secondary mt-3"
              onClick={() => {
                void session.retrySave()
              }}
            >
              저장 다시 시도
            </button>
          </div>
        ) : null}
        {incorrect.length ? (
          <div className="mt-7 text-left">
            <h2 className="text-sm font-semibold">한 번 더 만나볼 단어</h2>
            <div className="mt-3 divide-y divide-line">
              {incorrect.map(({ word }) => (
                <div key={word.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span className="font-medium">{word.word}</span>
                  <span className="text-muted">{word.meaning}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">틀린 단어는 10분 뒤 다시 복습할 수 있어요.</p>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {remaining.length ? (
            <button
              disabled={!session.saved || session.saving}
              onClick={() => session.start(words, remaining, session.mode, remaining.length)}
              className="btn btn-primary"
            >
              <RotateCcw size={16} />
              오답 다시 연습
            </button>
          ) : (
            <button disabled={!session.saved} className="btn btn-primary" onClick={session.reset}>
              다른 방식으로 연습
              <ArrowRight size={16} />
            </button>
          )}
          <Link className="btn btn-secondary" to="/">
            오늘의 학습으로
          </Link>
        </div>
      </section>
    </div>
  )
}
