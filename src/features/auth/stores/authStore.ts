import { create } from 'zustand'
import type { User } from 'firebase/auth'

interface AuthState {
  user: User | null
  ready: boolean
  demo: boolean
  error: string | null
  setUser: (user: User | null) => void
  enterDemo: () => void
  leaveDemo: () => void
}
export const useAuthStore = create<AuthState>((set) => ({
  user: null, ready: false, demo: false, error: null,
  setUser: (user) => set({ user, ready: true, demo: false, error: null }),
  enterDemo: () => set({ demo: true, ready: true, error: null }),
  leaveDemo: () => set({ demo: false }),
}))
