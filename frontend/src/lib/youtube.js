// Only extract video IDs from YouTube URLs; never use a pasted URL as an iframe source.
export function youtubeVideo(value) {
  try {
    const url = new URL(value.trim())
    if (!['https:', 'http:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase()
    const parts = url.pathname.split('/').filter(Boolean)
    let id
    if (host === 'youtu.be') id = parts.length === 1 ? parts[0] : null
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v')
      else if (['shorts', 'embed', 'live'].includes(parts[0]) && parts.length === 2) id = parts[1]
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return null
    const time = url.searchParams.get('t') || url.searchParams.get('start') || ''
    const match = time.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/)
    const start = match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0
    return { id, start: Number.isSafeInteger(start) ? start : 0 }
  } catch {
    return null
  }
}
