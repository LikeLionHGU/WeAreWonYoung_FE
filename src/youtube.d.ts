declare namespace YT {
  interface PlayerOptions {
    videoId: string
    playerVars?: Record<string, unknown>
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: OnStateChangeEvent) => void
    }
  }
  interface PlayerEvent {
    target: Player
  }
  interface OnStateChangeEvent {
    data: number
    target: Player
  }
  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions)
    destroy(): void
    seekTo(seconds: number, allowSeekAhead: boolean): void
    getCurrentTime(): number
    getDuration(): number
    playVideo(): void
    pauseVideo(): void
    getPlayerState(): number
  }
  const PlayerState: {
    PLAYING: number
    PAUSED: number
    ENDED: number
    BUFFERING: number
  }
}
