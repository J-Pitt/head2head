'use client'

import { useEffect, useRef } from 'react'

type PhaserModule = typeof import('phaser')

// Shared, mutable contract between React and the Phaser scene. React keeps the
// values fresh; the scene reads `bridgeRef.current` every frame.
export type GameBridge = {
  startAt: number
  endAt: number | null
  active: boolean
  report: (p: { score: number; alive: boolean; finished: boolean }) => void
  // Queued discrete input from on-screen buttons (consumed by the scene).
  pendingMove: 'up' | 'down' | 'left' | 'right' | null
  flap: boolean
}

export type BridgeRef = { current: GameBridge }

export type SceneCtor = new (...args: unknown[]) => Phaser.Scene

export type SceneFactory = (PhaserLib: PhaserModule, bridgeRef: BridgeRef) => SceneCtor

type Props = {
  sceneFactory: SceneFactory
  bridgeRef: BridgeRef
  width: number
  height: number
  background?: string
  className?: string
}

export default function PhaserGame({
  sceneFactory,
  bridgeRef,
  width,
  height,
  background = '#0b0e16',
  className,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let destroyed = false
    let game: Phaser.Game | null = null

    import('phaser').then((mod) => {
      const PhaserLib = ((mod as { default?: PhaserModule }).default ?? mod) as PhaserModule
      if (destroyed || !parentRef.current) return
      const SceneClass = sceneFactory(PhaserLib, bridgeRef)
      game = new PhaserLib.Game({
        type: PhaserLib.AUTO,
        width,
        height,
        parent: parentRef.current,
        backgroundColor: background,
        scale: { mode: PhaserLib.Scale.FIT, autoCenter: PhaserLib.Scale.CENTER_BOTH },
        scene: SceneClass,
        banner: false,
        audio: { noAudio: true },
        fps: { target: 60 },
      })
    })

    return () => {
      destroyed = true
      if (game) game.destroy(true)
    }
    // Create the game exactly once; live values flow through bridgeRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={parentRef} className={className} style={{ width: '100%', maxWidth: width }} />
}
