import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import type { AnalysisReportResponse } from '../api/types'
import { ApiRequestError } from '../api/types'

export function useAnalysisReport(videoId: string, enabled = true) {
  const [report, setReport] = useState<AnalysisReportResponse | null>(null)
  const [error, setError] = useState<ApiRequestError | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    if (!enabled || !videoId) return
    let active = true
    void apiClient
      .report(videoId)
      .then(value => {
        if (active) setReport(value)
      })
      .catch(value => {
        if (active)
          setError(
            value instanceof ApiRequestError
              ? value
              : new ApiRequestError(
                  'INTERNAL_SERVER_ERROR',
                  '리포트를 불러오지 못했습니다.',
                  500,
                ),
          )
      })
    return () => {
      active = false
    }
  }, [enabled, videoId, fetchKey])

  const refetch = useCallback(() => setFetchKey(k => k + 1), [])

  return { report, error, refetch }
}
