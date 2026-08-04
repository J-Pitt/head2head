export type PlaylistTrack = {
  id: string
  videoId: string
  title: string
  addedBy: string
  addedByName: string
  at: number
}

export type PartyPlaylistState = {
  queue: PlaylistTrack[]
  currentId: string | null
  updatedAt: number
}

export const MAX_PLAYLIST = 30

export function emptyPlaylist(): PartyPlaylistState {
  return { queue: [], currentId: null, updatedAt: Date.now() }
}

/** Extract an 11-char YouTube video id from common URL shapes or a bare id. */
export function parseYouTubeVideoId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (/^[\w-]{11}$/.test(raw)) return raw

  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = url.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const parts = url.pathname.split('/').filter(Boolean)
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return /^[\w-]{11}$/.test(parts[1]) ? parts[1] : null
      }
    }
  } catch {
    /* not a URL */
  }

  const loose = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)
  return loose?.[1] ?? null
}

export function youtubeEmbedUrl(videoId: string, opts?: { autoplay?: boolean }) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
  })
  if (opts?.autoplay) params.set('autoplay', '1')
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export async function fetchYouTubeTitle(videoId: string): Promise<string> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeWatchUrl(videoId))}&format=json`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return `YouTube ${videoId}`
    const data = (await res.json()) as { title?: string }
    return (data.title || `YouTube ${videoId}`).slice(0, 120)
  } catch {
    return `YouTube ${videoId}`
  }
}

export function isPlaylistState(v: unknown): v is PartyPlaylistState {
  if (!v || typeof v !== 'object') return false
  const p = v as PartyPlaylistState
  return Array.isArray(p.queue) && (p.currentId === null || typeof p.currentId === 'string')
}

export function normalizePlaylist(v: unknown): PartyPlaylistState {
  if (!isPlaylistState(v)) return emptyPlaylist()
  return {
    queue: v.queue
      .filter(
        (t) =>
          t &&
          typeof t.id === 'string' &&
          typeof t.videoId === 'string' &&
          typeof t.title === 'string'
      )
      .slice(0, MAX_PLAYLIST),
    currentId: v.currentId,
    updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : Date.now(),
  }
}

const BASE = '/api/head2head/playlist'

export async function fetchPlaylist(roomId: string): Promise<PartyPlaylistState> {
  try {
    const res = await fetch(`${BASE}?roomId=${encodeURIComponent(roomId)}`, { cache: 'no-store' })
    if (!res.ok) return emptyPlaylist()
    const data = await res.json()
    return normalizePlaylist(data.playlist)
  } catch {
    return emptyPlaylist()
  }
}

export async function playlistAction(
  roomId: string,
  action: 'add' | 'remove' | 'play' | 'next' | 'clear',
  body: Record<string, unknown> = {}
): Promise<PartyPlaylistState> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, action, ...body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Playlist update failed')
  return normalizePlaylist((data as { playlist?: unknown }).playlist)
}
