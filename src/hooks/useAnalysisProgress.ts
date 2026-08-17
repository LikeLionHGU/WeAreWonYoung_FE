import { useCallback, useEffect, useRef, useState } from 'react'
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { apiClient, websocketUrl } from '../api/client'
import type { VideoStatusResponse } from '../api/types'

export function useAnalysisProgress(videoId: number) {
  const [status, setStatus] = useState<VideoStatusResponse | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const jobId = useRef<string | null>(null)
  const progressState = useRef({ jobId: null as string | null, value: 0, terminal: false })
  const clientRef = useRef<Client | null>(null)

  const applyStatus = useCallback((next: VideoStatusResponse) => {
    if (jobId.current && next.jobId !== jobId.current) return

    if (!jobId.current || progressState.current.jobId !== next.jobId) {
      jobId.current = next.jobId
      progressState.current = { jobId: next.jobId, value: 0, terminal: false }
    }

    // Polling and WebSocket messages can arrive out of order. Keep the visual
    // progress monotonic so a delayed response never makes the bar jump back.
    if (progressState.current.terminal && next.status !== 'COMPLETED') return
    const progress = next.status === 'COMPLETED'
      ? 100
      : Math.min(100, Math.max(progressState.current.value, Math.round(next.progress)))
    progressState.current.value = progress
    progressState.current.terminal = next.status === 'COMPLETED' || next.status === 'FAILED'
    setStatus(progress === next.progress ? next : { ...next, progress })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const next = await apiClient.status(videoId)
      applyStatus(next)
      return next
    } catch { return null }
  }, [applyStatus, videoId])

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
          applyStatus(next)
        } catch { /* ignore malformed broker messages */ }
      })
    }, onWebSocketError: startPolling, onStompError: startPolling, onWebSocketClose: startPolling })
    clientRef.current = client
    client.activate()
    return () => { mounted = false; if (pollTimer) window.clearInterval(pollTimer); subscription?.unsubscribe(); void client.deactivate(); clientRef.current = null }
  }, [applyStatus, refresh, videoId])

  return { status, isFallback, refresh }
}
