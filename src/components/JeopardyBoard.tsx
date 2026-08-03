'use client'

import { CATEGORIES } from '@/lib/trivia'
import type { GameState } from '@/lib/types'

type Props = {
  state: GameState
  pickerName: string | null
  canPick: boolean
  onSelect: (clueId: string) => void
}

export default function JeopardyBoard({ state, pickerName, canPick, onSelect }: Props) {
  const used = new Set(state.usedClueIds)
  const isDouble = state.jeopardyRound === 'double'

  return (
    <div className="jeopardy-board">
      {isDouble && <p className="jeopardy-round-label">Double Jeopardy!</p>}
      <p className="jeopardy-board-hint">
        {canPick
          ? `${pickerName ?? 'Player'}, pick a clue`
          : `${pickerName ?? 'Player'} is picking…`}
      </p>
      <div
        className="jeopardy-grid"
        style={{ gridTemplateColumns: `repeat(${state.categories.length}, minmax(0, 1fr))` }}
      >
        {state.categories.map((catId) => {
          const meta = CATEGORIES.find((c) => c.id === catId)!
          const clues = state.clues
            .filter((c) => c.category === catId)
            .sort((a, b) => a.value - b.value)

          return (
            <div key={catId} className="jeopardy-col">
              <div className="jeopardy-category">
                <span className="jeopardy-cat-icon">{meta.icon}</span>
                <span className="jeopardy-cat-label">{meta.label}</span>
              </div>
              {clues.map((clue) => {
                const isUsed = used.has(clue.id)
                return (
                  <button
                    key={clue.id}
                    type="button"
                    className={`jeopardy-clue ${isUsed ? 'used' : ''} ${isDouble ? 'double' : ''}`}
                    disabled={!canPick || isUsed}
                    onClick={() => onSelect(clue.id)}
                  >
                    {isUsed ? ' ' : `$${clue.value}`}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
