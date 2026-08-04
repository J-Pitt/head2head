import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getPlaylist, setPlaylist } from '@/lib/redis'
import {
  emptyPlaylist,
  fetchYouTubeTitle,
  MAX_PLAYLIST,
  normalizePlaylist,
  parseYouTubeVideoId,
  type PartyPlaylistState,
  type PlaylistTrack,
} from '@/lib/playlist'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId required' }, { status: 400 })
    }
    const playlist = normalizePlaylist(await getPlaylist(roomId))
    return NextResponse.json({ success: true, playlist })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const roomId = body.roomId ? String(body.roomId) : ''
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId required' }, { status: 400 })
    }

    const action = String(body.action || '')
    let playlist = normalizePlaylist(await getPlaylist(roomId))

    if (action === 'add') {
      const videoId = parseYouTubeVideoId(String(body.url || body.videoId || ''))
      if (!videoId) {
        return NextResponse.json(
          { success: false, error: 'Paste a valid YouTube link or video id' },
          { status: 400 }
        )
      }
      if (playlist.queue.some((t) => t.videoId === videoId)) {
        return NextResponse.json({ success: false, error: 'That video is already in the queue' }, { status: 409 })
      }
      if (playlist.queue.length >= MAX_PLAYLIST) {
        return NextResponse.json(
          { success: false, error: `Queue is full (${MAX_PLAYLIST} max)` },
          { status: 400 }
        )
      }
      const title =
        typeof body.title === 'string' && body.title.trim()
          ? body.title.trim().slice(0, 120)
          : await fetchYouTubeTitle(videoId)
      const track: PlaylistTrack = {
        id: randomUUID(),
        videoId,
        title,
        addedBy: body.playerId ? String(body.playerId) : '',
        addedByName: body.playerName ? String(body.playerName).slice(0, 24) : 'Player',
        at: Date.now(),
      }
      playlist = {
        queue: [...playlist.queue, track],
        currentId: playlist.currentId ?? track.id,
        updatedAt: Date.now(),
      }
    } else if (action === 'remove') {
      const trackId = String(body.trackId || '')
      const queue = playlist.queue.filter((t) => t.id !== trackId)
      let currentId = playlist.currentId
      if (currentId === trackId) {
        currentId = queue[0]?.id ?? null
      }
      playlist = { queue, currentId, updatedAt: Date.now() }
    } else if (action === 'play') {
      const trackId = String(body.trackId || '')
      if (!playlist.queue.some((t) => t.id === trackId)) {
        return NextResponse.json({ success: false, error: 'Track not found' }, { status: 404 })
      }
      playlist = { ...playlist, currentId: trackId, updatedAt: Date.now() }
    } else if (action === 'next') {
      playlist = advancePlaylist(playlist)
    } else if (action === 'clear') {
      playlist = emptyPlaylist()
    } else {
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }

    await setPlaylist(roomId, playlist)
    return NextResponse.json({ success: true, playlist })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

function advancePlaylist(playlist: PartyPlaylistState): PartyPlaylistState {
  if (playlist.queue.length === 0) {
    return { queue: [], currentId: null, updatedAt: Date.now() }
  }
  const idx = playlist.queue.findIndex((t) => t.id === playlist.currentId)
  const nextIdx = idx >= 0 ? idx + 1 : 0
  if (nextIdx >= playlist.queue.length) {
    // Finished the queue — clear current, keep history for re-play
    return { ...playlist, currentId: null, updatedAt: Date.now() }
  }
  return { ...playlist, currentId: playlist.queue[nextIdx]!.id, updatedAt: Date.now() }
}
