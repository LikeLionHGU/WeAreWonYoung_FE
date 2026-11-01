import assert from 'node:assert/strict'
import { extractYouTubeId } from '../src/utils/youtube.js'

const id = 'eqDX_z4CBxg'

for (const url of [
  `https://www.youtube.com/watch?v=${id}`,
  `https://youtube.com/watch?v=${id}&t=30`,
  `https://m.youtube.com/watch?v=${id}`,
  `https://music.youtube.com/watch?v=${id}`,
  `https://www.youtube.com/shorts/${id}`,
  `https://youtu.be/${id}`,
]) {
  assert.equal(extractYouTubeId(url), id, url)
}

for (const url of [
  `https://youtube.com.evil.example/watch?v=${id}`,
  `https://evil-youtube.com/watch?v=${id}`,
  `https://youtu.be.evil.example/${id}`,
  `javascript://www.youtube.com/watch?v=${id}`,
  'https://www.youtube.com/watch?v=short',
  'https://www.youtube.com/watch?v=abc%22%3E%3Cscript%3E',
  'https://www.youtube.com/watch',
  'not a url',
]) {
  assert.equal(extractYouTubeId(url), null, url)
}

console.log('YouTube id smoke test passed')
