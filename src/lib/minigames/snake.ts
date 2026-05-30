import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

export const SNAKE_W = 16
export const SNAKE_H = 16
export const SNAKE_TICK_MS = 130
export const SNAKE_DIRS = ['up', 'down', 'left', 'right'] as const
export type SnakeDir = (typeof SNAKE_DIRS)[number]

export type SnakeData = {
  body: { x: number; y: number }[]
  prevBody: { x: number; y: number }[]
  dir: SnakeDir
  nextDir: SnakeDir
  alive: boolean
  score: number
}

const OPPOSITE: Record<SnakeDir, SnakeDir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

function spawnFood(w: number, h: number, snakes: Record<string, SnakeData>) {
  const occupied = new Set<string>()
  for (const s of Object.values(snakes)) {
    for (const b of s.body) occupied.add(`${b.x},${b.y}`)
  }
  let x = 0
  let y = 0
  for (let attempt = 0; attempt < 80; attempt++) {
    x = Math.floor(Math.random() * w)
    y = Math.floor(Math.random() * h)
    if (!occupied.has(`${x},${y}`)) return { x, y }
  }
  return { x: Math.floor(w / 2), y: Math.floor(h / 2) }
}

export function createSnakeState(players: Player[]): MinigameState {
  const snakes: Record<string, SnakeData> = {}
  players.forEach((p, i) => {
    const hx = 3 + (i % 4) * 3
    const hy = SNAKE_H - 2 - Math.floor(i / 4) * 2
    const body = [
      { x: hx, y: hy },
      { x: hx, y: hy + 1 },
      { x: hx, y: hy + 2 },
    ]
    snakes[p.id] = {
      body,
      prevBody: body.map((b) => ({ ...b })),
      dir: 'up',
      nextDir: 'up',
      alive: true,
      score: 0,
    }
  })
  return {
    started: false,
    startedAt: 0,
    snakes,
    food: spawnFood(SNAKE_W, SNAKE_H, snakes),
    gridW: SNAKE_W,
    gridH: SNAKE_H,
    winScore: 8,
    tickMs: SNAKE_TICK_MS,
    lastTickAt: 0,
  }
}

export function startSnakeState(state: MinigameState) {
  const s = startBase(state)
  return { ...s, lastTickAt: Date.now() }
}

export function snakeSetDirection(state: MinigameState, playerId: string, dir: string): MinigameState {
  if (!SNAKE_DIRS.includes(dir as SnakeDir) || state.winnerId) return state
  const snakes = { ...(state.snakes as Record<string, SnakeData>) }
  const s = snakes[playerId]
  if (!s?.alive) return state
  const d = dir as SnakeDir
  if (d === OPPOSITE[s.dir]) return state
  snakes[playerId] = { ...s, nextDir: d }
  return { ...state, snakes }
}

function stepHead(head: { x: number; y: number }, dir: SnakeDir) {
  const h = { ...head }
  if (dir === 'up') h.y -= 1
  else if (dir === 'down') h.y += 1
  else if (dir === 'left') h.x -= 1
  else h.x += 1
  return h
}

export function snakeTick(state: MinigameState): MinigameState {
  if (!state.started || state.winnerId) return state

  const w = state.gridW as number
  const h = state.gridH as number
  const snakes = { ...(state.snakes as Record<string, SnakeData>) }
  let food = { ...(state.food as { x: number; y: number }) }
  let winnerId = state.winnerId ?? null

  for (const id of Object.keys(snakes)) {
    const s = snakes[id]
    if (!s.alive) continue

    const dir = s.nextDir !== OPPOSITE[s.dir] ? s.nextDir : s.dir
    const prevBody = s.body.map((b) => ({ ...b }))
    const head = stepHead(s.body[0], dir)

    if (head.x < 0 || head.x >= w || head.y < 0 || head.y >= h) {
      snakes[id] = { ...s, dir, prevBody, alive: false }
      continue
    }

    let hit = false
    const willEat = head.x === food.x && head.y === food.y
    for (const [oid, other] of Object.entries(snakes)) {
      for (let bi = 0; bi < other.body.length; bi++) {
        if (oid === id && bi === other.body.length - 1 && !willEat) continue
        const b = other.body[bi]
        if (b.x === head.x && b.y === head.y) {
          hit = true
          break
        }
      }
      if (hit) break
    }
    if (hit) {
      snakes[id] = { ...s, dir, prevBody, alive: false }
      continue
    }

    const body = [head, ...s.body]
    let score = s.score
    if (head.x === food.x && head.y === food.y) {
      score += 1
      food = spawnFood(w, h, snakes)
      if (score >= (state.winScore as number)) winnerId = id
    } else {
      body.pop()
    }

    snakes[id] = { ...s, dir, nextDir: dir, prevBody, body, score }
  }

  return { ...state, snakes, food, winnerId, lastTickAt: Date.now() }
}

/** 0–1 progress into current tick for smooth rendering */
export function snakeTickProgress(state: MinigameState, now = Date.now()) {
  const last = (state.lastTickAt as number) || 0
  const ms = (state.tickMs as number) || SNAKE_TICK_MS
  if (!last) return 1
  return Math.min(1, Math.max(0, (now - last) / ms))
}

export function snakeSegmentPos(
  prev: { x: number; y: number } | undefined,
  curr: { x: number; y: number },
  progress: number
) {
  if (!prev) return curr
  return {
    x: prev.x + (curr.x - prev.x) * progress,
    y: prev.y + (curr.y - prev.y) * progress,
  }
}

export function dirFromSwipe(dx: number, dy: number): SnakeDir | null {
  const min = 28
  if (Math.hypot(dx, dy) < min) return null
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}
