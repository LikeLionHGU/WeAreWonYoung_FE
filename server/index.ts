import cors from 'cors'
import express, { type Request, type Response } from 'express'
import { execFile } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { promisify } from 'node:util'
import multer from 'multer'
import { WebSocketServer, type WebSocket } from 'ws'

type Status = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
type Stage = 'UPLOAD' | 'STT' | 'TEXT_RISK' | 'SCENE_DETECTION' | 'OCR' | 'MULTIMODAL' | 'FINALIZING' | 'COMPLETED'
type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
type ReviewStatus = 'NOT_STARTED' | 'IN_REVIEW' | 'COMPLETED'
type ReviewAction = 'CONFIRMED' | 'EDITED' | 'HOLD' | 'NOT_USEFUL'
type CandidateType = 'SPEECH_REVIEW' | 'FACT_CHECK'

interface Reference {
  title: string
  provider?: string | null
  url: string
  publishedAt?: string | null
  snippet?: string | null
  relevantContext?: string | null
}

interface EventBase {
  id: string
  startMs: number
  endMs: number
  severity: Severity
  candidateType: CandidateType
  title: string
  reason: string
  frameUrl: string
  references: Reference[]
  reviewAction: ReviewAction | null
}

type TimelineEvent =
  | (EventBase & { type: 'SPEECH'; text: string; riskTypes: string[]; contextBefore?: string | null; contextAfter?: string | null })
  | (EventBase & { type: 'CAPTION'; speechText: string; captionText: string })

interface Report {
  videoId: string
  jobId: string
  filename: string
  generatedAt: string
  durationMs: number
  streamUrl: string
  reviewStatus: ReviewStatus
  summary: { total: number; speechReview: number; factCheck: number }
  reviewSummary: { decided: number; remaining: number; confirmed: number; edited: number; hold: number; notUseful: number }
  coverage: { speechAnalyzed: boolean; screenTextAnalyzed: boolean; sceneAnalyzed: boolean }
  warnings: { stage: string; code: string; message: string }[]
  events: TimelineEvent[]
}

interface VideoRecord {
  videoId: string
  filename: string
  uploadedAt: string
  durationMs: number
  storagePath: string
  mimeType: string
  jobId: string
  status: Status
  progress: number
  stage: Stage
  message: string
  startedAt: string | null
  updatedAt: string
  completedAt: string | null
  reviewedAt: string | null
  failure: { code: string; message: string } | null
  report?: Report
}

interface State { nextVideoId: number; videos: Record<string, VideoRecord> }

const root = process.cwd()
const dataDir = process.env.MOCK_DATA_DIR ?? path.join(root, 'mock-data')
const uploadsDir = path.join(dataDir, 'uploads')
const statePath = path.join(dataDir, 'state.json')
const port = Number(process.env.PORT ?? 3001)
const stepMs = Number(process.env.MOCK_STEP_MS ?? 900)
const stages: Stage[] = ['STT', 'TEXT_RISK', 'SCENE_DETECTION', 'OCR', 'MULTIMODAL', 'FINALIZING', 'COMPLETED']
let state: State = { nextVideoId: 1, videos: {} }
let failedOnce = false
let saveChain: Promise<void> = Promise.resolve()
const subscriptions = new Map<WebSocket, Map<string, string>>()
const execFileAsync = promisify(execFile)

async function probeDurationMs(storagePath: string) {
  if (!storagePath) return 0
  try {
    const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', storagePath])
    const seconds = Number(stdout.trim())
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : 0
  } catch {
    return 0
  }
}

