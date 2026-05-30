'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import PhaserGame from './phaser/PhaserGame'
import { makeFroggerScene, FROGGER_W, FROGGER_H } from './phaser/froggerScene'
import { useGameBridge, RaceLeaderboard, RoundStatusBar, Dpad } from './shared'

export function FroggerView(props: GameViewProps) {
  const bridgeRef = useGameBridge(props)
  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={props.session} now={props.now} />
        <PhaserGame
          sceneFactory={makeFroggerScene}
          bridgeRef={bridgeRef}
          width={FROGGER_W}
          height={FROGGER_H}
          className="phaser-canvas"
        />
        <Dpad onMove={(d) => (bridgeRef.current.pendingMove = d)} />
        <p className="race-hint">Swipe or use arrows / D-pad. Reach the top to score a crossing.</p>
      </div>
      <aside className="race-side">
        <h3>Live standings</h3>
        <RaceLeaderboard players={props.players} progress={props.progress} playerId={props.playerId} />
      </aside>
    </div>
  )
}
