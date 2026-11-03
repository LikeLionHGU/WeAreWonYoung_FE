export interface ProgressClientHandlers {
  onConnect: () => void
  onDisconnect: () => void
}

export interface ProgressClient {
  activate: () => void
  deactivate: () => unknown
  subscribe: (topic: string, onMessage: (body: string) => void) => { unsubscribe: () => void }
}

export interface ProgressSyncOptions {
  topic: string
  refresh: () => void
  onMessage: (body: string) => void
  onFallbackChange: (fallback: boolean) => void
  createClient: (handlers: ProgressClientHandlers) => ProgressClient
  connectedPollMs: number
  fallbackPollMs: number
}

export function startProgressSync(options: ProgressSyncOptions): () => void {
  let stopped = false
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let pollMs: number | undefined
  let subscription: { unsubscribe: () => void } | undefined

  function poll(ms: number) {
    if (pollMs === ms) return
    clearInterval(pollTimer)
    pollMs = ms
    pollTimer = setInterval(options.refresh, ms)
  }

  const client = options.createClient({
    onConnect: () => {
      if (stopped) return
      options.onFallbackChange(false)
      subscription = client.subscribe(options.topic, options.onMessage)
      // Updates published before the subscription existed are never delivered, so read once more.
      options.refresh()
      // A live socket can still miss the final update, so keep a slow safety poll.
      poll(options.connectedPollMs)
    },
    onDisconnect: () => {
      if (stopped) return
      options.onFallbackChange(true)
      poll(options.fallbackPollMs)
    },
  })

  options.refresh()
  poll(options.connectedPollMs)
  client.activate()

  return () => {
    stopped = true
    clearInterval(pollTimer)
    subscription?.unsubscribe()
    void client.deactivate()
  }
}
