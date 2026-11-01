import assert from 'node:assert/strict'
import type { AnalysisReportResponse, SpeechTimelineEvent } from '../src/api/types'
import { firstCueTimeMs, normalizeScriptReport, stripCueTimes } from '../src/utils/scriptCue'

function speechEvent(overrides: Partial<SpeechTimelineEvent>): SpeechTimelineEvent {
  return {
    id: '1',
    startMs: 1148820,
    endMs: 1169340,
    severity: 'LOW',
    candidateType: 'SPEECH_REVIEW',
    title: "'개그맨' — 조롱",
    reason: '이유',
    frameUrl: '',
    references: [],
    reviewAction: null,
    type: 'SPEECH',
    text: '발언',
    ...overrides,
  }
}

function report(events: SpeechTimelineEvent[], sourceType: 'UPLOAD' | 'YOUTUBE' = 'YOUTUBE') {
  return {
    sourceType,
    sourceUrl: null,
    events,
  } as unknown as AnalysisReportResponse
}

assert.equal(stripCueTimes('0:2626초정변이지 음.'), '정변이지 음.')
assert.equal(stripCueTimes('0:033초풀린다 했죠.'), '풀린다 했죠.')
assert.equal(stripCueTimes('1:071분 7초초밥 장인들'), '초밥 장인들')
assert.equal(stripCueTimes('44:0044분만약에'), '만약에')
assert.equal(stripCueTimes('1:02:031시간 2분 3초네'), '네')
assert.equal(stripCueTimes('37:2637분 26초'), '')
assert.equal(
  stripCueTimes('표현: "0:3030초왜 이래", "0:4747초제발 만지게"'),
  '표현: "왜 이래", "제발 만지게"',
)

assert.equal(stripCueTimes('10:30에 만나요'), '10:30에 만나요')
assert.equal(stripCueTimes('10:3020분에 만나요'), '10:3020분에 만나요')
assert.equal(stripCueTimes('(등장: 19:30, 22:36)'), '(등장: 19:30, 22:36)')

assert.equal(firstCueTimeMs('45:0945분 9초근데'), 2709000)
assert.equal(firstCueTimeMs('1:02:031시간 2분 3초네'), 3723000)
assert.equal(firstCueTimeMs('제발 저에게도'), null)
assert.equal(firstCueTimeMs('10:30에 만나요'), null)

const polluted = normalizeScriptReport(
  report([
    speechEvent({
      text: '13:3613분 36초선생님들이',
      contextBefore: '13:2813분 28초2살',
      contextAfter: '13:4813분 48초',
      reason: '[폄하] "19:0819분 8초넌 잘돼 봤자" (등장: 19:08, 19:22)',
    }),
    speechEvent({
      id: '2',
      startMs: 52740,
      text: '제발 저에게도',
      contextBefore: null,
    }),
  ]),
)
const [stamped, unstamped] = polluted.events as SpeechTimelineEvent[]
assert.equal(stamped.text, '선생님들이')
assert.equal(stamped.contextBefore, '2살')
assert.equal(stamped.contextAfter, null)
assert.equal(stamped.reason, '[폄하] "넌 잘돼 봤자"')
assert.equal(stamped.startMs, 816000)
assert.equal(stamped.timeUnknown, undefined)
assert.equal(unstamped.timeUnknown, true)
assert.equal(unstamped.startMs, 52740)

const clean = report([speechEvent({ reason: '이유 (등장: 19:30, 22:36)' })])
assert.equal(normalizeScriptReport(clean), clean)

const uploaded = report([speechEvent({ text: '0:2626초정변이지' })], 'UPLOAD')
assert.equal(normalizeScriptReport(uploaded), uploaded)

console.log('Script cue smoke test passed')