async function init() {
  await mkdir(uploadsDir, { recursive: true })
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8')) as State
    state.nextVideoId = parsed.nextVideoId ?? 1
    state.videos = Object.fromEntries(Object.entries(parsed.videos ?? {}).map(([key, raw]) => {
      const legacy = raw as Partial<VideoRecord> & { errorCode?: string }
      const now = new Date().toISOString()
      const record: VideoRecord = {
        videoId: String(legacy.videoId ?? key),
        filename: legacy.filename ?? 'uploaded-video.mp4',
        uploadedAt: legacy.uploadedAt ?? now,
        durationMs: legacy.durationMs ?? 0,
        storagePath: legacy.storagePath ?? '',
        mimeType: legacy.mimeType ?? 'video/mp4',
        jobId: legacy.jobId ?? `job_${key}`,
        status: legacy.status ?? 'PENDING',
        progress: legacy.progress ?? 0,
        stage: legacy.stage ?? 'UPLOAD',
        message: legacy.message ?? '분석 요청을 준비 중',
        startedAt: legacy.startedAt ?? null,
        updatedAt: legacy.updatedAt ?? now,
        completedAt: legacy.completedAt ?? null,
        reviewedAt: legacy.reviewedAt ?? null,
        failure: legacy.failure ?? (legacy.errorCode ? { code: legacy.errorCode, message: legacy.message ?? '분석에 실패했습니다.' } : null),
      }
      if (record.status === 'COMPLETED') record.report = normalizeReport(record, legacy.report)
      return [record.videoId, record]
    }))
    await Promise.all(Object.values(state.videos).map(async record => {
      const measuredDuration = await probeDurationMs(record.storagePath)
      if (!measuredDuration) return
      record.durationMs = measuredDuration
      if (record.report) record.report.durationMs = measuredDuration
    }))
    await saveState()
  } catch {
    await saveState()
  }
}

function saveState() {
  const snapshot = JSON.stringify(state, null, 2)
  saveChain = saveChain.catch(() => undefined).then(async () => {
    const temp = `${statePath}.${process.pid}.tmp`
    await writeFile(temp, snapshot)
    await rename(temp, statePath)
  })
  return saveChain
}

function success<T>(res: Response, status: number, data: T) {
  res.status(status).json({ success: true, data, error: null })
}

function failure(res: Response, status: number, code: string, message: string, details: unknown = null) {
  res.status(status).json({ success: false, data: null, error: { code, message, details } })
}

function video(id: string) { return state.videos[id] }
function mimeFor(filename: string) { const ext = path.extname(filename).toLowerCase(); return ext === '.mov' ? 'video/quicktime' : ext === '.avi' ? 'video/x-msvideo' : 'video/mp4' }

function reviewSummary(events: TimelineEvent[]) {
  const count = (action: ReviewAction) => events.filter(event => event.reviewAction === action).length
  const decided = events.filter(event => event.reviewAction !== null).length
  return { decided, remaining: events.length - decided, confirmed: count('CONFIRMED'), edited: count('EDITED'), hold: count('HOLD'), notUseful: count('NOT_USEFUL') }
}

function reportFor(record: VideoRecord): Report {
  const frame = (id: string) => `/api/v1/videos/${record.videoId}/frames/${id}`
  const events: TimelineEvent[] = [
    {
      id: 'event-1', startMs: 3200, endMs: 6100, type: 'SPEECH', severity: 'HIGH', candidateType: 'SPEECH_REVIEW',
      title: '특정 세대를 단정하는 표현', text: '요즘 젊은 사람들은 다 책임감이 없는 것 같아요.',
      contextBefore: '제가 최근에 몇 명을 만나봤는데요.', contextAfter: '물론 제가 만난 사례만 보고 느낀 생각입니다.',
      riskTypes: ['GENERALIZATION'], reason: '특정 세대 전체를 하나의 특성으로 묶어 표현하고 있습니다.', frameUrl: frame('event-1'),
      references: [], reviewAction: null,
    },
    {
      id: 'event-2', startMs: 7310, endMs: 9220, type: 'SPEECH', severity: 'MEDIUM', candidateType: 'FACT_CHECK',
      title: '설립 연도 사실 확인', text: 'OO회사는 2019년에 설립됐습니다.',
      riskTypes: ['FACT_CHECK'], reason: '영상에서는 설립 연도를 2019년이라고 언급했지만 확인된 자료에서는 2020년으로 안내하고 있습니다.', frameUrl: frame('event-2'),
      references: [{ title: 'OO회사 공식 소개', provider: 'OO회사', url: 'https://example.com/company', relevantContext: '발언의 설립 연도 확인에 사용' }], reviewAction: null,
    },
    {
      id: 'event-3', startMs: 12600, endMs: 15000, type: 'CAPTION', severity: 'MEDIUM', candidateType: 'FACT_CHECK',
      title: '화면 수치 출처 확인', speechText: '', captionText: '2024년 국내 이용자 80%',
      reason: '화면에 구체적인 이용률 수치가 표시되어 있어 출처 확인이 필요합니다.', frameUrl: frame('event-3'),
      references: [{ title: '2024 이용자 조사', provider: 'OO기관', url: 'https://example.com/report', publishedAt: '2026-07-01', snippet: '국내 이용률 78.5%' }], reviewAction: null,
    },
  ]
  return {
    videoId: record.videoId,
    jobId: record.jobId,
    filename: record.filename,
    generatedAt: record.completedAt ?? new Date().toISOString(),
    durationMs: record.durationMs,
    streamUrl: `/api/v1/videos/${record.videoId}/stream`,
    reviewStatus: 'NOT_STARTED',
    summary: { total: 3, speechReview: 1, factCheck: 2 },
    reviewSummary: reviewSummary(events),
    coverage: { speechAnalyzed: true, screenTextAnalyzed: true, sceneAnalyzed: true },
    warnings: [],
    events,
  }
}

