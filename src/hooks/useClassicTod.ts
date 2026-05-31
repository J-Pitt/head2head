'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_BOARD_PIECE } from '@/lib/tod/boardPieces'
import {
  createTodRoom,
  getTodRoomClient,
  joinTodRoom,
  leaveTodRoom,
  updateTodState,
} from '@/lib/tod/roomApi'
import { getTruthsForMode, getDaresForMode, pickRandomPrompt } from '@/lib/tod/classic/lists'
import type { ClassicListMode } from '@/lib/tod/classic/lists'
import { initialClassicTodState, isClassicTodState, type ClassicTodState } from '@/lib/tod/classic/types'
import type { Player } from '@/lib/types'

const POLL_MS = 2000
const TOD_KEY = 'head2head_tod_room'
const NAME_KEY = 'head2head_player_name'

function loadPlayerId() {
  try {
    let id = localStorage.getItem('head2head_player_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('head2head_player_id', id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useClassicTod() {
  const [playerId] = useState(loadPlayerId)
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [avatar] = useState(DEFAULT_BOARD_PIECE)
  const [listMode, setListMode] = useState<ClassicListMode>('pg')
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [intent, setIntent] = useState<'create' | 'join' | 'solo' | null>(null)

  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [state, setState] = useState<ClassicTodState | null>(null)

  const stateRef = useRef<ClassicTodState | null>(null)
  stateRef.current = state
  const playersRef = useRef<Player[]>([])
  playersRef.current = players
  const roomIdRef = useRef<string | null>(null)
  roomIdRef.current = roomId

  const isLocal = roomId === 'classic-local'
  const inRoom = !!roomId && !!state
  const isHost = hostId === playerId

  const pushState = useCallback(async (next: ClassicTodState) => {
    setState(next)
    const rid = roomIdRef.current
    if (!rid || rid === 'classic-local') return
    try {
      await updateTodState(rid, next)
    } catch (e) {
      console.warn('classic sync failed', e)
    }
  }, [])

  useEffect(() => {
    if (!roomId || roomId === 'classic-local') return
    let cancelled = false
    async function poll() {
      try {
        const data = await getTodRoomClient(roomId!)
        if (cancelled) return
        setPlayers(data.players || [])
        setHostId(data.hostId ?? null)
        if (isClassicTodState(data.state)) setState(data.state)
      } catch {
        /* retry */
      }
    }
    poll()
    const iv = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [roomId])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('classic') !== '1') return
      const code = params.get('code')?.trim().toUpperCase()
      const create = params.get('create')?.trim().toUpperCase()
      if (code) {
        setIntent('join')
        setJoinCode(code)
      } else if (create) {
        setIntent('create')
        setJoinCode(create)
      } else {
        setIntent('solo')
      }
    } catch {
      /* ignore */
    }
  }, [])

  function spotName(id: string | null): string {
    if (!id) return 'Someone'
    if (isLocal) return players.find((p) => p.id === id)?.name ?? 'Someone'
    return players.find((p) => p.id === id)?.name ?? 'Someone'
  }

  const onSpotId = state?.onSpotId ?? null
  const myTurn = inRoom && state?.subPhase === 'playing' && onSpotId === playerId

  async function enterLobby() {
    const name = playerName.trim()
    if (!name) {
      setError('Enter your name')
      return
    }
    setError('')
    try {
      localStorage.setItem(NAME_KEY, name)
    } catch {
      /* ignore */
    }

    const classic = initialClassicTodState(listMode)

    if (intent === 'join' && joinCode) {
      try {
        const data = await joinTodRoom(joinCode, name, avatar, playerId)
        const st = isClassicTodState(data.state) ? data.state : classic
        setRoomId(data.roomId)
        setGameCode(joinCode)
        setHostId(data.hostId)
        setPlayers(data.players)
        setState(st)
        localStorage.setItem(
          TOD_KEY,
          JSON.stringify({ roomId: data.roomId, gameCode: joinCode, entryMode: 'classic' })
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not join room')
      }
      return
    }

    if (intent === 'create' && joinCode) {
      try {
        const data = await createTodRoom(name, avatar, playerId, joinCode)
        await updateTodState(data.roomId, classic)
        setRoomId(data.roomId)
        setGameCode(data.gameCode)
        setHostId(data.hostId)
        setPlayers(data.players)
        setState(classic)
        localStorage.setItem(
          TOD_KEY,
          JSON.stringify({ roomId: data.roomId, gameCode: data.gameCode, entryMode: 'classic' })
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create room')
      }
      return
    }

    // Solo / pass-and-play — local lobby, no server required
    const host: Player = { id: playerId, name, avatar: DEFAULT_BOARD_PIECE }
    setRoomId('classic-local')
    setGameCode(null)
    setHostId(playerId)
    setPlayers([host])
    setState(classic)
    try {
      localStorage.setItem(TOD_KEY, JSON.stringify({ roomId: 'classic-local', entryMode: 'classic' }))
    } catch {
      /* ignore */
    }
  }

  function addLocalPlayer() {
    if (!isLocal) return
    const n = playersRef.current.length + 1
    setPlayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: `Player ${n}`, avatar: DEFAULT_BOARD_PIECE },
    ])
  }

  function startPlaying() {
    const s = stateRef.current
    if (!s || s.subPhase !== 'lobby') return
    const order = shuffle(
      playersRef.current.filter((p) => p.status !== 'break').map((p) => p.id)
    )
    const ids = order.length ? order : playersRef.current.map((p) => p.id)
    const next: ClassicTodState = {
      ...s,
      subPhase: 'playing',
      turnOrder: ids,
      turnIndex: 0,
      turnPhase: 'choose',
      onSpotId: ids[0] ?? null,
      chosenCategory: null,
      prompt: null,
    }
    pushState(next)
  }

  function pickChoice(choice: 'truth' | 'dare') {
    const s = stateRef.current
    if (!s || s.subPhase !== 'playing' || s.turnPhase !== 'choose' || s.onSpotId !== playerId) return
    const pool = choice === 'truth' ? getTruthsForMode(s.listMode) : getDaresForMode(s.listMode)
    const used = choice === 'truth' ? s.usedTruths : s.usedDares
    const { text, idx } = pickRandomPrompt(pool, used)
    pushState({
      ...s,
      turnPhase: 'answer',
      chosenCategory: choice,
      prompt: text,
      usedTruths: choice === 'truth' ? [...s.usedTruths, idx] : s.usedTruths,
      usedDares: choice === 'dare' ? [...s.usedDares, idx] : s.usedDares,
    })
  }

  function completeAnswer() {
    const s = stateRef.current
    if (!s || s.subPhase !== 'playing' || s.turnPhase !== 'answer' || s.onSpotId !== playerId) return
    const nextIndex = (s.turnIndex + 1) % Math.max(s.turnOrder.length, 1)
    pushState({
      ...s,
      turnIndex: nextIndex,
      turnPhase: 'choose',
      onSpotId: s.turnOrder[nextIndex] ?? null,
      chosenCategory: null,
      prompt: null,
    })
  }

  async function leaveRoom() {
    const rid = roomIdRef.current
    if (rid && rid !== 'classic-local') {
      await leaveTodRoom(rid, playerId).catch(() => {})
    }
    try {
      localStorage.removeItem(TOD_KEY)
    } catch {
      /* ignore */
    }
    setRoomId(null)
    setGameCode(null)
    setHostId(null)
    setPlayers([])
    setState(null)
  }

  return {
    playerId,
    playerName,
    setPlayerName,
    avatar,
    listMode,
    setListMode,
    error,
    intent,
    joinCode,
    roomId,
    gameCode,
    isLocal,
    isHost,
    inRoom,
    players,
    state,
    myTurn,
    onSpotId,
    spotName,
    enterLobby,
    addLocalPlayer,
    startPlaying,
    pickChoice,
    completeAnswer,
    leaveRoom,
  }
}
