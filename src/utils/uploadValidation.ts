export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024

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
