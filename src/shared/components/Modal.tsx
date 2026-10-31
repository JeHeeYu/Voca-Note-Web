import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
export default function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus() }
  }, [])
  return <dialog ref={ref} aria-labelledby="modal-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/30 backdrop:backdrop-blur-sm">
    <div className="p-6"><div className="mb-4 flex items-center justify-between gap-4"><h2 id="modal-title" className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="btn btn-quiet p-2" aria-label="닫기"><X size={20} /></button></div>{children}</div>
  </dialog>
}
