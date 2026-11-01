import assert from 'node:assert/strict'
import { fetchAllPages } from '../src/utils/fetchAllPages.js'

function pagedSource(total: number, size: number) {
  const requested: number[] = []
  const fetchPage = async (page: number) => {
    requested.push(page)
    const start = page * size
    return {
      items: Array.from({ length: Math.min(size, total - start) }, (_, index) => start + index),
      totalPages: Math.ceil(total / size),
    }
  }
  return { fetchPage, requested }
}

async function run() {
  const large = pagedSource(250, 100)
  assert.equal((await fetchAllPages(large.fetchPage)).length, 250)
  assert.deepEqual(large.requested, [0, 1, 2])

  const exact = pagedSource(100, 100)
  assert.equal((await fetchAllPages(exact.fetchPage)).length, 100)
  assert.deepEqual(exact.requested, [0])

  const empty = pagedSource(0, 100)
  assert.deepEqual(await fetchAllPages(empty.fetchPage), [])
  assert.deepEqual(empty.requested, [0])

  await assert.rejects(
    fetchAllPages(async page => {
      if (page === 1) throw new Error('page failed')
      return { items: [page], totalPages: 2 }
    }),
    /page failed/,
  )

  console.log('Fetch all pages smoke test passed')
}

void run()
