export type BoardPieceId = 'car' | 'boat' | 'spaceship' | 'plane'

export type BoardPieceDef = {
  id: BoardPieceId
  label: string
  /** Primary body fill */
  color: string
  /** Outline and dark details */
  accent: string
  /** Windows, sails, highlights */
  highlight: string
  /** Soft glow on the board */
  glow: string
}

export const BOARD_PIECES: BoardPieceDef[] = [
  {
    id: 'car',
    label: 'Car',
    color: '#ef4444',
    accent: '#991b1b',
    highlight: '#bfdbfe',
    glow: 'rgba(239, 68, 68, 0.55)',
  },
  {
    id: 'boat',
    label: 'Boat',
    color: '#0ea5e9',
    accent: '#0369a1',
    highlight: '#f8fafc',
    glow: 'rgba(14, 165, 233, 0.5)',
  },
  {
    id: 'spaceship',
    label: 'Spaceship',
    color: '#a855f7',
    accent: '#6b21a8',
    highlight: '#fde047',
    glow: 'rgba(168, 85, 247, 0.5)',
  },
  {
    id: 'plane',
    label: 'Plane',
    color: '#f59e0b',
    accent: '#b45309',
    highlight: '#fef3c7',
    glow: 'rgba(245, 158, 11, 0.55)',
  },
]

export const DEFAULT_BOARD_PIECE: BoardPieceId = 'car'

const LEGACY_IDS: Record<string, BoardPieceId> = {
  duck: 'boat',
  rocket: 'spaceship',
  frog: 'car',
  crown: 'plane',
}

export function getBoardPiece(id: string): BoardPieceDef {
  const mapped = LEGACY_IDS[id] ?? id
  const found = BOARD_PIECES.find((p) => p.id === mapped)
  if (found) return found
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % BOARD_PIECES.length
  return BOARD_PIECES[hash]!
}

export function isBoardPiece(id: string): boolean {
  return BOARD_PIECES.some((p) => p.id === id)
}
