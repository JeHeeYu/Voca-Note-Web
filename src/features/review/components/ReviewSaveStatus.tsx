import { Check, LoaderCircle } from 'lucide-react'
import type { useReviewSession } from '../hooks/useReviewSession'

export default function ReviewSaveStatus({
  session,
}: {
  session: ReturnType<typeof useReviewSession>
}) {
  return (
    <>
      <div role="status" className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
        {session.saving ? (
          <>
            <LoaderCircle size={15} className="animate-spin" />
            학습 기록을 저장하고 있어요.
          </>
        ) : session.saved ? (
          <>
            <Check size={15} className="text-brand" />
            학습 기록과 다음 복습 시간을 저장했어요.
          </>
        ) : null}
      </div>
      {session.error ? (
        <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p>{session.error}</p>
          <button
            type="button"
            disabled={session.saving}
            className="btn btn-secondary mt-3"
            onClick={() => {
              void session.retrySave()
            }}
          >
            저장 다시 시도
          </button>
        </div>
      ) : null}
    </>
  )
}
