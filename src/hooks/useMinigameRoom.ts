'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Player } from '@/lib/types'
import type { MinigameId } from '@/lib/minigames/catalog'
import { createGameState, startGameState } from '@/lib/minigames/registry'
import type { MinigameState } from '@/lib/minigames/types'
import {
  createMinigameRoom,
  getMinigameRoomClient,
  joinMinigameRoom,
  updateMinigameState,
} from '@/lib/minigames/roomApi'

const POLL_MS = 1500
const PLAYER_KEY = 'head2head_player_id'
const NAME_KEY = 'head2head_player_name'

export function loadPlayerId() {
  try {
    let id = localStorage.getItem(PLAYER_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(PLAYER_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function roomStorageKey(gameId: string) {
  return `head2head_minigame_${gameId}`
}

export function useMinigameRoom(gameId: MinigameId) {
  const [screen, setScreen] = useState<'lobby' | 'game'>('lobby')
  const [playerId] = useState(loadPlayerId)
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [avatar, setAvatar] = useState('star')
  const [gameCodeInput, setGameCodeInput] = useState('')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [state, setState] = useState<MinigameState | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  const syncingRef = useRef(false)

  useEffect(() => {
    if (!roomId || screen !== 'game') return
    const id = setInterval(() => setTick((t) => t + 1), 50)
    return () => clearInterval(id)
  }, [roomId, screen])

  useEffect(() => {
    if (state?.started && screen === 'lobby') setScreen('game')
  }, [state?.started, screen])

  useEffect(() => {
    if (!roomId) return
    const rid = roomId
    async function poll() {
      if (syncingRef.current) return
      try {
        const data = await getMinigameRoomClient(rid)
        setPlayers(data.players || [])
        if (data.state) setState(data.state as MinigameState)
      } catch {
        /* ignore */
      }
    }
    poll()
    const iv = setInterval(poll, POLL_MS)
    return () => clearInterval(iv)
  }, [roomId])

  const pushState = useCallback(
    async (next: MinigameState) => {
      if (!roomId) return
      if (next.winnerId && !next.winnerName) {
        const name = players.find((p) => p.id === next.winnerId)?.name ?? 'Winner'
        next = { ...next, winnerName: name }
      }
      syncingRef.current = true
      setState(next)
      try {
        await updateMinigameState(roomId, next, next.winnerName ?? undefined)
      } catch (e) {
        console.warn('sync failed', e)
      } finally {
        syncingRef.current = false
      }
    },
    [roomId, players]
  )

  async function hostRoom() {
    if (!playerName.trim()) {
      setError('Enter your name')
      return
    }
    setError('')
    try {
      localStorage.setItem(NAME_KEY, playerName.trim())
      const data = await createMinigameRoom(gameId, playerName.trim(), avatar, playerId)
      setRoomId(data.roomId)
      setGameCode(data.gameCode)
      setPlayers(data.players)
      setIsHost(true)
      localStorage.setItem(
        roomStorageKey(gameId),
        JSON.stringify({ roomId: data.roomId, gameCode: data.gameCode })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create room')
    }
  }

  async function joinRoom(code?: string) {
    const c = (code ?? gameCodeInput).trim().toUpperCase()
    if (!playerName.trim() || !c) {
      setError('Name and game code required')
      return
    }
    setError('')
    try {
      localStorage.setItem(NAME_KEY, playerName.trim())
      const data = await joinMinigameRoom(c, playerName.trim(), avatar, playerId)
      setRoomId(data.roomId)
      setGameCode(c)
      setPlayers(data.players)
      setIsHost(data.players[0]?.id === playerId)
      if (data.state) setState(data.state as MinigameState)
      if (data.state?.started) setScreen('game')
      localStorage.setItem(roomStorageKey(gameId), JSON.stringify({ roomId: data.roomId, gameCode: c }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join')
    }
  }

  function startGame() {
    if (!isHost || !roomId) return
    const initial = startGameState(gameId, createGameState(gameId, players))
    pushState(initial)
    setScreen('game')
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(roomStorageKey(gameId))
      if (!raw || roomId) return
      const saved = JSON.parse(raw) as { gameCode: string }
      if (saved.gameCode) setGameCodeInput(saved.gameCode)
    } catch {
      /* ignore */
    }
  }, [gameId, roomId])

  return {
    screen,
    playerId,
    playerName,
    setPlayerName,
    avatar,
    setAvatar,
    gameCodeInput,
    setGameCodeInput,
    roomId,
    gameCode,
    isHost,
    players,
    state,
    error,
    tick,
    pushState,
    hostRoom,
    joinRoom,
    startGame,
  }
}
