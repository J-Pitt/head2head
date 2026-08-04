import { getBoardPiece, type BoardPieceId } from '@/lib/tod/boardPieces'

type Props = {
  pieceId: string
  size?: number
  className?: string
}

type IconProps = {
  kind: BoardPieceId
  color: string
  accent: string
  highlight: string
}

function PieceIcon({ kind, color, accent, highlight }: IconProps) {
  const props = {
    viewBox: '0 0 40 32',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  }

  switch (kind) {
    case 'car':
      return (
        <svg {...props}>
          <ellipse cx="11" cy="26.5" rx="4.2" ry="4" fill={accent} />
          <ellipse cx="29" cy="26.5" rx="4.2" ry="4" fill={accent} />
          <circle cx="11" cy="26.5" r="2" fill={highlight} opacity="0.9" />
          <circle cx="29" cy="26.5" r="2" fill={highlight} opacity="0.9" />
          <path
            d="M5 22.5c0-1.1.9-2 2-2h1.4l2.1-6.3a2.4 2.4 0 0 1 2.3-1.7h14.4a2.4 2.4 0 0 1 2.3 1.7L31.6 20.5H33c1.1 0 2 .9 2 2v1.5H5V22.5Z"
            fill={color}
            stroke={accent}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M12.5 14.5h15l1.8 6H10.7l1.8-6Z"
            fill={highlight}
            opacity="0.85"
          />
          <path
            d="M14 14.5h12l1.2 4.5H12.8L14 14.5Z"
            fill={accent}
            opacity="0.35"
          />
          <path d="M17 12h6" stroke={accent} strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
        </svg>
      )
    case 'boat':
      return (
        <svg {...props}>
          <path
            d="M6 24.5c3.2-1.4 6.8-2.1 14-2.1s10.8.7 14 2.1"
            stroke={accent}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M8 24.5 11.5 17h17L32 24.5H8Z"
            fill={color}
            stroke={accent}
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          <path d="M11.5 17 20 24.5 28.5 17" fill={accent} opacity="0.25" />
          <path
            d="M20 7v10.2"
            stroke={accent}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M20 8.5 12.5 19.5h15L20 8.5Z"
            fill={highlight}
            opacity="0.95"
            stroke={accent}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <path d="M20 8.5 14 18.5M20 8.5l6 10" stroke={accent} strokeWidth="0.5" opacity="0.35" />
        </svg>
      )
    case 'spaceship':
      return (
        <svg {...props}>
          <path
            d="M20 4.5c5.8 3.8 10 9.8 11.2 17.5H8.8C10 14.3 14.2 8.3 20 4.5Z"
            fill={color}
            stroke={accent}
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          <path d="M20 4.5 16.5 22h7L20 4.5Z" fill={accent} opacity="0.22" />
          <path
            d="M12.5 22h15l-1.2 3.2H13.7L12.5 22Z"
            fill={accent}
            opacity="0.85"
          />
          <path
            d="M14.5 25.2 12.8 28.5M25.5 25.2 27.2 28.5"
            stroke={accent}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle cx="20" cy="13.5" r="2.2" fill={highlight} opacity="0.95" stroke={accent} strokeWidth="0.7" />
          <path d="M18.2 25.2h3.6" stroke={highlight} strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
        </svg>
      )
    case 'plane':
      return (
        <svg {...props}>
          <path
            d="M20 6.5 14.5 22h2.4l-.5 4.2 2-3.2h1.2l2 3.2-.5-4.2H25.5L20 6.5Z"
            fill={color}
            stroke={accent}
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          <path
            d="M7 15.5 20 12.5 33 15.5"
            fill={highlight}
            opacity="0.9"
            stroke={accent}
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
          <path
            d="M7 15.5 20 12.5 33 15.5"
            stroke={accent}
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9.5 17.5 6.5 19.5M30.5 17.5 33.5 19.5" stroke={accent} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M19 12.5h2" stroke={highlight} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
        </svg>
      )
  }
}

export default function BoardPiece({ pieceId, size = 40, className }: Props) {
  const piece = getBoardPiece(pieceId)

  return (
    <span
      className={`board-piece board-piece-${piece.id}${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: Math.round(size * 0.82),
        ['--piece-color' as string]: piece.color,
        ['--piece-accent' as string]: piece.accent,
        ['--piece-highlight' as string]: piece.highlight,
        ['--piece-glow' as string]: piece.glow,
      }}
      title={piece.label}
      aria-label={piece.label}
      role="img"
    >
      <span className="board-piece-icon">
        <PieceIcon
          kind={piece.id}
          color={piece.color}
          accent={piece.accent}
          highlight={piece.highlight}
        />
      </span>
      <span className="board-piece-shadow" aria-hidden />
    </span>
  )
}
