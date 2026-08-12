import { useCallback, useEffect, useRef, useState } from 'react'
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { apiClient, websocketUrl } from '../api/client'
import type { VideoStatusResponse } from '../api/types'

export function useAnalysisProgress(videoId: number) {
  const [status, setStatus] = useState<VideoStatusResponse | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const jobId = useRef<string | null>(null)
  const clientRef = useRef<Client | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await apiClient.status(videoId)
      if (!jobId.current || next.jobId === jobId.current) { jobId.current = next.jobId; setStatus(next) }
      return next
    } catch { return null }
  }, [videoId])

  useEffect(() => {
    let mounted = true
    let pollTimer: number | undefined
    let subscription: StompSubscription | undefined
    void refresh()
    const startPolling = () => {
      if (!mounted || pollTimer) return
      setIsFallback(true)
      pollTimer = window.setInterval(() => { void refresh() }, 3000)
    }
    const client = new Client({ brokerURL: websocketUrl(), reconnectDelay: 5000, heartbeatIncoming: 10000, heartbeatOutgoing: 10000, onConnect: () => {
      if (!mounted) return
      setIsFallback(false)
      subscription = client.subscribe(`/topic/videos/${videoId}/progress`, (message: IMessage) => {
        try {
          const next = JSON.parse(message.body) as VideoStatusResponse
          if (!jobId.current || next.jobId === jobId.current) { jobId.current = next.jobId; setStatus(next) }
        } catch { /* ignore malformed broker messages */ }
      })
    }, onWebSocketError: startPolling, onStompError: startPolling, onWebSocketClose: startPolling })
    clientRef.current = client
    client.activate()
    return () => { mounted = false; if (pollTimer) window.clearInterval(pollTimer); subscription?.unsubscribe(); void client.deactivate(); clientRef.current = null }
  }, [refresh, videoId])

  return { status, isFallback, refresh }
}
