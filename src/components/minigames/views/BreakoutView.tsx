'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import PhaserGame from './phaser/PhaserGame'
import { makeBreakoutScene, BREAKOUT_W, BREAKOUT_H } from './phaser/breakoutScene'
import { useGameBridge, RaceLeaderboard, RoundStatusBar, Dpad } from './shared'

export function BreakoutView(props: GameViewProps) {
  const bridgeRef = useGameBridge(props)
  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={props.session} now={props.now} />
        <PhaserGame
          sceneFactory={makeBreakoutScene}
          bridgeRef={bridgeRef}
          width={BREAKOUT_W}
          height={BREAKOUT_H}
          className="phaser-canvas"
        />
        <Dpad onMove={(d) => (bridgeRef.current.pendingMove = d)} />
        <p className="race-hint">Move the paddle — smash bricks before the ball drops.</p>
      </div>
      <aside className="race-side">
        <h3>Live standings</h3>
        <RaceLeaderboard players={props.players} progress={props.progress} playerId={props.playerId} />
      </aside>
    </div>
  )
}
