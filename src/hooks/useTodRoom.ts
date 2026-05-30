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
  leaveTodRoom,
  setTodPresence,
  kickTodPlayer,
  setTodTyping,
  type TypingSignal,
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

function pickAsker(candidates: string[], onSpotId: string | null): string | null {
  const others = candidates.filter((id) => id !== onSpotId)
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
  const [typing, setTyping] = useState<TypingSignal | null>(null)
  const [error, setError] = useState('')

  const stateRef = useRef<TodState | null>(null)
  stateRef.current = state
  const playersRef = useRef<Player[]>([])
  playersRef.current = players
  const roomIdRef = useRef<string | null>(null)
  roomIdRef.current = roomId

  const lastTypingSentRef = useRef(0)
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isHost = !!hostId && hostId === playerId
  const me = players.find((p) => p.id === playerId) ?? null
  const isOnBreak = me?.status === 'break'

  // A player is available for turns if they're still in the room and not on break.
  const availableIds = useCallback(() => {
    return playersRef.current.filter((p) => p.status !== 'break').map((p) => p.id)
  }, [])

  const isAvailable = useCallback((id: string | null) => {
    if (!id) return false
    const p = playersRef.current.find((x) => x.id === id)
    return !!p && p.status !== 'break'
  }, [])

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
        // Show someone else's typing signal (ignore our own echo).
        setTyping(data.typing && data.typing.id !== playerId ? data.typing : null)
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
  }, [roomId, playerId])

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
      // Only players who are present and not on break take turns this round.
      const present = availableIds()
      const order = shuffle(present.length ? present : playersRef.current.map((p) => p.id))
      const onSpotId = order[0] ?? null
      pushState({
        ...base,
        phase: 'turn',
        round,
        turnOrder: order,
        turnIndex: 0,
        onSpotId,
        askerId: pickAsker(present, onSpotId),
        choice: null,
        prompt: null,
      })
    },
    [pushState, availableIds]
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

  // Advance to the next still-present player, skipping anyone who left or is on
  // break. When nobody is left in the order, the round ends.
  const nextTurn = useCallback(() => {
    const base = stateRef.current
    if (!base) return
    let nextIndex = base.turnIndex + 1
    while (nextIndex < base.turnOrder.length && !isAvailable(base.turnOrder[nextIndex])) {
      nextIndex++
    }
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
      askerId: pickAsker(availableIds(), onSpotId),
      choice: null,
      prompt: null,
    })
  }, [patchState, beginRound, isAvailable, availableIds])

  // Host (or anyone) can skip the player on the spot if they've stepped away.
  const skipTurn = nextTurn

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

  // Toggle your own break status (stepped away but still in the room).
  const toggleBreak = useCallback(async () => {
    const rid = roomIdRef.current
    if (!rid) return
    const current = playersRef.current.find((p) => p.id === playerId)
    const nextStatus = current?.status === 'break' ? 'active' : 'break'
    try {
      const data = await setTodPresence(rid, playerId, nextStatus)
      setPlayers(data.players)
    } catch (e) {
      console.warn('presence failed', e)
    }
  }, [playerId])

  // Host removes another player from the room.
  const kickPlayer = useCallback(
    async (targetId: string) => {
      const rid = roomIdRef.current
      if (!rid) return
      try {
        const data = await kickTodPlayer(rid, playerId, targetId)
        setPlayers(data.players)
        setHostId(data.hostId)
      } catch (e) {
        console.warn('kick failed', e)
      }
    },
    [playerId]
  )

  // Broadcast a "typing…" signal. Throttled so we send at most ~1/sec while
  // typing, and an idle timer sends the stop signal after a short pause.
  const signalTyping = useCallback(
    (isTyping: boolean) => {
      const rid = roomIdRef.current
      if (!rid) return
      const name = playersRef.current.find((p) => p.id === playerId)?.name ?? 'Someone'
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current)
        typingStopTimerRef.current = null
      }
      if (isTyping) {
        const nowMs = Date.now()
        if (nowMs - lastTypingSentRef.current > 1200) {
          lastTypingSentRef.current = nowMs
          setTodTyping(rid, playerId, name, true)
        }
        typingStopTimerRef.current = setTimeout(() => {
          lastTypingSentRef.current = 0
          setTodTyping(rid, playerId, name, false)
        }, 2000)
      } else {
        lastTypingSentRef.current = 0
        setTodTyping(rid, playerId, name, false)
      }
    },
    [playerId]
  )

  // Leave the room entirely and reset back to the join screen.
  const leaveRoom = useCallback(async () => {
    const rid = roomIdRef.current
    if (rid) {
      try {
        await leaveTodRoom(rid, playerId)
      } catch {
        /* leaving is best-effort */
      }
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
  }, [playerId])

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

  // On load, try to slip back into a saved room (e.g. after a refresh). If we're
  // still listed as a player, restore the session; otherwise just prefill the code.
  useEffect(() => {
    let cancelled = false
    async function rejoin() {
      let saved: { roomId?: string; gameCode?: string } | null = null
      try {
        const raw = localStorage.getItem(TOD_KEY)
        saved = raw ? JSON.parse(raw) : null
      } catch {
        saved = null
      }
      if (!saved?.gameCode) return
      setGameCodeInput((prev) => prev || saved!.gameCode!)
      if (!saved.roomId) return
      try {
        const data = await getTodRoomClient(saved.roomId)
        if (cancelled) return
        const stillIn = (data.players || []).some((p) => p.id === playerId)
        if (!stillIn) return
        setRoomId(data.roomId)
        setGameCode(data.gameCode)
        setHostId(data.hostId ?? null)
        setPlayers(data.players || [])
        setState(data.state ?? null)
        // Coming back from a refresh marks us active again.
        setTodPresence(data.roomId, playerId, 'active').catch(() => {})
      } catch {
        /* stay on the join screen */
      }
    }
    rejoin()
    return () => {
      cancelled = true
    }
  }, [playerId])

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
    me,
    isOnBreak,
    players,
    state,
    typing,
    error,
    isAvailable,
    signalTyping,
    hostRoom,
    joinRoom,
    startGame,
    pickChoice,
    submitPrompt,
    nextTurn,
    skipTurn,
    continueFromPicture,
    endParty,
    toggleBreak,
    kickPlayer,
    leaveRoom,
  }
}
