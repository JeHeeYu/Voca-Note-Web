import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useVocaStore } from '@/shared/stores/vocaStore'
import EmptyState from '@/shared/components/EmptyState'
import WordEditorForm from '../components/WordEditorForm'

export default function WordEditorPage() {
  const { wordId } = useParams()
  const word = useVocaStore((state) => state.words.find((item) => item.id === wordId))
  if (wordId && !word) return <EmptyState title="단어를 찾을 수 없어요." description="다른 기기에서 삭제되었거나 주소가 변경되었을 수 있어요." action={<Link to="/words" className="btn btn-secondary">단어장으로</Link>} />
  return <><Link to="/words" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-brand"><ArrowLeft size={16} />나의 단어장</Link><WordEditorForm key={wordId ?? 'new'} word={word} /></>
}
