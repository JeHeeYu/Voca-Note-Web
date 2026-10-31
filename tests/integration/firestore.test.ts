import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { createFirestoreRepository } from '@/shared/repositories/firestoreVocaRepository'
import { emptyDraft } from '@/shared/models/word'
import type { VocaSnapshot } from '@/shared/repositories/vocaRepository'

let environment: RulesTestEnvironment
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST)
    throw new Error('Integration tests require the local Firestore emulator.')
  environment = await initializeTestEnvironment({
    projectId: 'demo-voca-note',
    firestore: { host: '127.0.0.1', port: 18180, rules: readFileSync('firestore.rules', 'utf8') },
  })
})
beforeEach(async () => {
  await environment.clearFirestore()
})
afterAll(async () => {
  await environment?.cleanup()
})
const dbFor = (uid: string) =>
  environment.authenticatedContext(uid).firestore() as unknown as Firestore

describe('app and web data contract against the Android rules', () => {
  it('creates, edits, subscribes to, and deletes a word without losing app review state', async () => {
    const db = dbFor('alice'),
      repository = createFirestoreRepository(db, 'alice')
    const id = await repository.saveWord({
      ...emptyDraft(),
      word: '  focus ',
      meaning: '집중하다',
      partOfSpeech: 'verb',
      synonyms: [' concentrate '],
    })
    const reference = doc(db, 'users/alice/words', id)
    expect((await getDoc(reference)).data()).toMatchObject({
      word: 'focus',
      wordLowercase: 'focus',
      synonyms: ['concentrate'],
      partOfSpeech: 'verb',
      correctCount: 0,
    })
    await repository.saveSession('session-one', 'writing', [{ wordId: id, isCorrect: true }])
    await repository.saveWord({ ...emptyDraft(), word: 'focus', meaning: '집중' }, id)
    const edited = (await getDoc(reference)).data()!
    expect(edited).toMatchObject({
      correctCount: 1,
      reviewIntervalDays: 1,
      reviewStreak: 1,
      meaning: '집중',
    })
    expect(edited.createdAt).toBeInstanceOf(Timestamp)
    const snapshot = await new Promise<VocaSnapshot>((resolve, reject) => {
      const stop = repository.subscribe((value) => {
        if (!value.pending && !value.fromCache) {
          stop()
          resolve(value)
        }
      }, reject)
    })
    expect(snapshot.words[0].id).toBe(id)
    expect(snapshot.sessions[0]).toMatchObject({
      mode: 'writing',
      questionCount: 1,
      correctCount: 1,
    })
    await repository.deleteWord(id)
    expect((await getDoc(reference)).exists()).toBe(false)
  })
  it('records a session atomically and makes retries idempotent', async () => {
    const db = dbFor('alice'),
      repository = createFirestoreRepository(db, 'alice')
    const id = await repository.saveWord({ ...emptyDraft(), word: 'grow', meaning: '자라다' })
    await repository.saveSession('stable-id', 'recall', [{ wordId: id, isCorrect: false }])
    await repository.saveSession('stable-id', 'recall', [{ wordId: id, isCorrect: false }])
    expect((await getDoc(doc(db, 'users/alice/words', id))).data()).toMatchObject({
      incorrectCount: 1,
      reviewStreak: 0,
      reviewIntervalDays: 0,
    })
    await expect(
      repository.saveSession('must-not-save', 'writing', [
        { wordId: id, isCorrect: true },
        { wordId: 'missing', isCorrect: true },
      ]),
    ).rejects.toThrow('삭제된 단어')
    expect((await getDoc(doc(db, 'users/alice/reviewSessions/must-not-save'))).exists()).toBe(false)
    expect((await getDoc(doc(db, 'users/alice/words', id))).data()?.correctCount).toBe(0)
  })
  it('migrates legacy settings and rejects cross-account or unauthenticated access', async () => {
    const alice = dbFor('alice'),
      bob = dbFor('bob'),
      repository = createFirestoreRepository(alice, 'alice')
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore() as unknown as Firestore, 'users/alice/settings/review'),
        { multipleChoiceCount: 12, writingCount: 8 },
      )
    })
    await repository.saveSettings({ sessionSize: 12, dailyGoal: 20 })
    expect((await getDoc(doc(alice, 'users/alice/settings/review'))).data()).toMatchObject({
      sessionSize: 12,
      dailyGoal: 20,
    })
    expect((await getDoc(doc(alice, 'users/alice/settings/review'))).data()).not.toHaveProperty(
      'multipleChoiceCount',
    )
    await assertFails(getDoc(doc(bob, 'users/alice/settings/review')))
    await assertFails(
      setDoc(doc(bob, 'users/alice/words/stolen'), { word: 'x', wordLowercase: 'x', meaning: 'y' }),
    )
    await assertFails(
      getDoc(
        doc(
          environment.unauthenticatedContext().firestore() as unknown as Firestore,
          'users/alice/settings/review',
        ),
      ),
    )
    await assertSucceeds(getDoc(doc(alice, 'users/alice/settings/review')))
  })
  it('rejects oversized drafts, invalid settings, and immutable session updates', async () => {
    const db = dbFor('alice'),
      repository = createFirestoreRepository(db, 'alice')
    await assertFails(
      setDoc(doc(db, 'users/alice/settings/review'), { dailyGoal: 101, sessionSize: 10 }),
    )
    await assertFails(
      setDoc(doc(db, 'users/alice/words/too-long'), {
        word: 'x'.repeat(101),
        wordLowercase: 'x',
        meaning: '뜻',
      }),
    )
    const id = await repository.saveWord({ ...emptyDraft(), word: 'grow', meaning: '자라다' })
    await repository.saveSession('immutable', 'multiple_choice', [{ wordId: id, isCorrect: true }])
    await assertFails(
      setDoc(doc(db, 'users/alice/reviewSessions/immutable'), { correctCount: 0 }, { merge: true }),
    )
  })
})
