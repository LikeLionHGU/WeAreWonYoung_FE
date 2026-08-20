import type {
  AnalysisCancelResponse,
  AnalysisReportResponse,
  AnalysisRetryResponse,
  ApiResponse,
  ReviewAction,
  ReviewActionResponse,
  ReviewCompletionResponse,
  UploadGenre,
  VideoHistoryResponse,
  VideoStatusResponse,
  VideoUploadResponse,
} from './types'
import { ApiRequestError } from './types'

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const errorMessages: Record<string, string> = {
  INVALID_REQUEST: '요청 내용을 다시 확인해 주세요.',
  VIDEO_NOT_FOUND: '영상을 찾을 수 없습니다.',
  ANALYSIS_IN_PROGRESS: '이미 분석 중인 영상입니다.',
  ANALYSIS_NOT_COMPLETED: '분석이 끝난 뒤 리포트를 확인할 수 있습니다.',
  INVALID_ANALYSIS_STATE: '현재 상태에서는 이 작업을 진행할 수 없습니다.',
  REVIEW_INCOMPLETE: '아직 결정하지 않은 검토 후보가 남아 있습니다.',
  MAX_UPLOAD_SIZE_EXCEEDED: '500MB 이하의 영상을 올려 주세요.',
  UNSUPPORTED_VIDEO_FORMAT: 'mp4, mov 또는 avi 형식의 영상을 올려 주세요.',
  MAX_VIDEO_DURATION_EXCEEDED: '90분 이하의 영상을 올려 주세요.',
  RANGE_NOT_SATISFIABLE: '영상의 해당 구간을 재생할 수 없습니다.',
  INVALID_VIDEO_URL: '유효한 영상 링크가 아닙니다.',
  INTERNAL_SERVER_ERROR: '잠시 후 다시 시도해 주세요.',
}

export function hasConfiguredApi() {
  return Boolean(baseUrl)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init)
  let body: ApiResponse<T>
  try {
    body = (await response.json()) as ApiResponse<T>
  } catch {
    throw new ApiRequestError(
      'INTERNAL_SERVER_ERROR',
      errorMessages.INTERNAL_SERVER_ERROR,
      response.status,
    )
  }

  if (!response.ok || !body.success) {
    if (!body.success) {
      const message =
        body.error.message ?? errorMessages[body.error.code] ?? errorMessages.INTERNAL_SERVER_ERROR
      throw new ApiRequestError(body.error.code, message, response.status, body.error.details)
    }
    throw new ApiRequestError(
      'INTERNAL_SERVER_ERROR',
      errorMessages.INTERNAL_SERVER_ERROR,
      response.status,
    )
  }

  return body.data
}

export const apiClient = {
  upload(file: File, genre?: UploadGenre, onProgress?: (percent: number) => void) {
    const form = new FormData()
    form.append('file', file)
    if (genre) form.append('genre', genre)
    if (!onProgress) {
      return request<VideoUploadResponse>('/api/v1/videos', { method: 'POST', body: form })
    }
    return new Promise<VideoUploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${baseUrl}/api/v1/videos`)
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText) as ApiResponse<VideoUploadResponse>
          if (!body.success) {
            const msg = errorMessages[body.error.code] ?? body.error.message ?? errorMessages.INTERNAL_SERVER_ERROR
            reject(new ApiRequestError(body.error.code, msg, xhr.status, body.error.details))
          } else {
            resolve(body.data)
          }
        } catch {
          reject(new ApiRequestError('INTERNAL_SERVER_ERROR', errorMessages.INTERNAL_SERVER_ERROR, xhr.status))
        }
      }
      xhr.onerror = () =>
        reject(
          new ApiRequestError('INTERNAL_SERVER_ERROR', errorMessages.INTERNAL_SERVER_ERROR, 0),
        )
      xhr.ontimeout = () =>
        reject(
          new ApiRequestError(
            'INTERNAL_SERVER_ERROR',
            '업로드 시간이 초과되었습니다. 다시 시도해 주세요.',
            0,
          ),
        )
      xhr.onabort = () =>
        reject(new ApiRequestError('INTERNAL_SERVER_ERROR', '업로드가 취소되었습니다.', 0))
      xhr.timeout = 300000
      xhr.send(form)
    })
  },
  registerUrl(url: string, genre?: UploadGenre) {
    return request<VideoUploadResponse>('/api/v1/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, genre: genre ?? undefined }),
    })
  },
  history(status: 'ALL' | 'COMPLETED' | 'FAILED' = 'ALL', page = 0, size = 20) {
    const query = new URLSearchParams({ status, page: String(page), size: String(size) })
    return request<VideoHistoryResponse>(`/api/v1/videos/history?${query}`)
  },
  status(videoId: string) {
    return request<VideoStatusResponse>(`/api/v1/videos/${encodeURIComponent(videoId)}/status`)
  },
  report(videoId: string) {
    return request<AnalysisReportResponse>(`/api/v1/videos/${encodeURIComponent(videoId)}/report`)
  },
  retry(videoId: string) {
    return request<AnalysisRetryResponse>(
      `/api/v1/videos/${encodeURIComponent(videoId)}/analysis/retry`,
      { method: 'POST' },
    )
  },
  cancel(videoId: string) {
    return request<AnalysisCancelResponse>(
      `/api/v1/videos/${encodeURIComponent(videoId)}/analysis/cancel`,
      { method: 'POST' },
    )
  },
  saveReviewAction(
    videoId: string,
    eventId: string,
    action: ReviewAction,
    note: string | null = null,
  ) {
    return request<ReviewActionResponse>(
      `/api/v1/videos/${encodeURIComponent(videoId)}/review-actions/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      },
    )
  },
  completeReview(videoId: string) {
    return request<ReviewCompletionResponse>(
      `/api/v1/videos/${encodeURIComponent(videoId)}/review-completion`,
      { method: 'POST' },
    )
  },
  deleteVideo(videoId: string) {
    return request<void>(
      `/api/v1/videos/${encodeURIComponent(videoId)}`,
      { method: 'DELETE' },
    )
  },
}

export function assetUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  if (/^[a-z]+:/i.test(path)) return ''
  return `${baseUrl}${path}`
}

export function websocketUrl() {
  const configured = import.meta.env.VITE_WS_URL as string | undefined
  if (configured) return configured
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}
