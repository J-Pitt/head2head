'use client'

import { useEffect, useRef } from 'react'
import type { Player } from '@/lib/types'
import type { GameViewProps, Progress } from '@/lib/minigames/types'
import Avatar from '@/components/Avatar'
import type { GameBridge, BridgeRef } from './phaser/PhaserGame'

// Stable bridge object; Phaser reads ref.current after each sync effect.
export function useGameBridge(props: GameViewProps): BridgeRef {
  const ref = useRef<GameBridge>({
    startAt: props.session.startAt ?? 0,
    endAt: props.session.endAt ?? null,
    active: props.session.status === 'live',
    report: () => {},
    pendingMove: null,
    flap: false,
  })
  const { session, report } = props
  useEffect(() => {
    ref.current.startAt = session.startAt ?? 0
    ref.current.endAt = session.endAt ?? null
    ref.current.active = session.status === 'live'
    ref.current.report = (p) => report(p)
  }, [session.startAt, session.endAt, session.status, report])
  return ref as BridgeRef
}

export function RoundStatusBar({
  session,
  now,
}: {
  session: GameViewProps['session']
  now: number
}) {
  let label = ''
  if (session.status === 'live' && session.startAt && now < session.startAt) {
    label = `Starts in ${Math.ceil((session.startAt - now) / 1000)}…`
  } else if (session.status === 'live' && session.endAt) {
    label = `${Math.max(0, Math.ceil((session.endAt - now) / 1000))}s left`
  } else if (session.status === 'over') {
    label = 'Round over'
  }
  return <div className="race-status">{label}</div>
}

export function RaceLeaderboard({
  players,
  progress,
  playerId,
  lowerIsBetter = false,
  unit = '',
}: {
  players: Player[]
  progress: Record<string, Progress>
  playerId: string
  lowerIsBetter?: boolean
  unit?: string
}) {
  const rows = players.map((p) => ({ player: p, prog: progress[p.id] }))
  rows.sort((a, b) => {
    const af = a.prog?.finished ? 1 : 0
    const bf = b.prog?.finished ? 1 : 0
    if (af !== bf) return bf - af
    const as = a.prog?.score ?? 0
    const bs = b.prog?.score ?? 0
    return lowerIsBetter ? as - bs : bs - as
  })
  return (
    <ul className="race-board">
      {rows.map(({ player, prog }, i) => {
        const status = !prog
          ? 'waiting'
          : prog.finished
            ? 'done'
            : prog.alive
              ? 'playing'
              : 'out'
        return (
          <li key={player.id} className={`race-row ${player.id === playerId ? 'me' : ''} ${status}`}>
            <span className="race-rank">{i + 1}</span>
            <span className="race-name">
              <Avatar seed={player.avatar} size={20} className="inline-avatar" /> {player.name}
              {player.id === playerId ? ' (you)' : ''}
            </span>
            <span className="race-score">
              {prog ? `${prog.score}${unit}` : '—'}
              {status === 'out' && ' 💀'}
              {status === 'done' && ' ✅'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function Dpad({ onMove }: { onMove: (d: 'up' | 'down' | 'left' | 'right') => void }) {
  return (
    <div className="dpad">
      <button type="button" className="dpad-btn up" onClick={() => onMove('up')} aria-label="Up">
        ▲
      </button>
      <div className="dpad-mid">
        <button type="button" className="dpad-btn" onClick={() => onMove('left')} aria-label="Left">
          ◀
        </button>
        <button type="button" className="dpad-btn" onClick={() => onMove('right')} aria-label="Right">
          ▶
        </button>
      </div>
      <button type="button" className="dpad-btn down" onClick={() => onMove('down')} aria-label="Down">
        ▼
      </button>
    </div>
  )
}

export function TapButton({ onTap, label }: { onTap: () => void; label: string }) {
  return (
    <button type="button" className="tap-button" onClick={onTap}>
      {label}
    </button>
  )
}
