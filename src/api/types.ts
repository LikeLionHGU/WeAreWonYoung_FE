export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type AnalysisStage =
  | 'UPLOAD'
  | 'STT'
  | 'TEXT_RISK'
  | 'SCENE_DETECTION'
  | 'OCR'
  | 'MULTIMODAL'
  | 'FINALIZING'
  | 'COMPLETED'
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
export type UploadGenre = 'TALK_PODCAST' | 'GENERAL'
export type CandidateType = 'SPEECH_REVIEW' | 'FACT_CHECK'
export type ReviewStatus = 'NOT_STARTED' | 'IN_REVIEW' | 'COMPLETED'
export type ReviewAction = 'CONFIRMED' | 'EDITED' | 'HOLD' | 'NOT_USEFUL'

export interface ApiSuccess<T> {
  success: true
  data: T
  error: null
}

export interface ApiErrorBody {
  success: false
  data: null
  error: {
    code: string
    message: string
    details: unknown | null
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody

export interface VideoUploadResponse {
  videoId: string
  jobId: string
  filename: string
  durationMs: number
  status: 'PENDING'
  streamUrl: string
}

export interface AnalysisFailure {
  code: string
  message: string
}

export interface VideoStatusResponse {
  videoId: string
  jobId: string
  filename: string
  durationMs: number
  status: AnalysisStatus
  progress: number
  stage: AnalysisStage
  message: string
  startedAt: string | null
  updatedAt: string
  completedAt: string | null
  failure: AnalysisFailure | null
}

export interface VideoHistoryItem {
  videoId: string
  filename: string
  uploadedAt: string
  analysisStatus: AnalysisStatus
  reviewStatus: ReviewStatus
  eventCount: number
  editedCount: number
  reviewedAt: string | null
  streamUrl: string
}

export interface VideoHistoryResponse {
  items: VideoHistoryItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface CandidateReference {
  title: string
  provider?: string | null
  url: string
  publishedAt?: string | null
  relevantContext?: string | null
  snippet?: string | null
}

export interface AnalysisCoverage {
  speechAnalyzed: boolean
  screenTextAnalyzed: boolean
  sceneAnalyzed: boolean
}

export interface AnalysisWarning {
  stage: string
  code: string
  message: string
}

interface TimelineEventBase {
  id: string
  startMs: number
  endMs: number
  severity: Severity
  candidateType: CandidateType
  title: string
  reason: string
  frameUrl: string
  references: CandidateReference[]
  reviewAction: ReviewAction | null
}

export interface SpeechTimelineEvent extends TimelineEventBase {
  type: 'SPEECH'
  text: string
  contextBefore?: string | null
  contextAfter?: string | null
  riskTypes?: string[]
}

export interface CaptionTimelineEvent extends TimelineEventBase {
  type: 'CAPTION'
  captionText: string
  speechText?: string
}

export type TimelineEvent = SpeechTimelineEvent | CaptionTimelineEvent

export interface RiskSummary {
  total: number
  speechReview: number
  factCheck: number
}

export interface ReviewSummary {
  decided: number
  remaining: number
  confirmed: number
  edited: number
  hold: number
  notUseful: number
}

export interface AnalysisReportResponse {
  videoId: string
  jobId: string
  filename: string
  generatedAt: string
  durationMs: number
  streamUrl: string | null
  sourceUrl: string | null
  reviewStatus: ReviewStatus
  summary: RiskSummary
  reviewSummary: ReviewSummary
  coverage: AnalysisCoverage
  warnings: AnalysisWarning[]
  events: TimelineEvent[]
}

export interface AnalysisRetryResponse {
  videoId: string
  jobId: string
  status: 'PENDING'
}

export interface AnalysisCancelResponse {
  videoId: string
  jobId: string
  status: 'CANCELLED'
}

export interface ReviewActionResponse {
  videoId: string
  eventId: string
  action: ReviewAction
  note: string | null
  updatedAt: string
}

export interface ReviewCompletionResponse {
  videoId: string
  reviewStatus: 'COMPLETED'
  reviewedAt: string
  summary: {
    total: number
    decided: number
    remaining: number
    confirmed: number
    edited: number
    hold: number
    notUseful: number
  }
}

export class ApiRequestError extends Error {
  code: string
  status: number
  details: unknown | null

  constructor(code: string, message: string, status: number, details: unknown | null = null) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}
