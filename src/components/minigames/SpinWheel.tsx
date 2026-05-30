'use client'

import { useCallback, useState } from 'react'
import { WHEEL_GAMES, type MinigameMeta } from '@/lib/minigames/catalog'

type Props = {
  onPlay: (game: MinigameMeta) => void
}

export default function SpinWheel({ onPlay }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<MinigameMeta | null>(null)

  const n = WHEEL_GAMES.length
  const slice = 360 / n
  const gradient = WHEEL_GAMES.map(
    (g, i) => `${g.color} ${i * slice}deg ${(i + 1) * slice}deg`
  ).join(', ')

  const spin = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    const pickIndex = Math.floor(Math.random() * n)
    const picked = WHEEL_GAMES[pickIndex]
    const centerAngle = pickIndex * slice + slice / 2
    const spins = 5 + Math.floor(Math.random() * 3)
    const target = spins * 360 + (360 - centerAngle)

    setRotation((prev) => {
      const base = prev % 360
      return prev - base + target
    })

    window.setTimeout(() => {
      setSpinning(false)
      setResult(picked)
    }, 4200)
  }, [spinning, n, slice])

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" aria-hidden>
        ▼
      </div>
      <div className="wheel-outer">
        <div
          className="wheel"
          style={{
            background: `conic-gradient(${gradient})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.2, 1)' : 'none',
          }}
        >
          {WHEEL_GAMES.map((g, i) => {
            const angle = i * slice + slice / 2 - 90
            const rad = (angle * Math.PI) / 180
            const x = 50 + Math.cos(rad) * 32
            const y = 50 + Math.sin(rad) * 32
            return (
              <span key={g.id} className="wheel-label" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                {g.emoji}
              </span>
            )
          })}
        </div>
        <button type="button" className="wheel-hub" onClick={spin} disabled={spinning}>
          {spinning ? '…' : 'SPIN'}
        </button>
      </div>

      {result && (
        <div className="wheel-result card">
          <p>
            <span className="wheel-result-emoji">{result.emoji}</span>{' '}
            <strong>{result.label}</strong>
          </p>
          <p className="wheel-result-blurb">{result.blurb}</p>
          <button type="button" className="btn btn-primary" onClick={() => onPlay(result)}>
            Play {result.label}
          </button>
        </div>
      )}
    </div>
  )
}
