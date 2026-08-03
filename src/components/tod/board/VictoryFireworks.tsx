'use client'

import { useMemo } from 'react'
import BoardPiece from '@/components/tod/BoardPiece'

type Props = {
  winnerName: string
  pieceId: string
  isHost: boolean
  onBackToLobby: () => void
}

const BURST_COLORS = ['#fbbf24', '#f472b6', '#38bdf8', '#a78bfa', '#4ade80', '#fb7185', '#fde68a', '#22d3ee']

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Full-screen win celebration with fireworks + announcement. */
export default function VictoryFireworks({ winnerName, pieceId, isHost, onBackToLobby }: Props) {
  const bursts = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const left = 8 + seeded(i * 3.1) * 84
      const top = 10 + seeded(i * 7.7) * 55
      const delay = seeded(i * 2.4) * 2.2
      const color = BURST_COLORS[i % BURST_COLORS.length]!
      const sparks = Array.from({ length: 12 }, (_, s) => {
        const angle = (s / 12) * Math.PI * 2 + seeded(i + s) * 0.4
        const dist = 40 + seeded(i * 11 + s) * 50
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          delay: delay + s * 0.02,
          color: BURST_COLORS[(i + s) % BURST_COLORS.length]!,
        }
      })
      return { left, top, delay, color, sparks }
    })
  }, [])

  const streamers = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: seeded(i * 5.5) * 100,
        delay: seeded(i * 1.7) * 3,
        duration: 2.2 + seeded(i * 9) * 2,
        color: BURST_COLORS[i % BURST_COLORS.length]!,
        drift: (seeded(i * 4.2) - 0.5) * 80,
      })),
    []
  )

  return (
    <div className="victory-fireworks" role="status" aria-live="assertive">
      <div className="victory-sky" aria-hidden>
        {bursts.map((b, i) => (
          <div
            key={`burst-${i}`}
            className="victory-burst"
            style={{
              left: `${b.left}%`,
              top: `${b.top}%`,
              ['--burst-delay' as string]: `${b.delay}s`,
              ['--burst-color' as string]: b.color,
            }}
          >
            <span className="victory-burst-core" />
            {b.sparks.map((s, si) => (
              <span
                key={si}
                className="victory-spark"
                style={{
                  ['--sx' as string]: `${s.x}px`,
                  ['--sy' as string]: `${s.y}px`,
                  ['--spark-delay' as string]: `${s.delay}s`,
                  ['--spark-color' as string]: s.color,
                }}
              />
            ))}
          </div>
        ))}
        {streamers.map((s, i) => (
          <span
            key={`stream-${i}`}
            className="victory-streamer"
            style={{
              left: `${s.left}%`,
              ['--stream-delay' as string]: `${s.delay}s`,
              ['--stream-dur' as string]: `${s.duration}s`,
              ['--stream-color' as string]: s.color,
              ['--stream-drift' as string]: `${s.drift}px`,
            }}
          />
        ))}
      </div>

      <div className="victory-announce">
        <p className="victory-kicker">🏁 Winner</p>
        <div className="victory-crown" aria-hidden>
          👑
        </div>
        <BoardPiece pieceId={pieceId} size={96} className="victory-piece" />
        <h1 className="victory-title">{winnerName} wins!</h1>
        <p className="victory-sub">They raced around the board and claimed the crown.</p>
        {isHost ? (
          <button type="button" className="btn btn-primary victory-btn" onClick={onBackToLobby}>
            Back to lobby →
          </button>
        ) : (
          <p className="lobby-sub">Waiting for the host…</p>
        )}
      </div>
    </div>
  )
}
