import { useState } from 'react'
import { apiClient } from '../api/client'
import type { VideoUploadResponse } from '../api/types'
import { ApiRequestError } from '../api/types'

export function useVideoUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<ApiRequestError | null>(null)

  async function upload(file: File): Promise<VideoUploadResponse | null> {
    setIsUploading(true)
    setError(null)
    setProgress(0)
    try {
      return await apiClient.upload(file, undefined, setProgress)
    } catch (e) {
      const err =
        e instanceof ApiRequestError
          ? e
          : new ApiRequestError('INTERNAL_SERVER_ERROR', '업로드에 실패했습니다.', 500)
      setError(err)
      return null
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }

  async function registerUrl(url: string): Promise<VideoUploadResponse | null> {
    setIsUploading(true)
    setError(null)
    setProgress(0)
    try {
      return await apiClient.registerUrl(url)
    } catch (e) {
      const err =
        e instanceof ApiRequestError
          ? e
          : new ApiRequestError('INTERNAL_SERVER_ERROR', '영상 링크 등록에 실패했습니다.', 500)
      setError(err)
      return null
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }

  return { upload, registerUrl, isUploading, progress, error }
}
