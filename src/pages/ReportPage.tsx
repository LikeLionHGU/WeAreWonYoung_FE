import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ErrorNotice, Loading } from '../components/AppShell'
import { assetUrl } from '../api/client'
import type { ReviewAction, TimelineEvent } from '../api/types'
import { apiClient } from '../api/client'
import { useAnalysisReport } from '../hooks/useAnalysisReport'
import { formatTime, formatSeconds, reportEventTitle, reportEventSpeech, reportEventKind, reportEventEvidence } from '../utils/format'
import EmptyReportPage from './EmptyReportPage'

type ReportFilter = 'ALL' | 'SPEECH_REVIEW' | 'FACT_CHECK'
type ReportSort = 'ASC' | 'DESC'

export default function ReportPage() {
  const { videoId } = useParams(); const id = videoId ?? ''; const navigate = useNavigate(); const { report: reportResponse, error } = useAnalysisReport(id)
  const videoRef = useRef<HTMLVideoElement>(null); const selectedCardRef = useRef<HTMLElement>(null); const [selectedId, setSelectedId] = useState<string | null>(null); const [decisions, setDecisions] = useState<Record<string, ReviewAction | null>>({}); const [isPlaying, setIsPlaying] = useState(false); const [duration, setDuration] = useState(0); const [currentTime, setCurrentTime] = useState(0); const [filter, setFilter] = useState<ReportFilter>('ALL'); const [sort, setSort] = useState<ReportSort>('ASC'); const [sortOpen, setSortOpen] = useState(false); const [decisionError, setDecisionError] = useState<string | null>(null); const [savingEventId, setSavingEventId] = useState<string | null>(null); const [isCompleting, setIsCompleting] = useState(false)
  useEffect(() => {
    if (reportResponse?.events[0]) setSelectedId(current => current ?? reportResponse.events[0].id)
  }, [reportResponse])
  useEffect(() => {
    if (reportResponse) setDecisions(Object.fromEntries(reportResponse.events.map(event => [event.id, event.reviewAction])))
  }, [reportResponse])
  if (!id) return <Navigate to="/" replace />
  if (!reportResponse && !error) return <main className="center-page"><Loading label="검수 결과를 정리하는 중" /></main>
  if (error) return <main className="center-page"><ErrorNotice message={error.message} code={error.code} /><Link className="button button-dark" to={`/videos/${id}/analysis`}>분석 상태로 돌아가기</Link></main>
  if (!reportResponse) return null
  const report = reportResponse
  const reportEvents = report.events
  const filteredEvents = reportEvents.filter(event => filter === 'ALL' || event.candidateType === filter)
  const orderedEvents = [...filteredEvents].sort((left, right) => sort === 'ASC' ? left.startMs - right.startMs : right.startMs - left.startMs)
  const selected = orderedEvents.find(event => event.id === selectedId) ?? orderedEvents[0]
  if (!selected) return <EmptyReportPage />
  const selectedIndex = Math.max(0, report.events.findIndex(event => event.id === selected.id))
  const remaining = report.events.filter(event => !decisions[event.id]).length
  const subtitle = '판정이 아니라 확인 요청입니다. 하나씩 읽고 직접 결정하세요.'
  function chooseFilter(nextFilter: ReportFilter) { setFilter(nextFilter); setSelectedId(null) }
  function chooseSort(nextSort: ReportSort) { setSort(nextSort); setSortOpen(false); setSelectedId(null) }
  async function setDecision(decision: ReviewAction) {
    const previous = decisions[selected.id] ?? null
    setDecisionError(null); setSavingEventId(selected.id); setDecisions(current => ({ ...current, [selected.id]: decision }))
    try {
      await apiClient.saveReviewAction(id, selected.id, decision)
      const currentIndex = orderedEvents.findIndex(event => event.id === selected.id)
      const nextEvent = orderedEvents[currentIndex + 1]
      if (nextEvent) setSelectedId(nextEvent.id)
    } catch (error) {
      setDecisions(current => ({ ...current, [selected.id]: previous }))
      setDecisionError(error instanceof Error ? error.message : '검수 결정을 저장하지 못했습니다.')
    } finally { setSavingEventId(null) }
  }
  function selectEvent(event: TimelineEvent) { setSelectedId(event.id); const nextTime = event.startMs / 1000; setCurrentTime(nextTime); if (videoRef.current) { videoRef.current.currentTime = nextTime; void videoRef.current.play().catch(() => undefined) } window.requestAnimationFrame(() => selectedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
  function togglePlay() { if (!videoRef.current) return; if (videoRef.current.paused) void videoRef.current.play(); else videoRef.current.pause() }
  function seek(value: number) { setCurrentTime(value); if (videoRef.current) videoRef.current.currentTime = value }
  function decisionLabel(event: TimelineEvent) { const decision = decisions[event.id]; return decision === 'EDITED' ? '수정함' : decision === 'CONFIRMED' ? '유지함' : decision === 'HOLD' ? '보류' : decision === 'NOT_USEFUL' ? '검출 끔' : '' }
  async function finishReview() {
    if (remaining > 0) { setDecisionError('아직 결정하지 않은 검토 후보가 남아 있습니다.'); return }
    setIsCompleting(true); setDecisionError(null)
    try { await apiClient.completeReview(id); navigate(`/videos/${id}/completed`) } catch (error) { setDecisionError(error instanceof Error ? error.message : '검수를 완료하지 못했습니다.') } finally { setIsCompleting(false) }
  }
  const reportDuration = report.durationMs / 1000
  const mediaDuration = Number.isFinite(duration) && duration > 0 ? duration : reportDuration
  const scrubberMax = mediaDuration || Math.max(selected.endMs / 1000, 1)
  const scrubberValue = Math.min(currentTime, scrubberMax)
  const durationLabel = mediaDuration ? formatSeconds(mediaDuration) : '--:--'
  const selectedDecision = decisions[selected.id]
  const filterLabel = filter === 'FACT_CHECK' ? '사실 확인' : '발언'
  const selectedSpeech = reportEventSpeech(selected)
  const selectedReferences = selected.references
  const generatedDate = new Date(report.generatedAt)
  const generatedLabel = Number.isNaN(generatedDate.valueOf()) ? '날짜 확인 불가' : generatedDate.toLocaleDateString('ko-KR')

  return <main className="report-page">
    <div className="report-content">
      <div className="report-heading"><p className="report-meta">검수 리포트 · {generatedLabel}</p><h1>다시 확인할 구간 {remaining}건 남음</h1><p>{subtitle}</p>{report.warnings.length > 0 && <div className="report-warnings" role="status"><strong>일부 분석 안내</strong>{report.warnings.map(warning => <p key={`${warning.stage}-${warning.code}`}>{warning.message}</p>)}</div>}{decisionError && <ErrorNotice message={decisionError} />}</div>
      <div className="report-toolbar"><div className="report-filter-count"><strong>남은 검토</strong><span>{remaining}</span></div><div className="report-filters" aria-label="검토 후보 유형"><button type="button" className={filter === 'ALL' ? 'is-selected' : ''} onClick={() => chooseFilter('ALL')}>전체 {report.events.length}</button><button type="button" className={filter === 'SPEECH_REVIEW' ? 'is-selected' : ''} onClick={() => chooseFilter('SPEECH_REVIEW')}>발언 {report.events.filter(event => event.candidateType === 'SPEECH_REVIEW').length}</button><button type="button" className={filter === 'FACT_CHECK' ? 'is-selected' : ''} onClick={() => chooseFilter('FACT_CHECK')}>사실 확인 {report.events.filter(event => event.candidateType === 'FACT_CHECK').length}</button></div><div className="report-sort-wrap"><button type="button" className="report-sort" aria-expanded={sortOpen} aria-haspopup="menu" onClick={() => setSortOpen(value => !value)} onKeyDown={event => { if (event.key === 'Escape') setSortOpen(false) }}>{sort === 'ASC' ? '시간순' : '최신순'} ▾</button>{sortOpen && <div className="report-sort-menu" role="menu" onKeyDown={event => { if (event.key === 'Escape') setSortOpen(false) }}><button type="button" role="menuitem" className={sort === 'ASC' ? 'is-selected' : ''} onClick={() => chooseSort('ASC')}>시간순</button><button type="button" role="menuitem" className={sort === 'DESC' ? 'is-selected' : ''} onClick={() => chooseSort('DESC')}>최신순</button></div>}</div></div>
      {filter !== 'ALL' && <section className="report-filter-results" aria-label={`${filterLabel} 검토 후보`}><div className="report-filter-results-head"><strong>{filterLabel} 검토 후보</strong><span>{orderedEvents.length}건</span></div><div className="report-filter-results-list">{orderedEvents.map(event => <button type="button" className={`report-filter-result ${event.id === selected.id ? 'is-current' : ''}`} key={event.id} onClick={() => selectEvent(event)}><span className="report-time-pill">{formatTime(event.startMs)}</span><span>{reportEventKind(event)}</span><strong>{reportEventTitle(event)}</strong><small>{reportEventEvidence(event)}</small>{decisionLabel(event) && <em>{decisionLabel(event)}</em>}</button>)}</div></section>}
      <article ref={selectedCardRef} className="report-selected-card"><div className="report-card-top"><div className="report-card-meta"><span className="report-time-pill">{formatTime(selected.startMs)}</span><span>{reportEventKind(selected)}</span></div><div className="report-card-position"><span className="report-scrubber-mini"><i style={{ width: `${mediaDuration ? Math.min(100, Math.max(4, selected.startMs / 1000 / mediaDuration * 100)) : 0}%` }} /></span><span>{durationLabel} 중 {formatTime(selected.startMs)}</span><span>{selectedIndex + 1} / {report.events.length}</span></div></div><h2>{reportEventTitle(selected)}</h2><div className="report-reason"><h3>왜 확인하나요?</h3><p>{selected.reason}</p></div><div className="report-player"><video ref={videoRef} preload="metadata" poster={assetUrl(selected.frameUrl)} src={assetUrl(report.streamUrl)} onLoadedMetadata={event => setDuration(event.currentTarget.duration)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onClick={togglePlay} /><button type="button" className="report-play" aria-label={isPlaying ? '일시정지' : '재생'} onClick={togglePlay}>{isPlaying ? 'Ⅱ' : '▶'}</button></div><div className="report-scrubber"><input type="range" min="0" max={scrubberMax} step="0.1" value={scrubberValue} onChange={event => seek(Number(event.target.value))} /><div><span>{formatSeconds(currentTime || selected.startMs / 1000)}</span><div><span>이 구간만 반복 재생</span><b>·</b><span>앞뒤 10초 더 보기</span></div><span>{durationLabel}</span></div></div>{selectedSpeech && <section className="report-evidence-block"><h3>{selected.type === 'SPEECH' ? '실제 발언' : '화면 정보'}</h3><blockquote>{selectedSpeech}</blockquote></section>}{selected.type === 'SPEECH' && selected.candidateType === 'SPEECH_REVIEW' && (selected.contextBefore || selected.contextAfter) && <section className="report-evidence-block report-context-block"><h3>앞뒤 맥락</h3>{selected.contextBefore && <p className="context-before">{selected.contextBefore}</p>}{selected.contextAfter && <p className="context-after">{selected.contextAfter}</p>}</section>}<section className="report-evidence-block report-reference-block"><h3>참고 자료</h3>{selectedReferences.length > 0 ? <div className="report-reference-items">{selectedReferences.map(reference => <article className="report-reference-item" key={`${reference.url}-${reference.title}`}><div><strong>{reference.title}</strong>{reference.provider && <span>{reference.provider}{reference.publishedAt ? ` · ${reference.publishedAt}` : ''}</span>}{reference.snippet && <small>{reference.snippet}</small>}</div><a href={reference.url} target="_blank" rel="noreferrer">원문 확인 <b aria-hidden="true">→</b></a></article>)}</div> : <p className="report-reference-empty">제공된 참고 자료가 없습니다.</p>}</section><div className="report-actions"><button type="button" disabled={savingEventId === selected.id} className={selectedDecision === 'EDITED' ? 'is-active' : ''} onClick={() => void setDecision('EDITED')}>수정함</button><button type="button" disabled={savingEventId === selected.id} className={selectedDecision === 'CONFIRMED' ? 'is-active' : ''} onClick={() => void setDecision('CONFIRMED')}>유지함</button><button type="button" disabled={savingEventId === selected.id} className={selectedDecision === 'HOLD' ? 'is-active' : ''} onClick={() => void setDecision('HOLD')}>보류</button><span /><button type="button" disabled={savingEventId === selected.id} className={`report-muted-action ${selectedDecision === 'NOT_USEFUL' ? 'is-active' : ''}`} onClick={() => void setDecision('NOT_USEFUL')}>이 검출 끄기</button></div><p className="report-next">결정하면 다음 검토 후보로 이동합니다 →</p></article>
      <section className="report-candidates"><div className="report-candidates-card">{orderedEvents.map(event => <button type="button" className={`report-candidate-row ${event.id === selected.id ? 'is-current' : ''}`} key={event.id} onClick={() => selectEvent(event)}><span className="report-time-pill">{formatTime(event.startMs)}</span><span>{reportEventKind(event)}</span><strong>{reportEventTitle(event)}</strong><small>{reportEventEvidence(event)}</small>{decisionLabel(event) && <em>{decisionLabel(event)}</em>}</button>)}</div></section><p className="report-footnote">최종 판단은 제작자가 합니다. 원본 영상은 분석 완료 후 24시간 안에 삭제됩니다.</p>
    </div>
    <aside className="report-sidebar"><div className="report-file-context"><span>검수 중인 영상</span><strong>{report.filename}</strong><small>검수 완료 · 원본 영상</small></div><div className="report-decision-progress"><div><span>결정 진행</span><strong>{report.events.length - remaining} / {report.events.length}</strong></div><div className="report-sidebar-track"><i style={{ width: `${report.events.length ? ((report.events.length - remaining) / report.events.length) * 100 : 0}%` }} /></div></div><button type="button" className="report-finish-button" onClick={() => void finishReview()} disabled={isCompleting}>{isCompleting ? '완료 처리 중…' : '검수 마치기'}</button><div className="report-outline"><span>검토 후보</span><strong>{report.events.length}건 · 남은 {remaining}</strong><div className="report-outline-list">{report.events.map(event => <button type="button" className={event.id === selected.id ? 'is-current' : ''} key={event.id} onClick={() => selectEvent(event)}><i>{decisions[event.id] ? '✓' : ''}</i><b>{formatTime(event.startMs)}</b><span>{reportEventKind(event)}</span></button>)}</div><small>클릭하면 해당 후보로 이동</small></div></aside>
  </main>
}
