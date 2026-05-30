import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

export type FroggerState = MinigameState & {
  frogs: Record<string, { col: number; row: number; alive: boolean; score: number; lives: number }>
}

export const FROGGER_COLS = 9
export const FROGGER_ROWS = 11
export const FROGGER_START_ROW = FROGGER_ROWS - 1
export const FROGGER_GOAL_ROW = 0
export const FROGGER_LIVES = 3
export const FROGGER_WIN_SCORE = 3

export type TrafficLane = { row: number; dir: 1 | -1; speed: number; length: number; offset: number }

export const TRAFFIC_LANES: TrafficLane[] = [
  { row: 1, dir: 1, speed: 2.2, length: 2, offset: 0 },
  { row: 2, dir: -1, speed: 3, length: 3, offset: 2 },
  { row: 3, dir: 1, speed: 2.5, length: 2, offset: 4 },
  { row: 4, dir: -1, speed: 3.5, length: 3, offset: 1 },
  { row: 6, dir: 1, speed: 2.8, length: 2, offset: 3 },
  { row: 7, dir: -1, speed: 3.2, length: 3, offset: 0 },
  { row: 8, dir: 1, speed: 2.4, length: 2, offset: 5 },
  { row: 9, dir: -1, speed: 3.8, length: 3, offset: 2 },
]

export function createFroggerState(players: Player[]): FroggerState {
  const frogs: FroggerState['frogs'] = {}
  players.forEach((p, i) => {
    frogs[p.id] = {
      col: Math.min(FROGGER_COLS - 1, 1 + i * 2),
      row: FROGGER_START_ROW,
      alive: true,
      score: 0,
      lives: FROGGER_LIVES,
    }
  })
  return { started: false, startedAt: 0, frogs }
}

export function startFroggerState(state: MinigameState): FroggerState {
  return startBase(state as FroggerState)
}

export function carPositions(lane: TrafficLane, elapsedSec: number): number[] {
  const span = FROGGER_COLS + lane.length + 2
  const spacing = Math.max(3, Math.floor(span / 2))
  const positions: number[] = []
  for (let i = 0; i < 2; i++) {
    const base = (elapsedSec * lane.speed * lane.dir + lane.offset + i * spacing) % span
    const head = lane.dir === 1 ? base - lane.length : span - base
    positions.push(Math.round(head))
  }
  return positions
}

export function frogHitByTraffic(col: number, row: number, elapsedSec: number): boolean {
  const lane = TRAFFIC_LANES.find((l) => l.row === row)
  if (!lane) return false
  return carPositions(lane, elapsedSec).some((head) => {
    for (let i = 0; i < lane.length; i++) {
      if (head + i * lane.dir === col) return true
    }
    return false
  })
}

export function moveFrog(state: FroggerState, playerId: string, dCol: number, dRow: number, elapsedSec: number): FroggerState {
  if (state.winnerId) return state
  const frog = state.frogs[playerId]
  if (!frog?.alive) return state

  let col = Math.max(0, Math.min(FROGGER_COLS - 1, frog.col + dCol))
  let row = Math.max(0, Math.min(FROGGER_ROWS - 1, frog.row + dRow))
  let score = frog.score
  let lives = frog.lives
  let alive: boolean = frog.alive

  if (frogHitByTraffic(col, row, elapsedSec)) {
    lives -= 1
    col = frog.col
    row = FROGGER_START_ROW
    if (lives <= 0) alive = false
  } else if (row === FROGGER_GOAL_ROW && frog.row !== FROGGER_GOAL_ROW) {
    score += 1
    row = FROGGER_START_ROW
  }

  const frogs = { ...state.frogs, [playerId]: { col, row, alive, score, lives } }
  let winnerId = state.winnerId ?? null
  let winnerName = state.winnerName ?? null
  if (score >= FROGGER_WIN_SCORE) {
    winnerId = playerId
  }
  return { ...state, frogs, winnerId, winnerName }
}
