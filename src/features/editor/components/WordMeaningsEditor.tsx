import { Plus, Split, Trash2 } from 'lucide-react'
import {
  MAX_MEANINGS,
  PARTS_OF_SPEECH,
  splitMeaningEntries,
  type PartOfSpeech,
  type WordMeaning,
} from '@/shared/models/word'
import type { WordValidationErrors } from '../models/wordValidation'

export default function WordMeaningsEditor({
  entries,
  errors,
  onChange,
}: {
  entries: WordMeaning[]
  errors: WordValidationErrors
  onChange: (entries: WordMeaning[]) => void
}) {
  const focusMeaning = (index: number) =>
    requestAnimationFrame(() => document.getElementById(`meaning-${index}`)?.focus())
  const update = (index: number, patch: Partial<WordMeaning>) =>
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  return (
    <div className="mt-7 border-t border-line pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          뜻과 품사{' '}
          <span className="ml-1 text-xs font-normal text-muted">
            {entries.length} / {MAX_MEANINGS}
          </span>
        </h3>
        <span className="text-xs text-muted">뜻마다 쓰임을 골라주세요</span>
      </div>
      <div className="space-y-4">
        {entries.map((entry, index) => {
          const split = splitMeaningEntries(entries, index)
          const meaningError = errors[`meaning-${index}`]
          const posError = errors[`partOfSpeech-${index}`]
          return (
            <div key={index} className="rounded-xl border border-line bg-canvas/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor={`meaning-${index}`} className="text-sm font-semibold">
                  뜻 {index + 1} <span className="text-brand">*</span>
                </label>
                <button
                  type="button"
                  disabled={entries.length === 1}
                  aria-label={`뜻 ${index + 1} 삭제`}
                  className="btn btn-quiet px-2 py-1.5 text-muted"
                  onClick={() => {
                    onChange(entries.filter((_, i) => i !== index))
                    focusMeaning(Math.max(0, index - 1))
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
                <div>
                  <label className="sr-only" htmlFor={`partOfSpeech-${index}`}>
                    품사·표현 {index + 1}
                  </label>
                  <select
                    id={`partOfSpeech-${index}`}
                    className="field"
                    value={entry.partOfSpeech ?? ''}
                    onChange={(event) =>
                      update(index, {
                        partOfSpeech: (event.target.value || null) as PartOfSpeech | null,
                      })
                    }
                    aria-invalid={Boolean(posError)}
                    aria-describedby={posError ? `partOfSpeech-${index}-error` : undefined}
                  >
                    <option value="">품사·표현 선택</option>
                    {Object.entries(PARTS_OF_SPEECH).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {posError ? (
                    <p id={`partOfSpeech-${index}-error`} className="mt-1.5 text-xs text-red-600">
                      {posError}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <textarea
                    id={`meaning-${index}`}
                    className="field min-h-20 resize-y"
                    value={entry.meaning}
                    onChange={(event) => update(index, { meaning: event.target.value })}
                    placeholder={index === 0 ? '예: 기록, 기록물' : '다른 뜻을 입력하세요'}
                    maxLength={300}
                    required
                    aria-invalid={Boolean(meaningError)}
                    aria-describedby={meaningError ? `meaning-${index}-error` : undefined}
                  />
                  {meaningError ? (
                    <p id={`meaning-${index}-error`} className="mt-1.5 text-xs text-red-600">
                      {meaningError}
                    </p>
                  ) : null}
                  {split !== entries ? (
                    <button
                      type="button"
                      className="mt-2 flex items-center gap-1.5 text-xs text-brand hover:underline"
                      onClick={() => {
                        onChange(split)
                        focusMeaning(index)
                      }}
                    >
                      <Split size={13} />
                      쉼표로 뜻 나누기
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {errors.meanings ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {errors.meanings}
        </p>
      ) : null}
      <button
        type="button"
        disabled={entries.length >= MAX_MEANINGS}
        className="btn btn-secondary mt-4 w-full"
        onClick={() => {
          onChange([...entries, { meaning: '', partOfSpeech: null }])
          focusMeaning(entries.length)
        }}
      >
        <Plus size={16} />뜻 추가
      </button>
      <p className="mt-3 text-xs leading-6 text-muted">
        명사와 동사의 뜻을 따로 기록할 수 있어요. 여러 단어로 된 표현은 구(phr), 구동사, 관용구를
        선택해 주세요.
      </p>
    </div>
  )
}
