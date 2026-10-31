import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Trash2, Info } from 'lucide-react'
import { useVocaStore, notify } from '@/shared/stores/vocaStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import {
  emptyDraft,
  normalizeDraft,
  RELATED_FIELDS,
  type WordDraft,
  type SavedWord,
  type RelatedField,
} from '@/shared/models/word'
import { errorMessage } from '@/shared/lib/errors'
import { useOnline } from '@/shared/hooks/useOnline'
import Modal from '@/shared/components/Modal'
import PageHeader from '@/shared/components/PageHeader'
import LeaveGuard from '@/shared/components/LeaveGuard'
import SpeakButton from '@/shared/components/SpeakButton'
import { validateWord, type WordValidationErrors } from '../models/wordValidation'
import WordMeaningsEditor from './WordMeaningsEditor'

export default function WordEditorForm({ word }: { word?: SavedWord }) {
  const [initial, setInitial] = useState(() => normalizeDraft(word ?? emptyDraft()))
  const [draft, setDraft] = useState<WordDraft>(initial)
  const [errors, setErrors] = useState<WordValidationErrors>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { repository, words } = useVocaStore()
  const demo = useAuthStore((state) => state.demo)
  const online = useOnline()
  const allowLeave = useRef(false)
  const wordInput = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const change = <K extends keyof WordDraft>(key: K, value: WordDraft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }))
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !repository || (!online && !demo)) return
    const validation = validateWord(draft, words, word?.id)
    setErrors(validation)
    setError('')
    if (Object.keys(validation).length) {
      document.getElementById(Object.keys(validation)[0])?.focus()
      return
    }
    setBusy(true)
    try {
      await repository.saveWord(draft, word?.id)
      notify(word ? '단어를 수정했어요.' : '새 단어를 담았어요.')
      if (!word) {
        const next = normalizeDraft(emptyDraft())
        setInitial(next)
        setDraft(next)
        setErrors({})
        requestAnimationFrame(() => wordInput.current?.focus())
      } else {
        allowLeave.current = true
        navigate('/words')
      }
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!word || !repository || busy) return
    setBusy(true)
    setError('')
    try {
      await repository.deleteWord(word.id)
      allowLeave.current = true
      notify('단어를 삭제했어요.')
      navigate('/words')
    } catch (cause) {
      setError(errorMessage(cause))
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }
  const help = (key: keyof WordDraft) =>
    errors[key] ? (
      <p id={`${key}-error`} className="mt-1.5 text-xs text-red-600">
        {errors[key]}
      </p>
    ) : null
  return (
    <>
      <PageHeader
        eyebrow={word ? 'A closer look' : 'Make it yours'}
        title={word ? '단어를 더 깊이 알아가요.' : '오늘 만난 새로운 단어.'}
        description="뜻뿐 아니라 쓰임까지 기록하면 더 오래 기억할 수 있어요."
        action={word ? <SpeakButton text={word.word} /> : undefined}
      />
      <form onSubmit={save} className="grid items-start gap-6 xl:grid-cols-[1fr_300px]" noValidate>
        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <section className="card p-5 sm:p-7">
            <h2 className="mb-6 font-semibold">
              기본 정보{' '}
              <span className="ml-2 text-xs font-normal text-muted">
                단어와 뜻은 꼭 입력해 주세요
              </span>
            </h2>
            <div className="grid gap-5">
              <div>
                <label className="label" htmlFor="word">
                  영어 단어 <span className="text-brand">*</span>
                </label>
                <input
                  id="word"
                  ref={wordInput}
                  value={draft.word}
                  onChange={(e) => change('word', e.target.value)}
                  className="field"
                  placeholder="예: serendipity"
                  maxLength={80}
                  required
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.word)}
                  aria-describedby={errors.word ? 'word-error' : undefined}
                />
                {help('word')}
              </div>
            </div>
            <WordMeaningsEditor
              entries={draft.meanings}
              errors={errors}
              onChange={(entries) => {
                change('meanings', entries)
                setErrors({})
              }}
            />
          </section>
          <section className="card space-y-5 p-5 sm:p-7">
            <h2 className="font-semibold">문장 속에서 기억하기</h2>
            <div>
              <label htmlFor="example" className="label">
                예문
              </label>
              <textarea
                id="example"
                className="field min-h-24 resize-y"
                value={draft.example}
                onChange={(e) => change('example', e.target.value)}
                placeholder="Finding this book was pure serendipity."
                maxLength={500}
              />
              {help('example')}
            </div>
            <div>
              <label htmlFor="note" className="label">
                나만의 메모
              </label>
              <textarea
                id="note"
                className="field min-h-24 resize-y"
                value={draft.note}
                onChange={(e) => change('note', e.target.value)}
                placeholder="어디서 만난 단어인가요? 기억에 남는 이야기를 적어보세요."
                maxLength={1000}
              />
              {help('note')}
            </div>
          </section>
          <section className="card p-5 sm:p-7">
            <h2 className="font-semibold">함께 알아두면 좋은 표현</h2>
            <p className="mt-2 mb-5 text-xs leading-6 text-muted">
              쉼표로 구분해서 입력하세요. 각 분류별로 20개까지 담을 수 있어요.
            </p>
            <div className="space-y-4">
              {(Object.entries(RELATED_FIELDS) as [RelatedField, string][]).map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={key} className="label">
                    {label}
                  </label>
                  <input
                    id={key}
                    value={draft[key].join(',')}
                    onChange={(e) => change(key, e.target.value.split(','))}
                    className="field"
                    placeholder={`${label}를 입력하세요`}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={errors[key] ? `${key}-error` : undefined}
                  />
                  {help(key)}
                </div>
              ))}
            </div>
          </section>
        </fieldset>
        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="card p-5">
            <h2 className="text-sm font-semibold">내 단어장에 담기</h2>
            <p className="mt-2 text-xs leading-6 text-muted">
              {demo
                ? '체험 내용은 이 브라우저에만 저장돼요.'
                : '저장한 단어는 내 계정에 안전하게 보관돼요.'}
            </p>
            {error ? (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {error}
              </p>
            ) : null}
            <button
              disabled={busy || (!online && !demo)}
              className="btn btn-primary mt-5 w-full"
              type="submit"
            >
              <Save size={16} />
              {busy ? '저장 중…' : '단어 저장하기'}
            </button>
            {!word ? (
              <p className="mt-4 text-xs leading-6 text-muted">
                저장하면 이 화면에서 다음 단어를 바로 추가할 수 있어요.
              </p>
            ) : (
              <button
                disabled={busy || (!online && !demo)}
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn mt-3 w-full text-red-600 hover:bg-red-50"
              >
                <Trash2 size={15} />이 단어 삭제
              </button>
            )}
          </div>
          <div className="flex gap-2 rounded-xl bg-brand-soft p-4 text-xs leading-6 text-brand">
            <Info size={16} className="mt-1 shrink-0" />
            <p>
              예문에 단어를 넣어두면
              <br />
              직접 쓰기 연습에서 빈칸 문제로 만날 수 있어요.
            </p>
          </div>
        </aside>
      </form>
      <LeaveGuard dirty={dirty || busy} allowLeave={allowLeave} busy={busy} />
      {confirmDelete ? (
        <Modal
          title="이 단어를 삭제할까요?"
          onClose={() => {
            if (!busy) setConfirmDelete(false)
          }}
        >
          <p className="text-sm leading-6 text-muted">
            ‘{word?.word}’와 이 단어의 복습 일정이 삭제돼요. {demo ? '' : '앱에서도 함께 삭제되며 '}
            되돌릴 수 없어요.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              disabled={busy}
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmDelete(false)}
            >
              취소
            </button>
            <button
              disabled={busy}
              type="button"
              className="btn bg-red-600 text-white"
              onClick={remove}
            >
              {busy ? '삭제 중…' : '삭제하기'}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
