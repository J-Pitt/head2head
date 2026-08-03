'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import PhaserGame from './phaser/PhaserGame'
import { makePongScene, PONG_W, PONG_H } from './phaser/pongScene'
import { useGameBridge, RaceLeaderboard, RoundStatusBar, Dpad } from './shared'

export function PongView(props: GameViewProps) {
  const bridgeRef = useGameBridge(props)
  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={props.session} now={props.now} />
        <PhaserGame
          sceneFactory={makePongScene}
          bridgeRef={bridgeRef}
          width={PONG_W}
          height={PONG_H}
          className="phaser-canvas"
        />
        <Dpad onMove={(d) => (bridgeRef.current.pendingMove = d)} />
        <p className="race-hint">Keep the rally alive — ball speeds up every hit.</p>
      </div>
      <aside className="race-side">
        <h3>Live standings</h3>
        <RaceLeaderboard players={props.players} progress={props.progress} playerId={props.playerId} />
      </aside>
    </div>
  )
}
