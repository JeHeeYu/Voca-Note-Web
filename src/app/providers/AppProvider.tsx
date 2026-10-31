import { useEffect, type PropsWithChildren } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, database } from '@/shared/lib/firebase'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { emptyVocaState, useVocaStore } from '@/shared/stores/vocaStore'
import { createFirestoreRepository } from '@/shared/repositories/firestoreVocaRepository'
import { createDemoRepository } from '@/shared/repositories/demoVocaRepository'
import { errorMessage } from '@/shared/lib/errors'

export default function AppProvider({ children }: PropsWithChildren) {
  const uid = useAuthStore((state) => state.user?.uid)
  const demo = useAuthStore((state) => state.demo)
  useEffect(() => {
    if (!auth) { useAuthStore.getState().setUser(null); return }
    return onAuthStateChanged(auth, (user) => useAuthStore.getState().setUser(user), (error) => useAuthStore.setState({ ready: true, error: errorMessage(error) }))
  }, [])
  useEffect(() => {
    useVocaStore.setState(emptyVocaState)
    const repository = demo ? createDemoRepository() : uid && database ? createFirestoreRepository(database, uid) : null
    if (!repository) return
    let active = true
    useVocaStore.setState({ repository })
    const unsubscribe = repository.subscribe(
      (data) => { if (active) useVocaStore.setState({ ...data, loading: false, error: null }) },
      (error) => { if (active) useVocaStore.setState({ error: errorMessage(error), loading: false }) },
    )
    return () => { active = false; unsubscribe(); useVocaStore.setState(emptyVocaState) }
  }, [uid, demo])
  return children
}
