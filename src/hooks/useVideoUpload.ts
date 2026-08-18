import { useState } from 'react'
import { apiClient } from '../api/client'
import type { VideoUploadResponse } from '../api/types'
import { ApiRequestError } from '../api/types'

export function useVideoUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<ApiRequestError | null>(null)

  async function upload(file: File): Promise<VideoUploadResponse | null> {
    setIsUploading(true)
    setError(null)
    try {
      return await apiClient.upload(file)
    } catch (e) {
      const err =
        e instanceof ApiRequestError
          ? e
          : new ApiRequestError('INTERNAL_SERVER_ERROR', '업로드에 실패했습니다.', 500)
      setError(err)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  async function registerUrl(url: string): Promise<VideoUploadResponse | null> {
    setIsUploading(true)
    setError(null)
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
    }
  }

  return { upload, registerUrl, isUploading, error }
}
