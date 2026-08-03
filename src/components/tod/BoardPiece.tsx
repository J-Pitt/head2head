import { getBoardPiece } from '@/lib/tod/boardPieces'

type Props = {
  pieceId: string
  size?: number
  className?: string
}

export default function BoardPiece({ pieceId, size = 40, className }: Props) {
  const piece = getBoardPiece(pieceId)
  const fontSize = Math.round(size * 0.52)

  return (
    <span
      className={`board-piece${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        background: piece.color,
        fontSize,
      }}
      title={piece.label}
      aria-label={piece.label}
      role="img"
    >
      <span className="board-piece-emoji" aria-hidden>
        {piece.emoji}
      </span>
      <span className="board-piece-base" aria-hidden />
    </span>
  )
}
