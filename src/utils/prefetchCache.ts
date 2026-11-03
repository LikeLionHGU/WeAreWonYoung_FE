export function createPrefetchCache<T>(load: (key: string) => Promise<T>) {
  const pending = new Map<string, Promise<T>>()

  function prefetch(key: string) {
    if (pending.has(key)) return
    const request = load(key)
    // Nobody may take it, so a failure here must not surface as an unhandled rejection.
    request.catch(() => {})
    pending.set(key, request)
  }

  function take(key: string): Promise<T> {
    const request = pending.get(key)
    pending.delete(key)
    return request ?? load(key)
  }

  return { prefetch, take }
}
