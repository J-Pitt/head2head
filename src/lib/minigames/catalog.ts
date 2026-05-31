export type MinigameId =
  | 'frogger'
  | 'snake'
  | 'flappy'
  | 'memory'
  | 'connect4'
  | 'dino'

export type MinigameMeta = {
  id: MinigameId
  label: string
  emoji: string
  color: string
  playable: boolean
  blurb: string
  tag: string
}

export const WHEEL_GAMES: MinigameMeta[] = [
  { id: 'frogger', label: 'Frogger', emoji: '🐸', color: '#34d399', playable: true, blurb: 'Dodge traffic, rack up crossings before time runs out', tag: 'Live race' },
  { id: 'snake', label: 'Snake', emoji: '🐍', color: '#a78bfa', playable: true, blurb: 'Eat, grow, survive — longest snake wins', tag: 'Live race' },
  { id: 'flappy', label: 'Flappy', emoji: '🐦', color: '#38bdf8', playable: true, blurb: 'Tap through pipes — last bird flying wins', tag: 'Live race' },
  { id: 'memory', label: 'Memory', emoji: '🃏', color: '#fb923c', playable: true, blurb: 'Same deck for everyone — first to clear it wins', tag: 'Speed race' },
  { id: 'connect4', label: 'Connect 4', emoji: '🔴', color: '#ef4444', playable: true, blurb: 'Take turns — four of your color in a row', tag: 'Turn-based' },
  { id: 'dino', label: 'Dino Run', emoji: '🦖', color: '#78716c', playable: true, blurb: 'Jump the cacti — run as far as you can before time runs out', tag: 'Live race' },
]

// Games used as Truth-or-Dare round openers — only those with a clear single
// loser (no turn-based games like Connect 4).
export const TOD_MINIGAMES: MinigameId[] = ['frogger', 'snake', 'flappy', 'memory', 'dino']

export function randomTodMinigame(): MinigameId {
  return TOD_MINIGAMES[Math.floor(Math.random() * TOD_MINIGAMES.length)]
}

export function getMinigame(id: string) {
  return WHEEL_GAMES.find((g) => g.id === id)
}

export function minigamePath(id: MinigameId) {
  return `/minigames/${id}`
}
