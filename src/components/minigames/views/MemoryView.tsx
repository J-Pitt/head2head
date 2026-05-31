'use client'

import { useMemo, useRef, useState } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import { seededShuffle } from '@/lib/minigames/rng'
import { RaceLeaderboard, RoundStatusBar } from './shared'

const FACES = ['🍎', '🚀', '🐙', '🎸', '🍕', '🌈', '👾', '⚽']

function MemoryGrid({
  deck,
  session,
  now,
  report,
}: {
  deck: string[]
  session: GameViewProps['session']
  now: number
  report: GameViewProps['report']
}) {
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const reportedDone = useRef(false)

  const started = session.startAt != null && now >= session.startAt
  const locked = !started || session.status !== 'live' || busy

  function flip(i: number) {
    if (locked || flipped.includes(i) || matched.includes(i)) return
    const next = [...flipped, i]
    setFlipped(next)
    if (next.length === 2) {
      setBusy(true)
      const [a, b] = next
      if (deck[a] === deck[b]) {
        const nextMatched = [...matched, a, b]
        setMatched(nextMatched)
        setFlipped([])
        setBusy(false)
        const pairs = nextMatched.length / 2
        if (nextMatched.length === deck.length) {
          reportedDone.current = true
          const startAt = session.startAt ?? now
          report({ score: pairs, finished: true, finishAt: now - startAt })
        } else {
          report({ score: pairs })
        }
      } else {
        setTimeout(() => {
          setFlipped([])
          setBusy(false)
        }, 700)
      }
    }
  }

  return (
    <div className="memory-grid">
      {deck.map((face, i) => {
        const open = flipped.includes(i) || matched.includes(i)
        return (
          <button
            key={i}
            type="button"
            className={`memory-card ${open ? 'open' : ''} ${matched.includes(i) ? 'matched' : ''}`}
            onClick={() => flip(i)}
            disabled={locked && !open}
          >
            {open ? face : '?'}
          </button>
        )
      })}
    </div>
  )
}

export function MemoryView(props: GameViewProps) {
  const { session, now } = props
  const deck = useMemo(
    () => seededShuffle([...FACES, ...FACES], session.seed || 1),
    [session.seed]
  )

  return (
    <div className="race-layout">
      <div className="race-main">
        <RoundStatusBar session={session} now={now} />
        <MemoryGrid
          key={`${session.round}-${session.seed}`}
          deck={deck}
          session={session}
          now={now}
          report={props.report}
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
