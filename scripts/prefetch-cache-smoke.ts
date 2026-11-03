import assert from 'node:assert/strict'
import { createPrefetchCache } from '../src/utils/prefetchCache.js'

async function takeReusesThePrefetchedRequest() {
  let calls = 0
  const cache = createPrefetchCache(async (id: string) => {
    calls += 1
    return `report-${id}`
  })
  cache.prefetch('7')
  assert.equal(await cache.take('7'), 'report-7')
  assert.equal(calls, 1)
}

async function takeLoadsWhenNothingWasPrefetched() {
  let calls = 0
  const cache = createPrefetchCache(async (id: string) => {
    calls += 1
    return `report-${id}`
  })
  assert.equal(await cache.take('7'), 'report-7')
  assert.equal(calls, 1)
}

async function takeUsesThePrefetchOnlyOnce() {
  let calls = 0
  const cache = createPrefetchCache(async (id: string) => {
    calls += 1
    return `report-${id}-${calls}`
  })
  cache.prefetch('7')
  assert.equal(await cache.take('7'), 'report-7-1')
  assert.equal(await cache.take('7'), 'report-7-2')
}

async function failedPrefetchRejectsOnTake() {
  const cache = createPrefetchCache(async () => {
    throw new Error('boom')
  })
  cache.prefetch('7')
  await assert.rejects(cache.take('7'), /boom/)
}

async function run() {
  await takeReusesThePrefetchedRequest()
  await takeLoadsWhenNothingWasPrefetched()
  await takeUsesThePrefetchOnlyOnce()
  await failedPrefetchRejectsOnTake()
  console.log('Prefetch cache smoke test passed')
}

void run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
