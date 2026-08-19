import { useState, type RefObject } from 'react'
import { assetUrl } from '../../api/client'
import { formatSeconds } from '../../utils/format'

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1)
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2]
      return parsed.searchParams.get('v')
    }
    return null
  } catch {
    return null
  }
}

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>
  streamUrl: string
  posterUrl: string
  youtubeUrl?: string
  isPlaying: boolean
  currentTime: number
  mediaDuration: number
  scrubberMax: number
  scrubberValue: number
  durationLabel: string | undefined
  onLoadedMetadata: (duration: number) => void
  onTimeUpdate: (time: number) => void
  onPlay: () => void
  onPause: () => void
  onTogglePlay: () => void
  onSeek: (value: number) => void
  onSkipBy: (seconds: number) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export default function VideoPlayer({
  videoRef,
  streamUrl,
  posterUrl,
  youtubeUrl,
  isPlaying,
  currentTime,
  mediaDuration,
  scrubberMax,
  scrubberValue,
  durationLabel,
  onLoadedMetadata,
  onTimeUpdate,
  onPlay,
  onPause,
  onTogglePlay,
  onSeek,
  onSkipBy,
  onKeyDown,
}: VideoPlayerProps) {
  const [videoError, setVideoError] = useState(false)
  const formattedDuration = durationLabel ?? formatSeconds(mediaDuration)
  const formattedValue = formatSeconds(scrubberValue)

  const youtubeVideoId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null
  const useYouTubeEmbed = youtubeVideoId && (videoError || !streamUrl)

  return (
    <>
      <div className="report-player">
        {useYouTubeEmbed ? (
          <iframe
            className="youtube-embed"
            src={`https://www.youtube.com/embed/${youtubeVideoId}`}
            title="YouTube 영상"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : videoError ? (
          <div className="video-error-fallback">
            <p>영상을 재생할 수 없습니다.</p>
            <small>YouTube 영상은 원본 링크에서 직접 확인해 주세요.</small>
          </div>
        ) : (
        <video
          ref={videoRef}
          tabIndex={0}
          aria-label="검수 대상 영상 플레이어 — Space: 재생/정지, ←→: 10초 이동"
          preload="metadata"
          poster={assetUrl(posterUrl)}
          src={assetUrl(streamUrl)}
          onLoadedMetadata={e => onLoadedMetadata(e.currentTarget.duration)}
          onTimeUpdate={e => onTimeUpdate(e.currentTarget.currentTime)}
          onPlay={onPlay}
          onPause={onPause}
          onClick={onTogglePlay}
          onKeyDown={onKeyDown}
          onError={() => setVideoError(true)}
        />
        )}
        {!videoError && (
        <button
          type="button"
          className="report-play"
          aria-label={isPlaying ? '일시정지' : '재생'}
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z" />
            </svg>
          )}
        </button>
        )}
      </div>
      <div className="report-scrubber">
        <input
          type="range"
          aria-label="영상 재생 위치"
          aria-valuetext={`${formattedValue} / ${formattedDuration}`}
          min="0"
          max={scrubberMax}
          step="0.1"
          value={scrubberValue}
          onChange={e => onSeek(Number(e.target.value))}
        />
        <div>
          <span>{formatSeconds(currentTime)}</span>
          <div className="report-scrubber-controls">
            <button type="button" aria-label="10초 뒤로" onClick={() => onSkipBy(-10)}>
              ◁ 10초
            </button>
            <button type="button" aria-label="10초 앞으로" onClick={() => onSkipBy(10)}>
              10초 ▷
            </button>
          </div>
          <span>{formattedDuration}</span>
        </div>
      </div>
      <p className="video-shortcut-hint">Space 재생/정지 · ← → 10초 이동</p>
    </>
  )
}
