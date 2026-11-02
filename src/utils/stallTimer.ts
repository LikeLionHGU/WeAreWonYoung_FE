export function createStallTimer(onStall: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined

  function stop() {
    clearTimeout(timer)
  }

  function reset() {
    stop()
    timer = setTimeout(onStall, ms)
  }

  return { reset, stop }
}
