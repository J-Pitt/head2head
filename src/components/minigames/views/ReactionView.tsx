'use client'

import { useGameTick } from '../MinigameRouter'
import type { GameViewProps } from '@/lib/minigames/types'
import { reactionClick, reactionTick } from '@/lib/minigames/reaction'

export function ReactionView({ state, players, playerId, pushState, isHost }: GameViewProps) {
  const phase = state.phase as string
  const clicks = state.clicks as Record<string, number>
  const scores = state.scores as Record<string, number>

  useGameTick(state.started && isHost, () => {
    pushState(reactionTick(state))
  }, 100)

  const bg =
    phase === 'go' ? 'go' : phase === 'ready' ? 'ready' : phase === 'early' ? 'early' : 'done'

  return (
    <div className="arcade-view">
      <button
        type="button"
        className={`reaction-pad ${bg}`}
        onClick={() => pushState(reactionClick(state, playerId))}
      >
        {phase === 'waiting' && 'Get ready…'}
        {phase === 'ready' && 'Wait for green…'}
        {phase === 'go' && 'TAP!'}
        {phase === 'early' && 'Too early!'}
        {phase === 'done' && 'Next round…'}
        {clicks[playerId] != null && clicks[playerId] >= 0 && `${clicks[playerId]} ms`}
      </button>
      <p className="arcade-hint">{players.map((p) => `${p.name}: ${scores[p.id] ?? 0}`).join(' · ')}</p>
    </div>
  )
}
