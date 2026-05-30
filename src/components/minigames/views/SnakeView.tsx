'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import {
  dirFromSwipe,
  snakeSegmentPos,
  snakeSetDirection,
  snakeTick,
  snakeTickProgress,
  type SnakeData,
  type SnakeDir,
} from '@/lib/minigames/snake'
import { avatarEmoji } from '@/lib/avatars'
import { useGameTick } from '../MinigameRouter'

export function SnakeView({ state, players, playerId, pushState, isHost }: GameViewProps) {
  const w = state.gridW as number
  const h = state.gridH as number
  const snakes = state.snakes as Record<string, SnakeData>
  const food = state.food as { x: number; y: number }
  const stateRef = useRef(state)
  stateRef.current = state

  const [frame, setFrame] = useState(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  // Host advances all snakes on the game clock
  useGameTick(
    state.started && !state.winnerId && isHost,
    () => pushState(snakeTick(stateRef.current)),
    state.tickMs as number
  )

  // Smooth animation frame (local interpolation between ticks)
  useEffect(() => {
    if (!state.started) return
    let id = 0
    const loop = () => {
      setFrame(performance.now())
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [state.started])

  const progress = snakeTickProgress(state, frame || Date.now())

  const setDir = useCallback(
    (dir: SnakeDir) => {
      pushState(snakeSetDirection(stateRef.current, playerId, dir))
    },
    [playerId, pushState]
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return
      const map: Record<string, SnakeDir> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }
      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        setDir(dir)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setDir])

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current
    if (!start) return
    const t = e.changedTouches[0]
    const dir = dirFromSwipe(t.clientX - start.x, t.clientY - start.y)
    touchStart.current = null
    if (dir) setDir(dir)
  }

  const mySnake = snakes[playerId]

  return (
    <div className="arcade-view snake-view">
      <div
        ref={boardRef}
        className="snake-board-smooth"
        style={{ aspectRatio: `${w} / ${h}` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Food */}
        <span
          className="snake-food"
          style={{
            left: `${((food.x + 0.5) / w) * 100}%`,
            top: `${((food.y + 0.5) / h) * 100}%`,
          }}
        >
          🍎
        </span>

        {players.map((p) => {
          const s = snakes[p.id]
          if (!s) return null
          const isMe = p.id === playerId
          return s.body.map((seg, i) => {
            const prev = s.prevBody[i] ?? seg
            const pos = snakeSegmentPos(prev, seg, progress)
            const isHead = i === 0
            return (
              <span
                key={`${p.id}-${i}`}
                className={`snake-segment ${isHead ? 'head' : 'tail'} ${isMe ? 'mine' : ''} ${s.alive ? '' : 'dead'}`}
                style={{
                  left: `${((pos.x + 0.5) / w) * 100}%`,
                  top: `${((pos.y + 0.5) / h) * 100}%`,
                  zIndex: isHead ? 3 : 1,
                }}
              >
                {isHead ? avatarEmoji(p.avatar) : ''}
              </span>
            )
          })
        })}
      </div>

      <p className="arcade-hint">
        Score: {mySnake?.score ?? 0} / {state.winScore as number}
        {!mySnake?.alive && ' · Respawn next round'}
      </p>
      <p className="arcade-hint snake-swipe-hint">Swipe on the board to turn · Arrows on keyboard</p>

      <div className="dpad snake-dpad">
        <button type="button" className="dpad-btn" onClick={() => setDir('up')} aria-label="Up">
          ▲
        </button>
        <div className="dpad-mid">
          <button type="button" className="dpad-btn" onClick={() => setDir('left')} aria-label="Left">
            ◀
          </button>
          <button type="button" className="dpad-btn" onClick={() => setDir('down')} aria-label="Down">
            ▼
          </button>
          <button type="button" className="dpad-btn" onClick={() => setDir('right')} aria-label="Right">
            ▶
          </button>
        </div>
      </div>
    </div>
  )
}
