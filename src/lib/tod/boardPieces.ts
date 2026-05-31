// Silly Monopoly-style board tokens — emoji on a colored disc.

export type BoardPieceDef = {
  id: string
  emoji: string
  label: string
  color: string
}

export const BOARD_PIECES: BoardPieceDef[] = [
  { id: 'duck', emoji: '🦆', label: 'Rubber duck', color: '#ffd93d' },
  { id: 'pizza', emoji: '🍕', label: 'Pizza slice', color: '#ff6b35' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn', color: '#e879f9' },
  { id: 'frog', emoji: '🐸', label: 'Frog', color: '#4ade80' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket', color: '#60a5fa' },
  { id: 'crown', emoji: '👑', label: 'Crown', color: '#fbbf24' },
  { id: 'taco', emoji: '🌮', label: 'Taco', color: '#f97316' },
  { id: 'dino', emoji: '🦖', label: 'T-Rex', color: '#86efac' },
  { id: 'cupcake', emoji: '🧁', label: 'Cupcake', color: '#fda4af' },
  { id: 'octopus', emoji: '🐙', label: 'Octopus', color: '#c084fc' },
  { id: 'donut', emoji: '🍩', label: 'Donut', color: '#f9a8d4' },
  { id: 'fox', emoji: '🦊', label: 'Fox', color: '#fb923c' },
  { id: 'eightball', emoji: '🎱', label: '8-ball', color: '#1e293b' },
  { id: 'avocado', emoji: '🥑', label: 'Avocado', color: '#a3e635' },
  { id: 'ghost', emoji: '👻', label: 'Ghost', color: '#e2e8f0' },
  { id: 'robot', emoji: '🤖', label: 'Robot', color: '#94a3b8' },
  { id: 'poop', emoji: '💩', label: 'Poop', color: '#a16207' },
  { id: 'alien', emoji: '👽', label: 'Alien', color: '#6ee7b7' },
]

export const DEFAULT_BOARD_PIECE = BOARD_PIECES[0].id

export function getBoardPiece(id: string): BoardPieceDef {
  const found = BOARD_PIECES.find((p) => p.id === id)
  if (found) return found
  // Stable silly piece for legacy avatar ids (e.g. DiceBear seeds).
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % BOARD_PIECES.length
  return BOARD_PIECES[hash]!
}

export function isBoardPiece(id: string): boolean {
  return BOARD_PIECES.some((p) => p.id === id)
}
