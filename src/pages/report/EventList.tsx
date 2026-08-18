import type { TimelineEvent } from '../../api/types'
import { formatTime, reportEventTitle, reportEventKind } from '../../utils/format'

interface EventListProps {
  events: TimelineEvent[]
  selectedId: string
  onSelect: (event: TimelineEvent) => void
  decisionLabel: (event: TimelineEvent) => string
}

export default function EventList({ events, selectedId, onSelect, decisionLabel }: EventListProps) {
  return (
    <section className="report-candidates">
      <div className="report-candidates-card">
        {events.map(event => (
          <button
            type="button"
            aria-current={event.id === selectedId ? 'true' : undefined}
            className={`report-candidate-row ${event.id === selectedId ? 'is-current' : ''}`}
            key={event.id}
            onClick={() => onSelect(event)}
          >
            <span className="report-time-pill">{formatTime(event.startMs)}</span>
            <span>{reportEventKind(event)}</span>
            <strong>{reportEventTitle(event)}</strong>
            <small>{reportEventKind(event)}</small>
            {decisionLabel(event) && <em>{decisionLabel(event)}</em>}
          </button>
        ))}
      </div>
    </section>
  )
}
