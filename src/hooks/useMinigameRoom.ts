'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLatest } from '@/lib/useLatest'
import { parseMinigamesUrlSearch } from '@/lib/minigamesUrl'
import type { Player } from '@/lib/types'
import type { MinigameId } from '@/lib/minigames/catalog'
import type { Progress, ProgressMap, Session } from '@/lib/minigames/types'
import { hubSession } from '@/lib/minigames/types'
import { getGameConfig, computeRaceWinner, isRoundComplete } from '@/lib/minigames/registry'
import { DEFAULT_AVATAR } from '@/lib/avatars'
import {
  createMinigameRoom,
  getMinigameRoomClient,
  joinMinigameRoom,
  reportProgress,
  updateSession,
} from '@/lib/minigames/roomApi'

const POLL_MS = 600
const REPORT_THROTTLE_MS = 220
const PLAYER_KEY = 'head2head_player_id'
const NAME_KEY = 'head2head_player_name'
const PARTY_KEY = 'head2head_minigame_party'

function loadSavedPartyCode() {
  try {
    const raw = localStorage.getItem(PARTY_KEY)
    if (!raw) return ''
    const saved = JSON.parse(raw) as { gameCode?: string }
    return saved.gameCode ?? ''
  } catch {
    return ''
  }
}

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

export type PartyScreen = 'join' | 'hub' | 'game'

