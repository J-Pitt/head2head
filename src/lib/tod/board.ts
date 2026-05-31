import type { Player } from '@/lib/types'
import type { Session } from '@/lib/minigames/types'

// A spiral race board: START on the outer corner, FINISH in the center. Each
// tile triggers an action when a player lands on it.
export type TileType =
  | 'start'
  | 'finish'
  | 'truth'
  | 'dare'
  | 'wild' // player picks truth or dare
  | 'trivia'
  | 'minigame'
  | 'jail' // skip your next turn
  | 'forward' // jump ahead
  | 'back' // fall behind
  | 'swap' // swap places with a random player
  | 'picture' // everyone posts a pic
  | 'group' // group dare
  | 'special' // a labeled challenge from the Truth or Dare special squares

// Special-square challenges, from the Truth or Dare "sexy" mode board.
export type SpecialKind = 'do' | 'group' | 'dice'
export type SpecialChallenge = { icon: string; label: string; kind: SpecialKind }

export const SPECIAL_CHALLENGES: SpecialChallenge[] = [
  { icon: '🔥', label: 'Take a hot selfie and send it to the chat', kind: 'do' },
  { icon: '💋', label: "Describe the best kiss you've ever had — in detail", kind: 'do' },
  { icon: '🎲', label: 'Everyone rolls — highest advances 5 spaces', kind: 'dice' },
  { icon: '😈', label: "Tell a naughty secret you've never shared", kind: 'do' },
  { icon: '💜', label: 'Everyone send their sexiest selfie to the chat!', kind: 'group' },
  { icon: '🌶️', label: 'Send a spicy message to someone and share both your message and their response', kind: 'do' },
  { icon: '✨', label: 'Put on your most attractive look and show the group', kind: 'do' },
  { icon: '💫', label: 'Make up a seductive alter ego name for yourself', kind: 'do' },
  { icon: '🔮', label: 'Predict the romantic future of another player', kind: 'do' },
]

export type BoardTile = {
  i: number
  type: TileType
  row: number
  col: number
  // Index into SPECIAL_CHALLENGES for 'special' tiles.
  special?: number
}

export type BoardPhase =
  | 'rolling'
  | 'prompt' // resolving a truth/dare/wild
  | 'trivia'
  | 'minigame'
  | 'forfeit' // minigame loser does a dare
  | 'event' // jail / movement / picture / group message
  | 'finished'

export type BoardState = {
  size: number
  tiles: BoardTile[]
  positions: Record<string, number>
  order: string[]
  turn: number
  rollerId: string | null
  dice: number | null
  // Players with a turn-skip pending (e.g. jail). Value = turns remaining.
  jail: Record<string, number>
  phase: BoardPhase
  // Truth/dare/wild resolution context.
  tileType: TileType | null
  onSpotId: string | null
  askerId: string | null
  choice: 'truth' | 'dare' | null
  prompt: string | null
  // Trivia.
  questionId: string | null
  answeredBy: string | null
  answerIndex: number | null
  answerCorrect: boolean | null
  // Minigame.
  minigame: Session | null
  mgRound: number
  loserId: string | null
  loserName: string | null
  // Event/jail message shown to everyone.
  message: string | null
  // Winner.
  winnerId: string | null
  winnerName: string | null
}

export const BOARD_SIZE = 6

// Tile types for the inner path (everything between START and FINISH). Tuned to
// spread the colors like the cardboard template.
const MIDDLE_PATTERN: TileType[] = [
  'truth', 'dare', 'trivia', 'minigame', 'special', 'dare',
  'truth', 'trivia', 'dare', 'special', 'truth', 'minigame',
  'dare', 'trivia', 'special', 'truth', 'jail', 'dare',
  'trivia', 'minigame', 'special', 'truth', 'dare', 'wild',
  'trivia', 'dare', 'special', 'truth', 'minigame', 'jail',
  'dare', 'trivia', 'special', 'truth',
]

// Ordered coordinates of a square spiral that winds inward to the center.
function spiralCoords(size: number): { row: number; col: number }[] {
  const res: { row: number; col: number }[] = []
  let top = 0
  let bottom = size - 1
  let left = 0
  let right = size - 1
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) res.push({ row: top, col: c })
    for (let r = top + 1; r <= bottom; r++) res.push({ row: r, col: right })
    if (top < bottom) for (let c = right - 1; c >= left; c--) res.push({ row: bottom, col: c })
    if (left < right) for (let r = bottom - 1; r >= top + 1; r--) res.push({ row: r, col: left })
    top++
    bottom--
    left++
    right--
  }
  return res
}

export function buildTiles(size = BOARD_SIZE): BoardTile[] {
  const coords = spiralCoords(size)
  const total = coords.length
  let specialCounter = 0
  return coords.map((c, i) => {
    let type: TileType
    if (i === 0) type = 'start'
    else if (i === total - 1) type = 'finish'
    else type = MIDDLE_PATTERN[(i - 1) % MIDDLE_PATTERN.length]
    const tile: BoardTile = { i, type, row: c.row, col: c.col }
    if (type === 'special') {
      tile.special = specialCounter % SPECIAL_CHALLENGES.length
      specialCounter++
    }
    return tile
  })
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createBoardState(players: Player[]): BoardState {
  const tiles = buildTiles()
  const order = shuffle(players.filter((p) => p.status !== 'break').map((p) => p.id))
  const fallback = order.length ? order : players.map((p) => p.id)
  const positions: Record<string, number> = {}
  for (const p of players) positions[p.id] = 0
  return {
    size: BOARD_SIZE,
    tiles,
    positions,
    order: fallback,
    turn: 0,
    rollerId: fallback[0] ?? null,
    dice: null,
    jail: {},
    phase: 'rolling',
    tileType: null,
    onSpotId: null,
    askerId: null,
    choice: null,
    prompt: null,
    questionId: null,
    answeredBy: null,
    answerIndex: null,
    answerCorrect: null,
    minigame: null,
    mgRound: 0,
    loserId: null,
    loserName: null,
    message: null,
    winnerId: null,
    winnerName: null,
  }
}

export const LAST_TILE = (b: BoardState) => b.tiles.length - 1

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6)
}

export const TILE_META: Record<TileType, { label: string; emoji: string; color: string }> = {
  start: { label: 'Start', emoji: '🚦', color: '#2dd4bf' },
  finish: { label: 'Finish', emoji: '🏁', color: '#2dd4bf' },
  truth: { label: 'Truth', emoji: '💬', color: '#3b82f6' },
  dare: { label: 'Dare', emoji: '🔥', color: '#ec4899' },
  wild: { label: 'Wild', emoji: '🎲', color: '#a855f7' },
  trivia: { label: 'Trivia', emoji: '🧠', color: '#8b5cf6' },
  minigame: { label: 'Mini game', emoji: '🎮', color: '#e5e7eb' },
  jail: { label: 'Jail', emoji: '🚔', color: '#475569' },
  forward: { label: 'Jump ahead', emoji: '⏩', color: '#22c55e' },
  back: { label: 'Fall back', emoji: '⏪', color: '#ef4444' },
  swap: { label: 'Swap', emoji: '🔀', color: '#06b6d4' },
  picture: { label: 'Picture time', emoji: '📸', color: '#14b8a6' },
  group: { label: 'Group dare', emoji: '👯', color: '#f59e0b' },
  special: { label: 'Special', emoji: '⭐', color: '#f0abfc' },
}
