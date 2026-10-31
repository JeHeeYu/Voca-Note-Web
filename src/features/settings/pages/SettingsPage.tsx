import { useRef, useState, type FormEvent } from 'react'
import { signOut } from 'firebase/auth'
import { Download, LogOut, Check, Target, Layers, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useVocaStore, notify } from '@/shared/stores/vocaStore'
import { auth } from '@/shared/lib/firebase'
import { errorMessage } from '@/shared/lib/errors'
import { useOnline } from '@/shared/hooks/useOnline'
import PageHeader from '@/shared/components/PageHeader'
import LeaveGuard from '@/shared/components/LeaveGuard'
import type { ReviewSettings } from '@/shared/models/review'

export default function SettingsPage() {
  const { user, demo } = useAuthStore()
  const { words, sessions, settings, pending } = useVocaStore()
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), words, settings, sessions }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `voca-note-${new Date().toISOString().slice(0, 10)}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('단어장 백업 파일을 내려받았어요.')
  }
  const logout = async () => {
    setError(''); setLeaving(true)
    try { if (demo) useAuthStore.getState().leaveDemo(); else if (auth) await signOut(auth) }
    catch (cause) { setError(errorMessage(cause)); setLeaving(false) }
  }
  return <><PageHeader eyebrow="At your own pace" title="나에게 맞는 학습 리듬." description="부담 없이 꾸준히 이어갈 수 있도록, 나만의 목표를 정해보세요." />
    <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]"><SettingsForm key={`${settings.dailyGoal}-${settings.sessionSize}`} settings={settings} /><div className="space-y-6"><section className="card p-6 sm:p-7"><h2 className="font-semibold">연결된 계정</h2><div className="mt-5 flex items-center gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand">{demo ? 'V' : (user?.displayName || 'V').slice(0, 1)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{demo ? '체험 중인 단어장' : user?.displayName || 'Voca Note 사용자'}</p><p className="mt-1 break-all text-xs text-muted">{demo ? '샘플 데이터 · 브라우저 저장' : user?.email}</p></div></div><div className="mt-5 flex items-start gap-2 rounded-xl bg-canvas p-4 text-xs leading-6 text-muted"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand" /><span>{demo ? '체험 데이터는 실제 계정과 분리되어 있어요.' : '같은 Google 계정으로 로그인한 앱과 웹에서 단어·복습 기록·설정이 연결돼요.'}</span></div>{error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}<button disabled={pending || leaving} className="btn btn-secondary mt-5 w-full" onClick={logout}><LogOut size={16} />{demo ? '체험 종료하고 로그인' : leaving ? '로그아웃 중…' : '로그아웃'}</button></section><section className="card p-6 sm:p-7"><h2 className="font-semibold">나의 기록 보관하기</h2><p className="mt-2 text-sm leading-7 text-muted">단어 {words.length}개와 최근 학습 기록을<br />JSON 파일로 내려받을 수 있어요.</p><button onClick={exportData} className="btn btn-secondary mt-5 w-full"><Download size={16} />단어장 백업 내려받기</button><p className="mt-3 text-[11px] leading-5 text-muted">앱과 동일하게 최근 120개 세션을 포함해요.</p></section></div></div></>
}

function SettingsForm({ settings }: { settings: ReviewSettings }) {
  const [dailyGoal, setDailyGoal] = useState(String(settings.dailyGoal))
  const [sessionSize, setSessionSize] = useState(String(settings.sessionSize))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const repository = useVocaStore((state) => state.repository)
  const demo = useAuthStore((state) => state.demo)
  const online = useOnline()
  const allowLeave = useRef(false)
  const dirty = Number(dailyGoal) !== settings.dailyGoal || Number(sessionSize) !== settings.sessionSize
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!repository || busy) return
    const goal = Number(dailyGoal), size = Number(sessionSize)
    if (!Number.isInteger(goal) || goal < 5 || goal > 100 || !Number.isInteger(size) || size < 5 || size > 30) { setError('하루 목표는 5~100, 세션 분량은 5~30 사이의 정수로 입력해 주세요.'); return }
    setBusy(true); setError('')
    try { await repository.saveSettings({ dailyGoal: goal, sessionSize: size }); notify('학습 설정을 저장했어요.') }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <form onSubmit={save} className="card p-6 sm:p-7"><h2 className="font-semibold">학습 목표</h2><div className="mt-7 space-y-8"><div><label htmlFor="daily-goal" className="label flex items-center gap-2"><Target size={17} className="text-brand" />하루 학습 목표</label><p className="mb-4 text-xs text-muted">하루에 풀고 싶은 문제 수를 정해요. (5~100문제)</p><div className="flex items-center gap-3"><input id="daily-goal" type="number" className="field w-28" value={dailyGoal} min={5} max={100} step={1} onChange={(e) => setDailyGoal(e.target.value)} required /><span className="text-sm text-muted">문제 / 하루</span></div><div className="mt-3 flex flex-wrap gap-2">{[10, 15, 20, 30].map((value) => <button key={value} type="button" aria-pressed={Number(dailyGoal) === value} className={`rounded-lg border px-4 py-2 text-xs ${Number(dailyGoal) === value ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted'}`} onClick={() => setDailyGoal(String(value))}>{value}문제</button>)}</div></div><div className="border-t border-line pt-7"><label htmlFor="session-size" className="label flex items-center gap-2"><Layers size={17} className="text-brand" />한 번에 연습할 분량</label><p className="mb-4 text-xs text-muted">한 세션에서 만날 단어 수예요. (5~30개)</p><div className="flex items-center gap-3"><input id="session-size" type="number" className="field w-28" value={sessionSize} min={5} max={30} step={1} onChange={(e) => setSessionSize(e.target.value)} required /><span className="text-sm text-muted">개 / 세션</span></div></div></div><div className="mt-8 rounded-xl bg-brand-soft p-4 text-xs leading-6 text-brand">짧아도 매일 꾸준하게.<br />처음에는 하루 15문제, 한 번에 10개를 추천해요.</div>{error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}<button disabled={!dirty || busy || (!online && !demo)} className="btn btn-primary mt-6 w-full" type="submit"><Check size={16} />{busy ? '저장 중…' : '학습 설정 저장'}</button><LeaveGuard dirty={dirty || busy} allowLeave={allowLeave} busy={busy} /></form>
}
