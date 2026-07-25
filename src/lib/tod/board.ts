import type { Player } from '@/lib/types'
import type { Session } from '@/lib/minigames/types'
import type { ClassicListMode } from '@/lib/tod/classic/lists'

// Race board: START at the bottom, FINISH at the top. Tiles follow a winding
// zig-zag path through a sparse grid — empty cells show the course gaps.
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
  answerText: string | null
  answerImage: string | null
  answerSubmitted: boolean
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
export const BOARD_ROWS = 10
/** Number of tiles on the path (start + middle + finish). */
export const BOARD_PATH_LENGTH = 36
/** Tiles per horizontal leg of the zig-zag snake. */
export const ZIGZAG_RUN_WIDTH = 5

/** Classic snake: alternate horizontal runs linked by single vertical steps. */
export function buildZigzagWaypoints(
  cols: number,
  rows: number,
  steps: number
): { row: number; col: number }[] {
  const path: { row: number; col: number }[] = []
  const runWidth = Math.min(ZIGZAG_RUN_WIDTH, cols)
  let row = rows - 1
  let east = true

  while (path.length < steps && row >= 0) {
    if (east) {
      let start = 0
      const prev = path[path.length - 1]
      if (prev?.row === row) start = prev.col + 1
      for (let c = start; c < runWidth && path.length < steps; c++) {
        path.push({ row, col: c })
      }
    } else {
      let start = runWidth - 1
      const prev = path[path.length - 1]
      if (prev?.row === row) start = prev.col - 1
      for (let c = start; c >= 0 && path.length < steps; c--) {
        path.push({ row, col: c })
      }
    }

    if (path.length >= steps) break
    row -= 1
    if (row < 0) break

    const turnCol = path[path.length - 1]!.col
    path.push({ row, col: turnCol })
    east = !east
  }

  return path.slice(0, steps)
}

/** Split path into horizontal legs (each row segment of the zig-zag). */
export function splitZigzagLegs(tiles: BoardTile[]): BoardTile[][] {
  const legs: BoardTile[][] = []
  let i = 0
  while (i < tiles.length) {
    const leg: BoardTile[] = [tiles[i]!]
    i++
    while (i < tiles.length && tiles[i]!.row === leg[0]!.row) {
      leg.push(tiles[i]!)
      i++
    }
    legs.push(leg)
  }
  return legs
}

// Tile mix for middle squares. Shuffled each game.
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

function middleTypePool(count: number): TileType[] {
  const pool: TileType[] = []
  for (let i = 0; i < count; i++) {
    pool.push(MIDDLE_TILE_POOL[i % MIDDLE_TILE_POOL.length]!)
  }
  return pool
}

/** Zig-zag path coordinates for the logical board grid. */
export function zigzagCourseCoords(
  cols: number,
  rows: number,
  steps: number
): { row: number; col: number }[] {
  return buildZigzagWaypoints(cols, rows, steps)
}

/** @deprecated Alias for zigzagCourseCoords. */
export const scenicCourseCoords = zigzagCourseCoords

/** Bounds of tiles on the logical grid (only path cells — no ghost grid). */
export function getPathBounds(tiles: BoardTile[]) {
  let minRow = Infinity
  let maxRow = -Infinity
  let minCol = Infinity
  let maxCol = -Infinity
  for (const t of tiles) {
    minRow = Math.min(minRow, t.row)
    maxRow = Math.max(maxRow, t.row)
    minCol = Math.min(minCol, t.col)
    maxCol = Math.max(maxCol, t.col)
  }
  return { minRow, maxRow, minCol, maxCol }
}

/**
 * Map path tiles to canvas positions using their logical grid coords.
 * Alternating rows share the same columns so the course reads as a classic
 * snake (→ on one row, ← on the next, linked at the turn column).
 */
export function getBoardDisplayLayout(tiles: BoardTile[]) {
  const { minRow, maxRow, minCol, maxCol } = getPathBounds(tiles)
  const spanRows = maxRow - minRow + 1
  const spanCols = maxCol - minCol + 1

  return {
    spanRows,
    spanCols,
    minRow,
    maxRow,
    minCol,
    maxCol,
    /** Finish near the top; start near the bottom. */
    displayRow: (tile: BoardTile) => tile.row - minRow,
    displayCol: (tile: BoardTile) => tile.col - minCol,
  }
}

export type BoardDisplayLayout = ReturnType<typeof getBoardDisplayLayout>

/** Center point (0–100) for pieces / trail in zig-zag display space. */
export function tileCenterPercent(layout: BoardDisplayLayout, tile: BoardTile) {
  const dc = layout.displayCol(tile)
  const dr = layout.displayRow(tile)
  return {
    left: ((dc + 0.5) / layout.spanCols) * 100,
    top: ((dr + 0.5) / layout.spanRows) * 100,
  }
}

/** Absolute slot for a tile — zig-zag rows, no ghost grid. */
export function tileSlotStyle(layout: BoardDisplayLayout, tile: BoardTile): {
  left: string
  top: string
  width: string
  height: string
} {
  const dc = layout.displayCol(tile)
  const dr = layout.displayRow(tile)
  const w = 100 / layout.spanCols
  const h = 100 / layout.spanRows
  return {
    left: `${dc * w}%`,
    top: `${dr * h}%`,
    width: `${w}%`,
    height: `${h}%`,
  }
}

export function buildTiles(
  cols = BOARD_COLS,
  rows = BOARD_ROWS,
  options: BuildTilesOptions = {}
): BoardTile[] {
  const { randomize = true } = options
  const coords = zigzagCourseCoords(cols, rows, BOARD_PATH_LENGTH)
  const total = coords.length
  const shuffledMiddle = randomize ? shuffle(middleTypePool(total - 2)) : middleTypePool(total - 2)
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
    answerText: null,
    answerImage: null,
    answerSubmitted: false,
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
  start: { label: 'Go', emoji: '⚡', color: '#22d3ee' },
  finish: { label: 'Win', emoji: '👑', color: '#fbbf24' },
  truth: { label: 'Truth', emoji: '🗣️', color: '#38bdf8' },
  dare: { label: 'Dare', emoji: '🔥', color: '#f43f5e' },
  wild: { label: 'Wild', emoji: '🎲', color: '#c084fc' },
  trivia: { label: 'Trivia', emoji: '🧠', color: '#818cf8' },
  minigame: { label: 'Mini game', emoji: '🎮', color: '#facc15' },
  jail: { label: 'Jail', emoji: '🔒', color: '#64748b' },
  forward: { label: 'Jump', emoji: '⏩', color: '#4ade80' },
  back: { label: 'Back', emoji: '⏪', color: '#fb7185' },
  swap: { label: 'Swap', emoji: '🔀', color: '#2dd4bf' },
  picture: { label: 'Pic', emoji: '📸', color: '#e879f9' },
  group: { label: 'Group', emoji: '👯', color: '#fb923c' },
  special: { label: 'Special', emoji: '💋', color: '#ec4899' },
}
