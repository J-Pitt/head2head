'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import { drawGuessAddStroke, drawGuessSubmit } from '@/lib/minigames/drawguess'

export function DrawGuessView({ state, players, playerId, pushState }: GameViewProps) {
  const order = state.playerOrder as string[]
  const drawer = order[(state.drawerIndex as number) % order.length]
  const isDrawer = drawer === playerId
  const strokes = state.strokes as { x: number; y: number }[][]
  const [guess, setGuess] = useState('')
  const drawing = useRef<{ x: number; y: number }[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  function paint() {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#6ee7b7'
    ctx.lineWidth = 3
    for (const stroke of strokes) {
      if (stroke.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y)
      ctx.stroke()
    }
  }

  useEffect(() => {
    paint()
  }, [strokes])

  return (
    <div className="arcade-view">
      <p className="arcade-hint">
        {isDrawer ? `Draw: ${state.secretWord as string}` : `${players.find((p) => p.id === drawer)?.name} is drawing…`}
      </p>
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="draw-canvas"
        onPointerDown={(e) => {
          if (!isDrawer) return
          const r = e.currentTarget.getBoundingClientRect()
          drawing.current = [{ x: e.clientX - r.left, y: e.clientY - r.top }]
        }}
        onPointerMove={(e) => {
          if (!isDrawer || !drawing.current.length) return
          const r = e.currentTarget.getBoundingClientRect()
          drawing.current.push({ x: e.clientX - r.left, y: e.clientY - r.top })
          paint()
        }}
        onPointerUp={() => {
          if (!isDrawer || drawing.current.length < 2) return
          pushState(drawGuessAddStroke(state, playerId, drawing.current))
          drawing.current = []
          setTimeout(paint, 50)
        }}
      />
      {!isDrawer && (
        <form
          className="join-row"
          onSubmit={(e) => {
            e.preventDefault()
            pushState(drawGuessSubmit(state, playerId, guess))
            setGuess('')
          }}
        >
          <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Your guess…" className="chat-input" />
          <button type="submit" className="btn btn-primary">Guess</button>
        </form>
      )}
    </div>
  )
}
