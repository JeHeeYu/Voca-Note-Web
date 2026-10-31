import { BookOpen, LayoutDashboard, Layers, Settings2, ArrowUpRight, Leaf, Cloud, WifiOff } from 'lucide-react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useVocaStore } from '@/shared/stores/vocaStore'
import { studyStats } from '@/shared/models/study'
import { useNow } from '@/shared/hooks/useNow'
import { useOnline } from '@/shared/hooks/useOnline'
import LoadingState from '@/shared/components/LoadingState'
import Toast from '@/shared/components/Toast'

const navigation = [
  { to: '/', label: '오늘의 학습', icon: LayoutDashboard, end: true },
  { to: '/words', label: '나의 단어장', icon: BookOpen, end: false },
  { to: '/review', label: '단어 연습', icon: Layers, end: false },
  { to: '/settings', label: '내 학습 설정', icon: Settings2, end: false },
]
export default function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const demo = useAuthStore((state) => state.demo)
  const { loading, error, pending, fromCache, sessions, settings } = useVocaStore()
  const now = useNow()
  const online = useOnline()
  const stats = studyStats(sessions, now)
  const name = demo ? '체험 중' : user?.displayName?.split(' ')[0] || '나의 공간'
  return <div className="min-h-dvh">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">본문으로 이동</a>
    <aside className="fixed inset-y-0 left-0 hidden w-[236px] flex-col border-r border-line bg-white px-5 py-8 lg:flex">
      <Link to="/" className="flex items-center gap-2.5 px-3"><img src="/favicon.svg" width="34" height="34" alt="" /><span className="text-xl font-bold tracking-tight">voca<span className="font-normal text-muted">note</span><span className="text-brand">.</span></span></Link>
      <p className="eyebrow mt-12 mb-4 px-4 text-muted/70">My workspace</p>
      <nav aria-label="메인 메뉴" className="space-y-2">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium ${isActive ? 'bg-brand-soft font-semibold text-brand' : 'text-muted hover:bg-canvas hover:text-ink'}`}><Icon size={19} strokeWidth={1.7} />{label}</NavLink>)}</nav>
      <div className="mt-auto rounded-2xl bg-canvas p-4"><Leaf size={21} className="mb-3 text-brand" /><p className="text-sm font-semibold">조금씩, 매일 쌓이는 힘</p><p className="mt-2 text-xs leading-5 text-muted">오늘의 작은 반복이<br />내일의 자연스러운 영어가 돼요.</p><div className="mt-4 flex justify-between text-xs"><span>오늘의 목표</span><span className="font-semibold text-brand">{stats.todayCount} / {settings.dailyGoal}</span></div><progress max={settings.dailyGoal} value={Math.min(stats.todayCount, settings.dailyGoal)} aria-label="오늘 목표 진행률" className="mt-2 h-1.5 w-full overflow-hidden rounded-full accent-brand" /></div>
      <Link to="/settings" className="mt-5 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-canvas"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eee9dd] text-sm font-bold text-[#8c7750]">{name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="mt-0.5 text-[11px] text-muted">{demo ? '샘플 단어장' : '나만의 학습 공간'}</p></div><Settings2 size={16} className="text-muted" /></Link>
    </aside>
    <div className="lg:pl-[236px]">
      <header className="flex h-[76px] items-center justify-between border-b border-line bg-white/80 px-5 sm:px-8 xl:px-12"><Link to="/" className="flex items-center gap-2 text-sm font-semibold lg:hidden"><img src="/favicon.svg" width="28" height="28" alt="" />Voca Note</Link><span className="hidden text-xs text-muted lg:inline">나의 공간 <span className="mx-3 text-line">/</span><span className="text-ink">Voca Note</span></span><div className="flex items-center gap-5"><span className="hidden text-xs text-muted sm:inline">{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(now)}</span><span className="flex items-center gap-1.5 text-[11px] text-muted">{!online ? <WifiOff size={14} /> : <Cloud size={14} />}<span>{demo ? '체험 모드' : !online ? '오프라인' : pending ? '저장 중' : fromCache ? '연결 중' : '동기화됨'}</span></span></div></header>
      {demo ? <div className="flex flex-wrap items-center justify-center gap-2 border-b border-[#e6dfc8] bg-[#faf6e9] px-5 py-2.5 text-xs text-[#827044]"><span>샘플 단어로 체험 중이에요. 변경 내용은 이 브라우저에만 저장돼요.</span><button onClick={() => useAuthStore.getState().leaveDemo()} className="inline-flex items-center gap-1 font-bold underline underline-offset-4">내 계정으로 로그인<ArrowUpRight size={13} /></button></div> : null}
      {!online && !demo ? <div role="status" className="bg-amber-50 px-6 py-3 text-sm text-amber-900">인터넷 연결이 끊겼어요. 연결 후 저장과 복습을 계속할 수 있어요.</div> : null}
      <main id="main" className="mx-auto max-w-[1480px] px-5 pt-8 pb-28 sm:px-8 lg:pb-12 xl:px-12 xl:pt-10">
        {error ? <div role="alert" className="card mb-5 border-red-200 p-5 text-sm text-red-700">{error}<button onClick={() => window.location.reload()} className="ml-3 underline">다시 연결</button></div> : null}
        {loading ? <LoadingState /> : error ? null : <Outlet />}
      </main>
    </div>
    <nav aria-label="모바일 메뉴" className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-4 border-t border-line bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-medium ${isActive ? 'text-brand' : 'text-muted'}`}><Icon size={21} />{label}</NavLink>)}</nav>
    <Toast />
  </div>
}
