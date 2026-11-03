import assert from 'node:assert/strict'
import { createCsrfSession } from '../src/utils/csrf.js'

function forbidden() {
  return Object.assign(new Error('forbidden'), { status: 403 })
}

function tokenSource(values: string[]) {
  let calls = 0
  return {
    calls: () => calls,
    fetchToken: async () => {
      const token = values[Math.min(calls, values.length - 1)]
      calls += 1
      return { headerName: 'X-CSRF-TOKEN', token }
    },
  }
}

async function reusesTokenAcrossRequests() {
  const source = tokenSource(['a'])
  const csrf = createCsrfSession(source.fetchToken)
  const seen = await Promise.all([csrf.send(async h => h), csrf.send(async h => h)])
  assert.deepEqual(seen, [{ 'X-CSRF-TOKEN': 'a' }, { 'X-CSRF-TOKEN': 'a' }])
  assert.equal(source.calls(), 1)
}

async function retriesOnceWithFreshTokenAfter403() {
  const source = tokenSource(['stale', 'fresh'])
  const csrf = createCsrfSession(source.fetchToken)
  const sent: string[] = []
  const result = await csrf.send(async headers => {
    sent.push(headers['X-CSRF-TOKEN'])
    if (headers['X-CSRF-TOKEN'] === 'stale') throw forbidden()
    return 'ok'
  })
  assert.equal(result, 'ok')
  assert.deepEqual(sent, ['stale', 'fresh'])
}

async function givesUpAfterSecond403() {
  const source = tokenSource(['a', 'b'])
  const csrf = createCsrfSession(source.fetchToken)
  let attempts = 0
  await assert.rejects(
    csrf.send(async () => {
      attempts += 1
      throw forbidden()
    }),
    /forbidden/,
  )
  assert.equal(attempts, 2)
}

async function doesNotRetryOtherErrors() {
  const source = tokenSource(['a'])
  const csrf = createCsrfSession(source.fetchToken)
  let attempts = 0
  await assert.rejects(
    csrf.send(async () => {
      attempts += 1
      throw Object.assign(new Error('unauthorized'), { status: 401 })
    }),
    /unauthorized/,
  )
  assert.equal(attempts, 1)
}

async function clearForcesNewToken() {
  const source = tokenSource(['a', 'b'])
  const csrf = createCsrfSession(source.fetchToken)
  await csrf.send(async h => h)
  csrf.clear()
  assert.deepEqual(await csrf.send(async h => h), { 'X-CSRF-TOKEN': 'b' })
}

async function refetchesAfterTokenRequestFails() {
  let calls = 0
  const csrf = createCsrfSession(async () => {
    calls += 1
    if (calls === 1) throw new Error('network')
    return { headerName: 'X-CSRF-TOKEN', token: 'a' }
  })
  await assert.rejects(csrf.send(async h => h), /network/)
  assert.deepEqual(await csrf.send(async h => h), { 'X-CSRF-TOKEN': 'a' })
}

async function sendsNoHeaderWhenAuthIsDisabled() {
  const csrf = createCsrfSession(async () => ({ headerName: null, token: null }))
  assert.deepEqual(await csrf.send(async h => h), {})
}

async function warmFetchesTheTokenAheadOfTime() {
  const source = tokenSource(['a'])
  const csrf = createCsrfSession(source.fetchToken)
  csrf.warm()
  assert.equal(source.calls(), 1)
  assert.deepEqual(await csrf.send(async h => h), { 'X-CSRF-TOKEN': 'a' })
  assert.equal(source.calls(), 1)
}

async function failedWarmIsRetriedOnSend() {
  let calls = 0
  const csrf = createCsrfSession(async () => {
    calls += 1
    if (calls === 1) throw new Error('network')
    return { headerName: 'X-CSRF-TOKEN', token: 'a' }
  })
  csrf.warm()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(await csrf.send(async h => h), { 'X-CSRF-TOKEN': 'a' })
  assert.equal(calls, 2)
}

async function run() {
  await reusesTokenAcrossRequests()
  await retriesOnceWithFreshTokenAfter403()
  await givesUpAfterSecond403()
  await doesNotRetryOtherErrors()
  await clearForcesNewToken()
  await refetchesAfterTokenRequestFails()
  await sendsNoHeaderWhenAuthIsDisabled()
  await warmFetchesTheTokenAheadOfTime()
  await failedWarmIsRetriedOnSend()
  console.log('CSRF smoke test passed')
}

void run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
