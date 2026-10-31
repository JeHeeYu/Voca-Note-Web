import { useSearchParams } from 'react-router-dom'
import LeaveGuard from '@/shared/components/LeaveGuard'
import ReviewSetup from '../components/ReviewSetup'
import ReviewQuestionCard from '../components/ReviewQuestionCard'
import ReviewResult from '../components/ReviewResult'
import { useReviewSession } from '../hooks/useReviewSession'

export default function ReviewPage() {
  const [params] = useSearchParams()
  const session = useReviewSession()
  const scope = ['due', 'mistakes'].includes(params.get('scope') ?? '')
    ? params.get('scope')!
    : 'all'
  return (
    <>
      {session.phase === 'setup' ? (
        <ReviewSetup key={scope} scope={scope} onStart={session.start} />
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
