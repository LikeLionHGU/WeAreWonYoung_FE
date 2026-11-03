import { useEffect, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ErrorNotice, Loading } from '../components/AppShell'
import { formatTime, reportEventTitle, reportEventKind } from '../utils/format'
import EmptyReportResult from './report/EmptyReportResult'
import EventDetailCard from './report/EventDetailCard'
import EventList from './report/EventList'
import ReviewSidebar from './report/ReviewSidebar'
import { useReportState } from './report/useReportState'

export default function ReportPage() {
  const state = useReportState()

  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (stateRef.current.isScriptOnly) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === ' ') {
        e.preventDefault()
        stateRef.current.togglePlay()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stateRef.current.skipBy(-10)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        stateRef.current.skipBy(10)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  if (!state.id) return <Navigate to="/" replace />

  if (!state.reportResponse && !state.error) {
    return (
      <main className="center-page">
        <Loading label="검수 결과를 정리하는 중" />
      </main>
    )
  }

  if (state.error) {
    return (
      <main className="center-page">
        <ErrorNotice message={state.error.message} />
        <Link className="button button-dark" to={`/videos/${state.id}/analysis`}>
          분석 상태로 돌아가기
        </Link>
      </main>
    )
  }

  if (!state.report) return null

  const { report, selected, orderedEvents, remaining, filter, warnings } = state

  if (!selected && report.events.length === 0) {
    const generatedDate = new Date(report.generatedAt)
    const generatedLabel = Number.isNaN(generatedDate.valueOf())
      ? '날짜 확인 불가'
      : generatedDate.toLocaleDateString('ko-KR')

    return (
      <main className="report-page">
        <EmptyReportResult report={report} generatedLabel={generatedLabel} warnings={warnings} />
        <ReviewSidebar
          filename={report.filename}
          events={[]}
          remaining={0}
          selectedId=""
          decisions={{}}
          isCompleting={state.isCompleting}
          finishError={state.decisionError}
          onFinishReview={() => void state.finishReview()}
          onSelect={() => undefined}
          textOnly={state.isScriptOnly}
        />
      </main>
    )
  }

  // 같은 표현·같은 논란 유형으로 걸린 다른 구간의 타임스탬프를 함께 보여준다.
  const relatedTimes = report.events
    .filter(
      event =>
        selected !== null &&
        event.id !== selected.id &&
        event.title === selected.title &&
        !event.timeUnknown,
    )
    .map(event => event.startMs)
    .sort((a, b) => a - b)
  const hasSpeech = report.events.some(event => event.type === 'SPEECH')
  const filterLabel = filter === 'FACT_CHECK' ? '사실 확인' : '발언'
  const generatedDate = new Date(report.generatedAt)
  const generatedLabel = Number.isNaN(generatedDate.valueOf())
    ? '날짜 확인 불가'
    : generatedDate.toLocaleDateString('ko-KR')

  return (
    <main className="report-page">
      <div className="report-content">
        {hasSpeech && (
          <p className="report-transcript-notice" role="note">
            전사된 발언에 오류가 있을 수 있습니다. 원본을 다시 한번 확인해 주세요.
          </p>
        )}
        <div className="report-heading">
          <p className="report-meta">검수 리포트 · {generatedLabel}</p>
          <h1>다시 확인할 구간 {remaining}건 남음</h1>
          <p>판정이 아니라 확인 요청입니다. 하나씩 읽고 직접 결정하세요.</p>
          {warnings.length > 0 && (
            <div className="report-warnings" role="status">
              <strong>일부 분석 안내</strong>
              {warnings.map(warning => (
                <p key={`${warning.stage}-${warning.code}`}>{warning.message}</p>
              ))}
            </div>
          )}
        </div>

        <div className="report-toolbar">
          <div className="report-filter-count">
            <strong>남은 검토</strong>
            <span>{remaining}</span>
          </div>
          <div className="report-filters" role="group" aria-label="검토 후보 유형">
            <button
              type="button"
              aria-pressed={filter === 'ALL'}
              className={filter === 'ALL' ? 'is-selected' : ''}
              onClick={() => state.chooseFilter('ALL')}
            >
              전체 {report.events.length}
            </button>
            <button
              type="button"
              aria-pressed={filter === 'SPEECH_REVIEW'}
              className={filter === 'SPEECH_REVIEW' ? 'is-selected' : ''}
              onClick={() => state.chooseFilter('SPEECH_REVIEW')}
            >
              발언 {state.speechCount}
            </button>
            <button
              type="button"
              aria-pressed={filter === 'FACT_CHECK'}
              className={filter === 'FACT_CHECK' ? 'is-selected' : ''}
              onClick={() => state.chooseFilter('FACT_CHECK')}
            >
              사실 확인 {state.factCheckCount}
            </button>
          </div>
        </div>

        {filter !== 'ALL' && (
          <section className="report-filter-results" aria-label={`${filterLabel} 검토 후보`}>
            <div className="report-filter-results-head">
              <strong>{filterLabel} 검토 후보</strong>
              <span>{orderedEvents.length}건</span>
            </div>
            <div className="report-filter-results-list">
              {orderedEvents.length === 0 && (
                <p className="report-filter-empty">{filterLabel} 검토 후보가 없습니다.</p>
              )}
              {orderedEvents.map(event => {
                const kind = reportEventKind(event)
                const label = state.decisionLabel(event)
                return (
                  <button
                    type="button"
                    aria-current={event.id === selected?.id ? 'true' : undefined}
                    className={`report-filter-result ${event.id === selected?.id ? 'is-current' : ''} ${state.isScriptOnly ? 'is-text-only' : ''}`}
                    key={event.id}
                    onClick={() => state.selectEvent(event)}
                  >
                    {!state.isScriptOnly && (
                      <span className="report-time-pill">{formatTime(event.startMs)}</span>
                    )}
                    <span>{kind}</span>
                    <strong>{reportEventTitle(event)}</strong>
                    <small aria-hidden="true">{kind}</small>
                    {label && <em>{label}</em>}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {selected && (
          <EventDetailCard
            selected={selected}
            relatedTimes={relatedTimes}
            selectedIndex={state.selectedIndex}
            totalCount={report.events.length}
            mediaDuration={state.mediaDuration}
            scrubberMax={state.scrubberMax}
            scrubberValue={state.scrubberValue}
            durationLabel={state.durationLabel}
            streamUrl={report.streamUrl ?? ''}
            youtubeUrl={report.sourceUrl ?? undefined}
            textOnly={state.isScriptOnly}
            videoRef={state.videoRef}
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            selectedDecision={state.selectedDecision}
            isSaving={state.savingEventId === selected.id}
            decisionError={state.decisionError}
            cardRef={state.selectedCardRef}
            onLoadedMetadata={state.handleSetDuration}
            onTimeUpdate={state.handleSetCurrentTime}
            onPlay={state.handleSetIsPlayingTrue}
            onPause={state.handleSetIsPlayingFalse}
            onTogglePlay={state.togglePlay}
            onSeek={state.seek}
            onSkipBy={state.skipBy}
            onVideoKeyDown={state.handleVideoKeyDown}
            onDecision={state.setDecision}
          />
        )}

        {filter === 'ALL' && (
          <EventList
            events={orderedEvents}
            selectedId={selected?.id ?? ''}
            onSelect={state.selectEvent}
            decisionLabel={state.decisionLabel}
            textOnly={state.isScriptOnly}
          />
        )}

        <p className="report-footnote">
          최종 판단은 제작자가 합니다. 원본 영상은 분석 완료 후 24시간 안에 삭제됩니다.
        </p>
      </div>

      <ReviewSidebar
        filename={report.filename}
        events={
          state.isScriptOnly
            ? report.events
            : [...report.events].sort((a, b) => a.startMs - b.startMs)
        }
        remaining={remaining}
        selectedId={selected?.id ?? ''}
        decisions={state.decisions}
        isCompleting={state.isCompleting}
        finishError={state.decisionError}
        onFinishReview={() => void state.finishReview()}
        onSelect={state.selectEvent}
        textOnly={state.isScriptOnly}
      />
    </main>
  )
}
