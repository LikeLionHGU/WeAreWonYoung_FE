import type { ApiResponse, AnalysisReportResponse, AnalysisRetryResponse, VideoHistoryItem, VideoStatusResponse, VideoUploadResponse } from './types'
import { ApiRequestError } from './types'

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init)
  let body: ApiResponse<T>
  try { body = await response.json() as ApiResponse<T> } catch { throw new ApiRequestError('INTERNAL_SERVER_ERROR', '서버 응답을 읽지 못했습니다.', response.status) }
  if (!response.ok || !body.success) {
    if (!body.success) throw new ApiRequestError(body.error.code, body.message, response.status, body.error.traceId)
    throw new ApiRequestError('INTERNAL_SERVER_ERROR', '요청에 실패했습니다.', response.status)
  }
  return body.data
}

export const apiClient = {
  upload(file: File) {
    const form = new FormData(); form.append('file', file)
    return request<VideoUploadResponse>('/api/v1/videos', { method: 'POST', body: form })
  },
  videos() { return request<VideoHistoryItem[]>('/api/v1/videos') },
  status(videoId: number) { return request<VideoStatusResponse>(`/api/v1/videos/${videoId}/status`) },
  report(videoId: number) { return request<AnalysisReportResponse>(`/api/v1/videos/${videoId}/report`) },
  retry(videoId: number) { return request<AnalysisRetryResponse>(`/api/v1/videos/${videoId}/analysis/retry`, { method: 'POST' }) },
}

export function assetUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  return `${baseUrl}${path}`
}

export function websocketUrl() {
  const configured = import.meta.env.VITE_WS_URL as string | undefined
  if (configured) return configured
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}
