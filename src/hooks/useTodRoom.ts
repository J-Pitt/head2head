'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Player } from '@/lib/types'
import type { Progress, ProgressMap, Session } from '@/lib/minigames/types'
import type { TodState } from '@/lib/tod/types'
import { initialTodState } from '@/lib/tod/types'
import { getGameConfig, computeRaceLoser, isRoundComplete } from '@/lib/minigames/registry'
import { randomTodMinigame } from '@/lib/minigames/catalog'
import { randomPrompt } from '@/lib/tod/prompts'
import { DEFAULT_AVATAR } from '@/lib/avatars'
import {
  createTodRoom,
  getTodRoomClient,
  joinTodRoom,
  reportTodProgress,
  updateTodState,
} from '@/lib/tod/roomApi'

const POLL_MS = 600
const REPORT_THROTTLE_MS = 220
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

function normalizeProgress(raw: ProgressMap, round: number): Record<string, Progress> {
  const out: Record<string, Progress> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue
    const p = value as Progress
    const sep = key.indexOf(':')
    const keyRound = sep >= 0 ? Number(key.slice(0, sep)) : NaN
    if (!Number.isNaN(keyRound) && keyRound !== round) continue
    if (p.playerId) out[p.playerId] = p
  }
  return out
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
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
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const stateRef = useRef<TodState | null>(null)
  stateRef.current = state
  const progressRef = useRef<Record<string, Progress>>({})
  progressRef.current = progress
  const playersRef = useRef<Player[]>([])
  playersRef.current = players
  const roomIdRef = useRef<string | null>(null)
  roomIdRef.current = roomId

  const lastReportRef = useRef(0)
  const ownProgressRef = useRef<Progress | null>(null)
  const finalizingRef = useRef(false)

  const isHost = !!hostId && hostId === playerId

  useEffect(() => {
    if (!roomId) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [roomId])

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
        const incoming = data.state ?? null
        const local = stateRef.current
        if (!local || !incoming || incoming.round >= local.round) {
          setState(incoming)
        }
        const round = incoming?.round ?? local?.round ?? 0
        const merged = normalizeProgress(data.progress || {}, round)
        const own = ownProgressRef.current
        if (own && own.playerId && (!merged[own.playerId] || merged[own.playerId].at < own.at)) {
          merged[own.playerId] = own
        }
        setProgress(merged)
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

  // Update only the embedded minigame session (used by game views).
  const setMinigameSession = useCallback(
    (partial: Partial<Session>) => {
      const base = stateRef.current
      if (!base || !base.minigame) return
      pushState({ ...base, minigame: { ...base.minigame, ...partial } })
    },
    [pushState]
  )

  const report = useCallback(
    (partial: Partial<Omit<Progress, 'playerId' | 'at'>>) => {
      const rid = roomIdRef.current
      const st = stateRef.current
      if (!rid || !st) return
      const prev = ownProgressRef.current
      const next: Progress = {
        playerId,
        score: partial.score ?? prev?.score ?? 0,
        alive: partial.alive ?? prev?.alive ?? true,
        finished: partial.finished ?? prev?.finished ?? false,
        finishAt: partial.finishAt ?? prev?.finishAt ?? null,
        at: Date.now(),
      }
      ownProgressRef.current = next
      setProgress((p) => ({ ...p, [playerId]: next }))
      const changed = !prev || prev.alive !== next.alive || prev.finished !== next.finished
      if (!changed && Date.now() - lastReportRef.current < REPORT_THROTTLE_MS) return
      lastReportRef.current = Date.now()
      reportTodProgress(rid, st.round, next).catch(() => {})
    },
    [playerId]
  )

  // Host kicks off a new round's minigame.
  const startRound = useCallback(() => {
    const base = stateRef.current
    if (!roomIdRef.current || !base) return
    const gameId = randomTodMinigame()
    const config = getGameConfig(gameId)
    const startAt = Date.now() + config.countdownMs
    const seed = Math.floor(Math.random() * 1_000_000)
    const extras = config.buildSession?.(playersRef.current, seed) ?? {}
    const minigame: Session = {
      gameId,
      status: 'live',
      mode: config.mode,
      round: base.round + 1,
      startAt,
      endAt: config.durationMs ? startAt + config.durationMs : null,
      seed,
      goAt: config.mode === 'reaction' ? startAt + 1500 + (seed % 3500) : null,
      connect4: null,
      winnerId: null,
      winnerName: null,
      ...extras,
    }
    ownProgressRef.current = null
    lastReportRef.current = 0
    finalizingRef.current = false
    setProgress({})
    pushState({
      ...base,
      phase: 'minigame',
      round: base.round + 1,
      minigame,
      minigameId: gameId,
      loserId: null,
      loserName: null,
      onSpotId: null,
      askerId: null,
      choice: null,
      prompt: null,
    })
  }, [pushState])

  // Host finalizes the minigame and records the loser.
  useEffect(() => {
    if (!isHost) return
    const st = stateRef.current
    if (!st || st.phase !== 'minigame' || !st.minigame || st.minigame.status !== 'live') return
    if (finalizingRef.current) return
    const gid = st.minigame.gameId
    if (!gid) return
    const config = getGameConfig(gid)
    const list = Object.values(progressRef.current)
    if (!isRoundComplete(config, playersRef.current, list, now, st.minigame.endAt)) return
    finalizingRef.current = true
    const loser = computeRaceLoser(config, playersRef.current, list)
    pushState({
      ...st,
      minigame: { ...st.minigame, status: 'over' },
      loserId: loser?.id ?? null,
      loserName: loser?.name ?? null,
    }).finally(() => {
      finalizingRef.current = false
    })
  }, [now, isHost, pushState])

  const revealForfeit = useCallback(() => patchState({ phase: 'forfeit' }), [patchState])

  const beginTurns = useCallback(() => {
    const base = stateRef.current
    if (!base) return
    const order = shuffle(playersRef.current.map((p) => p.id))
    const onSpotId = order[0] ?? null
    const others = order.filter((id) => id !== onSpotId)
    const askerId = others.length ? others[Math.floor(Math.random() * others.length)] : null
    pushState({
      ...base,
      phase: 'turn',
      turnOrder: order,
      turnIndex: 0,
      onSpotId,
      askerId,
      choice: null,
      prompt: null,
    })
  }, [pushState])

  const pickChoice = useCallback(
    (choice: 'truth' | 'dare') => {
      const base = stateRef.current
      if (!base) return
      const prompt = randomPrompt(choice, Date.now() + base.turnIndex)
      patchState({ choice, prompt })
    },
    [patchState]
  )

  const nextTurn = useCallback(() => {
    const base = stateRef.current
    if (!base) return
    const nextIndex = base.turnIndex + 1
    if (nextIndex >= base.turnOrder.length) {
      startRound()
      return
    }
    const onSpotId = base.turnOrder[nextIndex] ?? null
    const others = base.turnOrder.filter((id) => id !== onSpotId)
    const askerId = others.length ? others[Math.floor(Math.random() * others.length)] : null
    patchState({ turnIndex: nextIndex, onSpotId, askerId, choice: null, prompt: null })
  }, [patchState, startRound])

  const endParty = useCallback(() => pushState({ ...initialTodState(), round: stateRef.current?.round ?? 0 }), [pushState])

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
    progress,
    error,
    now,
    report,
    setMinigameSession,
    hostRoom,
    joinRoom,
    startRound,
    revealForfeit,
    beginTurns,
    pickChoice,
    nextTurn,
    endParty,
  }
}
