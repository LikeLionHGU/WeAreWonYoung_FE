import type { RefObject } from 'react'
import { assetUrl } from '../../api/client'
import { formatSeconds } from '../../utils/format'

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>
  streamUrl: string
  posterUrl: string
  isPlaying: boolean
  currentTime: number
  mediaDuration: number
  scrubberMax: number
  scrubberValue: number
  durationLabel: string | undefined
  selectedStartMs: number
  onLoadedMetadata: (duration: number) => void
  onTimeUpdate: (time: number) => void
  onPlay: () => void
  onPause: () => void
  onTogglePlay: () => void
  onSeek: (value: number) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export default function VideoPlayer({
  videoRef,
  streamUrl,
  posterUrl,
  isPlaying,
  currentTime,
  mediaDuration,
  scrubberMax,
  scrubberValue,
  durationLabel,
  selectedStartMs,
  onLoadedMetadata,
  onTimeUpdate,
  onPlay,
  onPause,
  onTogglePlay,
  onSeek,
  onKeyDown,
}: VideoPlayerProps) {
  const formattedDuration = durationLabel ?? formatSeconds(mediaDuration)
  const formattedValue = formatSeconds(scrubberValue)

  return <>
    <div className="report-player">
      <video
        ref={videoRef}
        tabIndex={0}
        aria-label="검수 대상 영상 플레이어"
        preload="metadata"
        poster={assetUrl(posterUrl)}
        src={assetUrl(streamUrl)}
        onLoadedMetadata={e => onLoadedMetadata(e.currentTarget.duration)}
        onTimeUpdate={e => onTimeUpdate(e.currentTarget.currentTime)}
        onPlay={onPlay}
        onPause={onPause}
        onClick={onTogglePlay}
        onKeyDown={onKeyDown}
      />
      <button type="button" className="report-play" aria-label={isPlaying ? '일시정지' : '재생'} onClick={onTogglePlay}>
        {isPlaying ? 'Ⅱ' : '▶'}
      </button>
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
        <span>{formatSeconds(currentTime || selectedStartMs / 1000)}</span>
        <div><span>이 구간만 반복 재생</span><b>·</b><span>앞뒤 10초 더 보기</span></div>
        <span>{formattedDuration}</span>
      </div>
    </div>
  </>
}
