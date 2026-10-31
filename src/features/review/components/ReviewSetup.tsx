import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Layers, ListChecks, PencilLine, Headphones, Lightbulb } from 'lucide-react'
import { useVocaStore } from '@/shared/stores/vocaStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { isDue, needsPractice, type SavedWord } from '@/shared/models/word'
import { REVIEW_MODES, type ReviewMode } from '@/shared/models/review'
import { useOnline } from '@/shared/hooks/useOnline'
import { useNow } from '@/shared/hooks/useNow'
import { speechSupported } from '@/shared/lib/speech'
import PageHeader from '@/shared/components/PageHeader'
import EmptyState from '@/shared/components/EmptyState'

const icons = {
  recall: Layers,
  multiple_choice: ListChecks,
  writing: PencilLine,
  listening: Headphones,
}
export default function ReviewSetup({
  scope: initialScope,
  onStart,
}: {
  scope: string
  onStart: (words: SavedWord[], targets: SavedWord[], mode: ReviewMode, count: number) => void
}) {
  const [mode, setMode] = useState<ReviewMode>('recall')
  const [scope, setScope] = useState(initialScope)
  const { words, settings } = useVocaStore()
  const demo = useAuthStore((state) => state.demo)
  const online = useOnline()
  const now = useNow()
  const targets = words.filter((word) =>
    scope === 'due' ? isDue(word, now) : scope === 'mistakes' ? needsPractice(word) : true,
  )
  const uniqueMeanings = new Set(words.map((word) => word.meaning.trim().toLowerCase())).size
  const unsupported = mode === 'listening' && !speechSupported()
  const unavailable = mode === 'multiple_choice' && uniqueMeanings < 2
  return (
    <>
      <PageHeader
        eyebrow="Practice makes it yours"
        title="기억을 꺼내는 시간."
        description="읽기만 했던 단어를 떠올리고, 쓰고, 들어보세요. 나에게 맞는 방식으로 시작해요."
      />
      {!words.length ? (
        <div className="card">
          <EmptyState
            title="연습할 단어를 먼저 담아주세요."
            description="단어와 뜻을 기록하면 네 가지 방식으로 학습할 수 있어요."
            action={
              <Link to="/words/new" className="btn btn-primary">
                첫 단어 추가
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="grid gap-4 sm:grid-cols-2" role="group" aria-label="연습 방식">
              {(
                Object.entries(REVIEW_MODES) as [ReviewMode, (typeof REVIEW_MODES)[ReviewMode]][]
              ).map(([key, value]) => {
                const Icon = icons[key]
                return (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    aria-pressed={mode === key}
                    className={`relative rounded-2xl border p-6 text-left transition-colors ${mode === key ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line bg-white hover:border-brand/40'}`}
                  >
                    <span
                      className={`mb-7 grid size-11 place-items-center rounded-xl ${mode === key ? 'bg-brand text-white' : 'bg-canvas text-muted'}`}
                    >
                      <Icon size={21} strokeWidth={1.6} />
                    </span>
                    <p className="mb-2 text-[10px] tracking-widest text-muted uppercase">
                      {value.english}
                    </p>
                    <h2 className="text-lg font-semibold">{value.label}</h2>
                    <p className="mt-2 text-xs leading-6 text-muted">{value.description}</p>
                    <span
                      className={`absolute top-6 right-6 size-4 rounded-full border ${mode === key ? 'border-4 border-brand bg-white' : 'border-line'}`}
                    />
                  </button>
                )
              })}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#efefe5] p-5">
              <Lightbulb size={19} className="mt-0.5 shrink-0 text-[#94916a]" />
              <p className="text-xs leading-6 text-[#7e7c60]">
                답이 바로 떠오르지 않아도 괜찮아요.
                <br />
                기억하려고 노력하는 그 순간에도, 배움은 쌓이고 있어요.
              </p>
            </div>
          </div>
          <section className="card p-6">
            <h2 className="font-semibold">이번에는 무엇을 연습할까요?</h2>
            <div className="mt-5 space-y-2">
              {[
                {
                  key: 'all',
                  title: '전체 단어',
                  sub: '복습할 단어를 우선으로 골라요',
                  count: words.length,
                },
                {
                  key: 'due',
                  title: '오늘 복습',
                  sub: '다시 만날 시간이 된 단어만',
                  count: words.filter((w) => isDue(w, now)).length,
                },
                {
                  key: 'mistakes',
                  title: '오답 노트',
                  sub: '헷갈렸던 단어를 한 번 더',
                  count: words.filter(needsPractice).length,
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${scope === item.key ? 'border-brand/30 bg-brand-soft/50' : 'border-line'}`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={item.key}
                    checked={scope === item.key}
                    onChange={() => setScope(item.key)}
                    className="size-4 accent-brand"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-[11px] text-muted">{item.sub}</p>
                  </div>
                  <span className="text-xs text-muted">{item.count}개</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-between border-t border-line pt-5 text-sm">
              <span className="text-muted">이번 세션</span>
              <span className="font-semibold">
                {Math.min(targets.length, settings.sessionSize)}개 단어
              </span>
            </div>
            <p className="mt-3 text-xs leading-6 text-muted">
              학습 결과에 맞춰 다음 복습 시간이 자동으로 정해져요.
            </p>
            {unsupported || unavailable ? (
              <p role="status" className="mt-3 text-xs leading-6 text-amber-700">
                {unsupported
                  ? '이 브라우저는 음성 재생을 지원하지 않아요. 다른 연습 방식을 선택해 주세요.'
                  : '뜻 고르기는 서로 다른 뜻을 가진 단어가 2개 이상 필요해요.'}
              </p>
            ) : null}
            <button
              disabled={!targets.length || unsupported || unavailable || (!online && !demo)}
              onClick={() => onStart(words, targets, mode, settings.sessionSize)}
              className="btn btn-primary mt-6 w-full"
            >
              연습 시작하기
              <ArrowRight size={16} />
            </button>
            <Link
              to="/settings"
              className="mt-4 block text-center text-xs text-muted underline underline-offset-4"
            >
              한 번에 연습할 분량 바꾸기
            </Link>
          </section>
        </div>
      )}
    </>
  )
}
