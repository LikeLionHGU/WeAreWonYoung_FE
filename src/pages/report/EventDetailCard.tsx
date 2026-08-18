import type { RefObject } from 'react'
import type { ReviewAction, TimelineEvent } from '../../api/types'
import {
  formatTime,
  formatSeconds,
  reportEventTitle,
  reportEventSpeech,
  reportEventKind,
} from '../../utils/format'
import VideoPlayer from './VideoPlayer'
import ReviewActions from './ReviewActions'

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://placeholder.invalid')
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

interface EventDetailCardProps {
  selected: TimelineEvent
  selectedIndex: number
  totalCount: number
  mediaDuration: number
  scrubberMax: number
  scrubberValue: number
  durationLabel: string | undefined
  streamUrl: string
  videoRef: RefObject<HTMLVideoElement | null>
  isPlaying: boolean
  currentTime: number
  selectedDecision: ReviewAction | null
  isSaving: boolean
  decisionError: string | null
  cardRef: RefObject<HTMLElement | null>
  onLoadedMetadata: (duration: number) => void
  onTimeUpdate: (time: number) => void
  onPlay: () => void
  onPause: () => void
  onTogglePlay: () => void
  onSeek: (value: number) => void
  onSkipBy: (seconds: number) => void
  onVideoKeyDown: (e: React.KeyboardEvent) => void
  onDecision: (action: ReviewAction) => void
}

export default function EventDetailCard({
  selected,
  selectedIndex,
  totalCount,
  mediaDuration,
  scrubberMax,
  scrubberValue,
  durationLabel,
  streamUrl,
  videoRef,
  isPlaying,
  currentTime,
  selectedDecision,
  isSaving,
  decisionError,
  cardRef,
  onLoadedMetadata,
  onTimeUpdate,
  onPlay,
  onPause,
  onTogglePlay,
  onSeek,
  onSkipBy,
  onVideoKeyDown,
  onDecision,
}: EventDetailCardProps) {
  const formattedDuration = durationLabel ?? formatSeconds(mediaDuration)
  const selectedSpeech = reportEventSpeech(selected)
  const selectedReferences = selected.references

  return (
    <article ref={cardRef} className="report-selected-card">
      <div className="report-card-top">
        <div className="report-card-meta">
          <span className="report-time-pill">{formatTime(selected.startMs)}</span>
          <span>{reportEventKind(selected)}</span>
        </div>
        <div className="report-card-position">
          <span className="report-scrubber-mini">
            <i
              style={{
                width: `${mediaDuration ? Math.min(100, Math.max(4, (selected.startMs / 1000 / mediaDuration) * 100)) : 0}%`,
              }}
            />
          </span>
          <span>
            {formattedDuration} 중 {formatTime(selected.startMs)}
          </span>
          <span>
            {selectedIndex + 1} / {totalCount}
          </span>
        </div>
      </div>

      <h2>{reportEventTitle(selected)}</h2>
      <div className="report-reason">
        <h3>왜 확인하나요?</h3>
        <p>{selected.reason}</p>
      </div>

      <VideoPlayer
        videoRef={videoRef}
        streamUrl={streamUrl}
        posterUrl={selected.frameUrl}
        isPlaying={isPlaying}
        currentTime={currentTime}
        mediaDuration={mediaDuration}
        scrubberMax={scrubberMax}
        scrubberValue={scrubberValue}
        durationLabel={durationLabel}
        selectedStartMs={selected.startMs}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={onPlay}
        onPause={onPause}
        onTogglePlay={onTogglePlay}
        onSeek={onSeek}
        onSkipBy={onSkipBy}
        onKeyDown={onVideoKeyDown}
      />

      {selectedSpeech && (
        <section className="report-evidence-block">
          <h3>{selected.type === 'SPEECH' ? '실제 발언' : '화면 정보'}</h3>
          <blockquote>{selectedSpeech}</blockquote>
        </section>
      )}

      {selected.type === 'SPEECH' &&
        selected.candidateType === 'SPEECH_REVIEW' &&
        (selected.contextBefore || selected.contextAfter) && (
          <section className="report-evidence-block report-context-block">
            <h3>앞뒤 맥락</h3>
            {selected.contextBefore && <p className="context-before">{selected.contextBefore}</p>}
            {selected.contextAfter && <p className="context-after">{selected.contextAfter}</p>}
          </section>
        )}

      <section className="report-evidence-block report-reference-block">
        <h3>참고 자료</h3>
        {selectedReferences.length > 0 ? (
          <div className="report-reference-items">
            {selectedReferences.map(reference => (
              <article
                className="report-reference-item"
                key={`${reference.url}-${reference.title}`}
              >
                <div>
                  <strong>{reference.title}</strong>
                  {reference.provider && (
                    <span>
                      {reference.provider}
                      {reference.publishedAt ? ` · ${reference.publishedAt}` : ''}
                    </span>
                  )}
                  {reference.snippet && <small>{reference.snippet}</small>}
                </div>
                <a
                  href={isSafeUrl(reference.url) ? reference.url : '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  원문 확인 <b aria-hidden="true">→</b>
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p className="report-reference-empty">제공된 참고 자료가 없습니다.</p>
        )}
      </section>

      <ReviewActions
        selectedDecision={selectedDecision}
        isSaving={isSaving}
        decisionError={decisionError}
        onDecision={onDecision}
      />
    </article>
  )
}
