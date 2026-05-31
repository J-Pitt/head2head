'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AvatarPicker from './AvatarPicker'
import { DEFAULT_AVATAR } from '@/lib/avatars'
import BuzzerPad from './BuzzerPad'
import CategoryPicker from './CategoryPicker'
import ChatBox from './ChatBox'
import GameTimer from './GameTimer'
import PlayerCircle from './PlayerCircle'
import JeopardyBoard from './JeopardyBoard'
import QuestionCard from './QuestionCard'
import LocalPlayerName from './LocalPlayerName'
import { getActiveQuestion, getClueById, isGameComplete, phaseDeadline } from '@/lib/trivia'
import { advanceRound, applyAnswer, applyBuzz, applyTimeout, selectClue, startNewGame } from '@/lib/gameLogic'
import { isActivePlayer } from '@/lib/players'
import {
  addRoomMessage,
  createRoom,
  getMultiplayerStatus,
  getRoom,
  joinRoom,
  leaveRoom,
  resolveGameCode,
  setPlayerPresence,
  updateRoomState,
} from '@/lib/roomApi'
import type { CategoryId, ChatMessage, GameMode, GameState, Player, RejoinSession } from '@/lib/types'
import { parseTriviaUrlSearch } from '@/lib/triviaUrl'

const POLL_MS = 2000
const SESSION_PLAYER_KEY = 'head2head_player_id'
const SESSION_REJOIN_KEY = 'head2head_rejoin'
const SESSION_NAME_KEY = 'head2head_player_name'

type Screen = 'home' | 'setup' | 'room'

function HomeQuickModeTile({
  className,
  icon,
  title,
  subtitle,
  selected,
  onSelect,
  pickPanel,
}: {
  className: string
  icon: string
  title: string
  subtitle: string
  selected: boolean
  onSelect: () => void
  pickPanel?: ReactNode
}) {
  return (
    <div className={`mode-card mode-card-hot ${className} ${selected ? 'selected' : ''}`}>
      <button type="button" className="mode-card-inner" onClick={onSelect}>
        <span className="mode-icon">{icon}</span>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </button>
      {selected && pickPanel && (
        <div className="mode-card-overlay" onClick={(e) => e.stopPropagation()}>
          {pickPanel}
        </div>
      )}
    </div>
  )
}

