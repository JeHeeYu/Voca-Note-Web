import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { useVocaStore } from '@/shared/stores/vocaStore'
export default function Toast() {
  const message = useVocaStore((state) => state.toast)
  useEffect(() => { if (!message) return; const timer = setTimeout(() => useVocaStore.setState({ toast: null }), 4500); return () => clearTimeout(timer) }, [message])
  return message ? <div role="status" className="fixed right-4 bottom-24 left-4 z-50 flex items-center gap-3 rounded-xl bg-ink px-5 py-4 text-sm text-white shadow-lg sm:right-6 sm:left-auto lg:bottom-6"><CheckCircle2 size={18} className="shrink-0 text-lime" />{message}<button className="ml-3 p-1" aria-label="알림 닫기" onClick={() => useVocaStore.setState({ toast: null })}><X size={16} /></button></div> : null
}
