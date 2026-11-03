import assert from 'node:assert/strict'
import { setTimeout as wait } from 'node:timers/promises'
import { startProgressSync, type ProgressClientHandlers } from '../src/utils/progressSync.js'

function harness(connectedPollMs = 1000, fallbackPollMs = 1000) {
  let handlers: ProgressClientHandlers | undefined
  let refreshes = 0
  const subscribed: string[] = []
  const fallback: boolean[] = []
  let deactivated = false
  const stop = startProgressSync({
    topic: '/topic/videos/1/progress',
    refresh: () => {
      refreshes += 1
    },
    onMessage: () => {},
    onFallbackChange: value => fallback.push(value),
    connectedPollMs,
    fallbackPollMs,
    createClient: next => {
      handlers = next
      return {
        activate: () => {},
        deactivate: () => {
          deactivated = true
        },
        subscribe: topic => {
          subscribed.push(topic)
          return { unsubscribe: () => {} }
        },
      }
    },
  })
  return {
    stop,
    connect: () => handlers!.onConnect(),
    disconnect: () => handlers!.onDisconnect(),
    refreshes: () => refreshes,
    subscribed,
    fallback,
    deactivated: () => deactivated,
  }
}

async function refreshesAgainAfterSubscribing() {
  const sync = harness()
  assert.equal(sync.refreshes(), 1)
  sync.connect()
  assert.deepEqual(sync.subscribed, ['/topic/videos/1/progress'])
  assert.equal(sync.refreshes(), 2)
  sync.stop()
}

async function refreshesAgainAfterReconnecting() {
  const sync = harness()
  sync.connect()
  sync.disconnect()
  sync.connect()
  assert.equal(sync.subscribed.length, 2)
  assert.equal(sync.refreshes(), 3)
  sync.stop()
}

async function pollsWhileConnected() {
  const sync = harness(20, 1000)
  sync.connect()
  const before = sync.refreshes()
  await wait(70)
  assert.ok(sync.refreshes() - before >= 2, `polled ${sync.refreshes() - before} times`)
  sync.stop()
}

async function pollsFasterWhileDisconnected() {
  const sync = harness(1000, 20)
  sync.connect()
  sync.disconnect()
  const before = sync.refreshes()
  await wait(70)
  assert.ok(sync.refreshes() - before >= 2, `polled ${sync.refreshes() - before} times`)
  assert.deepEqual(sync.fallback, [false, true])
  sync.stop()
}

async function repeatedDisconnectsKeepThePollRunning() {
  const sync = harness(1000, 30)
  sync.disconnect()
  const before = sync.refreshes()
  for (let i = 0; i < 4; i += 1) {
    await wait(20)
    sync.disconnect()
  }
  assert.ok(sync.refreshes() - before >= 2, `polled ${sync.refreshes() - before} times`)
  sync.stop()
}

async function stopEndsEverything() {
  const sync = harness(10, 10)
  sync.connect()
  sync.stop()
  const after = sync.refreshes()
  sync.connect()
  await wait(40)
  assert.equal(sync.refreshes(), after)
  assert.equal(sync.deactivated(), true)
}

async function run() {
  await refreshesAgainAfterSubscribing()
  await refreshesAgainAfterReconnecting()
  await pollsWhileConnected()
  await pollsFasterWhileDisconnected()
  await repeatedDisconnectsKeepThePollRunning()
  await stopEndsEverything()
  console.log('Progress sync smoke test passed')
}

void run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