function HomeQuickPickPanel({
  title,
  onlineAction,
  joinCode,
  onPickJoin,
  onPickCreate,
  onJoinCodeChange,
  onJoinCodeBack,
  onCollapse,
  onJoinSubmit,
  overlay = false,
}: {
  title: string
  onlineAction: 'join' | null
  joinCode: string
  onPickJoin: () => void
  onPickCreate: () => void
  onJoinCodeChange: (value: string) => void
  onJoinCodeBack: () => void
  onCollapse: () => void
  onJoinSubmit: (code: string) => void
  overlay?: boolean
}) {
  const shellClass = overlay ? 'mode-card-overlay-inner' : 'home-quick-pick'

  function goBackFromJoin() {
    onJoinCodeBack()
    onJoinCodeChange('')
  }

  if (onlineAction === 'join') {
    return (
      <div className={shellClass}>
        <div className="home-quick-panel-head">
          <p className="home-online-label">{title} — join</p>
          <button type="button" className="btn-ghost home-back home-back-inline" onClick={goBackFromJoin}>
            ← Back
          </button>
        </div>
        <form
          className="home-online-form home-online-form-compact"
          onSubmit={(e) => {
            e.preventDefault()
            const code = joinCode.trim().toUpperCase()
            if (!code) return
            onJoinSubmit(code)
          }}
        >
          <input
            value={joinCode}
            onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
            placeholder="GAME CODE"
            maxLength={6}
            className="code-input home-pwd-input"
            autoFocus
          />
          <button
            type="submit"
            className="btn full home-cta home-cta-join"
            disabled={!joinCode.trim()}
          >
            Continue to join
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      {!overlay && <p className="home-online-label">{title}</p>}
      <button type="button" className="btn full home-cta home-cta-join" onClick={onPickJoin}>
        Join game
      </button>
      <button type="button" className="btn full home-cta home-cta-create" onClick={onPickCreate}>
        Start game
      </button>
      <button type="button" className="btn-ghost home-back" onClick={onCollapse}>
        ← Back
      </button>
    </div>
  )
}

function newPlayerId() {
  return crypto.randomUUID()
}

function loadPlayerId() {
  if (typeof window === 'undefined') return newPlayerId()
  try {
    let id = localStorage.getItem(SESSION_PLAYER_KEY)
    if (!id) {
      id = newPlayerId()
      localStorage.setItem(SESSION_PLAYER_KEY, id)
    }
    return id
  } catch {
    return newPlayerId()
  }
}

function loadSavedName() {
  try {
    return localStorage.getItem(SESSION_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function loadRejoinSession(): RejoinSession | null {
  try {
    const raw = localStorage.getItem(SESSION_REJOIN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as RejoinSession
  } catch {
    return null
  }
}

function saveRejoinSession(data: RejoinSession) {
  try {
    localStorage.setItem(SESSION_REJOIN_KEY, JSON.stringify(data))
  } catch {}
}

function clearRejoinSession() {
  try {
    localStorage.removeItem(SESSION_REJOIN_KEY)
  } catch {}
}

export default function GameApp() {
  const searchParams = useSearchParams()
  const triviaBoot = parseTriviaUrlSearch(`?${searchParams.toString()}`)
  const [screen, setScreen] = useState<Screen>(() => triviaBoot?.screen ?? 'home')
  const [mode, setMode] = useState<'local' | 'online' | null>(() => triviaBoot?.mode ?? null)
  const [multiplayerAvailable, setMultiplayerAvailable] = useState(false)
  const [pendingRejoin, setPendingRejoin] = useState<RejoinSession | null>(null)
  const [onBreak, setOnBreak] = useState(false)
  const [booting, setBooting] = useState(true)

  const [playerName, setPlayerName] = useState(loadSavedName)
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR)
  const [playerId] = useState(loadPlayerId)

  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([
    'science',
    'popculture',
    'general',
  ])
  const [gameMode, setGameMode] = useState<GameMode>('buzzer')

  const [gameCodeInput, setGameCodeInput] = useState(() => triviaBoot?.gameCodeInput ?? '')
  const [onlineOpen, setOnlineOpen] = useState(false)
  const [onlineAction, setOnlineAction] = useState<'join' | 'create' | null>(null)
  const [triviaOpen, setTriviaOpen] = useState(false)
  const [triviaJoinAction, setTriviaJoinAction] = useState(false)
  const [triviaJoinCode, setTriviaJoinCode] = useState('')
  const [classicOpen, setClassicOpen] = useState(false)
  const [classicJoinAction, setClassicJoinAction] = useState(false)
  const [classicJoinCode, setClassicJoinCode] = useState('')
  const [minigamesOpen, setMinigamesOpen] = useState(false)
  const [minigamesJoinAction, setMinigamesJoinAction] = useState(false)
  const [minigamesJoinCode, setMinigamesJoinCode] = useState('')
  const [onlineIntent, setOnlineIntent] = useState<'join' | 'create' | null>(
    () => triviaBoot?.onlineIntent ?? null
  )
  const [joinGameCode, setJoinGameCode] = useState('')
  const router = useRouter()

  useEffect(() => {
    const boot = parseTriviaUrlSearch(`?${searchParams.toString()}`)
    if (!boot) return
    setScreen(boot.screen)
    setMode(boot.mode)
    setOnlineIntent(boot.onlineIntent)
    setGameCodeInput(boot.gameCodeInput)
  }, [searchParams])

  function closeQuickModes() {
    setTriviaOpen(false)
    setTriviaJoinAction(false)
    setTriviaJoinCode('')
    setClassicOpen(false)
    setClassicJoinAction(false)
    setClassicJoinCode('')
    setMinigamesOpen(false)
    setMinigamesJoinAction(false)
    setMinigamesJoinCode('')
  }

  function openQuickMode(mode: 'trivia' | 'classic' | 'minigames') {
    const alreadyOpen =
      (mode === 'trivia' && triviaOpen) ||
      (mode === 'classic' && classicOpen) ||
      (mode === 'minigames' && minigamesOpen)
    if (alreadyOpen) {
      closeQuickModes()
      return
    }
    closeQuickModes()
    if (mode === 'trivia') setTriviaOpen(true)
    if (mode === 'classic') setClassicOpen(true)
    if (mode === 'minigames') setMinigamesOpen(true)
  }

  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState('')

  const [players, setPlayers] = useState<Player[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncingRef = useRef(false)

  type EnterRoomFn = (
    rid: string,
    code: string | null,
    plist: Player[],
    host: boolean,
    online: boolean,
    initialState?: GameState | null,
    initialMessages?: ChatMessage[]
  ) => void | Promise<void>

  const enterRoomRef = useRef<EnterRoomFn>(() => {})

  useEffect(() => {
    async function init() {
      const { available } = await getMultiplayerStatus()
      setMultiplayerAvailable(available)
      const saved = loadRejoinSession()
      if (saved && saved.roomId === 'local') {
        setBooting(false)
        return
      }
      if (saved && available) {
        try {
          const data = await getRoom(saved.roomId)
          const stillIn = (data.players || []).some((p) => p.id === playerId)
          if (stillIn) {
            setPlayerName(saved.playerName)
            setAvatar(saved.avatar)
            setGameCodeInput(saved.gameCode)
            const joinData = await joinRoom(
              saved.gameCode,
              saved.playerName,
              saved.avatar,
              playerId
            )
            const host = joinData.players[0]?.id === playerId
            enterRoomRef.current(
              saved.roomId,
              saved.gameCode,
              joinData.players,
              host,
              true,
              joinData.state,
              joinData.messages || []
            )
            setOnBreak(false)
            setBooting(false)
            return
          }
        } catch {
          clearRejoinSession()
        }
        if (saved) setPendingRejoin(saved)
      }
      setBooting(false)
    }
    init()
  }, [playerId])

  const me = players.find((p) => p.id === playerId)
  const myName = me?.name ?? playerName

  const syncStateOnline = useCallback(
    async (state: GameState) => {
      if (!roomId || mode !== 'online') return
      syncingRef.current = true
      try {
        await updateRoomState(roomId, state)
      } catch (e) {
        console.warn('Room sync failed', e)
      } finally {
        syncingRef.current = false
      }
    },
    [roomId, mode]
  )

  const pushState = useCallback(
    (state: GameState) => {
      setGameState(state)
      if (mode === 'online' && roomId) syncStateOnline(state)
    },
    [mode, roomId, syncStateOnline]
  )

  useEffect(() => {
    if (!roomId || mode !== 'online') return
    const pollRoomId = roomId

    async function tick() {
      if (syncingRef.current) return
      try {
        const data = await getRoom(pollRoomId)
        setPlayers(data.players || [])
        if (Array.isArray(data.messages)) setMessages(data.messages)
        if (data.state) {
          setGameState(data.state)
          const qPhase = data.state.phase
          if (qPhase === 'board' || qPhase === 'question' || qPhase === 'buzzing' || qPhase === 'answering') {
            setSelectedChoice(null)
          } else if (data.state.lastAnswer) {
            setSelectedChoice(
              data.state.lastAnswer.choiceIndex >= 0 ? data.state.lastAnswer.choiceIndex : null
            )
          }
        }
      } catch (e) {
        console.warn('Poll failed', e)
      }
    }

    tick()
    pollRef.current = setInterval(tick, POLL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [roomId, mode])

  const hostHandlesTimeouts = isHost && gameState?.gameStarted

  useEffect(() => {
    if (!hostHandlesTimeouts || !gameState) return
    const id = setInterval(() => {
      const next = applyTimeout(gameState, players)
      if (next !== gameState) {
        if (next.lastAnswer) {
          setSelectedChoice(next.lastAnswer.choiceIndex >= 0 ? next.lastAnswer.choiceIndex : null)
        }
        pushState(next)
      }
    }, 400)
    return () => clearInterval(id)
  }, [hostHandlesTimeouts, gameState, players, pushState])

  async function persistName(name: string) {
    try {
      localStorage.setItem(SESSION_NAME_KEY, name.trim())
    } catch {}
  }

  async function enterRoom(
    rid: string,
    code: string | null,
    plist: Player[],
    host: boolean,
    online: boolean,
    initialState: GameState | null = null,
    initialMessages: ChatMessage[] = []
  ) {
    setRoomId(rid)
    setGameCode(code)
    setPlayers(plist)
    setIsHost(host)
    setMode(online ? 'online' : 'local')
    setGameState(initialState)
    setMessages(initialMessages)
    setScreen('room')
    setOnBreak(false)
    setPendingRejoin(null)
    const name = playerName.trim() || plist.find((p) => p.id === playerId)?.name || 'Player'
    saveRejoinSession({
      roomId: rid,
      gameCode: code ?? '',
      playerName: name,
      avatar,
    })
  }

  useEffect(() => {
    enterRoomRef.current = enterRoom
  })

  async function startLocalGame() {
    if (!playerName.trim()) {
      setError('Enter your name')
      return
    }
    await persistName(playerName)
    const p: Player = { id: playerId, name: playerName.trim(), avatar }
    setGameMode('turns')
    await enterRoom('local', null, [p], true, false)
    setError('')
  }

  async function addLocalPlayer() {
    const name = prompt('Player name?')
    if (!name?.trim()) return
    const p: Player = { id: newPlayerId(), name: name.trim(), avatar: 'star' }
    setPlayers((prev) => [...prev, p])
  }

  function renameLocalPlayer(targetId: string, name: string) {
    if (mode !== 'local') return
    const trimmed = name.trim().slice(0, 24)
    if (!trimmed) return
    setPlayers((prev) => prev.map((p) => (p.id === targetId ? { ...p, name: trimmed } : p)))
  }

  async function hostOnline(code?: string) {
    if (!playerName.trim()) {
      setError('Enter your name')
      return
    }
    if (!multiplayerAvailable) {
      setError('Online play needs Redis configured')
      return
    }
    setError('')
    await persistName(playerName)
    try {
      const pwd = (code ?? gameCodeInput).trim().toUpperCase() || undefined
      const data = await createRoom(playerName.trim(), avatar, playerId, pwd)
      setGameMode('buzzer')
      await enterRoom(data.roomId, data.gameCode, data.players, true, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create room')
    }
  }

  async function joinOnline(code?: string) {
    const c = (code ?? gameCodeInput).trim().toUpperCase()
    if (!playerName.trim() || !c) {
      setError('Enter your name and game code')
      return
    }
    if (!multiplayerAvailable) {
      setError('Online play needs Redis configured')
      return
    }
    setError('')
    await persistName(playerName)
    try {
      const data = await joinRoom(c, playerName.trim(), avatar, playerId)
      const hostPlayer = data.players[0]
      const host = hostPlayer?.id === playerId
      await enterRoom(data.roomId, c, data.players, host, true, data.state, data.messages || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join room')
    }
  }

  async function rejoinSavedRoom(session?: RejoinSession) {
    const target = session ?? pendingRejoin
    if (!target) return
    setPlayerName(target.playerName)
    setAvatar(target.avatar)
    setGameCodeInput(target.gameCode)
    setError('')
    if (target.roomId === 'local') {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, status: 'active' as const } : p))
      )
      setRoomId('local')
      setMode('local')
      setScreen('room')
      setOnBreak(false)
      setPendingRejoin(null)
      return
    }
    try {
      const data = await joinRoom(target.gameCode, target.playerName, target.avatar, playerId)
      const host = data.players[0]?.id === playerId
      await enterRoom(
        target.roomId,
        target.gameCode,
        data.players,
        host,
        true,
        data.state,
        data.messages || []
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rejoin')
      clearRejoinSession()
      setPendingRejoin(null)
    }
  }

  function dismissRejoin() {
    const saved = loadRejoinSession()
    if (saved?.roomId && saved.roomId !== 'local') {
      leaveRoom(saved.roomId, playerId).catch(() => {})
    }
    clearRejoinSession()
    setPendingRejoin(null)
    setOnBreak(false)
  }

  function startGame() {
    if (selectedCategories.length === 0) {
      setError('Pick at least one category')
      return
    }
    const gm = mode === 'online' ? gameMode : 'turns'
    const state = startNewGame(players, selectedCategories, gm)
    setSelectedChoice(null)
    pushState(state)
  }

  const currentQ = gameState ? getActiveQuestion(gameState) : null
  const activeClue = gameState ? getClueById(gameState, gameState.activeClueId) : null

  const currentPlayer = gameState ? players[gameState.currentPlayerIndex] : null
  const buzzedPlayer = gameState?.buzzedBy
    ? players.find((p) => p.id === gameState.buzzedBy)
    : null
  const activePlayer =
    gameState?.gameMode === 'buzzer'
      ? buzzedPlayer ?? null
      : currentPlayer ?? null

  const imActive = me ? isActivePlayer(me) : true
  const isMyTurn =
    imActive &&
    gameState?.gameMode === 'turns' &&
    currentPlayer?.id === playerId &&
    isActivePlayer(currentPlayer)
  const canBuzz =
    imActive && gameState?.phase === 'buzzing' && !gameState.buzzedBy
  const canAnswer =
    gameState &&
    currentQ &&
    ((gameState.gameMode === 'turns' &&
      gameState.phase === 'question' &&
      (mode === 'local' || isMyTurn)) ||
      (gameState.gameMode === 'buzzer' &&
        gameState.phase === 'answering' &&
        gameState.buzzedBy === playerId))

  const canPickClue =
    gameState?.phase === 'board' &&
    (mode === 'local' ||
      (!!currentPlayer &&
        currentPlayer.id === playerId &&
        imActive &&
        isActivePlayer(currentPlayer)))

  function handleSelectClue(clueId: string) {
    if (!gameState || !canPickClue) return
    const next = selectClue(gameState, clueId, players)
    if (next === gameState) return
    setSelectedChoice(null)
    pushState(next)
  }

  function handleBuzz() {
    if (!gameState || gameState.phase !== 'buzzing') return
    if (mode === 'online' && gameState.buzzedBy) return
    const next = applyBuzz(gameState, playerId, players)
    if (next === gameState) return
    setSelectedChoice(null)
    pushState(next)
  }

  function handleAnswer(choiceIndex: number) {
    if (!gameState || !currentQ) return
    const answererId =
      gameState.gameMode === 'buzzer' ? gameState.buzzedBy : currentPlayer?.id
    if (!answererId) return
    if (gameState.gameMode === 'buzzer' && gameState.phase !== 'answering') return
    if (gameState.gameMode === 'turns' && gameState.phase !== 'question') return
    if (mode === 'online' && answererId !== playerId) return

    setSelectedChoice(choiceIndex)
    const next = applyAnswer(gameState, answererId, choiceIndex, currentQ.correctIndex)
    pushState(next)
  }

  function advanceAfterReveal() {
    if (!gameState) return
    if (mode === 'online' && !isHost) return
    const next = advanceRound(gameState, players)
    if (!next) return
    setSelectedChoice(null)
    pushState(next)
  }

  async function sendChat(text: string) {
    if (mode === 'online' && roomId) {
      const msgs = await addRoomMessage(roomId, myName, text)
      setMessages(msgs)
    } else {
      setMessages((m) => [...m, { playerName: myName, text, ts: Date.now() }])
    }
  }

  async function takeBreak() {
    const saved = loadRejoinSession()
    if (mode === 'online' && roomId) {
      try {
        const { players: plist, state } = await setPlayerPresence(roomId, playerId, 'break')
        setPlayers(plist)
        if (state) setGameState(state)
      } catch (e) {
        console.warn('Break failed', e)
      }
      if (pollRef.current) clearInterval(pollRef.current)
    } else if (mode === 'local') {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, status: 'break' as const } : p))
      )
    }
    setRoomId(null)
    setScreen('home')
    setOnBreak(true)
    if (saved) setPendingRejoin(saved)
  }

  async function leaveGame() {
    if (roomId && mode === 'online') {
      try {
        await leaveRoom(roomId, playerId)
      } catch {}
    }
    if (pollRef.current) clearInterval(pollRef.current)
    clearRejoinSession()
    setPendingRejoin(null)
    setOnBreak(false)
    setScreen('home')
    setMode(null)
    setRoomId(null)
    setGameCode(null)
    setPlayers([])
    setGameState(null)
    setMessages([])
    setIsHost(false)
  }

  const gameOver = !!(gameState && isGameComplete(gameState))

  const isLastClueOfRound =
    !!gameState?.activeClueId &&
    gameState.usedClueIds.length + 1 >= gameState.clues.length

  const isGameEndingReveal = isLastClueOfRound && gameState?.jeopardyRound === 'double'
  const isDoubleJeopardyReveal = isLastClueOfRound && gameState?.jeopardyRound === 'single'

  const timerActive =
    gameState?.gameStarted &&
    !gameOver &&
    (gameState.phase === 'buzzing' ||
      gameState.phase === 'answering' ||
      gameState.phase === 'question')
  const sortedScores = [...players].sort(
    (a, b) => (gameState?.scores[b.id] ?? 0) - (gameState?.scores[a.id] ?? 0)
  )

  if (booting) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <h1 className="logo">Head2Head</h1>
          <p className="tagline">Loading…</p>
        </header>
      </div>
    )
  }

  if (screen === 'home') {
    return (
      <div className="app-shell tod-home">
        <div className="tod-home-bg" aria-hidden="true">
          <span className="tod-glow tod-glow-rose" />
          <span className="tod-glow tod-glow-violet" />
        </div>

        <div className="tod-home-content">
          <header className="app-header tod-home-header">
            <span className="tod-badge">Party game · 18+</span>
            <h1 className="tod-logo tod-logo-stacked">
              <span className="tod-logo-main">
                Trivia <span className="tod-logo-or">or</span> Dare
              </span>
              <span className="tod-logo-sub">The Board Game</span>
            </h1>
            <p className="tod-tagline">
              Think quick. Dare harder. Finish first.
            </p>
          </header>

        {(pendingRejoin || onBreak) && (
          <section className="card rejoin-card">
            {onBreak ? (
              <p>
                You&apos;re on a break. Your spot in room{' '}
                <strong>{pendingRejoin?.gameCode || gameCode}</strong> is saved.
              </p>
            ) : (
              <p>
                Welcome back! Rejoin room <strong>{pendingRejoin?.gameCode}</strong> as{' '}
                <strong>{pendingRejoin?.playerName}</strong>?
              </p>
            )}
            <p className="rejoin-hint">
              Refreshed or closed the tab? Same device — just tap Rejoin. No need to enter the code
              again.
            </p>
            <div className="rejoin-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => pendingRejoin && rejoinSavedRoom(pendingRejoin)}
              >
                Rejoin game
              </button>
              <button type="button" className="btn" onClick={dismissRejoin}>
                Leave for good
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </section>
        )}

        <section className="card tod-home-actions tod-glass">
          {!onlineOpen ? (
            <div className="home-play-pick">
              <Link href="/truth-or-dare?local=1" className="btn full home-cta home-cta-local">
                PLAY LOCALLY
              </Link>
              <button
                type="button"
                className="btn full home-cta home-cta-online"
                onClick={() => setOnlineOpen(true)}
              >
                PLAY ONLINE
              </button>
            </div>
          ) : !onlineAction ? (
            <div className="home-online-pick">
              <p className="home-online-label">Play online</p>
              <button
                type="button"
                className="btn full home-cta home-cta-join"
                onClick={() => setOnlineAction('join')}
              >
                Join game
              </button>
              <button
                type="button"
                className="btn full home-cta home-cta-create"
                onClick={() => router.push('/truth-or-dare?host=1')}
              >
                Start game
              </button>
              <button
                type="button"
                className="btn-ghost home-back"
                onClick={() => setOnlineOpen(false)}
              >
                ← Back
              </button>
            </div>
          ) : (
            <form
              className="home-online-form"
              onSubmit={async (e) => {
                e.preventDefault()
                const code = joinGameCode.trim().toUpperCase()
                if (!code) return
                const resolved = await resolveGameCode(code)
                router.push(resolved?.joinPath ?? `/truth-or-dare?code=${encodeURIComponent(code)}`)
              }}
            >
              <p className="home-online-label">Enter the game code</p>
              <input
                value={joinGameCode}
                onChange={(e) => setJoinGameCode(e.target.value.toUpperCase())}
                placeholder="GAME CODE"
                maxLength={6}
                className="code-input home-pwd-input"
                autoFocus
              />
              <button
                type="submit"
                className="btn full home-cta home-cta-join"
                disabled={!joinGameCode.trim()}
              >
                Continue to join
              </button>
              <button
                type="button"
                className="btn-ghost home-back"
                onClick={() => {
                  setOnlineAction(null)
                  setJoinGameCode('')
                }}
              >
                ← Back
              </button>
            </form>
          )}
        </section>

        <p className="home-divider">Also try</p>

        <section className="card hero-card tod-glass home-quick-card">
          <div className="mode-grid three">
            <HomeQuickModeTile
              className="mode-trivia"
              icon="🧠"
              title="Trivia"
              subtitle="Jeopardy-style · 6 categories"
              selected={triviaOpen}
              onSelect={() => openQuickMode('trivia')}
              pickPanel={
                triviaOpen ? (
                  <HomeQuickPickPanel
                    overlay
                    title="Trivia"
                    onlineAction={triviaJoinAction ? 'join' : null}
                    joinCode={triviaJoinCode}
                    onPickJoin={() => setTriviaJoinAction(true)}
                    onPickCreate={() => {
                      setMode('online')
                      setGameCodeInput('')
                      setOnlineIntent('create')
                      setScreen('setup')
                      closeQuickModes()
                    }}
                    onJoinCodeChange={setTriviaJoinCode}
                    onJoinCodeBack={() => setTriviaJoinAction(false)}
                    onCollapse={closeQuickModes}
                    onJoinSubmit={(code) => {
                      setMode('online')
                      setGameCodeInput(code)
                      setOnlineIntent('join')
                      setScreen('setup')
                      closeQuickModes()
                    }}
                  />
                ) : undefined
              }
            />
            <HomeQuickModeTile
              className="mode-tod"
              icon="💋"
              title="Classic ToD"
              subtitle="Turns · PG or NSFW · picture dares"
              selected={classicOpen}
              onSelect={() => openQuickMode('classic')}
              pickPanel={
                classicOpen ? (
                  <HomeQuickPickPanel
                    overlay
                    title="Classic ToD"
                    onlineAction={classicJoinAction ? 'join' : null}
                    joinCode={classicJoinCode}
                    onPickJoin={() => setClassicJoinAction(true)}
                    onPickCreate={() => {
                      closeQuickModes()
                      router.push('/truth-or-dare?classic=1&host=1')
                    }}
                    onJoinCodeChange={setClassicJoinCode}
                    onJoinCodeBack={() => setClassicJoinAction(false)}
                    onCollapse={closeQuickModes}
                    onJoinSubmit={(code) => {
                      closeQuickModes()
                      router.push(`/truth-or-dare?classic=1&code=${encodeURIComponent(code)}`)
                    }}
                  />
                ) : undefined
              }
            />
            <HomeQuickModeTile
              className="mode-minigames"
              icon="🎮"
              title="Mini games"
              subtitle="Frogger, Snake & more"
              selected={minigamesOpen}
              onSelect={() => openQuickMode('minigames')}
              pickPanel={
                minigamesOpen ? (
                  <HomeQuickPickPanel
                    overlay
                    title="Mini games"
                    onlineAction={minigamesJoinAction ? 'join' : null}
                    joinCode={minigamesJoinCode}
                    onPickJoin={() => setMinigamesJoinAction(true)}
                    onPickCreate={() => {
                      closeQuickModes()
                      router.push('/minigames?host=1')
                    }}
                    onJoinCodeChange={setMinigamesJoinCode}
                    onJoinCodeBack={() => setMinigamesJoinAction(false)}
                    onCollapse={closeQuickModes}
                    onJoinSubmit={(code) => {
                      closeQuickModes()
                      router.push(`/minigames?code=${encodeURIComponent(code)}`)
                    }}
                  />
                ) : undefined
              }
            />
          </div>
        </section>
        </div>
      </div>
    )
  }

  if (screen === 'setup') {
    const setupTitle =
      mode === 'local'
        ? 'Trivia — local'
        : onlineIntent === 'join'
          ? 'Trivia — join room'
          : onlineIntent === 'create'
            ? 'Trivia — host room'
            : 'Trivia — online'

    return (
      <div className="app-shell">
        <header className="app-header compact">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setScreen('home')
              setOnlineIntent(null)
            }}
          >
            ← Back
          </button>
          <h1>{setupTitle}</h1>
        </header>

        <section className="card setup-card">
          {mode === 'online' && onlineIntent === 'join' && gameCodeInput && (
            <p className="setup-code-hint">
              Room code: <strong className="room-code-display">{gameCodeInput}</strong>
            </p>
          )}

          <label className="field">
            <span>Your name</span>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Alex"
              maxLength={24}
              autoFocus
            />
          </label>

          <AvatarPicker selected={avatar} onSelect={setAvatar} />

          {mode === 'online' && (
            <>
              <div className="mode-toggle">
                <p className="label">Online style</p>
                <div className="toggle-row">
                  <button
                    type="button"
                    className={`toggle-btn ${gameMode === 'buzzer' ? 'on' : ''}`}
                    onClick={() => setGameMode('buzzer')}
                  >
                    ⚡ Buzzer
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${gameMode === 'turns' ? 'on' : ''}`}
                    onClick={() => setGameMode('turns')}
                  >
                    🔄 Turns
                  </button>
                </div>
              </div>

              {onlineIntent === 'create' ? (
                <button type="button" className="btn btn-primary full" onClick={() => hostOnline()}>
                  Create room &amp; enter lobby
                </button>
              ) : onlineIntent === 'join' && gameCodeInput ? (
                <button type="button" className="btn btn-primary full" onClick={() => joinOnline(gameCodeInput)}>
                  Join room
                </button>
              ) : (
                <div className="online-actions">
                  <button type="button" className="btn btn-primary" onClick={() => hostOnline()}>
                    Host new room
                  </button>
                  <div className="join-row">
                    <input
                      value={gameCodeInput}
                      onChange={(e) => setGameCodeInput(e.target.value.toUpperCase())}
                      placeholder="GAME CODE"
                      maxLength={6}
                      className="code-input"
                    />
                    <button type="button" className="btn" onClick={() => joinOnline()}>
                      Join
                    </button>
                  </div>
                </div>
              )}

              {!multiplayerAvailable && (
                <p className="error">Online trivia needs Redis configured on the server.</p>
              )}
            </>
          )}

          {mode === 'local' && (
            <button type="button" className="btn btn-primary full" onClick={startLocalGame}>
              Start local game
            </button>
          )}

          {error && <p className="error">{error}</p>}
        </section>
      </div>
    )
  }

  return (
    <div className="app-shell room-shell">
      <header className="room-bar">
        <div>
          <span className="logo-sm">Head2Head</span>
          {gameCode && <span className="room-code">Code: {gameCode}</span>}
          {mode === 'local' && <span className="room-code">Local</span>}
          {gameState?.gameMode && (
            <span className="room-code">
              {gameState.gameMode === 'buzzer' ? 'Buzzer' : 'Turns'}
            </span>
          )}
        </div>
        <div className="room-actions">
          {mode === 'local' && !gameState?.gameStarted && (
            <button type="button" className="btn btn-sm" onClick={addLocalPlayer}>
              + Player
            </button>
          )}
          {!gameState?.gameStarted && isHost && players.length > 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={startGame}>
              Start game
            </button>
          )}
          <div className="room-menu">
            <button type="button" className="btn btn-sm" onClick={takeBreak} title="Step away — you can rejoin later">
              Take a break
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={leaveGame} title="Leave the room completely">
              Leave room
            </button>
          </div>
        </div>
      </header>

      <div className="room-layout">
        <main className="arena">
          {players.length > 0 && (
            <PlayerCircle
              players={players}
              currentIndex={gameState?.currentPlayerIndex ?? 0}
              myPlayerId={playerId}
              buzzedPlayerId={gameState?.buzzedBy ?? undefined}
            />
          )}

          <div className="arena-center">
            {!gameState?.gameStarted && isHost && (
              <div className="lobby-settings">
                <CategoryPicker
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                />
                {mode === 'online' && (
                  <div className="mode-toggle compact">
                    <p className="label">Style</p>
                    <div className="toggle-row">
                      <button
                        type="button"
                        className={`toggle-btn ${gameMode === 'buzzer' ? 'on' : ''}`}
                        onClick={() => setGameMode('buzzer')}
                      >
                        Buzzer
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${gameMode === 'turns' ? 'on' : ''}`}
                        onClick={() => setGameMode('turns')}
                      >
                        Turns
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!gameState?.gameStarted && (
              <div className="lobby-center">
                <p>Waiting for players…</p>
                <p className="lobby-sub">
                  {isHost
                    ? 'Pick categories, share the code, then Start game'
                    : 'Host will start when everyone is in'}
                </p>
                <ul className="lobby-players">
                  {players.map((p) => (
                    <li key={p.id}>
                      <LocalPlayerName
                        name={p.name}
                        editable={mode === 'local' && p.id !== playerId}
                        onRename={(name) => renameLocalPlayer(p.id, name)}
                      />
                      {p.id === playerId ? ' (you)' : ''}
                      {p.status === 'break' ? ' — on break' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {gameState?.gameStarted && gameOver && (
              <div className="question-card game-over">
                <h2>Game over</h2>
                <ol className="scoreboard">
                  {sortedScores.map((p, i) => (
                    <li key={p.id}>
                      #{i + 1} {p.name} — ${gameState.scores[p.id] ?? 0}
                    </li>
                  ))}
                </ol>
                {isHost && (
                  <button type="button" className="btn btn-primary" onClick={startGame}>
                    Play again
                  </button>
                )}
              </div>
            )}

            {gameState?.gameStarted && !gameOver && gameState.phase === 'board' && (
              <JeopardyBoard
                state={gameState}
                pickerName={currentPlayer?.name ?? null}
                canPick={canPickClue}
                onSelect={handleSelectClue}
              />
            )}

            {gameState?.gameStarted && !gameOver && gameState.phase !== 'board' && currentQ && (
              <>
                {timerActive && gameState && (
                  <GameTimer
                    deadline={phaseDeadline(gameState)}
                    label={
                      gameState.phase === 'buzzing'
                        ? 'Buzz window'
                        : gameState.phase === 'answering'
                          ? 'Answer'
                          : 'Your turn'
                    }
                    active={timerActive}
                    onExpire={
                      hostHandlesTimeouts
                        ? () => {
                            const next = applyTimeout(gameState, players)
                            if (next !== gameState) {
                              if (next.lastAnswer) {
                                setSelectedChoice(
                                  next.lastAnswer.choiceIndex >= 0
                                    ? next.lastAnswer.choiceIndex
                                    : null
                                )
                              }
                              pushState(next)
                            }
                          }
                        : undefined
                    }
                  />
                )}

                {gameState.phase === 'buzzing' && (
                  <BuzzerPad
                    onBuzz={handleBuzz}
                    disabled={!canBuzz || (mode === 'online' && !!gameState.buzzedBy)}
                    locked={!!gameState.buzzedBy}
                    buzzedByName={buzzedPlayer?.name ?? null}
                  />
                )}

                <QuestionCard
                  question={currentQ}
                  phase={gameState.phase}
                  value={activeClue?.value}
                  correctIndex={currentQ.correctIndex}
                  selectedIndex={selectedChoice}
                  onSelect={handleAnswer}
                  disabled={!canAnswer}
                  currentPlayerName={activePlayer?.name}
                  subtitle={
                    gameState.phase === 'buzzing'
                      ? 'First buzz wins the question'
                      : gameState.gameMode === 'buzzer' && activePlayer
                        ? `${activePlayer.name} — answer now`
                        : undefined
                  }
                />

                {gameState.phase === 'reveal' && (mode === 'local' || isHost) && (
                  <button type="button" className="btn btn-primary next-btn" onClick={advanceAfterReveal}>
                    {isGameEndingReveal
                      ? 'Final scores →'
                      : isDoubleJeopardyReveal
                        ? 'Double Jeopardy →'
                        : 'Back to board →'}
                  </button>
                )}
                {gameState.phase === 'reveal' && mode === 'online' && !isHost && (
                  <p className="wait-host">Waiting for host to continue…</p>
                )}
              </>
            )}
          </div>
        </main>

        {mode === 'online' && (
          <aside className="room-sidebar">
            <ChatBox messages={messages} senderName={myName} onSend={sendChat} />
          </aside>
        )}
      </div>
    </div>
  )
}
