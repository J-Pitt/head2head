'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import { RaceLeaderboard, RoundStatusBar } from './shared'

export function ReactionView(props: GameViewProps) {
  const { session, now } = props
  const startAt = session.startAt ?? now
  const goAt = session.goAt ?? startAt + 2500

  const [result, setResult] = useState<number | 'early' | null>(null)
  const reported = useRef(false)

  useEffect(() => {
    setResult(null)
    reported.current = false
  }, [session.round])

  const started = now >= startAt
  const green = started && now >= goAt
  const live = session.status === 'live'

  let phase: 'ready' | 'wait' | 'go' | 'done' | 'early' = 'ready'
  if (!started) phase = 'ready'
  else if (result === 'early') phase = 'early'
  else if (result != null) phase = 'done'
  else if (green) phase = 'go'
  else phase = 'wait'

  function tap() {
    if (!live || reported.current || !started) return
    // Use the precise wall clock for the measurement, not the 100ms React tick.
    const t = Date.now()
    if (t < goAt) {
      reported.current = true
      setResult('early')
      props.report({ score: 99999, alive: false, finished: true, finishAt: 99999 })
      return
    }
    const ms = Math.round(t - goAt)
    reported.current = true
    setResult(ms)
    props.report({ score: ms, alive: true, finished: true, finishAt: ms })
  }

  const label =
    phase === 'ready'
      ? 'Get ready…'
      : phase === 'wait'
        ? 'Wait for GREEN…'
        : phase === 'go'
          ? 'TAP NOW!'
          : phase === 'early'
            ? 'Too soon! ❌'
            : `${result} ms`

  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={session} now={now} />
        <button
          type="button"
          className={`reaction-pad big ${phase === 'go' ? 'go' : phase === 'wait' ? 'ready' : phase === 'early' ? 'early' : 'done'}`}
          onClick={tap}
          disabled={!live || reported.current}
        >
          {label}
        </button>
        <p className="race-hint">Tap the moment it turns green. Tap early and you&apos;re out for the round.</p>
      </div>
      <aside className="race-side">
        <h3>Reaction times</h3>
        <RaceLeaderboard
          players={props.players}
          progress={props.progress}
          playerId={props.playerId}
          lowerIsBetter
          unit="ms"
        />
      </aside>
    </div>
  )
}
