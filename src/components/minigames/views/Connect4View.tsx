'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import { CONNECT4_COLS, connect4Drop } from '@/lib/minigames/connect4'

export function Connect4View({ state, players, playerId, pushState }: GameViewProps) {
  const board = state.board as string[][]
  const order = state.playerOrder as string[]
  const turn = state.turnIndex as number
  const current = order[turn % order.length]
  const colors = state.colors as Record<string, string>
  const isMyTurn = current === playerId

  return (
    <div className="arcade-view">
      <p className="arcade-hint">{isMyTurn ? 'Your turn — pick a column' : 'Waiting…'}</p>
      <div className="connect4-board">
        {board.map((row, ri) =>
          row.map((cell, ci) => (
            <div key={`${ri}-${ci}`} className={`connect4-cell ${cell === 'R' ? 'red' : cell === 'Y' ? 'yellow' : ''}`} />
          ))
        )}
      </div>
      <div className="connect4-cols">
        {Array.from({ length: CONNECT4_COLS }).map((_, col) => (
          <button
            key={col}
            type="button"
            className="btn btn-sm"
            disabled={!isMyTurn || !!state.winnerId}
            onClick={() => pushState(connect4Drop(state, playerId, col))}
          >
            ↓
          </button>
        ))}
      </div>
      <p className="arcade-hint">
        You are {colors[playerId] === 'R' ? '🔴' : '🟡'}
      </p>
    </div>
  )
}
