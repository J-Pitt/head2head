'use client'

import { useState } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import { RaceLeaderboard, RoundStatusBar } from './shared'

export function ReactionView(props: GameViewProps) {
  const { session, now } = props
  const startAt = session.startAt ?? now
  const goAt = session.goAt ?? startAt + 2500

  const [result, setResult] = useState<number | 'early' | null>(null)
  const [reported, setReported] = useState(false)

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
    if (!live || reported || !started) return
    const t = Date.now()
    if (t < goAt) {
      setReported(true)
      setResult('early')
      props.report({ score: 99999, alive: false, finished: true, finishAt: 99999 })
      return
    }
    const ms = Math.round(t - goAt)
    setReported(true)
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
          key={session.round}
          type="button"
          className={`reaction-pad big ${phase === 'go' ? 'go' : phase === 'wait' ? 'ready' : phase === 'early' ? 'early' : 'done'}`}
          onClick={tap}
          disabled={!live || reported}
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
