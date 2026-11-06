import CrosswordReview from '../components/CrosswordReview'
import { useSearchParams } from 'react-router-dom'
import LeaveGuard from '@/shared/components/LeaveGuard'
import ReviewSetup from '../components/ReviewSetup'
import ReviewQuestionCard from '../components/ReviewQuestionCard'
import ReviewResult from '../components/ReviewResult'
import BatchReview from '../components/BatchReview'
import { useReviewSession } from '../hooks/useReviewSession'

export default function ReviewPage() {
  const [params] = useSearchParams()
  const session = useReviewSession()
  const requestedScope = params.get('scope')
  const scope = requestedScope === 'due' || requestedScope === 'mistakes' ? requestedScope : 'all'
  return (
    <>
      {session.phase === 'setup' ? (
        <ReviewSetup key={scope} scope={scope} error={session.startError} onStart={session.start} />
      ) : session.mode === 'crossword' &&
        (session.phase === 'active' || session.phase === 'graded') ? (
        <CrosswordReview session={session} />
      ) : session.phase === 'graded' ||
        (session.phase === 'active' && session.presentation === 'batch') ? (
        <BatchReview session={session} />
      ) : session.phase === 'active' ? (
        <ReviewQuestionCard session={session} />
      ) : (
        <ReviewResult session={session} />
      )}
      <LeaveGuard
        dirty={session.phase !== 'setup' && !session.saved}
        busy={session.saving}
        allowLeave={session.allowLeave}
      />
    </>
  )
}
