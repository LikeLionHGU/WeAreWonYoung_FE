import assert from 'node:assert/strict'
import { visibleWarnings } from '../src/utils/reportWarnings.js'

const disabledOcr = { stage: 'OCR', code: 'OCR_NOT_ENABLED', message: '현재 사용하지 않는 기능입니다.' }
const disabledVisual = {
  stage: 'VISUAL_TEXT',
  code: 'VISUAL_TEXT_NOT_ENABLED',
  message: '현재 사용하지 않는 기능입니다.',
}
const failedStt = { stage: 'STT', code: 'STT_FAILED', message: '음성 인식에 실패했습니다.' }

assert.deepEqual(visibleWarnings([disabledOcr, disabledVisual]), [])
assert.deepEqual(visibleWarnings([disabledOcr, failedStt]), [failedStt])
assert.deepEqual(visibleWarnings([]), [])

console.log('Report warnings smoke test passed')
