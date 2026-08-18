import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ReviewAction, TimelineEvent } from '../../api/types'
import { apiClient } from '../../api/client'
import { useAnalysisReport } from '../../hooks/useAnalysisReport'

export type ReportFilter = 'ALL' | 'SPEECH_REVIEW' | 'FACT_CHECK'

export function useReportState() {
  const { videoId } = useParams()
  const id = videoId ?? ''
  const navigate = useNavigate()
  const { report: reportResponse, error } = useAnalysisReport(id)
  const videoRef = useRef<HTMLVideoElement>(null)
  const selectedCardRef = useRef<HTMLElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, ReviewAction | null>>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [filter, setFilter] = useState<ReportFilter>('ALL')
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [savingEventId, setSavingEventId] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    if (!reportResponse) return
    setSelectedId(current => current ?? reportResponse.events[0]?.id ?? null)
    setDecisions(Object.fromEntries(reportResponse.events.map(event => [event.id, event.reviewAction])))
  }, [reportResponse])

  const reportEvents = reportResponse?.events ?? []

  const orderedEvents = useMemo(
    () => reportEvents
      .filter(event => filter === 'ALL' || event.candidateType === filter)
      .sort((left, right) => left.startMs - right.startMs),
    [reportEvents, filter]
  )

  const speechCount = useMemo(() => reportEvents.filter(e => e.candidateType === 'SPEECH_REVIEW').length, [reportEvents])
  const factCheckCount = useMemo(() => reportEvents.filter(e => e.candidateType === 'FACT_CHECK').length, [reportEvents])

  const selected = orderedEvents.find(event => event.id === selectedId) ?? orderedEvents[0] ?? null
  const selectedIndex = selected ? Math.max(0, reportEvents.findIndex(event => event.id === selected.id)) : 0
  const remaining = reportEvents.filter(event => !decisions[event.id]).length

  function chooseFilter(nextFilter: ReportFilter) { setFilter(nextFilter); setSelectedId(null) }

  async function setDecision(decision: ReviewAction) {
    if (!selected) return
    const previous = decisions[selected.id] ?? null
    setDecisionError(null); setSavingEventId(selected.id); setDecisions(current => ({ ...current, [selected.id]: decision }))
    try {
      await apiClient.saveReviewAction(id, selected.id, decision)
      const currentIdx = orderedEvents.findIndex(event => event.id === selected.id)
      const nextEvent = orderedEvents[currentIdx + 1]
      if (nextEvent) setSelectedId(nextEvent.id)
    } catch (err) {
      setDecisions(current => ({ ...current, [selected.id]: previous }))
      setDecisionError(err instanceof Error ? err.message : '검수 결정을 저장하지 못했습니다.')
    } finally { setSavingEventId(null) }
  }

  function selectEvent(event: TimelineEvent) {
    setSelectedId(event.id)
    const nextTime = event.startMs / 1000
    setCurrentTime(nextTime)
    if (videoRef.current) { videoRef.current.currentTime = nextTime; void videoRef.current.play().catch(() => undefined) }
    window.requestAnimationFrame(() => selectedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function togglePlay() { if (!videoRef.current) return; if (videoRef.current.paused) void videoRef.current.play().catch(() => undefined); else videoRef.current.pause() }
  function seek(value: number) { setCurrentTime(value); if (videoRef.current) videoRef.current.currentTime = value }

  function handleVideoKeyDown(e: React.KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); togglePlay() }
  }

  function decisionLabel(event: TimelineEvent) {
    const decision = decisions[event.id]
    return decision === 'EDITED' ? '수정함' : decision === 'CONFIRMED' ? '유지함' : decision === 'HOLD' ? '보류' : decision === 'NOT_USEFUL' ? '검출 끔' : ''
  }

  async function finishReview() {
    if (remaining > 0) { setDecisionError('아직 결정하지 않은 검토 후보가 남아 있습니다.'); return }
    setIsCompleting(true); setDecisionError(null)
    try { await apiClient.completeReview(id); navigate(`/videos/${id}/completed`) } catch (err) { setDecisionError(err instanceof Error ? err.message : '검수를 완료하지 못했습니다.') } finally { setIsCompleting(false) }
  }

  const reportDuration = (reportResponse?.durationMs ?? 0) / 1000
  const mediaDuration = Number.isFinite(duration) && duration > 0 ? duration : reportDuration
  const scrubberMax = selected ? (mediaDuration || Math.max(selected.endMs / 1000, 1)) : 1
  const scrubberValue = Math.min(currentTime, scrubberMax)
  const durationLabel = mediaDuration ? undefined : '--:--'

  return {
    id,
    reportResponse,
    error,
    report: reportResponse,
    reportEvents,
    orderedEvents,
    speechCount,
    factCheckCount,
    selected,
    selectedIndex,
    remaining,
    filter,
    chooseFilter,
    decisions,
    selectedDecision: selected ? decisions[selected.id] : null,
    setDecision,
    selectEvent,
    decisionLabel,
    decisionError,
    savingEventId,
    finishReview,
    isCompleting,
    // video
    videoRef,
    selectedCardRef,
    isPlaying,
    setIsPlaying,
    duration,
    setDuration,
    currentTime,
    setCurrentTime,
    mediaDuration,
    scrubberMax,
    scrubberValue,
    durationLabel,
    togglePlay,
    seek,
    handleVideoKeyDown,
  }
}
