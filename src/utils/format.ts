import type { CandidateType, TimelineEvent } from '../api/types'

export function formatTime(ms: number) { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }

export function formatSeconds(seconds: number) { return formatTime(Math.max(0, seconds) * 1000) }

export function formatHistoryDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '—' : date.toISOString().slice(0, 10)
}

export function reportEventTitle(event: TimelineEvent) { return event.title }
export function reportEventSpeech(event: TimelineEvent) { return event.type === 'SPEECH' ? event.text : event.speechText }
export function reportEventKind(event: TimelineEvent) { return event.type === 'SPEECH' ? '발언' : '사실 확인' }

export const candidateLabels: Record<CandidateType, string> = { SPEECH_REVIEW: '발언 검토', SCREEN_TEXT_REVIEW: '화면 자막 검토', FACT_ENTITY: '사실·대상 확인', CONTEXT_REFERENCE: '맥락 참고' }

export function reportEventEvidence(event: TimelineEvent) { return candidateLabels[event.candidateType] }
