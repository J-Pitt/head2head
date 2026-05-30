'use client'

import type { MinigameId } from '@/lib/minigames/catalog'
import type { GameViewProps } from '@/lib/minigames/types'
import { FroggerView } from './FroggerView'
import { SnakeView } from './SnakeView'
import { PongView } from './PongView'
import { BreakoutView } from './BreakoutView'
import { AsteroidsView } from './AsteroidsView'
import { MemoryView } from './MemoryView'
import { FlappyView } from './FlappyView'
import { TetrisView } from './TetrisView'
import { DrawGuessView } from './DrawGuessView'
import { ReactionView } from './ReactionView'
import { Connect4View } from './Connect4View'
import { ScrambleView } from './ScrambleView'

export function GameViewRouter({ gameId, ...props }: GameViewProps & { gameId: MinigameId }) {
  switch (gameId) {
    case 'frogger':
      return <FroggerView {...props} />
    case 'snake':
      return <SnakeView {...props} />
    case 'pong':
      return <PongView {...props} />
    case 'breakout':
      return <BreakoutView {...props} />
    case 'asteroids':
      return <AsteroidsView {...props} />
    case 'memory':
      return <MemoryView {...props} />
    case 'flappy':
      return <FlappyView {...props} />
    case 'tetris':
      return <TetrisView {...props} />
    case 'drawguess':
      return <DrawGuessView {...props} />
    case 'reaction':
      return <ReactionView {...props} />
    case 'connect4':
      return <Connect4View {...props} />
    case 'scramble':
      return <ScrambleView {...props} />
    default:
      return <p>Game not found.</p>
  }
}
