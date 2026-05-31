'use client'

import { BOARD_PIECES } from '@/lib/tod/boardPieces'
import BoardPiece from '@/components/tod/BoardPiece'

type Props = {
  selected: string
  onSelect: (id: string) => void
}

export default function BoardPiecePicker({ selected, onSelect }: Props) {
  return (
    <div className="avatar-picker board-piece-picker">
      <p className="label">Pick your game piece</p>
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
    </div>
  )
}
