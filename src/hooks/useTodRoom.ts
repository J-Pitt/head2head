'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Player } from '@/lib/types'
import type { TodState } from '@/lib/tod/types'
import { initialTodState, PICTURE_EVERY } from '@/lib/tod/types'
import { DEFAULT_AVATAR } from '@/lib/avatars'
import {
  createTodRoom,
  getTodRoomClient,
  joinTodRoom,
  updateTodState,
} from '@/lib/tod/roomApi'

const POLL_MS = 600
const PLAYER_KEY = 'head2head_player_id'
const NAME_KEY = 'head2head_player_name'
const TOD_KEY = 'head2head_tod_room'

function loadPlayerId() {
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickAsker(order: string[], onSpotId: string | null): string | null {
  const others = order.filter((id) => id !== onSpotId)
  return others.length ? others[Math.floor(Math.random() * others.length)] : null
}

export function useTodRoom() {
  const [playerId] = useState(loadPlayerId)
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR)
  const [gameCodeInput, setGameCodeInput] = useState('')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [state, setState] = useState<TodState | null>(null)
  const [error, setError] = useState('')

  const stateRef = useRef<TodState | null>(null)
  stateRef.current = state
  const playersRef = useRef<Player[]>([])
  playersRef.current = players
  const roomIdRef = useRef<string | null>(null)
  roomIdRef.current = roomId

  const isHost = !!hostId && hostId === playerId

  useEffect(() => {
    if (!roomId) return
    const rid = roomId
    let cancelled = false
    async function poll() {
      try {
        const data = await getTodRoomClient(rid)
        if (cancelled) return
        setPlayers(data.players || [])
        setHostId(data.hostId ?? null)
        setState(data.state ?? null)
      } catch {
        /* retry next poll */
      }
    }
    poll()
    const iv = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [roomId])

  const pushState = useCallback(async (next: TodState) => {
    const rid = roomIdRef.current
    if (!rid) return
    setState(next)
    try {
      await updateTodState(rid, next)
    } catch (e) {
      console.warn('tod sync failed', e)
    }
  }, [])

  const patchState = useCallback(
    (partial: Partial<TodState>) => {
      const base = stateRef.current
      if (!base) return
      pushState({ ...base, ...partial })
    },
    [pushState]
  )

  // Build a fresh round of turns: shuffle the order, set the first player on
  // the spot, and pick a random asker.
  const beginRound = useCallback(
    (round: number) => {
      const base = stateRef.current
      if (!base) return
      const order = shuffle(playersRef.current.map((p) => p.id))
      const onSpotId = order[0] ?? null
      pushState({
        ...base,
        phase: 'turn',
        round,
        turnOrder: order,
        turnIndex: 0,
        onSpotId,
        askerId: pickAsker(order, onSpotId),
        choice: null,
        prompt: null,
      })
    },
    [pushState]
  )

  // Host starts the game from the lobby.
  const startGame = useCallback(() => beginRound(1), [beginRound])

  // The player on the spot picks truth or dare; the asker then writes the prompt.
  const pickChoice = useCallback(
    (choice: 'truth' | 'dare') => {
      patchState({ choice, prompt: null })
    },
    [patchState]
  )

  // The randomly-chosen asker types the truth/dare and submits it for everyone.
  const submitPrompt = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      patchState({ prompt: t.slice(0, 400) })
    },
    [patchState]
  )

  const nextTurn = useCallback(() => {
    const base = stateRef.current
    if (!base) return
    const nextIndex = base.turnIndex + 1
    if (nextIndex >= base.turnOrder.length) {
      // Round complete — every Nth round triggers picture time.
      if (base.round % PICTURE_EVERY === 0) {
        patchState({ phase: 'picture' })
      } else {
        beginRound(base.round + 1)
      }
      return
    }
    const onSpotId = base.turnOrder[nextIndex] ?? null
    patchState({
      turnIndex: nextIndex,
      onSpotId,
      askerId: pickAsker(base.turnOrder, onSpotId),
      choice: null,
      prompt: null,
    })
  }, [patchState, beginRound])

  // After picture time, continue into the next round of turns.
  const continueFromPicture = useCallback(() => {
    const base = stateRef.current
    if (!base) return
    beginRound(base.round + 1)
  }, [beginRound])

  const endParty = useCallback(
    () => pushState({ ...initialTodState(), round: stateRef.current?.round ?? 0 }),
    [pushState]
  )

  async function hostRoom() {
    if (!playerName.trim()) {
      setError('Enter your name')
      return
    }
    setError('')
    try {
      localStorage.setItem(NAME_KEY, playerName.trim())
      const data = await createTodRoom(playerName.trim(), avatar, playerId)
      setRoomId(data.roomId)
      setGameCode(data.gameCode)
      setHostId(data.hostId)
      setPlayers(data.players)
      setState(initialTodState())
      localStorage.setItem(TOD_KEY, JSON.stringify({ roomId: data.roomId, gameCode: data.gameCode }))
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
      const data = await joinTodRoom(c, playerName.trim(), avatar, playerId)
      setRoomId(data.roomId)
      setGameCode(c)
      setHostId(data.hostId)
      setPlayers(data.players)
      setState(data.state ?? null)
      localStorage.setItem(TOD_KEY, JSON.stringify({ roomId: data.roomId, gameCode: c }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join')
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOD_KEY)
      if (!raw || roomId) return
      const saved = JSON.parse(raw) as { gameCode?: string }
      if (saved.gameCode) setGameCodeInput(saved.gameCode)
    } catch {
      /* ignore */
    }
  }, [roomId])

  return {
    playerId,
    playerName,
    setPlayerName,
    avatar,
    setAvatar,
    gameCodeInput,
    setGameCodeInput,
    roomId,
    gameCode,
    hostId,
    isHost,
    players,
    state,
    error,
    hostRoom,
    joinRoom,
    startGame,
    pickChoice,
    submitPrompt,
    nextTurn,
    continueFromPicture,
    endParty,
  }
}
