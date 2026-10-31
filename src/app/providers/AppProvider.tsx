import { useEffect, type PropsWithChildren } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/shared/lib/firebase'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { emptyVocaState, useVocaStore } from '@/shared/stores/vocaStore'
import { createDemoRepository } from '@/shared/repositories/demoVocaRepository'
import { errorMessage } from '@/shared/lib/errors'
import type { VocaRepository } from '@/shared/repositories/vocaRepository'

export default function AppProvider({ children }: PropsWithChildren) {
  const uid = useAuthStore((state) => state.user?.uid)
  const demo = useAuthStore((state) => state.demo)
  useEffect(() => {
    if (!auth) {
      useAuthStore.getState().setUser(null)
      return
    }
    return onAuthStateChanged(
      auth,
      (user) => useAuthStore.getState().setUser(user),
      (error) => useAuthStore.setState({ ready: true, error: errorMessage(error) }),
    )
  }, [])
  useEffect(() => {
    useVocaStore.setState(emptyVocaState)
    let active = true
    let unsubscribe = () => {}
    const connect = (repository: VocaRepository) => {
      if (!active) return
      useVocaStore.setState({ repository })
      unsubscribe = repository.subscribe(
        (data) => {
          if (active) useVocaStore.setState({ ...data, loading: false, error: null })
        },
        (error) => {
          if (active) useVocaStore.setState({ error: errorMessage(error), loading: false })
        },
      )
    }
    if (demo) connect(createDemoRepository())
    else if (uid) {
      Promise.all([
        import('@/shared/lib/firestore'),
        import('@/shared/repositories/firestoreVocaRepository'),
      ])
        .then(([{ database }, { createFirestoreRepository }]) => {
          if (database) connect(createFirestoreRepository(database, uid))
        })
        .catch((error) => {
          if (active) useVocaStore.setState({ error: errorMessage(error), loading: false })
        })
    }
    return () => {
      active = false
      unsubscribe()
      useVocaStore.setState(emptyVocaState)
    }
  }, [uid, demo])
  return children
}
