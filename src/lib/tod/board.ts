import type { Player } from '@/lib/types'
import type { Session } from '@/lib/minigames/types'
import type { ClassicListMode } from '@/lib/tod/classic/lists'

// Linear race board: START at one corner, FINISH at the opposite end. Tiles
// snake row-by-row (left→right, then right→left, …).
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
  cols: number
  rows: number
  /** Legacy spiral boards used `size` for both dimensions. */
  size?: number
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
  // TruthOrDareNow prompt lists (PG or NSFW).
  listMode: ClassicListMode
  usedTruths: number[]
  usedDares: number[]
  usedQuestionIds: string[]
}

export const BOARD_COLS = 6
export const BOARD_ROWS = 6

// Tile mix for middle squares (34 on a 6×6 board). Shuffled each game.
const MIDDLE_TILE_POOL: TileType[] = [
  'truth', 'dare', 'trivia', 'minigame', 'special', 'dare',
  'truth', 'trivia', 'dare', 'special', 'truth', 'minigame',
  'dare', 'trivia', 'special', 'truth', 'jail', 'dare',
  'trivia', 'minigame', 'special', 'truth', 'dare', 'wild',
  'trivia', 'dare', 'special', 'truth', 'minigame', 'jail',
  'dare', 'trivia', 'special', 'truth',
]

export type BuildTilesOptions = {
  /** Shuffle middle tile types and special assignments. Default true. */
  randomize?: boolean
}

function middleTypePool(cols: number, rows: number): TileType[] {
  const middleCount = cols * rows - 2
  const pool: TileType[] = []
  for (let i = 0; i < middleCount; i++) {
    pool.push(MIDDLE_TILE_POOL[i % MIDDLE_TILE_POOL.length]!)
  }
  return pool
}

// Serpentine path: row 0 left→right, row 1 right→left, etc.
function serpentineCoords(cols: number, rows: number): { row: number; col: number }[] {
  const res: { row: number; col: number }[] = []
  for (let row = 0; row < rows; row++) {
    if (row % 2 === 0) {
      for (let col = 0; col < cols; col++) res.push({ row, col })
    } else {
      for (let col = cols - 1; col >= 0; col--) res.push({ row, col })
    }
  }
  return res
}

export function buildTiles(
  cols = BOARD_COLS,
  rows = BOARD_ROWS,
  options: BuildTilesOptions = {}
): BoardTile[] {
  const { randomize = true } = options
  const coords = serpentineCoords(cols, rows)
  const total = coords.length
  const shuffledMiddle = randomize ? shuffle(middleTypePool(cols, rows)) : middleTypePool(cols, rows)
  let middleIdx = 0
  let specialCounter = 0
  return coords.map((c, i) => {
    let type: TileType
    if (i === 0) type = 'start'
    else if (i === total - 1) type = 'finish'
    else type = shuffledMiddle[middleIdx++]!
    const tile: BoardTile = { i, type, row: c.row, col: c.col }
    if (type === 'special') {
      tile.special = randomize
        ? Math.floor(Math.random() * SPECIAL_CHALLENGES.length)
        : specialCounter++ % SPECIAL_CHALLENGES.length
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

export function createBoardState(
  players: Player[],
  listMode: ClassicListMode = 'nsfw'
): BoardState {
  const tiles = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: true })
  const order = shuffle(players.filter((p) => p.status !== 'break').map((p) => p.id))
  const fallback = order.length ? order : players.map((p) => p.id)
  const positions: Record<string, number> = {}
  for (const p of players) positions[p.id] = 0
  return {
    cols: BOARD_COLS,
    rows: BOARD_ROWS,
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
    listMode,
    usedTruths: [],
    usedDares: [],
    usedQuestionIds: [],
  }
}

export const LAST_TILE = (b: BoardState) => b.tiles.length - 1

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6)
}

export const TILE_META: Record<TileType, { label: string; emoji: string; color: string }> = {
  start: { label: 'Start', emoji: '🚦', color: '#2dd4bf' },
  finish: { label: 'Finish', emoji: '🏁', color: '#34d399' },
  truth: { label: 'Truth', emoji: '💬', color: '#60a5fa' },
  dare: { label: 'Dare', emoji: '🔥', color: '#f472b6' },
  wild: { label: 'Wild', emoji: '🎲', color: '#c084fc' },
  trivia: { label: 'Trivia', emoji: '🧠', color: '#a78bfa' },
  minigame: { label: 'Mini game', emoji: '🎮', color: '#fde047' },
  jail: { label: 'Jail', emoji: '🚔', color: '#94a3b8' },
  forward: { label: 'Jump ahead', emoji: '⏩', color: '#4ade80' },
  back: { label: 'Fall back', emoji: '⏪', color: '#f87171' },
  swap: { label: 'Swap', emoji: '🔀', color: '#22d3ee' },
  picture: { label: 'Picture time', emoji: '📸', color: '#2dd4bf' },
  group: { label: 'Group dare', emoji: '👯', color: '#fbbf24' },
  special: { label: 'Special', emoji: '⭐', color: '#e879f9' },
}
