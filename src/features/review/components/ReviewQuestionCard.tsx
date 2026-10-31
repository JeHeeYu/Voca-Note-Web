import WordMeanings from '@/shared/components/WordMeanings'
import { useEffect, useRef, type FormEvent } from 'react'
import { ArrowRight, Check, RotateCcw, Eye, X } from 'lucide-react'
import { PARTS_OF_SPEECH, RELATED_FIELDS, type RelatedField } from '@/shared/models/word'
import { REVIEW_MODES } from '@/shared/models/review'
import SpeakButton from '@/shared/components/SpeakButton'
import type { useReviewSession } from '../hooks/useReviewSession'

export default function ReviewQuestionCard({
  session,
}: {
  session: ReturnType<typeof useReviewSession>
}) {
  const { current, mode, revealed, feedback } = session
  const input = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (mode === 'writing' || mode === 'listening') input.current?.focus()
    else heading.current?.focus()
  }, [current?.word.id, mode])
  if (!current) return null
  const submit = (event: FormEvent) => {
    event.preventDefault()
    session.check()
  }
  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{REVIEW_MODES[mode].label}</p>
        <span className="text-sm text-muted">
          <strong className="text-brand">{session.answers.length + 1}</strong> /{' '}
          {session.questions.length}
        </span>
      </div>
      <progress
        max={session.questions.length}
        value={session.answers.length}
        aria-label="복습 진행률"
        className="mb-7 h-1.5 w-full overflow-hidden rounded-full accent-brand"
      />
      <section className="card overflow-hidden">
        <div className="px-6 py-10 text-center sm:px-10 sm:py-12">
          <p className="eyebrow mb-6 text-muted">
            {mode === 'recall'
              ? 'Take a moment to remember'
              : mode === 'multiple_choice'
                ? 'Choose the right meaning'
                : mode === 'writing'
                  ? 'Find the right word'
                  : 'Listen carefully'}
          </p>
          {mode === 'listening' ? (
            <div className="mb-6">
              <SpeakButton text={current.word.word} large />
            </div>
          ) : null}
          <h1
            ref={heading}
            tabIndex={-1}
            className={`break-words font-semibold tracking-tight outline-none ${mode === 'listening' ? 'text-xl' : 'text-3xl sm:text-4xl'}`}
          >
            {current.prompt}
          </h1>
          {current.partOfSpeech ? (
            <span className="mt-4 inline-block rounded-md bg-canvas px-2.5 py-1 text-xs text-muted">
              {PARTS_OF_SPEECH[current.partOfSpeech]}
            </span>
          ) : null}
          {mode === 'recall' ? (
            <div className="mt-2">
              <SpeakButton text={current.word.word} />
            </div>
          ) : null}
          {current.context ? (
            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted">{current.context}</p>
          ) : null}
          {mode === 'recall' && !revealed ? (
            <button onClick={session.reveal} className="btn btn-secondary mt-9 gap-2 px-7">
              <Eye size={16} />뜻 확인하기
            </button>
          ) : null}
          {mode === 'recall' && revealed ? (
            <div className="mt-8 border-t border-line pt-7" aria-live="polite">
              <WordMeanings word={current.word} />
              <p className="mt-3 text-xs text-muted">답을 보기 전에 떠올릴 수 있었나요?</p>
            </div>
          ) : null}
          {mode === 'multiple_choice' ? (
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              {current.options.map((option, index) => (
                <button
                  key={option}
                  disabled={Boolean(feedback)}
                  onClick={() => session.check(option)}
                  className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${feedback && option === current.answer ? 'border-brand bg-brand-soft text-brand' : feedback && option === feedback.input ? 'border-red-200 bg-red-50 text-red-700' : 'border-line hover:border-brand hover:bg-canvas'}`}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-canvas text-xs text-muted">
                    {index + 1}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          ) : null}
          {mode === 'writing' || mode === 'listening' ? (
            <form onSubmit={submit} className="mx-auto mt-8 max-w-sm">
              <label htmlFor="review-answer" className="sr-only">
                영어 단어 입력
              </label>
              <input
                id="review-answer"
                ref={input}
                className="field text-center text-lg"
                placeholder="영어 단어를 입력하세요"
                value={session.input}
                onChange={(event) => session.setInput(event.target.value)}
                disabled={Boolean(feedback)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <button
                disabled={Boolean(feedback) || !session.input.trim()}
                className="btn btn-primary mt-3 w-full"
                type="submit"
              >
                정답 확인
              </button>
            </form>
          ) : null}
          {feedback ? (
            <div
              role="status"
              className={`mt-6 rounded-xl p-4 text-sm ${feedback.correct ? 'bg-brand-soft text-brand' : 'bg-[#fbf0e9] text-[#a16d4e]'}`}
            >
              <p className="flex items-center justify-center gap-2 font-semibold">
                {feedback.correct ? <Check size={17} /> : <X size={17} />}
                {feedback.correct
                  ? '정확해요. 잘 기억하고 있어요!'
                  : '괜찮아요. 한 번 더 기억해봐요.'}
              </p>
              {!feedback.correct ? (
                <p className="mt-2">
                  정답: <strong>{current.answer}</strong>
                </p>
              ) : null}
            </div>
          ) : null}
          {feedback ? (
            <div className="mt-5">
              <WordMeanings word={current.word} />
            </div>
          ) : null}
          {revealed &&
          (current.word.note ||
            Object.keys(RELATED_FIELDS).some((key) => current.word[key as RelatedField].length)) ? (
            <div className="mt-5 space-y-2 text-left text-xs leading-6 text-muted">
              {current.word.note ? <p>{current.word.note}</p> : null}
              {(Object.entries(RELATED_FIELDS) as [RelatedField, string][])
                .filter(([key]) => current.word[key].length)
                .map(([key, label]) => (
                  <p key={key}>
                    <span className="mr-2 font-medium text-ink">{label}</span>
                    {current.word[key].join(', ')}
                  </p>
                ))}
            </div>
          ) : null}
        </div>
        {mode === 'recall' && revealed ? (
          <div className="grid grid-cols-2 gap-3 border-t border-line bg-canvas/50 p-5">
            <button onClick={() => session.next(false)} className="btn btn-secondary">
              <RotateCcw size={16} />
              다시 볼래요
            </button>
            <button onClick={() => session.next(true)} className="btn btn-primary">
              <Check size={16} />
              기억했어요
            </button>
          </div>
        ) : feedback ? (
          <div className="border-t border-line bg-canvas/50 p-5">
            <button
              onClick={() => session.next(feedback.correct)}
              className="btn btn-primary w-full"
            >
              {session.answers.length + 1 === session.questions.length
                ? '학습 마치기'
                : '다음 단어'}
              <ArrowRight size={16} />
            </button>
          </div>
        ) : null}
      </section>
      <p className="mt-5 text-center text-xs leading-6 text-muted">
        모든 문제를 마치면 학습 결과와 다음 복습 시간이 저장돼요.
      </p>
    </div>
  )
}
