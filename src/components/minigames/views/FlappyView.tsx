'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import PhaserGame from './phaser/PhaserGame'
import { makeFlappyScene, FLAPPY_W, FLAPPY_H } from './phaser/flappyScene'
import { useGameBridge, RaceLeaderboard, RoundStatusBar, TapButton } from './shared'

export function FlappyView(props: GameViewProps) {
  const bridgeRef = useGameBridge(props)
  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={props.session} now={props.now} />
        <PhaserGame
          sceneFactory={makeFlappyScene}
          bridgeRef={bridgeRef}
          width={FLAPPY_W}
          height={FLAPPY_H}
          className="phaser-canvas"
        />
        <TapButton label="FLAP 🐦" onTap={() => (bridgeRef.current.flap = true)} />
        <p className="race-hint">Tap the screen, press space, or hit Flap to stay airborne.</p>
      </div>
      <aside className="race-side">
        <h3>Live standings</h3>
        <RaceLeaderboard players={props.players} progress={props.progress} playerId={props.playerId} />
      </aside>
    </div>
  )
}
