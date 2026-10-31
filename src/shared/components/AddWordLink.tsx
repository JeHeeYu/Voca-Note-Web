import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
export default function AddWordLink() { return <Link to="/words/new" className="btn btn-primary"><Plus size={17} />새 단어 추가</Link> }
