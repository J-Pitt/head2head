'use client'

import { useEffect } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import { memoryClearFlip, memoryFlip } from '@/lib/minigames/memory'

export function MemoryView({ state, players, playerId, pushState }: GameViewProps) {
  const cards = state.cards as string[]
  const flipped = state.flipped as number[]
  const matched = state.matched as number[]
  const order = state.playerOrder as string[]
  const turn = state.turnIndex as number
  const current = order[turn % order.length]
  const scores = state.scores as Record<string, number>
  const isMyTurn = current === playerId

  useEffect(() => {
    if (flipped.length !== 2) return
    const [a, b] = flipped
    if (cards[a] !== cards[b]) {
      const t = setTimeout(() => pushState(memoryClearFlip(state)), 700)
      return () => clearTimeout(t)
    }
  }, [flipped, cards, state, pushState])

  return (
    <div className="arcade-view">
      <p className="arcade-hint">{isMyTurn ? 'Your turn — pick two cards' : `Waiting for ${players.find((p) => p.id === current)?.name}`}</p>
      <div className="memory-grid">
        {cards.map((emoji, i) => {
          const show = matched.includes(i) || flipped.includes(i)
          return (
            <button
              key={i}
              type="button"
              className={`memory-card ${show ? 'open' : ''}`}
              disabled={!isMyTurn || matched.includes(i) || flipped.length >= 2}
              onClick={() => pushState(memoryFlip(state, playerId, i))}
            >
              {show ? emoji : '?'}
            </button>
          )
        })}
      </div>
      <p className="arcade-hint">{players.map((p) => `${p.name}: ${scores[p.id] ?? 0}`).join(' · ')}</p>
    </div>
  )
}
