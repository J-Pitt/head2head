'use client'

import { useState } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import { scrambleSubmit } from '@/lib/minigames/scramble'

export function ScrambleView({ state, playerId, pushState }: GameViewProps) {
  const [answer, setAnswer] = useState('')
  const answers = state.answers as Record<string, string>
  const scores = state.scores as Record<string, number>
  const done = !!answers[playerId]

  return (
    <div className="arcade-view scramble-view">
      <p className="scramble-word">{state.scrambled as string}</p>
      <p className="arcade-hint">Round {state.round as number} · Score: {scores[playerId] ?? 0}</p>
      <form
        className="join-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (done) return
          pushState(scrambleSubmit(state, playerId, answer))
          setAnswer('')
        }}
      >
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Unscramble…"
          className="chat-input"
          disabled={done || !!state.winnerId}
        />
        <button type="submit" className="btn btn-primary" disabled={done || !!state.winnerId}>
          Submit
        </button>
      </form>
      {done && <p className="arcade-hint">Submitted — waiting for next round…</p>}
    </div>
  )
}
