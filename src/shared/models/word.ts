export const LEGACY_PARTS_OF_SPEECH = {
  noun: '명사 (n)',
  pronoun: '대명사 (pron)',
  verb: '동사 (v)',
  adjective: '형용사 (adj)',
  adverb: '부사 (adv)',
  preposition: '전치사 (prep)',
  conjunction: '접속사 (conj)',
  interjection: '감탄사 (interj)',
} as const

export const PARTS_OF_SPEECH = {
  ...LEGACY_PARTS_OF_SPEECH,
  phrase: '구 (phr)',
  phrasal_verb: '구동사 (phr v)',
  idiom: '관용구 (idiom)',
  abbreviation: '약어 (abbr)',
} as const

export const MAX_MEANINGS = 10
export interface WordMeaning {
  meaning: string
  partOfSpeech: PartOfSpeech | null
}

export const isPartOfSpeech = (value: unknown): value is PartOfSpeech =>
  typeof value === 'string' && Object.hasOwn(PARTS_OF_SPEECH, value)

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
  meanings: WordMeaning[]
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
  meanings: [],
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
  const meanings = wordMeanings(draft).map((entry) => ({
    meaning: entry.meaning.trim(),
    partOfSpeech: entry.partOfSpeech,
  }))
  return {
    word: draft.word.trim(),
    meaning: meanings[0].meaning,
    partOfSpeech: meanings[0].partOfSpeech,
    meanings,
    example: draft.example.trim(),
    note: draft.note.trim(),
    synonyms: normalizeTerms(draft.synonyms),
    antonyms: normalizeTerms(draft.antonyms),
    derivatives: normalizeTerms(draft.derivatives),
    confusableWords: normalizeTerms(draft.confusableWords),
    collocations: normalizeTerms(draft.collocations),
  }
}

// Structured meanings are authoritative; old documents fall back to the flat fields.
export function wordMeanings(
  word: Pick<WordDraft, 'meaning' | 'partOfSpeech'> & { meanings?: WordMeaning[] },
): WordMeaning[] {
  return word.meanings?.length
    ? word.meanings
    : [{ meaning: word.meaning, partOfSpeech: word.partOfSpeech }]
}

export const meaningText = (word: WordDraft) =>
  wordMeanings(word)
    .map((entry) => entry.meaning)
    .join('; ')

export function splitMeaningEntries(entries: WordMeaning[], index: number): WordMeaning[] {
  const entry = entries[index]
  if (!entry) return entries
  const split = entry.meaning
    .split(/[,，]/)
    .map((meaning) => meaning.trim())
    .filter(Boolean)
  if (split.length < 2 || entries.length - 1 + split.length > MAX_MEANINGS) return entries
  return [
    ...entries.slice(0, index),
    ...split.map((meaning) => ({ ...entry, meaning })),
    ...entries.slice(index + 1),
  ]
}
