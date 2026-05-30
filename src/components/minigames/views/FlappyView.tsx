'use client'

import { useGameTick } from '../MinigameRouter'
import type { GameViewProps } from '@/lib/minigames/types'
import { flappyFlap, flappyTick } from '@/lib/minigames/flappy'
import { avatarEmoji } from '@/lib/avatars'

export function FlappyView({ state, players, playerId, pushState, isHost }: GameViewProps) {
  const birds = state.birds as Record<string, { y: number; alive: boolean; score: number }>
  const pipeX = state.pipeX as number
  const pipeTop = state.pipeTop as number
  const gap = state.pipeGap as number

  useGameTick(state.started && !state.winnerId && isHost, () => {
    pushState(flappyTick(state))
  }, 60)

  return (
    <div className="arcade-view">
      <div className="flappy-field" onClick={() => pushState(flappyFlap(state, playerId))}>
        <div className="flappy-pipe top" style={{ left: `${pipeX}%`, height: `${pipeTop}%` }} />
        <div className="flappy-pipe bot" style={{ left: `${pipeX}%`, top: `${pipeTop + gap}%` }} />
        {players.map((p) => {
          const b = birds[p.id]
          if (!b?.alive) return null
          return (
            <span key={p.id} className="flappy-bird" style={{ top: `${b.y}%` }}>
              {avatarEmoji(p.avatar)}
            </span>
          )
        })}
      </div>
      <p className="arcade-hint">Tap / click to flap · Score: {birds[playerId]?.score ?? 0}</p>
    </div>
  )
}
