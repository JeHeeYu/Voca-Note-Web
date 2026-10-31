import { BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'
export default function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="py-16 text-center"><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><BookOpen size={25} /></div><h2 className="font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-sm px-4 text-sm leading-6 text-muted">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div>
}
