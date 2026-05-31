'use client'

import type { MinigameId } from '@/lib/minigames/catalog'
import type { GameViewProps } from '@/lib/minigames/types'
import { FroggerView } from './FroggerView'
import { SnakeView } from './SnakeView'
import { FlappyView } from './FlappyView'
import { MemoryView } from './MemoryView'
import { Connect4View } from './Connect4View'
import { DinoView } from './DinoView'

export function GameViewRouter({ gameId, ...props }: GameViewProps & { gameId: MinigameId }) {
  switch (gameId) {
    case 'frogger':
      return <FroggerView {...props} />
    case 'snake':
      return <SnakeView {...props} />
    case 'flappy':
      return <FlappyView {...props} />
    case 'memory':
      return <MemoryView {...props} />
    case 'connect4':
      return <Connect4View {...props} />
    case 'dino':
      return <DinoView {...props} />
    default:
      return <p>Game not found.</p>
  }
}
