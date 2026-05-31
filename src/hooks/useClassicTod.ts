'use client'

import { useRef, useState } from 'react'
import { DEFAULT_AVATAR } from '@/lib/avatars'
import { getTruthsForMode, getDaresForMode, pickRandomPrompt } from '@/lib/tod/classic/lists'
import type { ClassicListMode } from '@/lib/tod/classic/lists'
import { initialClassicTodState, type ClassicTodState } from '@/lib/tod/classic/types'

const NAME_KEY = 'head2head_player_name'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useClassicTod() {
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [avatar] = useState(DEFAULT_AVATAR)
  const [error, setError] = useState('')
  const [localState, setLocalState] = useState<ClassicTodState | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [listMode, setListMode] = useState<ClassicListMode>('sexy')

  const stateRef = useRef<ClassicTodState | null>(null)
  stateRef.current = localState

  function currentSpotId(s: ClassicTodState): string | null {
    return s.turnOrder[s.turnIndex] ?? null
  }

  function spotName(id: string | null): string {
    return id ?? 'Someone'
  }

  function startGame() {
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
    const classic: ClassicTodState = {
      ...initialClassicTodState(listMode),
      subPhase: 'playing',
      turnOrder: shuffle([name]),
      turnIndex: 0,
    }
    setLocalState(classic)
    setModalOpen(false)
  }

  function beginTurn() {
    const s = stateRef.current
    if (!s || s.subPhase !== 'playing') return
    const onSpotId = currentSpotId(s)
    setLocalState({ ...s, onSpotId, waitingForChoice: true, chosenCategory: null, prompt: null })
  }

  function pickChoice(choice: 'truth' | 'dare') {
    const s = stateRef.current
    if (!s || !s.waitingForChoice) return
    const pool = choice === 'truth' ? getTruthsForMode(s.listMode) : getDaresForMode(s.listMode)
    const used = choice === 'truth' ? s.usedTruths : s.usedDares
    const { text, idx } = pickRandomPrompt(pool, used)
    setLocalState({
      ...s,
      waitingForChoice: false,
      chosenCategory: choice,
      prompt: text,
      usedTruths: choice === 'truth' ? [...s.usedTruths, idx] : s.usedTruths,
      usedDares: choice === 'dare' ? [...s.usedDares, idx] : s.usedDares,
    })
    setModalOpen(true)
  }

  function closeModal() {
    const s = stateRef.current
    if (!s || !s.prompt) return
    setModalOpen(false)
    const nextIndex = (s.turnIndex + 1) % Math.max(s.turnOrder.length, 1)
    setLocalState({
      ...s,
      turnIndex: nextIndex,
      waitingForChoice: false,
      chosenCategory: null,
      prompt: null,
      onSpotId: null,
    })
  }

  function leaveGame() {
    setLocalState(null)
    setModalOpen(false)
  }

  function resetGame() {
    setModalOpen(false)
    setLocalState(null)
  }

  return {
    playerName,
    setPlayerName,
    avatar,
    error,
    activeState: localState,
    modalOpen,
    spotName,
    currentSpotId: localState ? currentSpotId(localState) : null,
    startGame,
    beginTurn,
    pickChoice,
    closeModal,
    leaveGame,
    resetGame,
    listMode,
    setListMode,
  }
}
