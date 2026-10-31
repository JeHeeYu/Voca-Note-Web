import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'
import { DEFAULT_SETTINGS, normalizeSettings, type ReviewSession } from '@/shared/models/review'
import { normalizeDraft, PARTS_OF_SPEECH, type SavedWord } from '@/shared/models/word'
import { scheduleReview } from '@/shared/models/study'
import type { VocaRepository, VocaSnapshot } from './vocaRepository'

const timestamp = (value: unknown): number | null =>
  value instanceof Timestamp ? value.toMillis() : null
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const count = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
const terms = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

export function decodeWord(id: string, data: DocumentData): SavedWord {
  return {
    id,
    word: text(data.word),
    meaning: text(data.meaning),
    partOfSpeech: data.partOfSpeech in PARTS_OF_SPEECH ? data.partOfSpeech : null,
    example: text(data.example),
    note: text(data.note),
    synonyms: terms(data.synonyms),
    antonyms: terms(data.antonyms),
    derivatives: terms(data.derivatives),
    confusableWords: terms(data.confusableWords),
    collocations: terms(data.collocations),
    correctCount: count(data.correctCount),
    incorrectCount: count(data.incorrectCount),
    reviewStreak: count(data.reviewStreak),
    reviewIntervalDays: count(data.reviewIntervalDays),
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt),
    lastReviewedAt: timestamp(data.lastReviewedAt),
    nextReviewAt: timestamp(data.nextReviewAt),
  }
}

export function createFirestoreRepository(db: Firestore, uid: string): VocaRepository {
  const words = collection(db, 'users', uid, 'words')
  const settings = doc(db, 'users', uid, 'settings', 'review')
  const sessions = collection(db, 'users', uid, 'reviewSessions')
  return {
    subscribe(onChange, onError) {
      let data: VocaSnapshot = {
        words: [],
        settings: DEFAULT_SETTINGS,
        sessions: [],
        pending: false,
        fromCache: false,
      }
      const ready = new Set<string>()
      let failed = false
      const fail = (error: unknown) => {
        failed = true
        onError(error)
      }
      const metadata = new Map<string, { hasPendingWrites: boolean; fromCache: boolean }>()
      const publish = (key: string, meta: { hasPendingWrites: boolean; fromCache: boolean }) => {
        ready.add(key)
        metadata.set(key, meta)
        if (!failed && ready.size === 3)
          onChange({
            ...data,
            pending: [...metadata.values()].some((m) => m.hasPendingWrites),
            fromCache: [...metadata.values()].some((m) => m.fromCache),
          })
      }
      const subscriptions = [
        onSnapshot(
          words,
          { includeMetadataChanges: true },
          (snapshot) => {
            data = {
              ...data,
              words: snapshot.docs
                .map((d) => decodeWord(d.id, d.data()))
                .filter((w) => w.word && w.meaning)
                .sort((a, b) => a.word.localeCompare(b.word)),
            }
            publish('words', snapshot.metadata)
          },
          fail,
        ),
        onSnapshot(
          settings,
          { includeMetadataChanges: true },
          (snapshot) => {
            const value = snapshot.data()
            data = {
              ...data,
              settings: normalizeSettings({
                sessionSize: value?.sessionSize ?? value?.multipleChoiceCount ?? 10,
                dailyGoal: value?.dailyGoal ?? 15,
              }),
            }
            publish('settings', snapshot.metadata)
          },
          fail,
        ),
        onSnapshot(
          query(sessions, orderBy('completedAt', 'desc'), limit(120)),
          { includeMetadataChanges: true },
          (snapshot) => {
            data = {
              ...data,
              sessions: snapshot.docs.flatMap((d) => {
                const value = d.data()
                const completedAt = timestamp(value.completedAt)
                return completedAt === null
                  ? []
                  : [
                      {
                        id: d.id,
                        mode: value.mode,
                        questionCount: count(value.questionCount),
                        correctCount: count(value.correctCount),
                        wordIds: terms(value.wordIds),
                        incorrectWordIds: terms(value.incorrectWordIds),
                        completedAt,
                      } as ReviewSession,
                    ]
              }),
            }
            publish('sessions', snapshot.metadata)
          },
          fail,
        ),
      ]
      return () => subscriptions.forEach((unsubscribe) => unsubscribe())
    },
    async saveWord(draft, id) {
      const clean = normalizeDraft(draft)
      const reference = id ? doc(words, id) : doc(words)
      const fields = {
        ...clean,
        wordLowercase: clean.word.toLowerCase(),
        updatedAt: serverTimestamp(),
      }
      if (id) await updateDoc(reference, { ...fields, isFavorite: deleteField() })
      else
        await setDoc(reference, {
          ...fields,
          createdAt: serverTimestamp(),
          correctCount: 0,
          incorrectCount: 0,
          reviewStreak: 0,
          reviewIntervalDays: 0,
        })
      return reference.id
    },
    deleteWord: (id) => deleteDoc(doc(words, id)),
    saveSettings: (value) =>
      setDoc(
        settings,
        {
          ...normalizeSettings(value),
          multipleChoiceCount: deleteField(),
          writingCount: deleteField(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    async saveSession(id, mode, answers) {
      if (
        !answers.length ||
        answers.length > 30 ||
        new Set(answers.map((a) => a.wordId)).size !== answers.length
      )
        throw new Error('학습 결과가 올바르지 않아요. 세션을 다시 시작해 주세요.')
      // A stable session ID makes a retry safe after an uncertain network response.
      await runTransaction(db, async (transaction) => {
        const reference = doc(sessions, id)
        if ((await transaction.get(reference)).exists()) return
        const wordSnapshots = await Promise.all(
          answers.map((a) => transaction.get(doc(words, a.wordId))),
        )
        if (wordSnapshots.some((snapshot) => !snapshot.exists()))
          throw new Error('학습 중 삭제된 단어가 있어요. 단어장을 새로고침하고 다시 시작해 주세요.')
        const now = Date.now()
        answers.forEach((answer, index) => {
          const snapshot = wordSnapshots[index]
          const schedule = scheduleReview(
            decodeWord(snapshot.id, snapshot.data()!),
            answer.isCorrect,
            now,
          )
          transaction.update(snapshot.ref, {
            ...schedule,
            nextReviewAt: Timestamp.fromMillis(schedule.nextReviewAt),
            [answer.isCorrect ? 'correctCount' : 'incorrectCount']: increment(1),
            lastReviewedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isFavorite: deleteField(),
          })
        })
        transaction.set(reference, {
          mode,
          questionCount: answers.length,
          correctCount: answers.filter((a) => a.isCorrect).length,
          wordIds: answers.map((a) => a.wordId),
          incorrectWordIds: answers.filter((a) => !a.isCorrect).map((a) => a.wordId),
          completedAt: serverTimestamp(),
        })
      })
    },
  }
}
