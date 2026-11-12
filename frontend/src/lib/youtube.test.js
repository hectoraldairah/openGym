import { describe, expect, it } from 'vitest'
import { youtubeVideo } from './youtube.js'

const id = 'dQw4w9WgXcQ'

describe('youtubeVideo', () => {
  it.each([
    `https://www.youtube.com/watch?v=${id}&feature=shared`,
    `https://youtu.be/${id}?si=shared`,
    `https://www.youtube.com/shorts/${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ])('accepts shared video links: %s', url => {
    expect(youtubeVideo(url)).toEqual({ id, start: 0 })
  })

  it.each(['90', '90s', '1m30s', '0h1m30s'])('preserves a timestamp: %s', time => {
    expect(youtubeVideo(`https://youtu.be/${id}?t=${time}`)).toEqual({ id, start: 90 })
  })

  it('accepts embed start times and surrounding whitespace', () => {
    expect(youtubeVideo(` https://www.youtube.com/embed/${id}?start=60 `)).toEqual({ id, start: 60 })
  })

  it.each([
    '', 'not a URL', `https://example.com/watch?v=${id}`,
    `https://youtube.com.example.com/watch?v=${id}`,
    `https://youtube.com@evil.example/watch?v=${id}`,
    `javascript:alert(1)`, `ftp://youtube.com/watch?v=${id}`,
    'https://youtube.com/playlist?list=123', 'https://youtu.be/too-short',
    `https://youtube.com/watch?v=${id}%22`,
  ])('rejects invalid or non-video links: %s', url => {
    expect(youtubeVideo(url)).toBeNull()
  })

  it('ignores malformed timestamps', () => {
    expect(youtubeVideo(`https://youtu.be/${id}?t=-10`)).toEqual({ id, start: 0 })
  })
})
