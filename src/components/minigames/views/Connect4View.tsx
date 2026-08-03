'use client'

import { useEffect, useRef } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import Avatar from '@/components/Avatar'
import PhaserGame from './phaser/PhaserGame'
import { makeConnect4Scene, C4_W, C4_H, type Connect4Bridge } from './phaser/connect4Scene'

const W = 7
const H = 6
const DISC_COLORS = ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#f97316']

function dropRow(board: number[], col: number): number {
  for (let row = H - 1; row >= 0; row--) {
    if (board[row * W + col] === 0) return row
  }
  return -1
}

function wins(board: number[], v: number): boolean {
  const at = (r: number, c: number) => (r < 0 || c < 0 || r >= H || c >= W ? 0 : board[r * W + c])
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (at(r, c) !== v) continue
      for (const [dr, dc] of dirs) {
        if (at(r + dr, c + dc) === v && at(r + 2 * dr, c + 2 * dc) === v && at(r + 3 * dr, c + 3 * dc) === v) {
          return true
        }
      }
    }
  }
  return false
}

export function Connect4View(props: GameViewProps) {
  const { session, players, playerId, setSession } = props
  const c4 = session.connect4
  const myIndex = players.findIndex((p) => p.id === playerId)
  const myTurn = session.status === 'live' && c4?.turnPlayerId === playerId && myIndex >= 0
  const turnPlayer = players.find((p) => p.id === c4?.turnPlayerId)

  const dropRef = useRef<(col: number) => void>(() => {})
  dropRef.current = (col: number) => {
    if (!c4 || !myTurn) return
    const row = dropRow(c4.board, col)
    if (row < 0) return
    const board = [...c4.board]
    const v = myIndex + 1
    board[row * W + col] = v

    if (wins(board, v)) {
      setSession({
        connect4: { board, turnPlayerId: c4.turnPlayerId, lastCol: col },
        status: 'over',
        winnerId: playerId,
        winnerName: players[myIndex]?.name ?? 'Winner',
      })
      return
    }
    if (board.every((x) => x !== 0)) {
      setSession({
        connect4: { board, turnPlayerId: c4.turnPlayerId, lastCol: col },
        status: 'over',
        winnerId: null,
        winnerName: null,
      })
      return
    }
    const nextId = players[(myIndex + 1) % players.length]?.id ?? c4.turnPlayerId
    setSession({ connect4: { board, turnPlayerId: nextId, lastCol: col } })
  }

  const bridgeRef = useRef<Connect4Bridge>({
    board: c4?.board ?? Array(W * H).fill(0),
    myTurn: false,
    myValue: Math.max(1, myIndex + 1),
    colors: DISC_COLORS,
    status: session.status,
    drop: (col) => dropRef.current(col),
  })

  useEffect(() => {
    bridgeRef.current.board = c4?.board ?? Array(W * H).fill(0)
    bridgeRef.current.myTurn = !!myTurn
    bridgeRef.current.myValue = Math.max(1, myIndex + 1)
    bridgeRef.current.colors = DISC_COLORS
    bridgeRef.current.status = session.status
    bridgeRef.current.drop = (col) => dropRef.current(col)
  }, [c4?.board, myTurn, myIndex, session.status])

  if (!c4) return <p className="race-hint">Setting up the board…</p>

  return (
    <div className="race-layout">
      <div className="race-main">
        <div className="c4-turn">
          {session.status === 'over' ? (
            session.winnerId ? `${session.winnerName} connected four!` : "It's a draw!"
          ) : myTurn ? (
            <strong>Your turn</strong>
          ) : (
            <>
              Waiting for{' '}
              {turnPlayer ? (
                <>
                  <Avatar seed={turnPlayer.avatar} size={20} className="inline-avatar" /> {turnPlayer.name}
                </>
              ) : (
                '…'
              )}
            </>
          )}
        </div>

        <PhaserGame
          sceneFactory={makeConnect4Scene}
          bridgeRef={bridgeRef}
          width={C4_W}
          height={C4_H}
          background="#0b1220"
          className="phaser-canvas"
        />
      </div>

      <aside className="race-side">
        <h3>Players</h3>
        <ul className="c4-players">
          {players.map((p, i) => (
            <li key={p.id} className={c4.turnPlayerId === p.id && session.status === 'live' ? 'active' : ''}>
              <span className="c4-chip" style={{ background: DISC_COLORS[i % DISC_COLORS.length] }} />
              <Avatar seed={p.avatar} size={20} className="inline-avatar" /> {p.name}
              {p.id === playerId ? ' (you)' : ''}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