// A single, game-agnostic "party" room. Players join once, then everyone moves
// between the hub (choosing) and individual games together.
export function useMinigameParty() {
  const searchParams = useSearchParams()
  const urlBoot = parseMinigamesUrlSearch(searchParams.toString())
  const [playerId] = useState(loadPlayerId)
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR)
  const [gameCodeInput, setGameCodeInput] = useState(
    urlBoot?.joinCode || loadSavedPartyCode()
  )
  const [entryIntent, setEntryIntent] = useState<'join' | 'create' | 'solo' | null>(
    urlBoot?.intent ?? null
  )
  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const sessionRef = useLatest(session)
  const progressRef = useLatest(progress)
  const playersRef = useLatest(players)
  const isHostRef = useLatest(isHost)
  const roomIdRef = useLatest(roomId)

  const lastReportRef = useRef(0)
  const ownProgressRef = useRef<Progress | null>(null)
  const finalizingRef = useRef(false)

  const activeGameId = session?.gameId ?? null
  const inGame = !!(session && session.gameId && session.status !== 'lobby')
  const screen: PartyScreen = !roomId ? 'join' : inGame ? 'game' : 'hub'

  useEffect(() => {
    const boot = parseMinigamesUrlSearch(`?${searchParams.toString()}`)
    if (boot?.intent === 'join' && boot.joinCode) {
      setEntryIntent('join')
      setGameCodeInput(boot.joinCode)
      return
    }
    if (boot?.intent === 'create') {
      setEntryIntent('create')
      setGameCodeInput('')
    }
  }, [searchParams])

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
        const data = await getMinigameRoomClient(rid)
        if (cancelled) return
        setPlayers(data.players || [])
        const incoming = data.session ?? null
        const local = sessionRef.current
        if (!local || !incoming || incoming.round >= local.round) {
          setSession(incoming)
        }
        const round = incoming?.round ?? local?.round ?? 0
        const merged = normalizeProgress(data.progress || {}, round)
        const own = ownProgressRef.current
        if (own && own.playerId && (!merged[own.playerId] || merged[own.playerId].at < own.at)) {
          merged[own.playerId] = own
        }
        setProgress(merged)
      } catch {
        /* transient errors retried next poll */
      }
    }
    poll()
    const iv = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [roomId])

  const pushSession = useCallback(async (next: Session) => {
    const rid = roomIdRef.current
    if (!rid) return
    setSession(next)
    try {
      await updateSession(rid, next)
    } catch (e) {
      console.warn('session sync failed', e)
    }
  }, [])

  // Partial update for views (Connect 4 moves, declaring a winner, etc.).
  const writeSession = useCallback(
    (partial: Partial<Session>) => {
      const base = sessionRef.current
      if (!base) return
      pushSession({ ...base, ...partial })
    },
    [pushSession]
  )

  const report = useCallback(
    (partial: Partial<Omit<Progress, 'playerId' | 'at'>>) => {
      const rid = roomIdRef.current
      const sess = sessionRef.current
      if (!rid || !sess) return
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

      const stateChanged = !prev || prev.alive !== next.alive || prev.finished !== next.finished
      const elapsed = Date.now() - lastReportRef.current
      if (!stateChanged && elapsed < REPORT_THROTTLE_MS) return
      lastReportRef.current = Date.now()
      reportProgress(rid, sess.round, next).catch(() => {})
    },
    [playerId]
  )

  // Host finalizes race/reaction rounds when the end condition is met.
  useEffect(() => {
    if (!isHostRef.current) return
    const sess = sessionRef.current
    if (!sess || !sess.gameId || sess.status !== 'live') return
    if (sess.mode === 'turn') return
    if (finalizingRef.current) return
    const config = getGameConfig(sess.gameId)
    const list = Object.values(progressRef.current)
    if (!isRoundComplete(config, playersRef.current, list, now, sess.endAt)) return
    finalizingRef.current = true
    const winner = computeRaceWinner(config, playersRef.current, list)
    pushSession({
      ...sess,
      status: 'over',
      winnerId: winner?.id ?? null,
      winnerName: winner?.name ?? null,
    }).finally(() => {
      finalizingRef.current = false
    })
  }, [now, pushSession])

  async function hostRoom() {
    if (!playerName.trim()) {
      setError('Enter your name')
      return
    }
    const urlJoinCode = parseMinigamesUrlSearch(searchParams.toString())?.joinCode ?? ''
    const joinCode = gameCodeInput.trim().toUpperCase() || urlJoinCode
    if (joinCode && (entryIntent === 'join' || urlJoinCode)) {
      return joinRoom(joinCode)
    }
    setError('')
    try {
      localStorage.setItem(NAME_KEY, playerName.trim())
      const data = await createMinigameRoom('party', playerName.trim(), avatar, playerId)
      setRoomId(data.roomId)
      setGameCode(data.gameCode)
      setPlayers(data.players)
      setIsHost(true)
      setSession(null)
      localStorage.setItem(PARTY_KEY, JSON.stringify({ roomId: data.roomId, gameCode: data.gameCode }))
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
      setSession(data.session ?? null)
      localStorage.setItem(PARTY_KEY, JSON.stringify({ roomId: data.roomId, gameCode: c }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join')
    }
  }

  // Start a fresh round of a given game for the whole room.
  const beginGame = useCallback(
    (gameId: MinigameId) => {
      if (!roomIdRef.current) return
      const config = getGameConfig(gameId)
      const prevRound = sessionRef.current?.round ?? 0
      const startAt = Date.now() + config.countdownMs
      const seed = Math.floor(Math.random() * 1_000_000)
      const extras = config.buildSession?.(playersRef.current, seed) ?? {}
      const next: Session = {
        gameId,
        status: 'live',
        mode: config.mode,
        round: prevRound + 1,
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
      pushSession(next)
    },
    [pushSession]
  )

  const startRound = useCallback(() => {
    const g = sessionRef.current?.gameId
    if (g) beginGame(g)
  }, [beginGame])

  // Send everyone back to the hub to pick another game.
  const backToHub = useCallback(() => {
    const round = sessionRef.current?.round ?? 0
    ownProgressRef.current = null
    setProgress({})
    pushSession(hubSession(round))
  }, [pushSession])

  return {
    screen,
    activeGameId,
    playerId,
    playerName,
    setPlayerName,
    avatar,
    setAvatar,
    gameCodeInput,
    setGameCodeInput,
    entryIntent,
    roomId,
    gameCode,
    isHost,
    players,
    session,
    progress,
    error,
    now,
    report,
    setSession: writeSession,
    hostRoom,
    joinRoom,
    beginGame,
    startRound,
    backToHub,
  }
}
