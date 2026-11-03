import { useCallback, useEffect, useRef, useState } from 'react'
import { Client, ReconnectionTimeMode, type IMessage } from '@stomp/stompjs'
import { apiClient, websocketUrl } from '../api/client'
import type { VideoStatusResponse } from '../api/types'
import { startProgressSync } from '../utils/progressSync'

const CONNECTED_POLL_MS = 15_000
const FALLBACK_POLL_MS = 2000

export function useAnalysisProgress(videoId: string) {
  const [status, setStatus] = useState<VideoStatusResponse | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [connectionError, setConnectionError] = useState(false)
  const jobId = useRef<string | null>(null)
  const progressState = useRef({ jobId: null as string | null, value: 0, terminal: false })

  const applyStatus = useCallback((next: VideoStatusResponse) => {
    if (jobId.current && next.jobId !== jobId.current) return

    if (!jobId.current || progressState.current.jobId !== next.jobId) {
      jobId.current = next.jobId
      progressState.current = { jobId: next.jobId, value: 0, terminal: false }
    }

    // Polling and WebSocket messages can arrive out of order. Keep the visual
    // progress monotonic so a delayed response never makes the bar jump back.
    if (
      progressState.current.terminal &&
      !['COMPLETED', 'FAILED', 'CANCELLED'].includes(next.status)
    )
      return
    const progress =
      next.status === 'COMPLETED'
        ? 100
        : Math.min(100, Math.max(progressState.current.value, Math.round(next.progress)))
    progressState.current.value = progress
    progressState.current.terminal =
      next.status === 'COMPLETED' || next.status === 'FAILED' || next.status === 'CANCELLED'
    setStatus(progress === next.progress ? next : { ...next, progress })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const next = await apiClient.status(videoId)
      applyStatus(next)
      setConnectionError(false)
      return next
    } catch {
      setConnectionError(true)
      return null
    }
  }, [applyStatus, videoId])

  useEffect(
    () =>
      startProgressSync({
        topic: `/topic/videos/${videoId}/progress`,
        refresh: () => void refresh(),
        onMessage: body => {
          try {
            applyStatus(JSON.parse(body) as VideoStatusResponse)
          } catch {
            /* ignore malformed broker messages */
          }
        },
        onFallbackChange: setIsFallback,
        connectedPollMs: CONNECTED_POLL_MS,
        fallbackPollMs: FALLBACK_POLL_MS,
        createClient: ({ onConnect, onDisconnect }) => {
          const client = new Client({
            brokerURL: websocketUrl(),
            reconnectDelay: 1000,
            reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
            maxReconnectDelay: 10_000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            onConnect,
            onWebSocketError: onDisconnect,
            onStompError: onDisconnect,
            onWebSocketClose: onDisconnect,
          })
          return {
            activate: () => client.activate(),
            deactivate: () => client.deactivate(),
            subscribe: (topic, onMessage) =>
              client.subscribe(topic, (message: IMessage) => onMessage(message.body)),
          }
        },
      }),
    [applyStatus, refresh, videoId],
  )

  return { status, isFallback, connectionError, refresh }
}
