'use client'

import type { GameViewProps } from '@/lib/minigames/types'
import Avatar from '@/components/Avatar'

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
  if (!c4) return <p className="race-hint">Setting up the board…</p>

  const myIndex = players.findIndex((p) => p.id === playerId)
  const myTurn = session.status === 'live' && c4.turnPlayerId === playerId && myIndex >= 0
  const turnPlayer = players.find((p) => p.id === c4.turnPlayerId)

  function drop(col: number) {
    if (!myTurn) return
    const row = dropRow(c4!.board, col)
    if (row < 0) return
    const board = [...c4!.board]
    const v = myIndex + 1
    board[row * W + col] = v

    if (wins(board, v)) {
      setSession({
        connect4: { board, turnPlayerId: c4!.turnPlayerId, lastCol: col },
        status: 'over',
        winnerId: playerId,
        winnerName: players[myIndex]?.name ?? 'Winner',
      })
      return
    }
    if (board.every((x) => x !== 0)) {
      setSession({
        connect4: { board, turnPlayerId: c4!.turnPlayerId, lastCol: col },
        status: 'over',
        winnerId: null,
        winnerName: null,
      })
      return
    }
    const nextId = players[(myIndex + 1) % players.length]?.id ?? c4!.turnPlayerId
    setSession({ connect4: { board, turnPlayerId: nextId, lastCol: col } })
  }

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

        <div className="connect4-cols">
          {Array.from({ length: W }).map((_, col) => (
            <button
              key={col}
              type="button"
              className="c4-drop"
              onClick={() => drop(col)}
              disabled={!myTurn || dropRow(c4.board, col) < 0}
              aria-label={`Drop in column ${col + 1}`}
            >
              ▼
            </button>
          ))}
        </div>

        <div className="connect4-board">
          {c4.board.map((v, i) => (
            <div
              key={i}
              className="connect4-cell"
              style={v > 0 ? { background: DISC_COLORS[(v - 1) % DISC_COLORS.length] } : undefined}
            />
          ))}
        </div>
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
