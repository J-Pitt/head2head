'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import { tetrisDrop, tetrisMove } from '@/lib/minigames/tetris'

export function TetrisView({ state, playerId, pushState }: GameViewProps) {
  const boards = state.boards as Record<string, number[][]>
  const board = boards[playerId] ?? []
  const col = (state.pieces as Record<string, number>)[playerId] ?? 3
  const scores = state.scores as Record<string, number>

  return (
    <div className="arcade-view">
      <div className="tetris-board">
        {board.map((row, ri) =>
          row.map((cell, ci) => (
            <div key={`${ri}-${ci}`} className={`tetris-cell ${cell ? 'filled' : ''} ${ci === col && ri === 0 ? 'ghost' : ''}`} />
          ))
        )}
      </div>
      <p className="arcade-hint">Lines: {scores[playerId] ?? 0} / {state.winScore as number}</p>
      <div className="pong-controls">
        <button type="button" className="btn" onClick={() => pushState(tetrisMove(state, playerId, -1))}>◀</button>
        <button type="button" className="btn btn-primary" onClick={() => pushState(tetrisDrop(state, playerId))}>Drop</button>
        <button type="button" className="btn" onClick={() => pushState(tetrisMove(state, playerId, 1))}>▶</button>
      </div>
    </div>
  )
}
