'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AvatarPicker from './AvatarPicker'
import { DEFAULT_AVATAR } from '@/lib/avatars'
import BuzzerPad from './BuzzerPad'
import CategoryPicker from './CategoryPicker'
import ChatBox from './ChatBox'
import GameTimer from './GameTimer'
import PlayerCircle from './PlayerCircle'
import QuestionCard from './QuestionCard'
import { getQuestionById, phaseDeadline } from '@/lib/trivia'
import { advanceRound, applyAnswer, applyBuzz, applyTimeout, startNewGame } from '@/lib/gameLogic'
import { isActivePlayer } from '@/lib/players'
import {
  addRoomMessage,
  createRoom,
  getMultiplayerStatus,
  getRoom,
  joinRoom,
  leaveRoom,
  setPlayerPresence,
  updateRoomState,
} from '@/lib/roomApi'
import type { CategoryId, ChatMessage, GameMode, GameState, Player, RejoinSession } from '@/lib/types'

const POLL_MS = 2000
const SESSION_PLAYER_KEY = 'head2head_player_id'
const SESSION_REJOIN_KEY = 'head2head_rejoin'
const SESSION_NAME_KEY = 'head2head_player_name'

type Screen = 'home' | 'setup' | 'room'

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
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<'local' | 'online' | null>(null)
  const [multiplayerAvailable, setMultiplayerAvailable] = useState(false)
  const [pendingRejoin, setPendingRejoin] = useState<RejoinSession | null>(null)
  const [onBreak, setOnBreak] = useState(false)
  const [booting, setBooting] = useState(true)

  const [playerName, setPlayerName] = useState(loadSavedName)
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR)
  const [playerId] = useState(loadPlayerId)

  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>(['science', 'nineties'])
  const [gameMode, setGameMode] = useState<GameMode>('buzzer')

  const [gameCodeInput, setGameCodeInput] = useState('')
  const [onlineOpen, setOnlineOpen] = useState(false)
  const [onlineAction, setOnlineAction] = useState<'join' | 'create' | null>(null)
  const [roomPassword, setRoomPassword] = useState('')
  const router = useRouter()
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

  const enterRoomRef = useRef<
    (
      rid: string,
      code: string | null,
      plist: Player[],
      host: boolean,
      online: boolean,
      initialState?: GameState | null,
      initialMessages?: ChatMessage[]
    ) => void
  >(() => {})

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
          if (qPhase === 'question' || qPhase === 'buzzing' || qPhase === 'answering') {
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

  enterRoomRef.current = enterRoom

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

  async function hostOnline() {
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
      const data = await createRoom(playerName.trim(), avatar, playerId)
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

  const currentQ =
    gameState && gameState.questionIds[gameState.questionIndex]
      ? getQuestionById(gameState.questionIds[gameState.questionIndex])
      : null

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

  const gameOver = !!(gameState && gameState.questionIndex >= gameState.questionIds.length)

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
          <span className="tod-orb tod-orb-1" />
          <span className="tod-orb tod-orb-2" />
          <span className="tod-orb tod-orb-3" />
          <span className="tod-float tod-float-1">💋</span>
          <span className="tod-float tod-float-2">🔥</span>
          <span className="tod-float tod-float-3">😈</span>
          <span className="tod-float tod-float-4">💕</span>
          <span className="tod-float tod-float-5">🌶️</span>
        </div>

        <div className="tod-home-content">
          <header className="app-header tod-home-header">
            <span className="tod-badge">Spicy · 18+ only</span>
            <h1 className="tod-logo">
              Truth <span className="tod-logo-or">or</span> Dare
            </h1>
            <p className="tod-tagline">
              Truths get personal. Dares get wild. Nobody leaves innocent. 🔥
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
                🎲 Board game locally
              </Link>
              <button
                type="button"
                className="btn full home-cta home-cta-online"
                onClick={() => setOnlineOpen(true)}
              >
                🌐 Play online
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
                🔑 Join a game
              </button>
              <button
                type="button"
                className="btn full home-cta home-cta-create"
                onClick={() => setOnlineAction('create')}
              >
                ✨ Create a game
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
              onSubmit={(e) => {
                e.preventDefault()
                const pwd = roomPassword.trim().toUpperCase()
                if (!pwd) return
                if (onlineAction === 'join') {
                  router.push(`/truth-or-dare?code=${encodeURIComponent(pwd)}`)
                } else {
                  router.push(`/truth-or-dare?create=${encodeURIComponent(pwd)}`)
                }
              }}
            >
              <p className="home-online-label">
                {onlineAction === 'join' ? 'Enter password to join' : 'Set a game password'}
              </p>
              <input
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value.toUpperCase())}
                placeholder={onlineAction === 'join' ? 'GAME PASSWORD' : 'CHOOSE PASSWORD'}
                maxLength={6}
                className="code-input home-pwd-input"
                autoFocus
              />
              <button
                type="submit"
                className={`btn full home-cta ${onlineAction === 'join' ? 'home-cta-join' : 'home-cta-create'}`}
                disabled={!roomPassword.trim()}
              >
                {onlineAction === 'join' ? 'Join game' : 'Create game'}
              </button>
              <button
                type="button"
                className="btn-ghost home-back"
                onClick={() => {
                  setOnlineAction(null)
                  setRoomPassword('')
                }}
              >
                ← Back
              </button>
            </form>
          )}
        </section>

        <p className="home-divider">or jump straight into one</p>

        <section className="card hero-card tod-glass home-quick-card">
          <div className="mode-grid three">
            <button
              type="button"
              className="mode-card mode-card-hot mode-trivia"
              onClick={() => {
                setMode('local')
                setScreen('setup')
              }}
            >
              <span className="mode-icon">🧠</span>
              <strong>Trivia</strong>
              <span>Science & 90s pop</span>
            </button>
            <Link href="/minigames" className="mode-card mode-card-link mode-card-hot mode-minigames">
              <span className="mode-icon">🎮</span>
              <strong>Mini games</strong>
              <span>Frogger, Snake &amp; more</span>
            </Link>
            <Link href="/truth-or-dare?classic=1" className="mode-card mode-card-link mode-card-hot mode-tod">
              <span className="mode-icon">💋</span>
              <strong>Classic ToD</strong>
              <span>Turns &amp; picture time · 18+</span>
            </Link>
          </div>
        </section>
        </div>
      </div>
    )
  }

  if (screen === 'setup') {
    return (
      <div className="app-shell">
        <header className="app-header compact">
          <button type="button" className="btn-ghost" onClick={() => setScreen('home')}>
            ← Back
          </button>
          <h1>{mode === 'local' ? 'Local game' : 'Join or host'}</h1>
        </header>

        <section className="card setup-card">
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
              <div className="online-actions">
                <button type="button" className="btn btn-primary" onClick={hostOnline}>
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
                      {p.name} {p.id === playerId ? '(you)' : ''}
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
                      #{i + 1} {p.name} — {gameState.scores[p.id] ?? 0}
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

            {gameState?.gameStarted && !gameOver && currentQ && (
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
                    Next question →
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
