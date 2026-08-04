import { describe, expect, it } from 'vitest'
import { emptyPlaylist, normalizePlaylist, parseYouTubeVideoId } from '@/lib/playlist'

describe('playlist', () => {
  it('parses common YouTube URL shapes', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('rejects invalid input', () => {
    expect(parseYouTubeVideoId('')).toBeNull()
    expect(parseYouTubeVideoId('https://example.com/watch?v=nope')).toBeNull()
    expect(parseYouTubeVideoId('short')).toBeNull()
  })

  it('normalizePlaylist falls back to empty', () => {
    const empty = normalizePlaylist(null)
    expect(empty.queue).toEqual([])
    expect(empty.currentId).toBeNull()
    expect(normalizePlaylist({ queue: [], currentId: null, updatedAt: 1 }).queue).toEqual([])
  })
})
