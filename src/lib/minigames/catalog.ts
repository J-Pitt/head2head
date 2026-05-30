export type MinigameId =
  | 'frogger'
  | 'snake'
  | 'pong'
  | 'breakout'
  | 'asteroids'
  | 'memory'
  | 'flappy'
  | 'tetris'
  | 'drawguess'
  | 'reaction'
  | 'connect4'
  | 'scramble'

export type MinigameMeta = {
  id: MinigameId
  label: string
  emoji: string
  color: string
  playable: boolean
  blurb: string
}

export const WHEEL_GAMES: MinigameMeta[] = [
  { id: 'frogger', label: 'Frogger', emoji: '🐸', color: '#34d399', playable: true, blurb: 'Dodge traffic — first across wins' },
  { id: 'snake', label: 'Snake', emoji: '🐍', color: '#a78bfa', playable: true, blurb: 'Grow the longest snake' },
  { id: 'pong', label: 'Pong', emoji: '🏓', color: '#60a5fa', playable: true, blurb: 'Classic paddle battle' },
  { id: 'breakout', label: 'Breakout', emoji: '🧱', color: '#f472b6', playable: true, blurb: 'Smash every brick' },
  { id: 'asteroids', label: 'Asteroids', emoji: '☄️', color: '#fbbf24', playable: true, blurb: 'Survive the rock field' },
  { id: 'memory', label: 'Memory', emoji: '🃏', color: '#fb923c', playable: true, blurb: 'Match pairs fastest' },
  { id: 'flappy', label: 'Flappy', emoji: '🐦', color: '#38bdf8', playable: true, blurb: 'Tap through the pipes' },
  { id: 'tetris', label: 'Tetris', emoji: '🟦', color: '#818cf8', playable: true, blurb: 'Clear lines — send garbage' },
  { id: 'drawguess', label: 'Draw Guess', emoji: '✏️', color: '#e879f9', playable: true, blurb: 'Draw it — friends guess' },
  { id: 'reaction', label: 'Reaction', emoji: '⚡', color: '#facc15', playable: true, blurb: 'Fastest finger wins' },
  { id: 'connect4', label: 'Connect 4', emoji: '🔴', color: '#ef4444', playable: true, blurb: 'Four in a row' },
  { id: 'scramble', label: 'Scramble', emoji: '🔤', color: '#2dd4bf', playable: true, blurb: 'Unscramble the word' },
]

export function getMinigame(id: string) {
  return WHEEL_GAMES.find((g) => g.id === id)
}

export function minigamePath(id: MinigameId) {
  return `/minigames/${id}`
}
