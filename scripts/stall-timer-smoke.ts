import assert from 'node:assert/strict'
import { setTimeout as wait } from 'node:timers/promises'
import { createStallTimer } from '../src/utils/stallTimer.js'

async function firesWhenNotReset() {
  let stalled = 0
  const timer = createStallTimer(() => {
    stalled += 1
  }, 10)
  timer.reset()
  await wait(30)
  assert.equal(stalled, 1)
}

async function resetKeepsSlowProgressAlive() {
  let stalled = 0
  const timer = createStallTimer(() => {
    stalled += 1
  }, 30)
  timer.reset()
  for (let i = 0; i < 5; i += 1) {
    await wait(15)
    timer.reset()
  }
  timer.stop()
  assert.equal(stalled, 0)
}

async function stopCancelsPendingStall() {
  let stalled = 0
  const timer = createStallTimer(() => {
    stalled += 1
  }, 10)
  timer.reset()
  timer.stop()
  await wait(30)
  assert.equal(stalled, 0)
}

async function run() {
  await firesWhenNotReset()
  await resetKeepsSlowProgressAlive()
  await stopCancelsPendingStall()
  console.log('Stall timer smoke test passed')
}

void run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
