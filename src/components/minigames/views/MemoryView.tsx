'use client'

import { useEffect, useRef } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import PhaserGame from './phaser/PhaserGame'
import { makeMemoryScene, MEMORY_W, MEMORY_H, type MemoryBridge } from './phaser/memoryScene'
import { RaceLeaderboard, RoundStatusBar } from './shared'

export function MemoryView(props: GameViewProps) {
  const { session, report } = props
  const bridgeRef = useRef<MemoryBridge>({
    startAt: session.startAt ?? 0,
    endAt: session.endAt ?? null,
    active: session.status === 'live',
    seed: session.seed || 1,
    round: session.round,
    report: () => {},
  })

  useEffect(() => {
    bridgeRef.current.startAt = session.startAt ?? 0
    bridgeRef.current.endAt = session.endAt ?? null
    bridgeRef.current.active = session.status === 'live'
    bridgeRef.current.seed = session.seed || 1
    bridgeRef.current.round = session.round
    bridgeRef.current.report = (p) => report(p)
  }, [session.startAt, session.endAt, session.status, session.seed, session.round, report])

  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={session} now={props.now} />
        <PhaserGame
          sceneFactory={makeMemoryScene}
          bridgeRef={bridgeRef}
          width={MEMORY_W}
          height={MEMORY_H}
          background="#0c1220"
          className="phaser-canvas"
        />
        <p className="race-hint">Same board for everyone — clear all 8 pairs before your friends.</p>
      </div>
      <aside className="race-side">
        <h3>Pairs found</h3>
        <RaceLeaderboard players={props.players} progress={props.progress} playerId={props.playerId} />
      </aside>
    </div>
  )
}
