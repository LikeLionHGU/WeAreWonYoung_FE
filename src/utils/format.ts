import type { CandidateType, TimelineEvent } from '../api/types'

export function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function formatEventTime(event: TimelineEvent) {
  return event.timeUnknown ? '—' : formatTime(event.startMs)
}

export function formatSeconds(seconds: number) {
  return formatTime(Math.max(0, seconds) * 1000)
}

export function formatHistoryDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '—' : date.toISOString().slice(0, 10)
}

export function reportEventTitle(event: TimelineEvent) {
  return event.title
}

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

/** "'누나' — 성적 대상화·성희롱" 형태의 제목에서 논란 유형 부분을 꺼낸다. */
export function reportEventRiskLabel(event: TimelineEvent) {
  const [, risk] = event.title.split(/\s+—\s+/)
  if (risk?.trim()) return risk.trim()
  // riskTypes가 사람이 읽을 수 있는 한글 라벨일 때만 노출하고, 내부 코드값은 숨긴다.
  const readable =
    event.type === 'SPEECH' ? (event.riskTypes ?? []).filter(type => /[^\x00-\x7F]/.test(type)) : []
  return readable.length > 0 ? readable.join('·') : candidateLabels[event.candidateType]
}

/** 제목의 따옴표 안 표현이 발언에 포함되어 있으면 강조할 표현으로 사용한다. */
export function reportEventHighlight(event: TimelineEvent): string | null {
  const text = reportEventSpeech(event)
  const quoted = event.title.match(/['‘"“]([^'’"”]+)['’"”]/)?.[1]?.trim()
  if (quoted && text.includes(quoted)) return quoted
  return null
}
