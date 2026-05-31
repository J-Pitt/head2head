'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import PhaserGame from './phaser/PhaserGame'
import { makeMeteorScene, METEOR_W, METEOR_H } from './phaser/meteorScene'
import { useGameBridge, RaceLeaderboard, RoundStatusBar, Dpad } from './shared'

export function MeteorView(props: GameViewProps) {
  const bridgeRef = useGameBridge(props)
  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={props.session} now={props.now} />
        <PhaserGame
          sceneFactory={makeMeteorScene}
          bridgeRef={bridgeRef}
          width={METEOR_W}
          height={METEOR_H}
          className="phaser-canvas"
        />
        <Dpad onMove={(d) => (bridgeRef.current.pendingMove = d)} />
        <p className="race-hint">Dodge the meteors — survive as long as you can.</p>
      </div>
      <aside className="race-side">
        <h3>Live standings</h3>
        <RaceLeaderboard players={props.players} progress={props.progress} playerId={props.playerId} />
      </aside>
    </div>
  )
}
