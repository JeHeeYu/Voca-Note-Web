import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { ArrowRight, Check, Leaf, BookOpen, Volume2 } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { auth, firebaseConfigured } from '@/shared/lib/firebase'
import { errorMessage } from '@/shared/lib/errors'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const { user, demo, error: authError } = useAuthStore()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user || demo) return <Navigate to="/" replace />
  const login = async () => {
    if (!auth) return
    setBusy(true); setError('')
    try { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' }); await signInWithPopup(auth, provider) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <div className="grid min-h-dvh bg-white lg:grid-cols-2">
    <section className="flex flex-col px-7 py-9 sm:px-16 lg:px-[15%]"><LinkLogo /><div className="my-auto py-16"><p className="eyebrow mb-5 text-brand">Your words, your world</p><h1 className="text-4xl leading-[1.35] font-bold tracking-tight sm:text-[44px]">나의 단어,<br />나의 속도로.</h1><p className="mt-6 text-base leading-8 text-muted">스쳐 지나간 단어를 오래 남는 기억으로.<br />오늘도 Voca Note와 함께 쌓아가요.</p><div className="mt-10 space-y-3"><button onClick={login} disabled={busy || !firebaseConfigured} className="btn btn-secondary w-full gap-3 py-3.5"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.6Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.4 13.7a6 6 0 0 1 0-3.4V7.6H3a10 10 0 0 0 0 8.8Z"/><path fill="#ea4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.5 9.5 0 0 0 12 2a10 10 0 0 0-9 5.6l3.4 2.7C7.2 7.9 9.4 6.1 12 6.1Z"/></svg>{busy ? '로그인 중…' : 'Google로 시작하기'}</button><button disabled={busy} onClick={() => useAuthStore.getState().enterDemo()} className="btn btn-quiet w-full">먼저 둘러보기<ArrowRight size={16} /></button></div>{error || authError ? <p role="alert" className="mt-4 text-sm text-red-600">{error || authError}</p> : null}{!firebaseConfigured ? <p className="mt-4 text-sm text-muted">로그인 연결을 준비 중이에요. 먼저 샘플 단어장을 둘러보세요.</p> : null}<p className="mt-7 text-center text-xs leading-6 text-muted">앱에서 사용하던 Google 계정으로 로그인하면<br />단어와 학습 기록이 그대로 이어져요.</p></div><p className="text-xs text-muted">A little every day, a lot over time.</p></section>
    <section className="relative hidden flex-col items-center justify-center overflow-hidden bg-[#edf2e9] px-16 lg:flex"><div className="absolute -top-28 -right-20 size-96 rounded-full border border-brand/10" /><div className="absolute -bottom-48 -left-24 size-[550px] rounded-full border border-brand/10" /><div className="relative w-full max-w-[390px]"><div className="mb-6 flex items-center gap-2 text-brand"><Leaf size={18} /><span className="eyebrow">One word at a time</span></div><div className="rotate-[-3deg] rounded-3xl border border-white bg-white p-9 shadow-[0_20px_70px_-30px_#45604740]"><div className="flex justify-between"><span className="rounded-lg bg-brand-soft px-3 py-1.5 text-xs text-brand">오늘의 단어</span><BookOpen size={20} className="text-muted" /></div><h2 className="mt-10 text-4xl font-semibold tracking-tight">serendipity<span className="text-brand">.</span></h2><div className="mt-3 flex items-center gap-3 text-sm text-muted"><span>명사 (n)</span><Volume2 size={16} /></div><p className="mt-7 text-xl font-medium">뜻밖의 행운</p><p className="mt-4 text-sm leading-7 text-muted">“Finding this word was<br />pure serendipity.”</p><div className="mt-10 border-t border-line pt-5 text-xs text-muted">우연히 만난 단어가, 나의 것이 되는 순간.</div></div><div className="relative -mt-1 ml-auto flex w-fit rotate-3 items-center gap-3 rounded-xl bg-brand px-5 py-4 text-white shadow-lg"><span className="grid size-7 place-items-center rounded-full bg-white/15"><Check size={15} /></span><span className="text-sm">하나 더, 나의 단어가 되었어요.</span></div></div></section>
  </div>
}
function LinkLogo() { return <div className="flex items-center gap-2.5"><img src="/favicon.svg" alt="" width="36" height="36" /><span className="text-xl font-bold tracking-tight">voca<span className="font-normal text-muted">note</span>.</span></div> }
