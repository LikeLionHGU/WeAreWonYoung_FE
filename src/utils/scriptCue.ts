import type { AnalysisReportResponse, TimelineEvent } from '../api/types'

// 유튜브 스크립트를 붙여넣으면 "0:26" 과 음성 안내용 "26초" 가 대사 앞에 붙은 채 저장된다.
const CUE_PATTERN =
  /(?<![\d:])((?:\d{1,2}:)?\d{1,2}:\d{2})((?:\d+시간\s*)?(?:\d+분\s*)?(?:\d+초)?)/g
const SPOKEN_TIME = /^(?:(\d+)시간\s*)?(?:(\d+)분\s*)?(?:(\d+)초)?/
const OCCURRENCE_SUFFIX = /\s*\(등장: [^)]*\)$/

function clockToSeconds(clock: string) {
  return clock.split(':').reduce((total, part) => total * 60 + Number(part), 0)
}

function spokenToSeconds(spoken: string) {
  const [, hours = 0, minutes = 0, seconds = 0] = spoken.match(SPOKEN_TIME) ?? []
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
}

/** 시계 표기와 한글 표기가 같은 시각일 때만 큐로 본다. "10:30에" 같은 실제 발언은 건드리지 않는다. */
function isCue(clock: string, spoken: string) {
  return spoken.length > 0 && clockToSeconds(clock) === spokenToSeconds(spoken)
}

export function stripCueTimes(text: string) {
  return text
    .replace(CUE_PATTERN, (match, clock: string, spoken: string) =>
      isCue(clock, spoken) ? '' : match,
    )
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function firstCueTimeMs(text: string): number | null {
  for (const [, clock, spoken] of text.matchAll(CUE_PATTERN)) {
    if (isCue(clock, spoken)) return clockToSeconds(clock) * 1000
  }
  return null
}

function hasCueTime(event: TimelineEvent) {
  const texts =
    event.type === 'SPEECH'
      ? [event.text, event.contextBefore, event.contextAfter, event.reason]
      : [event.reason]
  return texts.some(text => text && firstCueTimeMs(text) !== null)
}

function normalizeEvent(event: TimelineEvent): TimelineEvent {
  const reason = stripCueTimes(event.reason.replace(OCCURRENCE_SUFFIX, ''))
  if (event.type !== 'SPEECH') return { ...event, reason, timeUnknown: true }

  const cueMs = firstCueTimeMs(event.text)
  return {
    ...event,
    reason,
    text: stripCueTimes(event.text),
    contextBefore: event.contextBefore ? stripCueTimes(event.contextBefore) || null : null,
    contextAfter: event.contextAfter ? stripCueTimes(event.contextAfter) || null : null,
    ...(cueMs === null ? { timeUnknown: true } : { startMs: cueMs }),
  }
}

/**
 * 큐가 섞인 스크립트 리포트는 startMs 와 "(등장: …)" 도 원본 시각과 어긋난다.
 * 그래서 발언에 남은 큐를 시각으로 쓰고, 큐가 없는 후보는 시각을 모르는 것으로 표시한다.
 */
export function normalizeScriptReport(report: AnalysisReportResponse): AnalysisReportResponse {
  const isScriptReport = report.sourceType === 'YOUTUBE' && !report.sourceUrl
  if (!isScriptReport || !report.events.some(hasCueTime)) return report
  return { ...report, events: report.events.map(normalizeEvent) }
}
