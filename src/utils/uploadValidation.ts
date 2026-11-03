export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024
export const MAX_VIDEO_SECONDS = 90 * 60
const DURATION_READ_TIMEOUT_MS = 10_000

const allowedExtensions = ['.mp4', '.mov', '.avi']

export function validateVideoFile(file: Pick<File, 'name' | 'size'>): string | null {
  const name = file.name.toLowerCase()
  if (!allowedExtensions.some(extension => name.endsWith(extension))) {
    return 'mp4, mov 또는 avi 형식의 영상을 올려 주세요.'
  }
  if (file.size === 0) return '빈 파일은 올릴 수 없습니다.'
  if (file.size > MAX_UPLOAD_BYTES) return '4GB 이하의 영상을 올려 주세요.'
  return null
}

// An unreadable length passes; the server checks it again after the upload.
export function validateVideoDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null
  if (Math.floor(seconds) > MAX_VIDEO_SECONDS) return '90분 이하의 영상을 올려 주세요.'
  return null
}

export function readVideoDuration(file: Blob): Promise<number | null> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const finish = (seconds: number | null) => {
      window.clearTimeout(timer)
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
      resolve(seconds)
    }
    const timer = window.setTimeout(() => finish(null), DURATION_READ_TIMEOUT_MS)
    video.preload = 'metadata'
    video.onloadedmetadata = () => finish(video.duration)
    video.onerror = () => finish(null)
    video.src = url
  })
}
