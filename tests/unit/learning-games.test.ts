import { describe, expect, it } from 'vitest'
import {
  buildCrossword,
  cellKey,
  crosswordAnswer,
  crosswordComplete,
  crosswordInputs,
  entryCells,
} from '@/features/review/models/crossword'
import {
  buildQuestions,
  gradeBatch,
  meaningAnswersMatch,
  questionMatches,
} from '@/features/review/models/reviewEngine'
import { emptyDraft, type SavedWord } from '@/shared/models/word'
const record: SavedWord = {
  ...emptyDraft(),
  id: 'record',
  word: 'record',
  meaning: '기록, 음반',
  meanings: [
    { meaning: '기록, 음반', partOfSpeech: 'noun' },
    { meaning: '기록하다', partOfSpeech: 'verb' },
  ],
  correctCount: 0,
  incorrectCount: 0,
  reviewStreak: 0,
  reviewIntervalDays: 0,
  createdAt: null,
  updatedAt: null,
  nextReviewAt: null,
  lastReviewedAt: null,
}

describe('Korean meaning answers', () => {
  it('accepts any stored meaning or separated alternative, ignoring Unicode whitespace', () => {
    const meanings = ['기록, 음반', '기록하다', '잘 자라다; 번창하다', '관점/시각']
    for (const answer of [
      '기 록',
      '음\t반',
      '기록 하다',
      '잘\u00a0자라다',
      '번창하다',
      '시각',
      '기록,음반',
    ])
      expect(meaningAnswersMatch(answer, meanings)).toBe(true)
    expect(meaningAnswersMatch('기록하다'.normalize('NFD'), meanings)).toBe(true)
    for (const answer of ['', ' \n ', '기록하', '잘', '오답, 음반', '기록합니다'])
      expect(meaningAnswersMatch(answer, meanings)).toBe(false)
  })
  it('uses the same grading for single and batch, and handles legacy flat meanings', () => {
    const [q] = buildQuestions([record], 'meaning_writing', 1)
    expect(q.prompt).toBe('record')
    expect(q.context).toBe('')
    expect(questionMatches('기 록 하 다', q, 'meaning_writing')).toBe(true)
    expect(gradeBatch([q], { record: '음반' }, 'meaning_writing')).toEqual([
      { wordId: 'record', isCorrect: true },
    ])
    expect(gradeBatch([q], { record: '   ' }, 'meaning_writing')).toBeNull()
    const [legacy] = buildQuestions([{ ...record, meanings: [] }], 'meaning_writing', 1)
    expect(questionMatches('음반', legacy, 'meaning_writing')).toBe(true)
    expect(questionMatches('rec ord', q, 'writing')).toBe(false)
  })
})

const candidates = [
  'apple',
  'pear',
  'grape',
  'peach',
  'lemon',
  'melon',
  'lime',
  'plum',
  'in time',
].map((answer) => ({ wordId: answer, answer }))
describe('connected crossword generation', () => {
  it('fits valid words, preserves the source, and never creates extra touching words', () => {
    const before = JSON.stringify(candidates)
    for (let offset = 0; offset < candidates.length; offset++) {
      const puzzle = buildCrossword(
        [...candidates.slice(offset), ...candidates.slice(0, offset)],
        8,
      )
      expect(puzzle.entries.length).toBeGreaterThanOrEqual(5)
      expect(puzzle.entries.length).toBeLessThanOrEqual(8)
      expect(puzzle.rows).toBeLessThanOrEqual(25)
      expect(puzzle.cols).toBeLessThanOrEqual(25)
      const board = new Map<string, string>()
      for (const entry of puzzle.entries)
        for (const { key, letter } of entryCells(entry)) {
          expect(board.get(key) ?? letter).toBe(letter)
          board.set(key, letter)
        }
      // Every horizontal/vertical run of >=2 letters must be a declared answer.
      for (const direction of ['across', 'down'] as const)
        for (let row = 0; row < puzzle.rows; row++)
          for (let col = 0; col < puzzle.cols; col++) {
            const dr = direction === 'down' ? 1 : 0,
              dc = direction === 'across' ? 1 : 0
            if (!board.has(cellKey(row, col)) || board.has(cellKey(row - dr, col - dc))) continue
            let answer = ''
            for (let i = 0; board.has(cellKey(row + dr * i, col + dc * i)); i++)
              answer += board.get(cellKey(row + dr * i, col + dc * i))
            if (answer.length > 1)
              expect(
                puzzle.entries.some(
                  (e) =>
                    e.row === row &&
                    e.col === col &&
                    e.direction === direction &&
                    e.answer === answer,
                ),
              ).toBe(true)
          }
      const visited = new Set([puzzle.entries[0].wordId])
      let changed = true
      while (changed) {
        changed = false
        for (const e of puzzle.entries)
          if (
            !visited.has(e.wordId) &&
            puzzle.entries.some(
              (other) =>
                visited.has(other.wordId) &&
                entryCells(e).some((cell) => entryCells(other).some((c) => c.key === cell.key)),
            )
          ) {
            visited.add(e.wordId)
            changed = true
          }
      }
      expect(visited.size).toBe(puzzle.entries.length)
    }
    expect(JSON.stringify(candidates)).toBe(before)
  })
  it('filters unsupported and duplicate answers and reports disconnected pools', () => {
    expect(crosswordAnswer('  in-time ')).toBe('INTIME')
    expect(crosswordAnswer("can't")).toBe('CANT')
    for (const word of ['a', 'word123', '한글', 'x'.repeat(19)])
      expect(crosswordAnswer(word)).toBe('')
    expect(
      buildCrossword(
        [
          { wordId: 'a', answer: 'AAA' },
          { wordId: 'b', answer: 'BBB' },
        ],
        5,
      ).entries,
    ).toEqual([])
    expect(buildCrossword(candidates, 0).entries).toEqual([])
    const puzzle = buildCrossword([...candidates, { wordId: 'duplicate', answer: 'APPLE' }], 30)
    expect(new Set(puzzle.entries.map((e) => e.answer)).size).toBe(puzzle.entries.length)
  })
  it('shares crossing letters, requires all cells, and keeps grading word based', () => {
    const puzzle = buildCrossword(candidates, 5)
    const cells = Object.fromEntries(
      puzzle.entries.flatMap(entryCells).map(({ key, letter }) => [key, letter]),
    )
    expect(crosswordComplete(puzzle, {})).toBe(false)
    expect(crosswordComplete(puzzle, cells)).toBe(true)
    for (const e of puzzle.entries) expect(crosswordInputs(puzzle, cells)[e.wordId]).toBe(e.answer)
    const overlap = entryCells(puzzle.entries[0]).find(
      ({ key }) =>
        puzzle.entries.filter((e) => entryCells(e).some((c) => c.key === key)).length === 2,
    )!
    delete cells[overlap.key]
    expect(crosswordComplete(puzzle, cells)).toBe(false)
    expect(
      puzzle.entries.filter((e) => crosswordInputs(puzzle, cells)[e.wordId].includes(' ')),
    ).toHaveLength(2)
  })
})
