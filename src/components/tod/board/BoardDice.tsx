'use client'

import { useEffect, useRef, useState } from 'react'

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

export const DICE_ANIM_MS = 1600

export function DiceFace({ value, rolling }: { value: number; rolling?: boolean }) {
  const on = new Set(PIPS[value] ?? PIPS[1])
  return (
    <div className={`board-dice-face${rolling ? ' board-dice-face-rolling' : ''}`} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`board-dice-pip${on.has(i) ? ' on' : ''}`} />
      ))}
    </div>
  )
}

type OverlayProps = {
  value: number
  rollerName?: string
  onDone: () => void
}

/** Full-board tumble animation that lands on `value`, then calls onDone. */
export function DiceRollOverlay({ value, rollerName, onDone }: OverlayProps) {
  const [face, setFace] = useState(() => 1 + Math.floor(Math.random() * 6))
  const [phase, setPhase] = useState<'spin' | 'land'>('spin')
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    let tick = 0
    const spin = window.setInterval(() => {
      tick += 1
      setFace(1 + Math.floor(Math.random() * 6))
      if (tick > 14) {
        window.clearInterval(spin)
        setFace(value)
        setPhase('land')
      }
    }, 70)

    const done = window.setTimeout(() => onDoneRef.current(), DICE_ANIM_MS)
    return () => {
      window.clearInterval(spin)
      window.clearTimeout(done)
    }
  }, [value])

  return (
    <div className={`board-dice-overlay board-dice-overlay-${phase}`} role="status" aria-live="polite">
      <div className="board-dice-overlay-card">
        <p className="board-dice-overlay-label">
          {rollerName ? `${rollerName} rolled` : 'Rolling…'}
        </p>
        <div className={`board-dice-tumble${phase === 'spin' ? ' is-spinning' : ' is-landed'}`}>
          <DiceFace value={face} rolling={phase === 'spin'} />
        </div>
        {phase === 'land' && <p className="board-dice-overlay-result">{value}</p>}
      </div>
    </div>
  )
}
