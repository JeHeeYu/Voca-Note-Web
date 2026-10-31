import { studyStats, dateKey } from '@/shared/models/study'
import type { ReviewSession } from '@/shared/models/review'

export default function WeeklyActivity({ sessions, now, goal }: { sessions: ReviewSession[]; now: number; goal: number }) {
  const { week, total } = studyStats(sessions, now)
  const ceiling = Math.max(goal, ...week.map((day) => day.total))
  return <section className="card p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">차곡차곡, 이번 주</h2><p className="mt-1.5 text-xs text-muted">최근 7일 동안 <span className="font-semibold text-brand">{total}문제</span>를 풀었어요</p></div><span className="rounded-md bg-canvas px-2 py-1 text-[10px] text-muted">최근 7일</span></div><div className="mt-7 flex h-40 items-end gap-3 sm:gap-5">{week.map((day) => {
    const today = dateKey(day.date) === dateKey(now)
    return <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-muted">{day.total || '—'}</span><div className="flex h-24 w-full max-w-8 items-end rounded-md bg-canvas"><div role="img" aria-label={`${new Date(day.date).getMonth() + 1}월 ${new Date(day.date).getDate()}일 ${day.total}문제`} className={`w-full rounded-md ${today ? 'bg-brand' : 'bg-[#c8ddcb]'}`} style={{ height: `${Math.max(day.total ? 6 : 0, day.total / ceiling * 100)}%` }} /></div><span className={`text-xs ${today ? 'font-bold text-brand' : 'text-muted'}`}>{today ? '오늘' : new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(day.date)}</span></div>
  })}</div></section>
}
