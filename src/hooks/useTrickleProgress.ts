import { useEffect, useRef, useState } from 'react'

/**
 * Trickle progress pattern (NProgress-style):
 * Gradually increments display value toward the real server value.
 * Between server updates, the bar slowly creeps forward to give
 * the impression of continuous activity.
 *
 * Rules:
 * - Never exceeds realProgress (won't overtake the server)
 * - When realProgress jumps (e.g. 0 → 35), smoothly catches up over ~1s
 * - When realProgress === 100, immediately shows 100 (done)
 * - Trickle slows as it approaches realProgress (asymptotic)
 */
export function useTrickleProgress(realProgress: number, isTerminal: boolean) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef<number>(0)
  const lastTime = useRef(performance.now())

  useEffect(() => {
    if (isTerminal) {
      setDisplay(realProgress)
      return
    }

    function tick() {
      const now = performance.now()
      const elapsed = now - lastTime.current
      lastTime.current = now

      setDisplay(prev => {
        if (prev >= realProgress) return prev
        // Speed: faster when far from target, slower when close
        const gap = realProgress - prev
        const speed = Math.max(0.5, gap * 0.03)
        const increment = speed * (elapsed / 16) // normalized to 60fps
        const next = Math.min(realProgress, prev + increment)
        return Math.round(next * 10) / 10
      })

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [realProgress, isTerminal])

  // Also trickle forward slightly even when server hasn't updated
  // (gives feeling of "something is happening")
  useEffect(() => {
    if (isTerminal) return
    const timer = setInterval(() => {
      setDisplay(prev => {
        // Don't exceed 95% without server confirmation
        const ceiling = Math.min(realProgress, 95)
        if (prev >= ceiling) return prev
        // Tiny increment: 0.1~0.3% per second
        const increment = 0.1 + Math.random() * 0.2
        return Math.min(ceiling, prev + increment)
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [realProgress, isTerminal])

  return Math.round(display)
}
