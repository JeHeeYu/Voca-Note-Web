import type { ReactNode } from 'react'

interface Props {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}
export default function PageHeader({ eyebrow, title, description, action }: Props) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-3 text-brand">{eyebrow}</p>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </header>
  )
}
