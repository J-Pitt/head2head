'use client'

import { useEffect, useState } from 'react'

type Props = {
  deadline: number
  label?: string
  onExpire?: () => void
  active?: boolean
}

export default function GameTimer({ deadline, label = 'Time left', onExpire, active = true }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()))

  useEffect(() => {
    if (!active) return
    const tick = () => {
      const left = Math.max(0, deadline - Date.now())
      setRemaining(left)
      if (left <= 0) onExpire?.()
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [deadline, active, onExpire])

  const sec = Math.ceil(remaining / 1000)
  const urgent = sec <= 5

  return (
    <div className={`game-timer ${urgent ? 'urgent' : ''}`} role="timer" aria-live="polite">
      <span className="timer-label">{label}</span>
      <span className="timer-value">{active ? sec : '—'}</span>
    </div>
  )
}
