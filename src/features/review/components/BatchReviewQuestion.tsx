import { Check, X } from 'lucide-react'
import type { ReviewMode } from '@/shared/models/review'
import { PARTS_OF_SPEECH } from '@/shared/models/word'
import SpeakButton from '@/shared/components/SpeakButton'
import WordMeanings from '@/shared/components/WordMeanings'
import type { ReviewQuestion } from '../models/reviewEngine'

export default function BatchReviewQuestion({
  question,
  index,
  mode,
  value,
  onChange,
  onNextInput,
  graded,
  correct,
  missing,
  layout,
}: {
  question: ReviewQuestion
  index: number
  mode: ReviewMode
  value: string
  onChange: (value: string) => void
  onNextInput: () => void
  graded: boolean
  correct: boolean
  missing: boolean
  layout: 'list' | 'grid'
}) {
  const inputId = `batch-answer-${index}`
  const errorId = `batch-error-${index}`
  return (
    <article
      aria-label={`${index + 1}번 문제`}
      className={`card min-w-0 p-5 sm:p-6 ${graded && !correct ? 'border-red-200' : missing ? 'border-amber-400' : ''}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-md bg-canvas px-2 py-1 text-xs font-semibold text-muted">
          {String(index + 1).padStart(2, '0')}
        </span>
        {question.partOfSpeech ? (
          <span className="rounded-md bg-brand-soft px-2 py-1 text-[10px] text-brand">
            {PARTS_OF_SPEECH[question.partOfSpeech]}
          </span>
        ) : null}
        {graded ? (
          <span
            className={`ml-auto flex items-center gap-1 text-xs font-semibold ${correct ? 'text-brand' : 'text-red-600'}`}
          >
            {correct ? <Check size={14} /> : <X size={14} />}
            {correct ? '정답' : '오답'}
          </span>
        ) : null}
      </div>
      <div className={`grid gap-5 ${layout === 'list' ? 'sm:grid-cols-2 sm:items-start' : ''}`}>
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold leading-7">{question.prompt}</h2>
          {mode === 'listening' ? (
            <div className="mt-3">
              <SpeakButton text={question.word.word} large />
            </div>
          ) : null}
          {question.context ? (
            <p className="mt-2 break-words text-xs leading-6 text-muted">{question.context}</p>
          ) : null}
        </div>
        <div className="min-w-0">
          {mode === 'multiple_choice' ? (
            <fieldset
              disabled={graded}
              aria-describedby={missing ? errorId : undefined}
              className="space-y-2"
            >
              <legend className="sr-only">{index + 1}번 문제 답 선택</legend>
              {question.options.map((option, optionIndex) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${value === option ? 'border-brand bg-brand-soft' : 'border-line'} ${graded ? 'cursor-default' : 'hover:border-brand/50'}`}
                >
                  <input
                    id={optionIndex === 0 ? inputId : `${inputId}-${optionIndex}`}
                    type="radio"
                    name={`batch-choice-${index}`}
                    value={option}
                    checked={value === option}
                    onChange={() => onChange(option)}
                    className="mt-0.5 shrink-0 accent-brand"
                  />
                  <span className="min-w-0 break-words">{option}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <>
              <label htmlFor={inputId} className="label">
                {index + 1}번 답
              </label>
              <input
                id={inputId}
                className="field"
                placeholder="영어 단어를 입력하세요"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                readOnly={graded}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={missing}
                aria-describedby={missing ? errorId : undefined}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  if (
                    graded ||
                    event.repeat ||
                    event.nativeEvent.isComposing ||
                    event.keyCode === 229
                  )
                    return
                  onNextInput()
                }}
              />
            </>
          )}
          {missing ? (
            <p id={errorId} className="mt-2 text-xs text-amber-700">
              {mode === 'multiple_choice' ? '답을 골라주세요.' : '답을 입력해 주세요.'}
            </p>
          ) : null}
        </div>
      </div>
      {graded ? (
        <div className="mt-5 border-t border-line pt-4">
          {!correct ? (
            <p className="mb-3 break-words text-sm text-red-700">
              정답: <strong>{question.answer}</strong>
            </p>
          ) : null}
          <WordMeanings word={question.word} compact />
        </div>
      ) : null}
    </article>
  )
}
