import type { CandidateType, TimelineEvent } from '../api/types'

export function formatTime(ms: number) { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }

export function formatSeconds(seconds: number) { return formatTime(Math.max(0, seconds) * 1000) }

export function formatHistoryDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '—' : date.toISOString().slice(0, 10)
}

export function reportEventTitle(event: TimelineEvent) { return event.title }

export function reportEventContent(event: TimelineEvent): { label: string; text: string } {
  if (event.type === 'SPEECH') return { label: '실제 발언', text: event.text }
  return { label: '화면 정보', text: event.captionText }
}

export function reportEventSpeech(event: TimelineEvent): string {
  if (event.type === 'SPEECH') return event.text
  return event.captionText
}

export function reportEventKind(event: TimelineEvent) {
  return candidateLabels[event.candidateType]
}

export const candidateLabels: Record<CandidateType, string> = {
  SPEECH_REVIEW: '발언',
  FACT_CHECK: '사실 확인',
}
