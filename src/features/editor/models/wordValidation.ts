import { normalizeDraft, RELATED_FIELDS, type SavedWord, type WordDraft } from '@/shared/models/word'

export function validateWord(draft: WordDraft, existing: SavedWord[], editingId?: string) {
  const clean = normalizeDraft(draft)
  const errors: Partial<Record<keyof WordDraft, string>> = {}
  if (!clean.word) errors.word = '영어 단어를 입력해 주세요.'
  else if (clean.word.length > 80) errors.word = '단어는 80자 이내로 입력해 주세요.'
  else if (existing.some((w) => w.id !== editingId && w.word.trim().toLowerCase() === clean.word.toLowerCase())) errors.word = '이미 단어장에 있는 단어예요.'
  if (!clean.meaning) errors.meaning = '뜻을 입력해 주세요.'
  else if (clean.meaning.length > 300) errors.meaning = '뜻은 300자 이내로 입력해 주세요.'
  if (clean.example.length > 500) errors.example = '예문은 500자 이내로 입력해 주세요.'
  if (clean.note.length > 1000) errors.note = '메모는 1,000자 이내로 입력해 주세요.'
  for (const key of Object.keys(RELATED_FIELDS) as (keyof typeof RELATED_FIELDS)[]) {
    if (clean[key].length > 20) errors[key] = '최대 20개까지 입력할 수 있어요.'
    else if (clean[key].some((term) => term.length > 80)) errors[key] = '각 항목은 80자 이내로 입력해 주세요.'
  }
  return errors
}
