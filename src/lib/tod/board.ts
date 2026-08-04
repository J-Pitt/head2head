import type { Player } from '@/lib/types'
import type { Session } from '@/lib/minigames/types'
import type { ClassicListMode } from '@/lib/tod/classic/lists'

// Race board: START (GO) at bottom-left, path spirals clockwise inward,
// FINISH (WIN) is the center tile.
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

/** Penalty tasks assigned when someone lands on Jail (complete before play continues). */
export const JAIL_PENALTIES: string[] = [
  'Send a sad selfie to the chat — full pity-party energy.',
  'Confess your most embarrassing crush out loud (or in chat).',
  'Do 10 dramatic fake sobs on camera for the group.',
  'Write a one-sentence apology to the person who sent you to jail vibes.',
  'Post a voice note of your saddest "I\'m innocent" plea.',
  'Tell the group one secret you\'d rather keep locked up.',
  'Strike your most pathetic "behind bars" pose and send a photo.',
  'Beg the group (politely, filthily — your call) for early release in chat.',
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
  /** Used indices into the Kink deck (separate from standard NSFW). */
  usedKinkTruths: number[]
  usedKinkDares: number[]
  /** Special challenge indices already played this game. */
  usedSpecials: number[]
  /** Jail penalty indices already played this game. */
  usedJailPenalties: number[]
  /** Normalized prompt texts already played (belt-and-suspenders vs index lists). */
  usedPromptTexts: string[]
  usedQuestionIds: string[]
}

export const BOARD_COLS = 10
export const BOARD_ROWS = 10
/** Full spiral fills every cell on the table. */
export const BOARD_PATH_LENGTH = BOARD_COLS * BOARD_ROWS

/**
 * Clockwise spiral inward: start bottom-left (GO), end at the center (WIN).
 */
export function buildSpiralWaypoints(
  cols: number,
  rows: number
): { row: number; col: number }[] {
  const path: { row: number; col: number }[] = []
  let top = 0
  let bottom = rows - 1
  let left = 0
  let right = cols - 1

  while (top <= bottom && left <= right) {
    // Bottom edge: left → right
    for (let col = left; col <= right; col++) path.push({ row: bottom, col })
    bottom--
    if (top > bottom) break

    // Right edge: up
    for (let row = bottom; row >= top; row--) path.push({ row, col: right })
    right--
    if (left > right) break

    // Top edge: right → left
    for (let col = right; col >= left; col--) path.push({ row: top, col })
    top++
    if (top > bottom) break

    // Left edge: down
    for (let row = top; row <= bottom; row++) path.push({ row, col: left })
    left++
  }

  return path
}

/** @deprecated Prefer buildSpiralWaypoints. */
export function buildPerimeterWaypoints(
  cols: number,
  rows: number
): { row: number; col: number }[] {
  return buildSpiralWaypoints(cols, rows)
}

/** @deprecated Prefer buildSpiralWaypoints. */
export function buildZigzagWaypoints(
  cols: number,
  rows: number,
  _steps?: number
): { row: number; col: number }[] {
  return buildSpiralWaypoints(cols, rows)
}

/** Split path into contiguous same-row legs. */
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

// Tile mix for middle squares. Shuffled each game; pool cycles to fill longer spirals.
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

/** Spiral path coordinates for the logical board grid. */
export function spiralCourseCoords(
  cols: number,
  rows: number
): { row: number; col: number }[] {
  return buildSpiralWaypoints(cols, rows)
}

/** @deprecated Prefer spiralCourseCoords. */
export function perimeterCourseCoords(
  cols: number,
  rows: number
): { row: number; col: number }[] {
  return buildSpiralWaypoints(cols, rows)
}

/** @deprecated Alias for spiralCourseCoords. */
export const zigzagCourseCoords = (cols: number, rows: number, _steps?: number) =>
  spiralCourseCoords(cols, rows)

/** Bounds of tiles on the logical grid. */
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
 * Map path tiles onto the full table grid (spiral fills every cell).
 */
export function getBoardDisplayLayout(tiles: BoardTile[]) {
  const { minRow, maxRow, minCol, maxCol } = getPathBounds(tiles)
  const spanRows = Math.max(maxRow - minRow + 1, BOARD_ROWS)
  const spanCols = Math.max(maxCol - minCol + 1, BOARD_COLS)

  return {
    spanRows,
    spanCols,
    minRow,
    maxRow,
    minCol,
    maxCol,
    displayRow: (tile: BoardTile) => tile.row - minRow,
    displayCol: (tile: BoardTile) => tile.col - minCol,
  }
}

export type BoardDisplayLayout = ReturnType<typeof getBoardDisplayLayout>

/** Center point (0–100) for pieces / trail. */
export function tileCenterPercent(layout: BoardDisplayLayout, tile: BoardTile) {
  const dc = layout.displayCol(tile)
  const dr = layout.displayRow(tile)
  return {
    left: ((dc + 0.5) / layout.spanCols) * 100,
    top: ((dr + 0.5) / layout.spanRows) * 100,
  }
}

/** Absolute slot for a path tile. */
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
  const coords = spiralCourseCoords(cols, rows)
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
    usedKinkTruths: [],
    usedKinkDares: [],
    usedSpecials: [],
    usedJailPenalties: [],
    usedPromptTexts: [],
    usedQuestionIds: [],
  }
}

const USED_NUMBER_KEYS = [
  'usedTruths',
  'usedDares',
  'usedKinkTruths',
  'usedKinkDares',
  'usedSpecials',
  'usedJailPenalties',
] as const

/** Merge used-index / used-text lists so concurrent patches never drop history. */
export function mergeBoardUsedFields(
  prev: BoardState,
  partial: Partial<BoardState>
): Partial<BoardState> {
  const out: Partial<BoardState> = { ...partial }
  for (const key of USED_NUMBER_KEYS) {
    if (partial[key] == null) continue
    out[key] = [...new Set([...(prev[key] ?? []), ...(partial[key] ?? [])])]
  }
  if (partial.usedPromptTexts != null) {
    const seen = new Set((prev.usedPromptTexts ?? []).map((t) => t.trim().toLowerCase()))
    const merged = [...(prev.usedPromptTexts ?? [])]
    for (const t of partial.usedPromptTexts) {
      const norm = t.trim().toLowerCase()
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      merged.push(t.trim())
    }
    out.usedPromptTexts = merged
  }
  if (partial.usedQuestionIds != null) {
    out.usedQuestionIds = [...new Set([...(prev.usedQuestionIds ?? []), ...partial.usedQuestionIds])]
  }
  return out
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
