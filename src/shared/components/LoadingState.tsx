import { LoaderCircle } from 'lucide-react'
export default function LoadingState() {
  return <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted"><LoaderCircle className="animate-spin" size={20} />단어장을 불러오고 있어요.</div>
}
