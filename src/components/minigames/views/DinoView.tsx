'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import PhaserGame from './phaser/PhaserGame'
import { makeDinoScene, DINO_W, DINO_H } from './phaser/dinoScene'
import { useGameBridge, RaceLeaderboard, RoundStatusBar, TapButton } from './shared'

export function DinoView(props: GameViewProps) {
  const bridgeRef = useGameBridge(props)
  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={props.session} now={props.now} />
        <PhaserGame
          sceneFactory={makeDinoScene}
          bridgeRef={bridgeRef}
          width={DINO_W}
          height={DINO_H}
          background="#f7f7f7"
          className="phaser-canvas phaser-canvas-dino"
        />
        <TapButton label="JUMP 🦖" onTap={() => (bridgeRef.current.flap = true)} />
        <p className="race-hint">Tap, press space, or hit Jump to leap over cacti — highest score wins.</p>
      </div>
      <aside className="race-side">
        <h3>Live standings</h3>
        <RaceLeaderboard players={props.players} progress={props.progress} playerId={props.playerId} />
      </aside>
    </div>
  )
}