function normalizeReport(record: VideoRecord, report?: Partial<Report>): Report {
  const normalized = reportFor(record)
  if (!report?.events) return normalized
  const actions = new Map(report.events.map(event => [String(event.id), event.reviewAction ?? null]))
  normalized.events.forEach(event => { event.reviewAction = actions.get(event.id) ?? null })
  normalized.reviewStatus = report.reviewStatus ?? (normalized.events.some(event => event.reviewAction) ? 'IN_REVIEW' : 'NOT_STARTED')
  normalized.reviewSummary = reviewSummary(normalized.events)
  normalized.generatedAt = report.generatedAt ?? normalized.generatedAt
  return normalized
}

function statusPayload(record: VideoRecord) {
  return {
    videoId: record.videoId,
    jobId: record.jobId,
    filename: record.filename,
    durationMs: record.durationMs,
    status: record.status,
    progress: record.progress,
    stage: record.stage,
    message: record.message,
    startedAt: record.startedAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
    failure: record.failure,
  }
}

function publish(record: VideoRecord) {
  const destination = `/topic/videos/${record.videoId}/progress`
  const payload = JSON.stringify(statusPayload(record))
  for (const [socket, topics] of subscriptions) {
    for (const [topic, subscriptionId] of topics) {
      if (topic === destination && socket.readyState === socket.OPEN) socket.send(`MESSAGE\nsubscription:${subscriptionId}\ndestination:${destination}\ncontent-type:application/json\ncontent-length:${Buffer.byteLength(payload)}\n\n${payload}\u0000`)
    }
  }
}

async function advance(record: VideoRecord) {
  if (record.status === 'COMPLETED' || record.status === 'CANCELLED') return
  record.status = 'PROCESSING'
  record.startedAt ??= new Date().toISOString()
  record.updatedAt = new Date().toISOString()
  record.message = '분석 준비 중'
  await saveState()
  publish(record)
  let index = Math.max(0, stages.indexOf(record.stage))
  const timer = setInterval(async () => {
    const current = state.videos[record.videoId]
    if (!current || current.jobId !== record.jobId || current.status === 'CANCELLED') { clearInterval(timer); return }
    if (process.env.MOCK_FAIL_FIRST_JOB === 'true' && !failedOnce && index >= 2) {
      failedOnce = true
      current.status = 'FAILED'
      current.failure = { code: 'ANALYSIS_FAILED', message: '분석 중 문제가 발생했습니다.' }
      current.message = current.failure.message
      current.updatedAt = new Date().toISOString()
      await saveState(); publish(current); clearInterval(timer); return
    }
    current.stage = stages[index] ?? 'COMPLETED'
    current.progress = current.stage === 'COMPLETED' ? 100 : Math.min(95, Math.round(((index + 1) / stages.length) * 100))
    current.message = current.stage === 'COMPLETED' ? '검수 결과가 준비되었습니다.' : stageMessage(current.stage)
    current.updatedAt = new Date().toISOString()
    if (current.stage === 'COMPLETED') {
      current.status = 'COMPLETED'
      current.completedAt = current.updatedAt
      current.report = reportFor(current)
      clearInterval(timer)
    }
    await saveState(); publish(current); index += 1
  }, stepMs)
}

