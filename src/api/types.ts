export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type AnalysisStage = 'UPLOAD' | 'STT' | 'TEXT_RISK' | 'SCENE_DETECTION' | 'OCR' | 'MULTIMODAL' | 'FINALIZING' | 'COMPLETED'
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ApiSuccess<T> { success: true; message: string; data: T }
export interface ApiErrorBody { success: false; message: string; error: { code: string; traceId: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody

export interface VideoUploadResponse { videoId: number; jobId: string; filename: string; status: AnalysisStatus; streamUrl: string }
export interface VideoStatusResponse { videoId: number; jobId: string; status: AnalysisStatus; progress: number; stage: AnalysisStage; message: string; errorCode?: string }
export interface VideoHistoryItem { videoId: number; filename: string; uploadedAt: string; status: AnalysisStatus; progress: number; eventCount: number; streamUrl: string }

interface TimelineEventBase { id: number; startMs: number; endMs: number; severity: Severity; reason: string; frameUrl: string | null }
export interface SpeechTimelineEvent extends TimelineEventBase { type: 'SPEECH'; text: string; riskTypes: string[] }
export interface CaptionTimelineEvent extends TimelineEventBase { type: 'CAPTION'; speechText: string; captionText: string }
export type TimelineEvent = SpeechTimelineEvent | CaptionTimelineEvent
export interface AnalysisReportResponse { videoId: number; jobId: string; status: 'COMPLETED'; summary: Record<Severity extends infer T ? T extends string ? Lowercase<T> : never : never, number>; events: TimelineEvent[] }
export interface AnalysisRetryResponse { videoId: number; jobId: string; status: 'PENDING' }

export class ApiRequestError extends Error {
  code: string
  status: number
  traceId?: string
  constructor(code: string, message: string, status: number, traceId?: string) { super(message); this.code = code; this.status = status; this.traceId = traceId }
}
