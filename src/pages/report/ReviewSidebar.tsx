import type { ReviewAction, TimelineEvent } from '../../api/types'
import { formatTime, reportEventKind } from '../../utils/format'

interface ReviewSidebarProps {
  filename: string
  events: TimelineEvent[]
  remaining: number
  selectedId: string
  decisions: Record<string, ReviewAction | null>
  isCompleting: boolean
  finishError: string | null
  onFinishReview: () => void
  onSelect: (event: TimelineEvent) => void
}

export default function ReviewSidebar({
  filename,
  events,
  remaining,
  selectedId,
  decisions,
  isCompleting,
  finishError,
  onFinishReview,
  onSelect,
}: ReviewSidebarProps) {
  const decided = events.length - remaining

  return (
    <aside className="report-sidebar">
      <div className="report-file-context">
        <span>검수 중인 영상</span>
        <strong>{filename}</strong>
        <small>검수 완료 · 원본 영상</small>
      </div>

      <div className="report-decision-progress">
        <div>
          <span>결정 진행</span>
          <strong>
            {decided} / {events.length}
          </strong>
        </div>
        <div className="report-sidebar-track">
          <i style={{ width: `${events.length ? (decided / events.length) * 100 : 0}%` }} />
        </div>
      </div>

      <button
        type="button"
        className="report-finish-button"
        onClick={onFinishReview}
        disabled={isCompleting || remaining > 0}
      >
        {isCompleting ? '완료 처리 중…' : remaining > 0 ? `남은 ${remaining}건 결정 후 완료` : '검수 마치기'}
      </button>
      {finishError && (
        <p role="alert" className="report-action-error">
          {finishError}
        </p>
      )}

      <div className="report-outline">
        <span>검토 후보</span>
        <strong>
          {events.length}건 · 남은 {remaining}
        </strong>
        <div className="report-outline-list">
          {events.map(event => (
            <button
              type="button"
              aria-current={event.id === selectedId ? 'true' : undefined}
              className={event.id === selectedId ? 'is-current' : ''}
              key={event.id}
              onClick={() => onSelect(event)}
            >
              <i>{decisions[event.id] ? '✓' : ''}</i>
              <b>{formatTime(event.startMs)}</b>
              <span>{reportEventKind(event)}</span>
            </button>
          ))}
        </div>
        <small>클릭하면 해당 후보로 이동</small>
      </div>
    </aside>
  )
}
