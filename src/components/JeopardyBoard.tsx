'use client'

import { CATEGORIES, JEOPARDY_VALUES } from '@/lib/trivia'
import type { GameState } from '@/lib/types'

type Props = {
  state: GameState
  pickerName: string | null
  canPick: boolean
  onSelect: (clueId: string) => void
}

export default function JeopardyBoard({ state, pickerName, canPick, onSelect }: Props) {
  const used = new Set(state.usedClueIds)

  return (
    <div className="jeopardy-board">
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
          return (
            <div key={catId} className="jeopardy-col">
              <div className="jeopardy-category">
                <span className="jeopardy-cat-icon">{meta.icon}</span>
                <span className="jeopardy-cat-label">{meta.label}</span>
              </div>
              {JEOPARDY_VALUES.map((value) => {
                const clueId = `${catId}-${value}`
                const isUsed = used.has(clueId)
                return (
                  <button
                    key={clueId}
                    type="button"
                    className={`jeopardy-clue ${isUsed ? 'used' : ''}`}
                    disabled={!canPick || isUsed}
                    onClick={() => onSelect(clueId)}
                  >
                    {isUsed ? ' ' : `$${value}`}
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
