import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { app } from './firebase'

export const database = app ? getFirestore(app) : null
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && database) {
  connectFirestoreEmulator(database, '127.0.0.1', 18180)
}
