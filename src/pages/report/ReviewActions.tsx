import type { ReviewAction } from '../../api/types'

interface ReviewActionsProps {
  selectedDecision: ReviewAction | null
  isSaving: boolean
  decisionError: string | null
  onDecision: (action: ReviewAction) => void
}

export default function ReviewActions({
  selectedDecision,
  isSaving,
  decisionError,
  onDecision,
}: ReviewActionsProps) {
  return (
    <>
      {decisionError && (
        <p role="alert" className="report-action-error">{decisionError}</p>
      )}
      <div className="report-actions">
        <button
          type="button"
          aria-pressed={selectedDecision === 'EDITED'}
          disabled={isSaving}
          className={selectedDecision === 'EDITED' ? 'is-active' : ''}
          onClick={() => void onDecision('EDITED')}
        >
          수정함
        </button>
        <button
          type="button"
          aria-pressed={selectedDecision === 'CONFIRMED'}
          disabled={isSaving}
          className={selectedDecision === 'CONFIRMED' ? 'is-active' : ''}
          onClick={() => void onDecision('CONFIRMED')}
        >
          유지함
        </button>
        <button
          type="button"
          aria-pressed={selectedDecision === 'HOLD'}
          disabled={isSaving}
          className={selectedDecision === 'HOLD' ? 'is-active' : ''}
          onClick={() => void onDecision('HOLD')}
        >
          보류
        </button>
        <span />
        <button
          type="button"
          aria-pressed={selectedDecision === 'NOT_USEFUL'}
          disabled={isSaving}
          className={`report-muted-action ${selectedDecision === 'NOT_USEFUL' ? 'is-active' : ''}`}
          onClick={() => void onDecision('NOT_USEFUL')}
        >
          이 검출 끄기
        </button>
      </div>
      <p className="report-next">결정하면 다음 검토 후보로 이동합니다 →</p>
    </>
  )
}
