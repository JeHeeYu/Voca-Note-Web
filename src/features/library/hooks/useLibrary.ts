import { useDeferredValue, useMemo, useState } from 'react'
import { accuracy, isDue, needsPractice, PARTS_OF_SPEECH, type SavedWord } from '@/shared/models/word'

export type WordFilter = 'all' | 'due' | 'mistakes'
export function useLibrary(words: SavedWord[], now: number) {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [filter, setFilter] = useState<WordFilter>('all')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    return words.filter((word) => {
      if (filter === 'due' && !isDue(word, now)) return false
      if (filter === 'mistakes' && !needsPractice(word)) return false
      return !term || [word.word, word.meaning, word.example, word.note, word.partOfSpeech ? PARTS_OF_SPEECH[word.partOfSpeech] : '', ...word.synonyms, ...word.antonyms, ...word.derivatives, ...word.confusableWords, ...word.collocations].join(' ').toLowerCase().includes(term)
    }).sort((a, b) => sort === 'alphabet' ? a.word.localeCompare(b.word) : sort === 'priority' ? Number(isDue(b, now)) - Number(isDue(a, now)) || accuracy(a) - accuracy(b) || b.incorrectCount - a.incorrectCount : (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }, [words, deferredSearch, filter, sort, now])
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20))
  const currentPage = Math.min(page, totalPages)
  return { search, setSearch: (value: string) => { setSearch(value); setPage(1) }, filter, setFilter: (value: WordFilter) => { setFilter(value); setPage(1) }, sort, setSort: (value: string) => { setSort(value); setPage(1) }, page: currentPage, setPage, totalPages, filtered, visible: filtered.slice((currentPage - 1) * 20, currentPage * 20) }
}
