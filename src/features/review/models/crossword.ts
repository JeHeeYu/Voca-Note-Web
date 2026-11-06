export interface CrosswordEntry {
  wordId: string
  answer: string
  row: number
  col: number
  direction: 'across' | 'down'
  number: number
}
export interface CrosswordPuzzle {
  entries: CrosswordEntry[]
  rows: number
  cols: number
}
export const crosswordAnswer = (word: string) => {
  const value = word
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s'’-]/gu, '')
  return /^[A-Z]{2,18}$/.test(value) ? value : ''
}
export const cellKey = (row: number, col: number) => `${row},${col}`
export const entryCells = (entry: CrosswordEntry) =>
  [...entry.answer].map((letter, index) => ({
    key: cellKey(
      entry.row + (entry.direction === 'down' ? index : 0),
      entry.col + (entry.direction === 'across' ? index : 0),
    ),
    letter,
  }))

// Every added word crosses the existing connected board. Parallel overlap,
// touching side-by-side words, and extra letters at either end are forbidden.
export function buildCrossword(
  candidates: { wordId: string; answer: string }[],
  count: number,
): CrosswordPuzzle {
  const unique = new Set<string>()
  const words = candidates.flatMap((word) => {
    const answer = crosswordAnswer(word.answer)
    if (!answer || unique.has(answer)) return []
    unique.add(answer)
    return [{ wordId: word.wordId, answer }]
  })
  const limit = Math.min(30, Math.max(0, count))
  let best: CrosswordEntry[] = []
  for (const seed of words.slice(0, 12)) {
    const entries: CrosswordEntry[] = [{ ...seed, row: 0, col: 0, direction: 'across', number: 0 }]
    const board = new Map<string, { letter: string; directions: Set<string> }>()
    const place = (entry: CrosswordEntry) => {
      for (const { key, letter } of entryCells(entry)) {
        const cell = board.get(key) ?? { letter, directions: new Set<string>() }
        cell.directions.add(entry.direction)
        board.set(key, cell)
      }
    }
    place(entries[0])
    const pending = words.filter((word) => word.wordId !== seed.wordId)
    let changed = true
    while (changed && entries.length < limit) {
      changed = false
      for (let index = 0; index < pending.length && entries.length < limit; index++) {
        const word = pending[index]
        let chosen: CrosswordEntry | null = null
        let bestScore = -Infinity
        for (const [key, cell] of board) {
          const [crossRow, crossCol] = key.split(',').map(Number)
          for (const direction of ['across', 'down'] as const) {
            if (cell.directions.has(direction)) continue
            const dr = direction === 'down' ? 1 : 0,
              dc = direction === 'across' ? 1 : 0
            for (let offset = 0; offset < word.answer.length; offset++) {
              if (word.answer[offset] !== cell.letter) continue
              const row = crossRow - dr * offset,
                col = crossCol - dc * offset
              if (
                board.has(cellKey(row - dr, col - dc)) ||
                board.has(cellKey(row + dr * word.answer.length, col + dc * word.answer.length))
              )
                continue
              let crosses = 0,
                valid = true
              for (let i = 0; i < word.answer.length; i++) {
                const r = row + dr * i,
                  c = col + dc * i,
                  existing = board.get(cellKey(r, c))
                if (existing) {
                  if (existing.letter !== word.answer[i] || existing.directions.has(direction)) {
                    valid = false
                    break
                  }
                  crosses++
                } else if (
                  board.has(cellKey(r + dc, c + dr)) ||
                  board.has(cellKey(r - dc, c - dr))
                ) {
                  valid = false
                  break
                }
              }
              if (!valid || !crosses) continue
              const trial: CrosswordEntry = { ...word, row, col, direction, number: 0 }
              const all = [...board.keys(), ...entryCells(trial).map((item) => item.key)].map(
                (key) => key.split(',').map(Number),
              )
              const height =
                Math.max(...all.map((p) => p[0])) - Math.min(...all.map((p) => p[0])) + 1
              const width =
                Math.max(...all.map((p) => p[1])) - Math.min(...all.map((p) => p[1])) + 1
              if (height > 25 || width > 25) continue
              const score = crosses * 1000 - height * width
              if (score > bestScore) {
                chosen = trial
                bestScore = score
              }
            }
          }
        }
        if (chosen) {
          entries.push(chosen)
          place(chosen)
          pending.splice(index--, 1)
          changed = true
        }
      }
    }
    if (entries.length > best.length) best = entries
    if (best.length >= limit) break
  }
  if (!limit || best.length < 2) return { entries: [], rows: 0, cols: 0 }
  const minRow = Math.min(...best.map((e) => e.row)),
    minCol = Math.min(...best.map((e) => e.col))
  best = best
    .map((e) => ({ ...e, row: e.row - minRow, col: e.col - minCol }))
    .sort((a, b) => a.row - b.row || a.col - b.col)
  let number = 0,
    last = ''
  for (const entry of best) {
    const key = cellKey(entry.row, entry.col)
    if (key !== last) {
      number++
      last = key
    }
    entry.number = number
  }
  return {
    entries: best,
    rows: Math.max(...best.map((e) => e.row + (e.direction === 'down' ? e.answer.length : 1))),
    cols: Math.max(...best.map((e) => e.col + (e.direction === 'across' ? e.answer.length : 1))),
  }
}

export function crosswordInputs(puzzle: CrosswordPuzzle, cells: Record<string, string>) {
  return Object.fromEntries(
    puzzle.entries.map((entry) => [
      entry.wordId,
      entryCells(entry)
        .map(({ key }) => cells[key] || ' ')
        .join(''),
    ]),
  )
}
export const crosswordComplete = (puzzle: CrosswordPuzzle, cells: Record<string, string>) =>
  puzzle.entries.length > 0 &&
  puzzle.entries.every((entry) =>
    entryCells(entry).every(({ key }) => /^[A-Z]$/.test(cells[key] ?? '')),
  )
