import { useState } from 'react'
import { apiClient } from '../api/client'
import type { AnalysisRetryResponse } from '../api/types'
import { ApiRequestError } from '../api/types'

export function useAnalysisRetry() {
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState<ApiRequestError | null>(null)
  async function retry(videoId: string): Promise<AnalysisRetryResponse | null> {
    setIsRetrying(true);
    setError(null);
    try {
      return await apiClient.retry(videoId)
    } catch (e) {
      const error = e instanceof ApiRequestError ? e : new ApiRequestError('INTERNAL_SERVER_ERROR', '재시작하지 못했습니다.', 500);
      setError(error);
      return null
    } finally {
      setIsRetrying(false)
    }
  }
  return { retry, isRetrying, error }
}
