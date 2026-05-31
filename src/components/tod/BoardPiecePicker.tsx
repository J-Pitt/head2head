'use client'

import { BOARD_PIECES } from '@/lib/tod/boardPieces'
import BoardPiece from '@/components/tod/BoardPiece'

type Props = {
  selected: string
  onSelect: (id: string) => void
}

export default function BoardPiecePicker({ selected, onSelect }: Props) {
  function pickRandom() {
    const others = BOARD_PIECES.filter((p) => p.id !== selected)
    const pool = others.length ? others : BOARD_PIECES
    onSelect(pool[Math.floor(Math.random() * pool.length)]!.id)
  }

  return (
    <div className="avatar-picker board-piece-picker">
      <p className="label">Pick your game piece</p>
      <p className="board-piece-hint">Cute, silly, or totally random — choose what represents you.</p>
      <div className="avatar-grid board-piece-grid">
        {BOARD_PIECES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`avatar-option board-piece-option ${selected === p.id ? 'selected' : ''}`}
            onClick={() => onSelect(p.id)}
            title={p.label}
            aria-label={p.label}
            aria-pressed={selected === p.id}
          >
            <BoardPiece pieceId={p.id} size={48} />
          </button>
        ))}
      </div>
      <button type="button" className="btn-ghost btn-sm board-piece-random" onClick={pickRandom}>
        🎲 Surprise me
      </button>
    </div>
  )
}
