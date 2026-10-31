import WordMeanings from '@/shared/components/WordMeanings'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Flame,
  Target,
  Sparkles,
  Check,
  Clock3,
} from 'lucide-react'
import { useVocaStore } from '@/shared/stores/vocaStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { isDue, needsPractice } from '@/shared/models/word'
import { studyStats } from '@/shared/models/study'
import { useNow } from '@/shared/hooks/useNow'
import PageHeader from '@/shared/components/PageHeader'
import EmptyState from '@/shared/components/EmptyState'
import SpeakButton from '@/shared/components/SpeakButton'
import AddWordLink from '@/shared/components/AddWordLink'
import WeeklyActivity from '../components/WeeklyActivity'

export default function HomePage() {
  const { words, sessions, settings } = useVocaStore()
  const user = useAuthStore((state) => state.user)
  const now = useNow()
  const stats = studyStats(sessions, now)
  const due = words.filter((word) => isDue(word, now))
  const mistakes = words.filter(needsPractice)
  const recent = [...words].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 5)
  const progress = Math.min(100, Math.round((stats.todayCount / settings.dailyGoal) * 100))
  const cards = [
    {
      label: '나의 단어',
      value: words.length,
      unit: '개',
      sub: '하나씩 모은 나만의 표현',
      icon: BookOpen,
      color: 'bg-[#eef2e9] text-[#779151]',
    },
    {
      label: '연속 학습',
      value: stats.streak,
      unit: '일',
      sub: stats.streak ? '오늘도 좋은 흐름을 이어가요' : '오늘부터 첫 기록을 만들어봐요',
      icon: Flame,
      color: 'bg-[#fcf1e8] text-[#c58d54]',
    },
    {
      label: '최근 7일 정확도',
      value: stats.accuracy ?? '—',
      unit: stats.accuracy === null ? '' : '%',
      sub: stats.total
        ? `${stats.total}문제를 풀며 다진 기억`
        : '첫 연습을 마치면 확인할 수 있어요',
      icon: Target,
      color: 'bg-[#eef0f8] text-[#858bad]',
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="A little progress, every day"
        title={`${user?.displayName ? `${user.displayName.split(' ')[0]}님, ` : ''}오늘도 한 단어씩.`}
        description="어제 만난 단어를 다시 꺼내볼까요? 작은 반복이 오래가는 기억을 만들어요."
        action={<AddWordLink />}
      />
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        {cards.map(({ label, value, unit, sub, icon: Icon, color }) => (
          <section key={label} className="card flex justify-between p-3 sm:p-5 xl:p-6">
            <div>
              <p className="text-[10px] font-medium text-muted sm:text-xs">{label}</p>
              <p className="mt-3 text-2xl sm:text-[30px] font-semibold leading-none tracking-tight">
                {value}
                <span className="ml-1 text-sm font-medium text-muted">{unit}</span>
              </p>
              <p className="mt-3 hidden text-[11px] text-muted sm:block">{sub}</p>
            </div>
            <span className={`hidden size-10 place-items-center rounded-xl sm:grid ${color}`}>
              <Icon size={19} strokeWidth={1.6} />
            </span>
          </section>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl bg-[#174f46] p-6 text-white sm:p-8">
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-2 text-xs text-[#c1d8ca]">
              <span className="size-1.5 rounded-full bg-lime" />
              TODAY’S FOCUS
            </div>
            <h2 className="mt-6 text-2xl leading-snug font-semibold tracking-tight">
              {due.length ? (
                <>
                  다시 만나면,
                  <br />더 오래 기억할 수 있어요.
                </>
              ) : words.length ? (
                <>
                  오늘의 복습을 마쳤어요.
                  <br />
                  정말 잘하고 있어요.
                </>
              ) : (
                <>
                  오래 기억하고 싶은
                  <br />첫 단어를 남겨보세요.
                </>
              )}
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-7 text-[#bed2c9]">
              {due.length ? (
                <>
                  복습을 기다리는 단어 <strong className="text-white">{due.length}개</strong>.<br />
                  잠깐의 집중으로 나의 단어로 만들어봐요.
                </>
              ) : words.length ? (
                '새로운 단어를 만나거나, 연습으로 기억을 더 단단하게 다져보세요.'
              ) : (
                '앱에서 저장한 단어는 같은 Google 계정으로 로그인하면 여기에 나타나요.'
              )}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                to={words.length ? `/review?scope=${due.length ? 'due' : 'all'}` : '/words/new'}
                className="btn bg-lime px-5 text-[#244e3a] hover:bg-[#cce4a5]"
              >
                {words.length ? '지금 복습하기' : '첫 단어 추가하기'}
                <ArrowRight size={16} />
              </Link>
              {words.length ? (
                <span className="flex items-center gap-1.5 text-xs text-[#bed2c9]">
                  <Clock3 size={13} />약{' '}
                  {Math.max(
                    1,
                    Math.ceil(Math.min(due.length || words.length, settings.sessionSize) / 3),
                  )}
                  분이면 충분해요
                </span>
              ) : null}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute top-10 right-[-35px] hidden rotate-[15deg] sm:block"
          >
            <div className="h-48 w-36 rounded-2xl border border-white/20 bg-white/5" />
            <div className="absolute top-8 -left-7 flex h-48 w-36 -rotate-[12deg] flex-col justify-between rounded-2xl border border-white/15 bg-[#276054] p-5">
              <Sparkles className="text-lime/70" size={22} />
              <span className="text-lg font-medium text-white/60">
                remember
                <br />
                <span className="text-xs font-normal">기억하다</span>
              </span>
              <div className="h-1 w-10 rounded bg-lime/40" />
            </div>
          </div>
        </section>
        <div className="space-y-5">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">오늘의 작은 목표</h2>
              <Link
                to="/settings"
                aria-label="학습 목표 설정"
                className="rounded p-1 text-muted hover:text-brand"
              >
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">{stats.todayCount}</span>
              <span className="text-sm text-muted">/ {settings.dailyGoal}문제</span>
              <span className="ml-auto text-sm font-semibold text-brand">{progress}%</span>
            </div>
            <progress
              value={progress}
              max={100}
              aria-label="일일 학습 목표 달성률"
              className="mt-3 h-2 w-full overflow-hidden rounded-full accent-brand"
            />
            <p className="mt-3 text-xs text-muted">
              {progress === 100
                ? '오늘의 목표를 달성했어요. 수고했어요!'
                : `${Math.max(0, settings.dailyGoal - stats.todayCount)}문제만 더 풀면 오늘의 목표에 도착해요.`}
            </p>
          </section>
          <div className="flex items-center gap-3 rounded-xl border border-[#e8e6db] bg-[#f4f3ec] px-5 py-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#9d986e]">
              <Check size={16} />
            </span>
            <p className="text-xs leading-6 text-[#817d63]">
              완벽하게 외우기보다,
              <br />
              <strong className="font-semibold text-[#65614c]">
                자주 다시 만나는 것이 중요해요.
              </strong>
            </p>
          </div>
        </div>
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">최근에 담은 단어</h2>
              <span className="text-xs text-muted">{words.length}</span>
            </div>
            <Link
              to="/words"
              className="flex items-center gap-1 text-xs text-muted hover:text-brand"
            >
              전체 보기
              <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length ? (
            <div>
              {recent.map((word) => (
                <div
                  key={word.id}
                  className="flex items-center gap-3 border-b border-line px-6 py-3.5 last:border-0"
                >
                  <Link to={`/words/${word.id}`} className="group min-w-0 flex-1">
                    <span className="font-semibold group-hover:text-brand">{word.word}</span>
                    <div className="mt-1 text-muted">
                      <WordMeanings word={word} compact />
                    </div>
                  </Link>
                  <SpeakButton text={word.word} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="아직 비어 있는 나의 단어장"
              description="오늘 만난 단어 하나부터 시작해보세요."
              action={
                <Link className="btn btn-secondary" to="/words/new">
                  첫 단어 추가
                </Link>
              }
            />
          )}
        </section>
        <div className="space-y-5">
          <WeeklyActivity sessions={sessions} now={now} goal={settings.dailyGoal} />
          <Link
            to="/review?scope=mistakes"
            className="flex items-center justify-between rounded-xl border border-line px-5 py-4 hover:bg-white"
          >
            <div>
              <p className="text-sm font-semibold">조금 더 연습하면 좋을 단어</p>
              <p className="mt-1 text-xs text-muted">
                헷갈렸던 {mistakes.length}개를 다시 확인해요
              </p>
            </div>
            <ArrowRight size={18} className="text-muted" />
          </Link>
        </div>
      </div>
    </>
  )
}