function stageMessage(stage: Stage) {
  const messages: Partial<Record<Stage, string>> = { STT: '음성을 텍스트로 변환 중', TEXT_RISK: '발언 검토 후보 분석 중', SCENE_DETECTION: '사실 정보를 확인 중', OCR: '관련 맥락을 확인 중', MULTIMODAL: '검토 후보와 근거를 정리 중', FINALIZING: '검수 결과를 정리 중' }
  return messages[stage] ?? '분석 중'
}

const app = express()
app.use(cors())
app.use(express.json())
const upload = multer({
  storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, uploadsDir), filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`) }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['.mp4', '.mov', '.avi'].includes(path.extname(file.originalname).toLowerCase())),
})

app.post('/api/v1/videos', (req, res) => {
  upload.single('file')(req, res, async error => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return failure(res, 413, 'MAX_UPLOAD_SIZE_EXCEEDED', '파일 크기가 500MB를 초과했습니다.')
    if (error) return failure(res, 415, 'UNSUPPORTED_VIDEO_FORMAT', '지원하지 않는 영상 형식입니다.')
    if (!req.file) return failure(res, 400, 'INVALID_REQUEST', '영상 파일을 첨부해 주세요.')
    const id = String(state.nextVideoId++)
    const now = new Date().toISOString()
    // Real videos use their measured duration. The 1 ms fallback keeps the
    // mock contract valid for synthetic test payloads that are not playable.
    const durationMs = await probeDurationMs(req.file.path) || 1
    const record: VideoRecord = { videoId: id, filename: req.file.originalname, uploadedAt: now, durationMs, storagePath: req.file.path, mimeType: mimeFor(req.file.originalname), jobId: `job_${Math.random().toString(16).slice(2, 8)}`, status: 'PENDING', progress: 0, stage: 'UPLOAD', message: '분석 요청을 준비 중', startedAt: null, updatedAt: now, completedAt: null, reviewedAt: null, failure: null }
    state.videos[id] = record
    await saveState()
    success(res, 201, { videoId: id, jobId: record.jobId, filename: record.filename, durationMs: record.durationMs, status: record.status, streamUrl: `/api/v1/videos/${id}/stream` })
    void advance(record)
  })
})

app.get('/api/v1/videos/history', (req, res) => {
  const status = String(req.query.status ?? 'ALL')
  const page = Math.max(0, Number(req.query.page ?? 0))
  const size = Math.max(1, Number(req.query.size ?? 20))
  const all = Object.values(state.videos).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).filter(record => status === 'ALL' || record.status === status)
  const items = all.slice(page * size, page * size + size).map(record => ({ videoId: record.videoId, filename: record.filename, uploadedAt: record.uploadedAt, analysisStatus: record.status, reviewStatus: record.report?.reviewStatus ?? 'NOT_STARTED', eventCount: record.report?.events.length ?? 0, editedCount: record.report?.events.filter(event => event.reviewAction === 'EDITED').length ?? 0, reviewedAt: record.reviewedAt, streamUrl: `/api/v1/videos/${record.videoId}/stream` }))
  success(res, 200, { items, page, size, totalElements: all.length, totalPages: Math.ceil(all.length / size) })
})

app.get('/api/v1/videos/:id/status', (req, res) => {
  const record = video(req.params.id)
  if (!record) return failure(res, 404, 'VIDEO_NOT_FOUND', '영상을 찾을 수 없습니다.')
  success(res, 200, statusPayload(record))
})

app.get('/api/v1/videos/:id/report', (req, res) => {
  const record = video(req.params.id)
  if (!record) return failure(res, 404, 'VIDEO_NOT_FOUND', '영상을 찾을 수 없습니다.')
  if (record.status !== 'COMPLETED' || !record.report) return failure(res, 409, 'ANALYSIS_NOT_COMPLETED', '분석이 아직 완료되지 않았습니다.')
  record.report.reviewSummary = reviewSummary(record.report.events)
  success(res, 200, record.report)
})

app.put('/api/v1/videos/:id/review-actions/:eventId', async (req, res) => {
  const record = video(req.params.id)
  if (!record) return failure(res, 404, 'VIDEO_NOT_FOUND', '영상을 찾을 수 없습니다.')
  if (!record.report) return failure(res, 409, 'ANALYSIS_NOT_COMPLETED', '분석이 아직 완료되지 않았습니다.')
  const event = record.report.events.find(item => item.id === req.params.eventId)
  if (!event) return failure(res, 400, 'INVALID_REQUEST', '검토 후보를 찾을 수 없습니다.')
  const action = req.body?.action as ReviewAction
  if (!['CONFIRMED', 'EDITED', 'HOLD', 'NOT_USEFUL'].includes(action)) return failure(res, 400, 'INVALID_REQUEST', '검수 결정 값이 올바르지 않습니다.')
  event.reviewAction = action
  record.report.reviewStatus = 'IN_REVIEW'
  record.report.reviewSummary = reviewSummary(record.report.events)
  const updatedAt = new Date().toISOString()
  await saveState()
  success(res, 200, { videoId: record.videoId, eventId: event.id, action, note: req.body?.note ?? null, updatedAt })
})

app.post('/api/v1/videos/:id/review-completion', async (req, res) => {
  const record = video(req.params.id)
  if (!record) return failure(res, 404, 'VIDEO_NOT_FOUND', '영상을 찾을 수 없습니다.')
  if (!record.report) return failure(res, 409, 'ANALYSIS_NOT_COMPLETED', '분석이 아직 완료되지 않았습니다.')
  const summary = reviewSummary(record.report.events)
  if (summary.remaining > 0) return failure(res, 409, 'REVIEW_INCOMPLETE', '결정하지 않은 검토 후보가 남아 있습니다.')
  record.report.reviewStatus = 'COMPLETED'
  record.report.reviewSummary = summary
  record.reviewedAt = new Date().toISOString()
  await saveState()
  success(res, 200, { videoId: record.videoId, reviewStatus: record.report.reviewStatus, reviewedAt: record.reviewedAt, summary: { total: record.report.events.length, decided: summary.decided, remaining: summary.remaining, confirmed: summary.confirmed, edited: summary.edited, hold: summary.hold, notUseful: summary.notUseful } })
})

app.post('/api/v1/videos/:id/analysis/retry', async (req, res) => {
  const record = video(req.params.id)
  if (!record) return failure(res, 404, 'VIDEO_NOT_FOUND', '영상을 찾을 수 없습니다.')
  if (record.status === 'PROCESSING' || record.status === 'PENDING') return failure(res, 409, 'ANALYSIS_IN_PROGRESS', '분석이 진행 중입니다.')
  if (record.status !== 'FAILED' && record.status !== 'CANCELLED') return failure(res, 409, 'INVALID_ANALYSIS_STATE', '실패하거나 취소된 분석만 다시 시작할 수 있습니다.')
  record.jobId = `job_${Math.random().toString(16).slice(2, 8)}`
  record.status = 'PENDING'; record.progress = 0; record.stage = 'UPLOAD'; record.message = '분석 재시작 요청이 접수되었습니다.'; record.startedAt = null; record.completedAt = null; record.failure = null; delete record.report
  record.updatedAt = new Date().toISOString()
  await saveState(); success(res, 200, { videoId: record.videoId, jobId: record.jobId, status: record.status }); void advance(record)
})

app.post('/api/v1/videos/:id/analysis/cancel', async (req, res) => {
  const record = video(req.params.id)
  if (!record) return failure(res, 404, 'VIDEO_NOT_FOUND', '영상을 찾을 수 없습니다.')
  if (record.status !== 'PENDING' && record.status !== 'PROCESSING') return failure(res, 409, 'INVALID_ANALYSIS_STATE', '진행 중인 분석만 취소할 수 있습니다.')
  record.status = 'CANCELLED'; record.message = '분석이 취소되었습니다.'; record.updatedAt = new Date().toISOString()
  await saveState(); publish(record); success(res, 200, { videoId: record.videoId, jobId: record.jobId, status: record.status })
})

app.get('/api/v1/videos/:id/stream', async (req, res) => {
  const record = video(req.params.id)
  if (!record) return failure(res, 404, 'VIDEO_NOT_FOUND', '영상을 찾을 수 없습니다.')
  try {
    const info = await stat(record.storagePath)
    const range = req.headers.range
    res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Content-Type', record.mimeType)
    if (!range) { res.setHeader('Content-Length', info.size); return createReadStream(record.storagePath).pipe(res) }
    const match = /bytes=(\d*)-(\d*)/.exec(range)
    if (!match) return failure(res, 416, 'RANGE_NOT_SATISFIABLE', '요청한 영상 범위를 읽을 수 없습니다.')
    const start = match[1] ? Number(match[1]) : 0
    const end = match[2] ? Number(match[2]) : info.size - 1
    if (start >= info.size || end >= info.size || start > end) return failure(res, 416, 'RANGE_NOT_SATISFIABLE', '요청한 영상 범위를 읽을 수 없습니다.')
    res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`); res.setHeader('Content-Length', end - start + 1)
    return createReadStream(record.storagePath, { start, end }).pipe(res)
  } catch { return failure(res, 404, 'VIDEO_NOT_FOUND', '영상 파일을 찾을 수 없습니다.') }
})

