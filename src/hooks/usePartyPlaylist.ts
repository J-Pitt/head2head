'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  emptyPlaylist,
  fetchPlaylist,
  playlistAction,
  type PartyPlaylistState,
} from '@/lib/playlist'
import { useLatest } from '@/lib/useLatest'

const POLL_MS = 2500

export function usePartyPlaylist(
  roomId: string | null,
  me: { playerId: string; playerName: string }
) {
  const [playlist, setPlaylist] = useState<PartyPlaylistState>(emptyPlaylist)
  const [error, setError] = useState('')
  const meRef = useLatest(me)

  useEffect(() => {
    if (!roomId || roomId === 'local') {
      setPlaylist(emptyPlaylist())
      return
    }
    let cancelled = false
    async function poll() {
      const next = await fetchPlaylist(roomId as string)
      if (!cancelled) setPlaylist(next)
    }
    poll()
    const iv = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [roomId])

  const run = useCallback(
    async (action: 'add' | 'remove' | 'play' | 'next' | 'clear', body: Record<string, unknown> = {}) => {
      if (!roomId || roomId === 'local') {
        setError('Playlist needs an online room')
        return
      }
      setError('')
      try {
        const next = await playlistAction(roomId, action, {
          playerId: meRef.current.playerId,
          playerName: meRef.current.playerName,
          ...body,
        })
        setPlaylist(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update playlist')
        throw e
      }
    },
    [roomId]
  )

  const add = useCallback((url: string) => run('add', { url }), [run])
  const remove = useCallback((trackId: string) => run('remove', { trackId }), [run])
  const play = useCallback((trackId: string) => run('play', { trackId }), [run])
  const next = useCallback(() => run('next'), [run])
  const clear = useCallback(() => run('clear'), [run])

  const current = playlist.queue.find((t) => t.id === playlist.currentId) ?? null

  return { playlist, current, error, add, remove, play, next, clear, setError }
}
