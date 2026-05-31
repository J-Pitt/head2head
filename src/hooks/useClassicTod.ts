'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_AVATAR } from '@/lib/avatars'
import {
  createTodRoom,
  getTodRoomClient,
  joinTodRoom,
  leaveTodRoom,
  setTodPresence,
  updateTodState,
} from '@/lib/tod/roomApi'
import { getTruthsForMode, getDaresForMode, pickRandomPrompt } from '@/lib/tod/classic/lists'
import type { ClassicListMode } from '@/lib/tod/classic/lists'
import { initialClassicTodState, isClassicTodState, type ClassicTodState } from '@/lib/tod/classic/types'
import type { Player } from '@/lib/types'

const POLL_MS = 2500
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

export type ClassicScreen =
  | 'title'
  | 'local-setup'
  | 'online-choice'
  | 'online-create'
  | 'online-join'
  | 'playing'

export function useClassicTod() {
  const [playerId] = useState(loadPlayerId)
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [screen, setScreen] = useState<ClassicScreen>('title')
  const [error, setError] = useState('')

  // Local pass-the-phone
  const [localNames, setLocalNames] = useState<string[]>(['', ''])
  const [numLocal, setNumLocal] = useState(2)
  const [localState, setLocalState] = useState<ClassicTodState | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Online room
  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [state, setState] = useState<ClassicTodState | null>(null)
  const [gameCodeInput, setGameCodeInput] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [listMode, setListMode] = useState<ClassicListMode>('sexy')

  const stateRef = useRef<ClassicTodState | null>(null)
  stateRef.current = state ?? localState

  const isOnline = !!roomId
  const isHost = !!hostId && hostId === playerId
  const activeState = isOnline ? state : localState
  const playing = activeState?.subPhase === 'playing'

  const pushState = useCallback(async (next: ClassicTodState) => {
    setState(next)
    if (roomId) {
      try {
        await updateTodState(roomId, next)
      } catch (e) {
        console.warn('classic sync failed', e)
      }
    }
  }, [roomId])

  // Poll online room
  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    async function poll() {
      try {
        const data = await getTodRoomClient(roomId!)
        if (cancelled) return
        setPlayers(data.players || [])
        setHostId(data.hostId ?? null)
        if (isClassicTodState(data.state)) {
          setState(data.state)
          if (data.state.prompt && data.state.chosenCategory) {
            setModalOpen(true)
          } else if (!data.state.prompt) {
            setModalOpen(false)
          }
        }
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

  // Skip auto-rejoin of board rooms on classic entry
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('classic') !== '1') return
      localStorage.removeItem(TOD_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  function currentSpotId(s: ClassicTodState): string | null {
    return s.turnOrder[s.turnIndex] ?? null
  }

  function spotName(id: string | null): string {
    if (!id) return 'Someone'
    if (!isOnline) return id
    return players.find((p) => p.id === id)?.name ?? 'Someone'
  }

  const myTurn = activeState
    ? isOnline
      ? currentSpotId(activeState) === playerId
      : true // local: anyone on device can tap for current name
    : false

  async function hostRoom(password?: string) {
    if (!playerName.trim()) {
      setError('Enter your name')
      return
    }
    setError('')
    try {
      localStorage.setItem(NAME_KEY, playerName.trim())
      const pwd = password?.trim().toUpperCase()
      const data = await createTodRoom(playerName.trim(), avatar, playerId, pwd || undefined)
      const classic = initialClassicTodState(listMode)
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
      const st = isClassicTodState(data.state) ? data.state : initialClassicTodState()
      setState(st)
      localStorage.setItem(
        TOD_KEY,
        JSON.stringify({ roomId: data.roomId, gameCode: c, entryMode: 'classic' })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join')
    }
  }

  function startLocalGame(mode: ClassicListMode) {
    const names = localNames.map((n, i) => n.trim() || `Player ${i + 1}`)
    const classic: ClassicTodState = {
      ...initialClassicTodState(mode),
      subPhase: 'playing',
      turnOrder: shuffle(names),
      turnIndex: 0,
    }
    setLocalState(classic)
  }

  async function startOnlineGame() {
    if (!isHost || players.length < 2) return
    const order = shuffle(players.filter((p) => p.status !== 'break').map((p) => p.id))
    const classic: ClassicTodState = {
      ...(state ?? initialClassicTodState()),
      subPhase: 'playing',
      turnOrder: order.length ? order : players.map((p) => p.id),
      turnIndex: 0,
      waitingForChoice: false,
      chosenCategory: null,
      prompt: null,
      onSpotId: null,
    }
    await pushState(classic)
    setModalOpen(false)
  }

  function beginTurn() {
    const s = stateRef.current
    if (!s || s.subPhase !== 'playing') return
    const onSpotId = currentSpotId(s)
    const next = { ...s, onSpotId, waitingForChoice: true, chosenCategory: null, prompt: null }
    if (isOnline) pushState(next)
    else setLocalState(next)
  }

  function pickChoice(choice: 'truth' | 'dare') {
    const s = stateRef.current
    if (!s || !s.waitingForChoice) return
    const pool = choice === 'truth' ? getTruthsForMode(s.listMode) : getDaresForMode(s.listMode)
    const used = choice === 'truth' ? s.usedTruths : s.usedDares
    const { text, idx } = pickRandomPrompt(pool, used)
    const next: ClassicTodState = {
      ...s,
      waitingForChoice: false,
      chosenCategory: choice,
      prompt: text,
      usedTruths: choice === 'truth' ? [...s.usedTruths, idx] : s.usedTruths,
      usedDares: choice === 'dare' ? [...s.usedDares, idx] : s.usedDares,
    }
    if (isOnline) pushState(next)
    else setLocalState(next)
    setModalOpen(true)
  }

  function closeModal() {
    const s = stateRef.current
    if (!s || !s.prompt) return
    setModalOpen(false)
    let nextIndex = (s.turnIndex + 1) % Math.max(s.turnOrder.length, 1)
    const next: ClassicTodState = {
      ...s,
      turnIndex: nextIndex,
      waitingForChoice: false,
      chosenCategory: null,
      prompt: null,
      onSpotId: null,
    }
    if (isOnline) pushState(next)
    else setLocalState(next)
  }

  async function leaveRoom() {
    if (roomId) {
      await leaveTodRoom(roomId, playerId).catch(() => {})
      setTodPresence(roomId, playerId, 'active').catch(() => {})
    }
    localStorage.removeItem(TOD_KEY)
    setRoomId(null)
    setGameCode(null)
    setState(null)
    setLocalState(null)
    setScreen('title')
    setModalOpen(false)
  }

  function resetGame() {
    setModalOpen(false)
    if (isOnline && isHost && state) {
      pushState({ ...initialClassicTodState(state.listMode), subPhase: 'lobby' })
      return
    }
    setLocalState(null)
    setScreen('title')
  }

  return {
    playerId,
    playerName,
    setPlayerName,
    avatar,
    setAvatar,
    screen,
    setScreen,
    error,
    localNames,
    setLocalNames,
    numLocal,
    setNumLocal,
    gameCodeInput,
    setGameCodeInput,
    createPassword,
    setCreatePassword,
    roomId,
    gameCode,
    isHost,
    isOnline,
    players,
    activeState,
    playing,
    modalOpen,
    myTurn,
    spotName,
    currentSpotId: activeState ? currentSpotId(activeState) : null,
    hostRoom,
    joinRoom,
    startLocalGame,
    startOnlineGame,
    beginTurn,
    pickChoice,
    closeModal,
    leaveRoom,
    resetGame,
    pushListMode: (mode: ClassicListMode) => {
      setListMode(mode)
      const s = stateRef.current
      if (!s) return
      const next = { ...s, listMode: mode }
      if (isOnline) pushState(next)
      else setLocalState(next)
    },
    listMode,
    setListMode,
  }
}
