import type { RefObject } from 'react'
import type { ReviewAction, TimelineEvent } from '../../api/types'
import {
  formatTime,
  formatSeconds,
  reportEventTitle,
  reportEventSpeech,
  reportEventRiskLabel,
  reportEventHighlight,
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

function HighlightedText({ text, term }: { text: string; term: string | null }) {
  if (!term) return <>{text}</>
  const index = text.indexOf(term)
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="report-highlight">{term}</mark>
      {text.slice(index + term.length)}
    </>
  )
}

interface EventDetailCardProps {
  relatedTimes: number[]
  selected: TimelineEvent
  selectedIndex: number
  totalCount: number
  mediaDuration: number
  scrubberMax: number
  scrubberValue: number
  durationLabel: string | undefined
  streamUrl: string
  youtubeUrl?: string
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
  textOnly?: boolean
}

export default function EventDetailCard({
  selected,
  relatedTimes,
  selectedIndex,
  totalCount,
  mediaDuration,
  scrubberMax,
  scrubberValue,
  durationLabel,
  streamUrl,
  youtubeUrl,
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
  textOnly = false,
}: EventDetailCardProps) {
  const formattedDuration = durationLabel ?? formatSeconds(mediaDuration)
  const selectedSpeech = reportEventSpeech(selected)
  const selectedReferences = selected.references
  const showTimestamp = !textOnly || (selected.startMs > 0 && !selected.timeUnknown)
  const riskLabel = reportEventRiskLabel(selected)
  const highlight = reportEventHighlight(selected)
  const shownRelated = relatedTimes.slice(0, 4)
  const hiddenRelated = relatedTimes.length - shownRelated.length

  return (
    <article ref={cardRef} className="report-selected-card">
      <div className="report-card-summary">
        <div className="report-card-timestamp">
          <span className="report-card-label">{showTimestamp ? '타임스탬프' : '검토 후보'}</span>
          <strong>
            {showTimestamp
              ? formatTime(selected.startMs)
              : `${selectedIndex + 1} / ${totalCount}`}
          </strong>
          {showTimestamp && shownRelated.length > 0 && (
            <small>
              {shownRelated.map(formatTime).join(' · ')}
              {hiddenRelated > 0 ? ` 외 ${hiddenRelated}곳` : ''}
            </small>
          )}
          {!textOnly && (
            <small className="report-card-position">
              {formattedDuration} 중 {formatTime(selected.startMs)} · {selectedIndex + 1} /{' '}
              {totalCount}
            </small>
          )}
        </div>
        <div className="report-card-risk">
          <span className="report-card-label">논란 유형</span>
          <span className="report-risk-chip">{riskLabel}</span>
        </div>
      </div>

      <hr className="report-card-divider" />

      {!textOnly && (
        <VideoPlayer
          videoRef={videoRef}
          streamUrl={streamUrl}
          youtubeUrl={youtubeUrl}
          posterUrl={selected.frameUrl}
          isPlaying={isPlaying}
          currentTime={currentTime}
          mediaDuration={mediaDuration}
          scrubberMax={scrubberMax}
          scrubberValue={scrubberValue}
          durationLabel={durationLabel}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPlay={onPlay}
          onPause={onPause}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onSkipBy={onSkipBy}
          onKeyDown={onVideoKeyDown}
        />
      )}

      <section className="report-card-section report-card-speech">
        <h3 className="report-card-label">{selected.type === 'SPEECH' ? '발언' : '화면 정보'}</h3>
        <p>
          {selectedSpeech ? (
            <HighlightedText text={selectedSpeech} term={highlight} />
          ) : (
            reportEventTitle(selected)
          )}
        </p>
      </section>

      {selected.type === 'SPEECH' && (selected.contextBefore || selected.contextAfter) && (
        <section className="report-card-section report-card-context">
          <h3 className="report-card-label">앞뒤 맥락</h3>
          {selected.contextBefore && <p className="context-before">{selected.contextBefore}</p>}
          {selected.contextAfter && <p className="context-after">{selected.contextAfter}</p>}
        </section>
      )}

      <section className="report-card-section report-card-reason">
        <h3 className="report-card-label">AI 검토 이유</h3>
        <p>{selected.reason}</p>
      </section>

      <section className="report-card-section report-reference-block">
        <h3 className="report-card-label">참고자료</h3>
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

      <hr className="report-card-divider" />

      <ReviewActions
        selectedDecision={selectedDecision}
        isSaving={isSaving}
        decisionError={decisionError}
        onDecision={onDecision}
      />
    </article>
  )
}
