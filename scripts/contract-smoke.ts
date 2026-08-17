import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

const port = 3101
const child = spawn('tsx', ['server/index.ts'], { env: { ...process.env, PORT: String(port), MOCK_STEP_MS: '20', MOCK_DATA_DIR: `/tmp/creator-risk-manager-contract-${process.pid}` }, stdio: 'ignore' })
const base = `http://localhost:${port}`

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { await fetch(`${base}/api/v1/videos/missing/status`); return } catch { await new Promise(resolve => setTimeout(resolve, 50)) }
  }
  throw new Error('Mock server did not start')
}

async function upload(filename: string) {
  const form = new FormData()
  form.append('file', new Blob([Buffer.from('mock-video-content')], { type: 'video/mp4' }), filename)
  const response = await fetch(`${base}/api/v1/videos`, { method: 'POST', body: form })
  assert.equal(response.status, 201)
  const body = await response.json() as { success: true; data: { videoId: string; filename: string; durationMs: number; streamUrl: string }; error: null }
  assert.equal(body.success, true)
  assert.equal(body.error, null)
  assert.equal(body.data.filename, filename)
  assert.equal(typeof body.data.videoId, 'string')
  assert.equal(body.data.durationMs > 0, true)
  assert.equal(body.data.streamUrl, `/api/v1/videos/${body.data.videoId}/stream`)
  return body.data.videoId
}

async function run() {
  try {
    await waitForServer()
    const id = await upload('contract.mp4')

    const history = await fetch(`${base}/api/v1/videos/history?status=ALL&page=0&size=20`)
    assert.equal(history.status, 200)
    const historyBody = await history.json() as { data: { items: Array<{ videoId: string; analysisStatus: string; editedCount: number }>; totalElements: number } }
    assert.equal(historyBody.data.items[0].videoId, id)
    assert.equal(historyBody.data.items[0].editedCount, 0)
    assert.equal(historyBody.data.totalElements, 1)

    let status = 'PENDING'
    for (let attempt = 0; attempt < 40 && status !== 'COMPLETED'; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 30))
      const response = await fetch(`${base}/api/v1/videos/${id}/status`)
      const body = await response.json() as { data: { status: string; filename: string; failure: null } }
      status = body.data.status
      assert.equal(body.data.filename, 'contract.mp4')
      assert.equal(body.data.failure, null)
    }
    assert.equal(status, 'COMPLETED')

    const report = await fetch(`${base}/api/v1/videos/${id}/report`)
    assert.equal(report.status, 200)
    const reportBody = await report.json() as { data: { filename: string; durationMs: number; events: Array<{ id: string; title: string; references: unknown[]; reviewAction: null }> } }
    assert.equal(reportBody.data.filename, 'contract.mp4')
    assert.equal(reportBody.data.durationMs > 0, true)
    assert.equal(reportBody.data.events.length, 3)
    assert.equal(typeof reportBody.data.events[0].title, 'string')
    assert.equal(Array.isArray(reportBody.data.events[0].references), true)

    const incomplete = await fetch(`${base}/api/v1/videos/${id}/review-completion`, { method: 'POST' })
    assert.equal(incomplete.status, 409)
    const incompleteBody = await incomplete.json() as { error: { code: string } }
    assert.equal(incompleteBody.error.code, 'REVIEW_INCOMPLETE')

    for (const [index, event] of reportBody.data.events.entries()) {
      const action = index === 0 ? 'EDITED' : 'CONFIRMED'
      const response = await fetch(`${base}/api/v1/videos/${id}/review-actions/${event.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note: null }) })
      assert.equal(response.status, 200)
    }

    const completion = await fetch(`${base}/api/v1/videos/${id}/review-completion`, { method: 'POST' })
    assert.equal(completion.status, 200)
    const completionBody = await completion.json() as { data: { reviewStatus: string; summary: { edited: number } } }
    assert.equal(completionBody.data.reviewStatus, 'COMPLETED')
    assert.equal(completionBody.data.summary.edited, 1)

    const reviewedHistory = await fetch(`${base}/api/v1/videos/history`)
    const reviewedHistoryBody = await reviewedHistory.json() as { data: { items: Array<{ editedCount: number; reviewStatus: string }> } }
    assert.equal(reviewedHistoryBody.data.items[0].editedCount, 1)
    assert.equal(reviewedHistoryBody.data.items[0].reviewStatus, 'COMPLETED')

    const cancelId = await upload('cancel.mp4')
    const cancel = await fetch(`${base}/api/v1/videos/${cancelId}/analysis/cancel`, { method: 'POST' })
    assert.equal(cancel.status, 200)
    const cancelBody = await cancel.json() as { data: { status: string } }
    assert.equal(cancelBody.data.status, 'CANCELLED')
    const retry = await fetch(`${base}/api/v1/videos/${cancelId}/analysis/retry`, { method: 'POST' })
    assert.equal(retry.status, 200)

    const range = await fetch(`${base}/api/v1/videos/${id}/stream`, { headers: { Range: 'bytes=0-4' } })
    assert.equal(range.status, 206)
    assert.equal((await range.arrayBuffer()).byteLength, 5)
    console.log('Contract smoke test passed')
  } finally {
    child.kill('SIGTERM')
  }
}

void run().catch(error => { console.error(error); process.exitCode = 1 })
