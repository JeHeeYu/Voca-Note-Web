import {
  normalizeDraft,
  RELATED_FIELDS,
  MAX_MEANINGS,
  isPartOfSpeech,
  type SavedWord,
  type WordDraft,
} from '@/shared/models/word'

export function validateWord(draft: WordDraft, existing: SavedWord[], editingId?: string) {
  const clean = normalizeDraft(draft)
  const errors: WordValidationErrors = {}
  if (!clean.word) errors.word = '영어 단어를 입력해 주세요.'
  else if (clean.word.length > 80) errors.word = '단어는 80자 이내로 입력해 주세요.'
  else if (
    existing.some(
      (w) => w.id !== editingId && w.word.trim().toLowerCase() === clean.word.toLowerCase(),
    )
  )
    errors.word = '이미 단어장에 있는 단어예요.'
  if (clean.meanings.length > MAX_MEANINGS)
    errors.meanings = `뜻은 최대 ${MAX_MEANINGS}개까지 추가할 수 있어요.`
  clean.meanings.forEach((entry, index) => {
    if (!entry.meaning) errors[`meaning-${index}`] = '뜻을 입력해 주세요.'
    else if (entry.meaning.length > 300)
      errors[`meaning-${index}`] = '각 뜻은 300자 이내로 입력해 주세요.'
    if (entry.partOfSpeech !== null && !isPartOfSpeech(entry.partOfSpeech))
      errors[`partOfSpeech-${index}`] = '품사·표현을 다시 선택해 주세요.'
  })
  if (clean.example.length > 500) errors.example = '예문은 500자 이내로 입력해 주세요.'
  if (clean.note.length > 1000) errors.note = '메모는 1,000자 이내로 입력해 주세요.'
  for (const key of Object.keys(RELATED_FIELDS) as (keyof typeof RELATED_FIELDS)[]) {
    if (clean[key].length > 20) errors[key] = '최대 20개까지 입력할 수 있어요.'
    else if (clean[key].some((term) => term.length > 80))
      errors[key] = '각 항목은 80자 이내로 입력해 주세요.'
  }
  return errors
}

export type WordValidationErrors = Partial<
  Record<keyof WordDraft | `meaning-${number}` | `partOfSpeech-${number}`, string>
>
