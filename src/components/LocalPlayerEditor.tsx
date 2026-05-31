'use client'

import { useState } from 'react'
import BoardPiece from '@/components/tod/BoardPiece'
import { BOARD_PIECES } from '@/lib/tod/boardPieces'
import LocalPlayerName from '@/components/LocalPlayerName'

type Props = {
  name: string
  pieceId: string
  editable: boolean
  onRename: (name: string) => void
  onPieceChange: (pieceId: string) => void
}

export default function LocalPlayerEditor({
  name,
  pieceId,
  editable,
  onRename,
  onPieceChange,
}: Props) {
  const [pickingPiece, setPickingPiece] = useState(false)

  return (
    <div className="local-player-editor">
      <div className="local-player-editor-main">
        <BoardPiece pieceId={pieceId} size={34} />
        <LocalPlayerName name={name} editable={editable} onRename={onRename} />
        {editable && (
          <button
            type="button"
            className="btn-ghost btn-sm local-player-piece-btn"
            onClick={() => setPickingPiece((open) => !open)}
          >
            {pickingPiece ? 'Done' : 'Piece'}
          </button>
        )}
      </div>
      {editable && pickingPiece && (
        <div className="local-player-piece-grid" role="listbox" aria-label={`Pick a game piece for ${name}`}>
          {BOARD_PIECES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={pieceId === p.id}
              className={`local-player-piece-option ${pieceId === p.id ? 'selected' : ''}`}
              onClick={() => {
                onPieceChange(p.id)
                setPickingPiece(false)
              }}
              title={p.label}
            >
              <BoardPiece pieceId={p.id} size={32} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
