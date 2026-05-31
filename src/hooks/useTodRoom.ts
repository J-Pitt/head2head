'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLatest } from '@/lib/useLatest'
import type { Player } from '@/lib/types'
import type { BoardTodState } from '@/lib/tod/types'
import { initialTodState, isBoardTodState, isClassicTodState, PICTURE_EVERY } from '@/lib/tod/types'
import type { BoardState, TileType } from '@/lib/tod/board'
import { createBoardState, rollDie, SPECIAL_CHALLENGES } from '@/lib/tod/board'
import type { Progress, Session } from '@/lib/minigames/types'
import { getGameConfig, computeRaceLoser, isRoundComplete } from '@/lib/minigames/registry'
import { randomTodMinigame } from '@/lib/minigames/catalog'
import { TRIVIA_QUESTIONS, getQuestionById } from '@/lib/trivia'
import { DEFAULT_BOARD_PIECE, isBoardPiece } from '@/lib/tod/boardPieces'
import {
  createTodRoom,
  getTodRoomClient,
  joinTodRoom,
  updateTodState,
  leaveTodRoom,
  setTodPresence,
  kickTodPlayer,
  setTodTyping,
  reportTodProgress,
  type TypingSignal,
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
  const [avatar, setAvatar] = useState<string>(DEFAULT_BOARD_PIECE)
  const [gameCodeInput, setGameCodeInput] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [entryMode, setEntryMode] = useState<'local' | 'join' | 'create' | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [state, setState] = useState<BoardTodState | null>(null)
  const [typing, setTyping] = useState<TypingSignal | null>(null)
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')

  const stateRef = useLatest(state)
  const playersRef = useLatest(players)
  const roomIdRef = useLatest(roomId)
  const progressRef = useLatest(progress)
  const ownProgressRef = useRef<Progress | null>(null)
  const lastReportRef = useRef(0)
  const finalizingRef = useRef(false)

  const lastTypingSentRef = useRef(0)
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isHost = !!hostId && hostId === playerId
  const me = players.find((p) => p.id === playerId) ?? null
  const isOnBreak = me?.status === 'break'
  const isLocal = entryMode === 'local' || roomId === 'local'

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
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [roomId])

  useEffect(() => {
    if (!roomId || roomId === 'local') return
    let cancelled = false
    async function poll() {
      try {
        const data = await getTodRoomClient(roomId!)
        if (cancelled) return
        setPlayers(data.players || [])
        setHostId(data.hostId ?? null)
        if (isBoardTodState(data.state)) {
          setState(data.state)
        }
        // Show someone else's typing signal (ignore our own echo).
        setTyping(data.typing && data.typing.id !== playerId ? data.typing : null)
        // Merge per-player board minigame progress for the current round.
        const mgRound = isBoardTodState(data.state) ? (data.state.board?.mgRound ?? 0) : 0
        const merged: Record<string, Progress> = {}
        for (const [key, value] of Object.entries(data.progress || {})) {
          if (!value || typeof value !== 'object') continue
          const p = value as Progress
          const sep = key.indexOf(':')
          const keyRound = sep >= 0 ? Number(key.slice(0, sep)) : NaN
          if (!Number.isNaN(keyRound) && keyRound !== mgRound) continue
          if (p.playerId) merged[p.playerId] = p
        }
        const own = ownProgressRef.current
        if (own?.playerId && (!merged[own.playerId] || merged[own.playerId].at < own.at)) {
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
  }, [roomId, playerId])

  const pushState = useCallback(async (next: BoardTodState) => {
    const rid = roomIdRef.current
    setState(next)
    if (!rid || rid === 'local') return
    try {
      await updateTodState(rid, next)
    } catch (e) {
      console.warn('tod sync failed', e)
    }
  }, [])

  const patchState = useCallback(
    (partial: Partial<BoardTodState>) => {
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

  // ---------------------------------------------------------------------------
  // Board game
  // ---------------------------------------------------------------------------
  const patchBoard = useCallback(
    (partial: Partial<BoardState>) => {
      const base = stateRef.current
      if (!base || !base.board) return
      pushState({ ...base, board: { ...base.board, ...partial } })
    },
    [pushState]
  )

  const pickAskerExcl = useCallback((excludeId: string | null) => {
    const cands = playersRef.current
      .filter((p) => p.status !== 'break' && p.id !== excludeId)
      .map((p) => p.id)
    return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null
  }, [])

  const startBoardGame = useCallback(() => {
    const base = stateRef.current
    if (!base) return
    ownProgressRef.current = null
    setProgress({})
    const board = createBoardState(playersRef.current)
    pushState({ ...base, phase: 'board', mode: 'board', board })
  }, [pushState])

  // Advance the roll to the next present, non-jailed player.
  const advanceRoll = useCallback(
    (b: BoardState, positions: Record<string, number>) => {
      const jail = { ...b.jail }
      let turn = b.turn
      let rollerId: string | null = null
      for (let steps = 0; steps < b.order.length * 3 + 1; steps++) {
        turn = (turn + 1) % b.order.length
        const cand = b.order[turn]
        const present = !!cand && playersRef.current.some((p) => p.id === cand && p.status !== 'break')
        if (!present) continue
        if ((jail[cand] ?? 0) > 0) {
          jail[cand] = jail[cand] - 1
          if (jail[cand] <= 0) delete jail[cand]
          continue
        }
        rollerId = cand
        break
      }
      patchBoard({
        turn,
        rollerId,
        dice: null,
        phase: 'rolling',
        tileType: null,
        onSpotId: null,
        askerId: null,
        choice: null,
        prompt: null,
        questionId: null,
        answeredBy: null,
        answerIndex: null,
        answerCorrect: null,
        message: null,
        loserId: null,
        loserName: null,
        minigame: null,
        positions,
        jail,
      })
    },
    [patchBoard]
  )

  const rollDice = useCallback(() => {
    const base = stateRef.current
    const b = base?.board
    if (!base || !b || b.phase !== 'rolling' || b.rollerId !== playerId) return
    const dice = rollDie()
    const last = b.tiles.length - 1
    const pos = b.positions[playerId] ?? 0
    const newPos = pos + dice
    const name = playersRef.current.find((p) => p.id === playerId)?.name ?? 'Player'
    const positions = { ...b.positions, [playerId]: Math.min(newPos, last) }

    if (newPos >= last) {
      patchBoard({ dice, positions, phase: 'finished', winnerId: playerId, winnerName: name })
      return
    }

    const type: TileType = b.tiles[newPos].type

    if (type === 'truth' || type === 'dare' || type === 'wild') {
      patchBoard({
        dice,
        positions,
        phase: 'prompt',
        tileType: type,
        onSpotId: playerId,
        askerId: pickAskerExcl(playerId),
        choice: type === 'wild' ? null : type,
        prompt: null,
      })
    } else if (type === 'trivia') {
      const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)]
      patchBoard({
        dice,
        positions,
        phase: 'trivia',
        tileType: 'trivia',
        questionId: q.id,
        answeredBy: playerId,
        answerIndex: null,
        answerCorrect: null,
      })
    } else if (type === 'minigame') {
      const gameId = randomTodMinigame()
      const config = getGameConfig(gameId)
      const startAt = Date.now() + config.countdownMs
      const seed = Math.floor(Math.random() * 1_000_000)
      const extras = config.buildSession?.(playersRef.current, seed) ?? {}
      const minigame: Session = {
        gameId,
        status: 'live',
        mode: config.mode,
        round: b.mgRound + 1,
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
      patchBoard({
        dice,
        positions,
        phase: 'minigame',
        tileType: 'minigame',
        minigame,
        mgRound: b.mgRound + 1,
        loserId: null,
        loserName: null,
      })
    } else if (type === 'jail') {
      patchBoard({
        dice,
        positions,
        phase: 'event',
        tileType: 'jail',
        message: `🚔 ${name} landed on Jail — skip your next turn!`,
        jail: { ...b.jail, [playerId]: 1 },
      })
    } else if (type === 'forward') {
      const np = Math.min(newPos + 2, last - 1)
      patchBoard({ dice, positions: { ...positions, [playerId]: np }, phase: 'event', tileType: 'forward', message: `⏩ ${name} jumps ahead 2 tiles!` })
    } else if (type === 'back') {
      const np = Math.max(newPos - 2, 0)
      patchBoard({ dice, positions: { ...positions, [playerId]: np }, phase: 'event', tileType: 'back', message: `⏪ ${name} slides back 2 tiles!` })
    } else if (type === 'swap') {
      const others = playersRef.current.filter((p) => p.id !== playerId && p.status !== 'break')
      const swapPos = { ...positions }
      let msg = `🔀 ${name} found no one to swap with.`
      if (others.length) {
        const t = others[Math.floor(Math.random() * others.length)]
        const mine = swapPos[playerId] ?? 0
        swapPos[playerId] = swapPos[t.id] ?? 0
        swapPos[t.id] = mine
        msg = `🔀 ${name} swapped places with ${t.name}!`
      }
      patchBoard({ dice, positions: swapPos, phase: 'event', tileType: 'swap', message: msg })
    } else if (type === 'picture') {
      patchBoard({ dice, positions, phase: 'event', tileType: 'picture', message: `📸 Picture time! Everyone post a pic in the group chat.` })
    } else if (type === 'special') {
      const ch = SPECIAL_CHALLENGES[b.tiles[newPos].special ?? 0]
      if (ch.kind === 'dice') {
        // Everyone present rolls; the highest roller advances 5 spaces.
        const present = playersRef.current.filter((p) => p.status !== 'break')
        let best = { id: playerId, roll: -1, name }
        for (const p of present) {
          const r = rollDie()
          if (r > best.roll) best = { id: p.id, roll: r, name: p.name }
        }
        const winnerPos = Math.min((positions[best.id] ?? 0) + 5, last - 1)
        patchBoard({
          dice,
          positions: { ...positions, [best.id]: winnerPos },
          phase: 'event',
          tileType: 'special',
          message: `🎲 Group roll! ${best.name} rolled highest (${best.roll}) and jumps ahead 5 spaces.`,
        })
      } else {
        patchBoard({ dice, positions, phase: 'event', tileType: 'special', message: `${ch.icon} ${ch.label}` })
      }
    } else if (type === 'start') {
      patchBoard({
        dice,
        positions,
        phase: 'event',
        tileType: 'start',
        message: `🚦 ${name} is back at Start — keep rolling!`,
      })
    } else {
      patchBoard({ dice, positions, phase: 'event', tileType: 'group', message: `👯 Group dare! Everyone does a dare together.` })
    }
  }, [playerId, patchBoard, pickAskerExcl])

  const boardPickChoice = useCallback(
    (choice: 'truth' | 'dare') => patchBoard({ choice, prompt: null }),
    [patchBoard]
  )

  const boardSubmitPrompt = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      patchBoard({ prompt: t.slice(0, 400) })
    },
    [patchBoard]
  )

  const boardAnswerTrivia = useCallback(
    (idx: number) => {
      const b = stateRef.current?.board
      if (!b || !b.questionId || b.answerIndex != null) return
      const q = getQuestionById(b.questionId)
      patchBoard({ answerIndex: idx, answerCorrect: !!q && q.correctIndex === idx })
    },
    [patchBoard]
  )

  const setBoardMinigameSession = useCallback(
    (partial: Partial<Session>) => {
      const base = stateRef.current
      if (!base || !base.board || !base.board.minigame) return
      pushState({ ...base, board: { ...base.board, minigame: { ...base.board.minigame, ...partial } } })
    },
    [pushState]
  )

  const boardReport = useCallback(
    (partial: Partial<Omit<Progress, 'playerId' | 'at'>>) => {
      const rid = roomIdRef.current
      const b = stateRef.current?.board
      if (!rid || !b) return
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
      if (rid !== 'local') reportTodProgress(rid, b.mgRound, next).catch(() => {})
    },
    [playerId]
  )

  const boardContinue = useCallback(() => {
    const base = stateRef.current
    const b = base?.board
    if (!base || !b) return
    let positions = b.positions
    // Trivia bonus: a correct answer nudges you one tile forward.
    if (b.phase === 'trivia' && b.answerCorrect && b.answeredBy) {
      const last = b.tiles.length - 1
      const cur = positions[b.answeredBy] ?? 0
      positions = { ...positions, [b.answeredBy]: Math.min(cur + 1, last - 1) }
    }
    advanceRoll(b, positions)
  }, [advanceRoll])

  const restartBoard = useCallback(() => {
    const base = stateRef.current
    if (!base) return
    pushState({ ...initialTodState(), mode: base.mode, round: base.round })
  }, [pushState])

  // Host finalizes the board minigame and sends the loser into a dare forfeit.
  useEffect(() => {
    if (!isHost) return
    const base = stateRef.current
    const b = base?.board
    if (!base || !b || b.phase !== 'minigame' || !b.minigame || b.minigame.status !== 'live') return
    if (finalizingRef.current) return
    const gid = b.minigame.gameId
    if (!gid) return
    const config = getGameConfig(gid)
    const list = Object.values(progressRef.current)
    if (!isRoundComplete(config, playersRef.current, list, now, b.minigame.endAt)) return
    finalizingRef.current = true
    const loser = computeRaceLoser(config, playersRef.current, list)
    pushState({
      ...base,
      board: {
        ...b,
        minigame: { ...b.minigame, status: 'over' },
        phase: 'forfeit',
        loserId: loser?.id ?? null,
        loserName: loser?.name ?? null,
        onSpotId: loser?.id ?? null,
        askerId: loser ? pickAskerExcl(loser.id) : null,
        choice: 'dare',
        prompt: null,
      },
    }).finally(() => {
      finalizingRef.current = false
    })
  }, [now, isHost, pushState, pickAskerExcl])

  // Toggle your own break status (stepped away but still in the room).
  const toggleBreak = useCallback(async () => {
    const rid = roomIdRef.current
    if (!rid) return
    const current = playersRef.current.find((p) => p.id === playerId)
    const nextStatus = current?.status === 'break' ? 'active' : 'break'
    if (rid === 'local') {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, status: nextStatus } : p))
      )
      return
    }
    try {
      const data = await setTodPresence(rid, playerId, nextStatus)
      setPlayers(data.players)
    } catch (e) {
      console.warn('presence failed', e)
    }
  }, [playerId])

  const kickPlayer = useCallback(
    async (targetId: string) => {
      const rid = roomIdRef.current
      if (!rid) return
      if (rid === 'local') {
        setPlayers((prev) => prev.filter((p) => p.id !== targetId))
        return
      }
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

  const signalTyping = useCallback(
    (isTyping: boolean) => {
      const rid = roomIdRef.current
      if (!rid || rid === 'local') return
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
    if (rid && rid !== 'local') {
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

  function enterLocalLobby() {
    if (!playerName.trim()) {
      setError('Enter your name')
      return
    }
    setError('')
    try {
      localStorage.setItem(NAME_KEY, playerName.trim())
      localStorage.setItem(
        TOD_KEY,
        JSON.stringify({ roomId: 'local', entryMode: 'local' })
      )
    } catch {
      /* ignore */
    }
    const host: Player = { id: playerId, name: playerName.trim(), avatar }
    setRoomId('local')
    setGameCode(null)
    setHostId(playerId)
    setPlayers([host])
    setState(initialTodState())
  }

  function addLocalPlayer() {
    if (roomIdRef.current !== 'local') return
    const n = playersRef.current.length + 1
    setPlayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: `Player ${n}`, avatar: DEFAULT_BOARD_PIECE },
    ])
  }

  async function hostRoom(code?: string) {
    if (!playerName.trim()) {
      setError('Enter your name')
      return
    }
    const pwd = (code ?? createPassword).trim().toUpperCase()
    if (entryMode === 'create' && !pwd) {
      setError('Set a game password')
      return
    }
    if (pwd && !/^[A-Z0-9]{4,6}$/.test(pwd)) {
      setError('Password must be 4–6 letters or numbers')
      return
    }
    setError('')
    try {
      localStorage.setItem(NAME_KEY, playerName.trim())
      setRoomId(null)
      setGameCode(null)
      setHostId(null)
      setPlayers([])
      setState(null)
      const data = await createTodRoom(playerName.trim(), avatar, playerId, pwd || undefined)
      setRoomId(data.roomId)
      setGameCode(data.gameCode)
      setHostId(data.hostId)
      setPlayers(data.players)
      setState(initialTodState())
      localStorage.setItem(
        TOD_KEY,
        JSON.stringify({ roomId: data.roomId, gameCode: data.gameCode, entryMode })
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
      const data = await joinTodRoom(c, playerName.trim(), avatar, playerId)
      setRoomId(data.roomId)
      setGameCode(c)
      setHostId(data.hostId)
      setPlayers(data.players)
      if (isBoardTodState(data.state)) {
        setState(data.state)
      } else if (!data.state || isClassicTodState(data.state)) {
        setState(initialTodState())
      }
      localStorage.setItem(
        TOD_KEY,
        JSON.stringify({ roomId: data.roomId, gameCode: c, entryMode })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join')
    }
  }

  // On load: honor home-screen intent (?create=, ?code=, etc.) or restore a saved session.
  useEffect(() => {
    let cancelled = false

    function readUrlIntent():
      | { mode: 'local' }
      | { mode: 'join'; code: string }
      | { mode: 'create'; code: string }
      | null {
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get('classic') === '1') return null
        if (params.get('local') === '1') return { mode: 'local' }
        const joinCode = params.get('code')
        if (joinCode) return { mode: 'join', code: joinCode.trim().toUpperCase() }
        const createCode = params.get('create')
        if (createCode) return { mode: 'create', code: createCode.trim().toUpperCase() }
      } catch {
        /* ignore */
      }
      return null
    }

    async function init() {
      const urlIntent = readUrlIntent()

      if (urlIntent?.mode === 'create') {
        localStorage.removeItem(TOD_KEY)
        setEntryMode('create')
        setCreatePassword(urlIntent.code)
        setAvatar((prev) => (isBoardPiece(prev) ? prev : DEFAULT_BOARD_PIECE))
        return
      }

      if (urlIntent?.mode === 'join') {
        setEntryMode('join')
        setGameCodeInput(urlIntent.code)
        setAvatar((prev) => (isBoardPiece(prev) ? prev : DEFAULT_BOARD_PIECE))

        let savedJoin: { roomId?: string; gameCode?: string } | null = null
        try {
          const raw = localStorage.getItem(TOD_KEY)
          savedJoin = raw ? JSON.parse(raw) : null
        } catch {
          savedJoin = null
        }
        // Same password + refresh: slip back into the lobby. New join from home: setup first.
        if (savedJoin?.gameCode === urlIntent.code && savedJoin.roomId) {
          try {
            const data = await getTodRoomClient(savedJoin.roomId)
            if (cancelled) return
            const stillIn = (data.players || []).some((p) => p.id === playerId)
            if (stillIn) {
              setRoomId(data.roomId)
              setGameCode(data.gameCode)
              setHostId(data.hostId ?? null)
              setPlayers(data.players || [])
              if (isBoardTodState(data.state)) setState(data.state)
              setTodPresence(data.roomId, playerId, 'active').catch(() => {})
            }
          } catch {
            localStorage.removeItem(TOD_KEY)
          }
        } else {
          localStorage.removeItem(TOD_KEY)
        }
        return
      }

      if (urlIntent?.mode === 'local') {
        localStorage.removeItem(TOD_KEY)
        setEntryMode('local')
        setAvatar((prev) => (isBoardPiece(prev) ? prev : DEFAULT_BOARD_PIECE))
        return
      }

      let saved: { roomId?: string; gameCode?: string; entryMode?: string } | null = null
      try {
        const raw = localStorage.getItem(TOD_KEY)
        saved = raw ? JSON.parse(raw) : null
      } catch {
        saved = null
      }

      if (saved?.roomId === 'local' && saved.entryMode === 'local') {
        setEntryMode('local')
        setRoomId('local')
        setHostId(playerId)
        setGameCode(null)
        const name = playerName.trim() || 'Player'
        setPlayers([{ id: playerId, name, avatar }])
        setState(initialTodState())
        return
      }

      if (!saved) return
      if (saved.entryMode === 'classic') return
      if (saved.gameCode) setGameCodeInput((prev) => prev || saved!.gameCode!)
      if (saved.entryMode === 'join' || saved.entryMode === 'create') {
        setEntryMode(saved.entryMode)
      }
      if (!saved.roomId || saved.roomId === 'local') return
      try {
        const data = await getTodRoomClient(saved.roomId)
        if (cancelled) return
        const stillIn = (data.players || []).some((p) => p.id === playerId)
        if (!stillIn) return
        setRoomId(data.roomId)
        setGameCode(data.gameCode)
        setHostId(data.hostId ?? null)
        setPlayers(data.players || [])
        if (isBoardTodState(data.state)) {
          setState(data.state)
        }
        setTodPresence(data.roomId, playerId, 'active').catch(() => {})
      } catch {
        /* stay on the join screen */
      }
    }

    init()
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
    createPassword,
    setCreatePassword,
    entryMode,
    isLocal,
    roomId,
    gameCode,
    hostId,
    isHost,
    me,
    isOnBreak,
    players,
    state,
    typing,
    progress,
    now,
    error,
    isAvailable,
    signalTyping,
    hostRoom,
    enterLocalLobby,
    addLocalPlayer,
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
    // Board game
    startBoardGame,
    rollDice,
    boardPickChoice,
    boardSubmitPrompt,
    boardAnswerTrivia,
    boardContinue,
    boardReport,
    setBoardMinigameSession,
    restartBoard,
  }
}
