import { useState, useMemo, type FormEvent } from 'react'
import { ArrowRight, CheckCheck, Puzzle } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import WordMeanings from '@/shared/components/WordMeanings'
import type { useReviewSession } from '../hooks/useReviewSession'
import { cellKey, crosswordAnswer, crosswordComplete, entryCells } from '../models/crossword'
import ReviewSaveStatus from './ReviewSaveStatus'

export default function CrosswordReview({
  session,
}: {
  session: ReturnType<typeof useReviewSession>
}) {
  const puzzle = session.crossword!
  const [selectedId, setSelectedId] = useState(puzzle.entries[0].wordId)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const selected = puzzle.entries.find((entry) => entry.wordId === selectedId) ?? puzzle.entries[0]
  const questions = new Map(session.questions.map((q) => [q.word.id, q]))
  const graded = session.phase === 'graded'
  const correct = new Map(session.answers.map((answer) => [answer.wordId, answer.isCorrect]))
  const cells = new Map(
    puzzle.entries.flatMap((entry) =>
      entryCells(entry).map((cell) => [cell.key, cell.letter] as const),
    ),
  )
  const cellEntries = useMemo(() => {
    const result = new Map<string, typeof puzzle.entries>()
    for (const entry of puzzle.entries)
      for (const { key } of entryCells(entry)) {
        result.set(key, [...(result.get(key) ?? []), entry])
      }
    return result
  }, [puzzle])
  const selectedCells = new Set(entryCells(selected).map((cell) => cell.key))
  const starts = new Map(
    puzzle.entries.map((entry) => [cellKey(entry.row, entry.col), entry.number]),
  )
  const completeCount = puzzle.entries.filter((entry) =>
    entryCells(entry).every(({ key }) => session.crosswordCells[key]),
  ).length
  const select = (id: string) => {
    setSelectedId(id)
    setDraft('')
    setError('')
  }
  const fill = (event: FormEvent) => {
    event.preventDefault()
    if (graded) return
    if (crosswordAnswer(draft).length !== selected.answer.length) {
      setError(
        `영문 ${selected.answer.length}글자를 입력해 주세요. 공백·하이픈·아포스트로피는 생략해요.`,
      )
      return
    }
    session.fillCrossword(selected.wordId, draft)
    setDraft('')
    setError('')
  }
  return (
    <>
      <PageHeader
        eyebrow="Word play · Crossword"
        title="가로세로, 기억을 이어봐요."
        description={`${puzzle.entries.length}개의 한글 힌트를 보고 영어 낱말을 채워보세요. 교차하는 글자는 함께 바뀌어요.`}
      />
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-5">
        <p aria-live="polite" className="text-sm text-muted">
          {graded
            ? `${session.answers.length}문제 중 ${session.answers.filter((a) => a.isCorrect).length}문제 정답`
            : `${completeCount} / ${puzzle.entries.length}개 낱말 입력`}
        </p>
        {graded ? (
          <button className="btn btn-primary" onClick={session.showSummary}>
            학습 요약 보기
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!crosswordComplete(puzzle, session.crosswordCells)) {
                setError('아직 비어 있는 칸이 있어요. 모든 낱말을 채워 주세요.')
                return
              }
              setError('')
              session.checkBatch()
            }}
          >
            <CheckCheck size={16} />
            전체 정답 확인
          </button>
        )}
      </div>
      {graded ? (
        <div className="card mb-5 p-5">
          <ReviewSaveStatus session={session} />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </p>
      ) : null}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <section className="card min-w-0 p-4 sm:p-6" aria-label="가로세로 낱말판">
          <p className="mb-4 text-xs leading-6 text-muted">
            칸이나 힌트를 선택해 낱말을 입력하세요. 큰 판은 좌우로 밀어 볼 수 있어요.
          </p>
          <div className="overflow-x-auto pb-3" tabIndex={0} aria-label="낱말판 스크롤">
            <div
              className="grid w-full gap-px border border-line bg-line"
              style={{
                gridTemplateColumns: `repeat(${puzzle.cols}, minmax(24px, 1fr))`,
                minWidth: puzzle.cols * 25 - 1,
                maxWidth: puzzle.cols * 37 - 1,
              }}
            >
              {Array.from({ length: puzzle.rows * puzzle.cols }, (_, index) => {
                const row = Math.floor(index / puzzle.cols),
                  col = index % puzzle.cols,
                  key = cellKey(row, col),
                  answer = cells.get(key)
                if (!answer) return <div key={key} className="aspect-square w-full bg-slate-100" />
                const value = session.crosswordCells[key] || ''
                const entries = cellEntries.get(key)!
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`${row + 1}행 ${col + 1}열 ${value || '빈칸'}`}
                    aria-pressed={selectedCells.has(key)}
                    className={`relative aspect-square w-full text-sm font-semibold outline-offset-[-2px] ${graded && value !== answer ? 'bg-red-50 text-red-700' : selectedCells.has(key) ? 'bg-brand-soft text-brand' : 'bg-white text-ink'}`}
                    onClick={() =>
                      select(
                        (entries.find((entry) => entry.wordId !== selected.wordId) ?? entries[0])
                          .wordId,
                      )
                    }
                  >
                    {starts.has(key) ? (
                      <span className="absolute top-0 left-0.5 text-[8px] leading-3">
                        {starts.get(key)}
                      </span>
                    ) : null}
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-canvas p-4">
            <p className="text-xs font-semibold text-brand">
              {selected.number} {selected.direction === 'across' ? '가로' : '세로'} ·{' '}
              {selected.answer.length}글자
            </p>
            <h2 className="mt-2 text-lg font-semibold">{questions.get(selected.wordId)?.prompt}</h2>
            <p
              aria-label="선택한 낱말의 현재 글자"
              className="mt-3 break-all font-mono tracking-widest"
            >
              {entryCells(selected)
                .map(({ key }) => session.crosswordCells[key] || '_')
                .join(' ')}
            </p>
            {!graded ? (
              <form onSubmit={fill} className="mt-4 space-y-3">
                <label htmlFor="crossword-answer" className="label">
                  선택한 낱말 입력
                </label>
                <input
                  id="crossword-answer"
                  className="field"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder={`${selected.answer.length}글자 영어 단어`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.repeat))
                      event.preventDefault()
                  }}
                />
                <button type="submit" disabled={!draft.trim()} className="btn btn-primary w-full">
                  <Puzzle size={16} />
                  낱말 채우기
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-brand">
                정답: {questions.get(selected.wordId)?.answer}
              </p>
            )}
          </div>
        </section>
        <section className="space-y-5" aria-label="낱말 힌트">
          {(['across', 'down'] as const).map((direction) => (
            <div key={direction} className="card p-5">
              <h2 className="mb-3 font-semibold">
                {direction === 'across' ? '가로' : '세로'} 힌트
              </h2>
              <div className="space-y-2">
                {puzzle.entries
                  .filter((entry) => entry.direction === direction)
                  .map((entry) => (
                    <div key={entry.wordId}>
                      <button
                        type="button"
                        aria-pressed={selected.wordId === entry.wordId}
                        data-word-id={entry.wordId}
                        className={`w-full rounded-xl border p-3 text-left text-sm leading-6 ${selected.wordId === entry.wordId ? 'border-brand bg-brand-soft' : 'border-line'}`}
                        onClick={() => select(entry.wordId)}
                      >
                        <span className="font-semibold text-brand">
                          {entry.number} {direction === 'across' ? '가로' : '세로'}
                        </span>{' '}
                        · {questions.get(entry.wordId)?.prompt}{' '}
                        <span className="text-xs text-muted">({entry.answer.length}글자)</span>
                        {graded ? (
                          <span
                            className={`ml-2 font-semibold ${correct.get(entry.wordId) ? 'text-brand' : 'text-red-600'}`}
                          >
                            {correct.get(entry.wordId) ? '정답' : '오답'}
                          </span>
                        ) : null}
                      </button>
                      {graded ? (
                        <div className="px-3 py-2 text-sm">
                          <p className="mb-1 font-semibold">
                            {questions.get(entry.wordId)?.answer}
                          </p>
                          <WordMeanings word={questions.get(entry.wordId)!.word} compact />
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}
