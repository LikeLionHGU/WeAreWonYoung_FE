import assert from 'node:assert/strict'
import { MAX_UPLOAD_BYTES, validateVideoFile } from '../src/utils/uploadValidation.js'

for (const name of ['clip.mp4', 'clip.mov', 'clip.avi', 'CLIP.MP4', 'my.final.cut.mov']) {
  assert.equal(validateVideoFile({ name, size: 1024 }), null, name)
}

assert.equal(MAX_UPLOAD_BYTES, 4_294_967_296)
assert.equal(validateVideoFile({ name: 'clip.mp4', size: MAX_UPLOAD_BYTES }), null)
assert.equal(
  validateVideoFile({ name: 'clip.mp4', size: MAX_UPLOAD_BYTES + 1 }),
  '4GB 이하의 영상을 올려 주세요.',
)
assert.equal(validateVideoFile({ name: 'clip.mp4', size: 0 }), '빈 파일은 올릴 수 없습니다.')

for (const name of ['clip.exe', 'clip.mp4.exe', 'clip.mkv', 'clip', '.mp4x']) {
  assert.equal(
    validateVideoFile({ name, size: 1024 }),
    'mp4, mov 또는 avi 형식의 영상을 올려 주세요.',
    name,
  )
}

console.log('Upload validation smoke test passed')
