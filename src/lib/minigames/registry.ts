import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { createFroggerState, startFroggerState } from './frogger'
import { createSnakeState, startSnakeState } from './snake'
import { createPongState, startPongState } from './pong'
import { createBreakoutState, startBreakoutState } from './breakout'
import { createAsteroidsState, startAsteroidsState } from './asteroids'
import { createMemoryState, startMemoryState } from './memory'
import { createFlappyState, startFlappyState } from './flappy'
import { createTetrisState, startTetrisState } from './tetris'
import { createDrawGuessState, startDrawGuessState } from './drawguess'
import { createReactionState, startReactionState } from './reaction'
import { createConnect4State, startConnect4State } from './connect4'
import { createScrambleState, startScrambleState } from './scramble'
import type { MinigameId } from './catalog'

type Factory = {
  create: (players: Player[]) => MinigameState
  start: (state: MinigameState) => MinigameState
}

export const GAME_FACTORIES: Record<MinigameId, Factory> = {
  frogger: { create: (p) => createFroggerState(p), start: (s) => startFroggerState(s) },
  snake: { create: (p) => createSnakeState(p), start: (s) => startSnakeState(s) },
  pong: { create: (p) => createPongState(p), start: (s) => startPongState(s) },
  breakout: { create: (p) => createBreakoutState(p), start: (s) => startBreakoutState(s) },
  asteroids: { create: (p) => createAsteroidsState(p), start: (s) => startAsteroidsState(s) },
  memory: { create: (p) => createMemoryState(p), start: (s) => startMemoryState(s) },
  flappy: { create: (p) => createFlappyState(p), start: (s) => startFlappyState(s) },
  tetris: { create: (p) => createTetrisState(p), start: (s) => startTetrisState(s) },
  drawguess: { create: (p) => createDrawGuessState(p), start: (s) => startDrawGuessState(s) },
  reaction: { create: (p) => createReactionState(p), start: (s) => startReactionState(s) },
  connect4: { create: (p) => createConnect4State(p), start: (s) => startConnect4State(s) },
  scramble: { create: (p) => createScrambleState(p), start: (s) => startScrambleState(s) },
}

export function createGameState(gameId: MinigameId, players: Player[]) {
  return GAME_FACTORIES[gameId].create(players)
}

export function startGameState(gameId: MinigameId, state: MinigameState) {
  return GAME_FACTORIES[gameId].start(state)
}
