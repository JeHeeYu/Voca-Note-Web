import { useEffect, type RefObject } from 'react'
import { useBlocker } from 'react-router-dom'
import Modal from './Modal'

export default function LeaveGuard({ dirty, allowLeave, busy = false }: { dirty: boolean; allowLeave: RefObject<boolean>; busy?: boolean }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !allowLeave.current && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty && !allowLeave.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, allowLeave])
  if (blocker.state !== 'blocked') return null
  return <Modal title={busy ? '저장이 진행 중이에요.' : '저장하지 않고 나갈까요?'} onClose={() => blocker.reset()}><p className="text-sm leading-6 text-muted">{busy ? '저장이 끝날 때까지 잠시 기다려 주세요.' : '이 화면에서 작성하거나 연습한 내용은 저장되지 않아요.'}</p><div className="mt-6 flex justify-end gap-2"><button className="btn btn-secondary" onClick={() => blocker.reset()}>계속하기</button><button disabled={busy} className="btn bg-red-50 text-red-700" onClick={() => blocker.proceed()}>나가기</button></div></Modal>
}