app.get('/api/v1/videos/:id/frames/:frameId', (req, res) => {
  if (!video(req.params.id)) return failure(res, 404, 'VIDEO_NOT_FOUND', '영상을 찾을 수 없습니다.')
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACqaXHeAAAAC0lEQVR42mNkYPgPAAEDAQAIWqD2AAAAAElFTkSuQmCC', 'base64')
  res.setHeader('Cache-Control', 'public, max-age=3600'); res.type('png').send(png)
})

const httpServer = createServer(app)
const wss = new WebSocketServer({ noServer: true })
function parseFrame(raw: string) { const [head, body = ''] = raw.replace(/\u0000$/, '').split('\n\n'); const lines = head.split('\n'); const command = lines.shift() ?? ''; const headers = Object.fromEntries(lines.map(line => { const index = line.indexOf(':'); return [line.slice(0, index), line.slice(index + 1)] })); return { command, headers, body } }
wss.on('connection', socket => {
  subscriptions.set(socket, new Map())
  socket.on('message', raw => {
    const frame = parseFrame(raw.toString())
    if (frame.command === 'CONNECT' || frame.command === 'STOMP') socket.send('CONNECTED\nversion:1.2\nheart-beat:10000,10000\n\n\u0000')
    if (frame.command === 'SUBSCRIBE' && frame.headers.destination) subscriptions.get(socket)?.set(frame.headers.destination, frame.headers.id ?? 'sub-0')
    if (frame.command === 'UNSUBSCRIBE' && frame.headers.id) { const topics = subscriptions.get(socket); if (topics) for (const [topic, id] of topics) if (id === frame.headers.id) topics.delete(topic) }
  })
  socket.on('close', () => subscriptions.delete(socket))
  const heartbeat = setInterval(() => { if (socket.readyState === socket.OPEN) socket.send('\n'); else clearInterval(heartbeat) }, 10000)
})
httpServer.on('upgrade', (request, socket, head) => { if (request.url !== '/ws') { socket.destroy(); return } wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request)) })

await init()
for (const record of Object.values(state.videos)) if (record.status === 'PENDING' || record.status === 'PROCESSING') void advance(record)
httpServer.listen(port, () => console.log(`Creator Risk mock server listening on http://localhost:${port}`))
