const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
])
const videoIdPattern = /^[\w-]{11}$/

function parseVideoId(parsed: URL): string | null {
  if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1)
  if (!youtubeHosts.has(parsed.hostname)) return null
  if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2]
  return parsed.searchParams.get('v')
}

export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    const videoId = parseVideoId(parsed)
    return videoId && videoIdPattern.test(videoId) ? videoId : null
  } catch {
    return null
  }
}
