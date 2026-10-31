export const PARTS_OF_SPEECH = {
  noun: '명사 (n)',
  pronoun: '대명사 (pron)',
  verb: '동사 (v)',
  adjective: '형용사 (adj)',
  adverb: '부사 (adv)',
  preposition: '전치사 (prep)',
  conjunction: '접속사 (conj)',
  interjection: '감탄사 (interj)',
} as const

export const RELATED_FIELDS = {
  synonyms: '유의어',
  antonyms: '반의어',
  derivatives: '파생어',
  confusableWords: '혼동어',
  collocations: '숙어·연어',
} as const

export type PartOfSpeech = keyof typeof PARTS_OF_SPEECH
export type RelatedField = keyof typeof RELATED_FIELDS
export type WordDraft = {
  word: string
  meaning: string
  partOfSpeech: PartOfSpeech | null
  example: string
  note: string
} & Record<RelatedField, string[]>

export interface SavedWord extends WordDraft {
  id: string
  correctCount: number
  incorrectCount: number
  reviewStreak: number
  reviewIntervalDays: number
  createdAt: number | null
  updatedAt: number | null
  lastReviewedAt: number | null
  nextReviewAt: number | null
}

export const emptyDraft = (): WordDraft => ({
  word: '',
  meaning: '',
  partOfSpeech: null,
  example: '',
  note: '',
  synonyms: [],
  antonyms: [],
  derivatives: [],
  confusableWords: [],
  collocations: [],
})

export const accuracy = (word: SavedWord) => {
  const total = word.correctCount + word.incorrectCount
  return total ? word.correctCount / total : 0
}
export const isDue = (word: SavedWord, now = Date.now()) =>
  word.nextReviewAt === null || word.nextReviewAt <= now
export const needsPractice = (word: SavedWord) => word.incorrectCount > 0 && accuracy(word) < 0.8

export const normalizeTerms = (values: string[]) => {
  const seen = new Set<string>()
  return values
    .map((v) => v.trim())
    .filter((v) => {
      if (!v || seen.has(v.toLowerCase())) return false
      seen.add(v.toLowerCase())
      return true
    })
}

export function normalizeDraft(draft: WordDraft): WordDraft {
  return {
    word: draft.word.trim(),
    meaning: draft.meaning.trim(),
    partOfSpeech: draft.partOfSpeech,
    example: draft.example.trim(),
    note: draft.note.trim(),
    synonyms: normalizeTerms(draft.synonyms),
    antonyms: normalizeTerms(draft.antonyms),
    derivatives: normalizeTerms(draft.derivatives),
    confusableWords: normalizeTerms(draft.confusableWords),
    collocations: normalizeTerms(draft.collocations),
  }
}
