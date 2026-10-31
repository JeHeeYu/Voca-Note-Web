import type { ReviewAnswer, ReviewMode, ReviewSession, ReviewSettings } from '@/shared/models/review'
import type { SavedWord, WordDraft } from '@/shared/models/word'

export interface VocaSnapshot {
  words: SavedWord[]
  settings: ReviewSettings
  sessions: ReviewSession[]
  pending: boolean
  fromCache: boolean
}
export interface VocaRepository {
  subscribe(onChange: (data: VocaSnapshot) => void, onError: (error: unknown) => void): () => void
  saveWord(draft: WordDraft, id?: string): Promise<string>
  deleteWord(id: string): Promise<void>
  saveSettings(settings: ReviewSettings): Promise<void>
  saveSession(id: string, mode: ReviewMode, answers: ReviewAnswer[]): Promise<void>
}
