import { PARTS_OF_SPEECH, wordMeanings, type WordDraft } from '@/shared/models/word'

export default function WordMeanings({
  word,
  compact = false,
}: {
  word: WordDraft
  compact?: boolean
}) {
  const entries = wordMeanings(word)
  return (
    <ol aria-label="단어의 뜻" className={`space-y-2 text-left ${compact ? 'text-xs' : 'text-sm'}`}>
      {entries.map((entry, index) => (
        <li key={index} className="flex items-baseline gap-2">
          {entries.length > 1 ? (
            <span className="shrink-0 text-[10px] tabular-nums text-muted">{index + 1}.</span>
          ) : null}
          <div className="min-w-0 break-words leading-6">
            {entry.partOfSpeech ? (
              <span className="mr-2 inline-block rounded bg-brand-soft px-1.5 text-[10px] font-medium text-brand">
                {PARTS_OF_SPEECH[entry.partOfSpeech]}
              </span>
            ) : null}
            <span>{entry.meaning}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
