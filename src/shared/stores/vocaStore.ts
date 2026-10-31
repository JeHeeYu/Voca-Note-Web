import { create } from 'zustand'
import { DEFAULT_SETTINGS } from '@/shared/models/review'
import type { VocaRepository, VocaSnapshot } from '@/shared/repositories/vocaRepository'

interface VocaState extends VocaSnapshot {
  repository: VocaRepository | null
  loading: boolean
  error: string | null
  toast: string | null
}
export const emptyVocaState = {
  words: [],
  settings: DEFAULT_SETTINGS,
  sessions: [],
  pending: false,
  fromCache: false,
  repository: null,
  loading: true,
  error: null,
  toast: null,
}
export const useVocaStore = create<VocaState>(() => emptyVocaState)
export const notify = (toast: string) => useVocaStore.setState({ toast })
