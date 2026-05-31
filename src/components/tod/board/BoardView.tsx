'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import BoardPiece from '@/components/tod/BoardPiece'
import type { useTodRoom } from '@/hooks/useTodRoom'
import { TILE_META, SPECIAL_CHALLENGES } from '@/lib/tod/board'
import type { BoardTile } from '@/lib/tod/board'
import { getQuestionById } from '@/lib/trivia'
import { randomTodPrompt } from '@/lib/tod/prompts'
import { getMinigame } from '@/lib/minigames/catalog'
import type { GameViewProps } from '@/lib/minigames/types'
import { GameViewRouter } from '@/components/minigames/views/GameViewRouter'
import { RaceLeaderboard } from '@/components/minigames/views/shared'

type Room = ReturnType<typeof useTodRoom>

const PIECE_STEP_MS = 165

export default function BoardView({ room }: { room: Room }) {
  const b = room.state?.board
  if (!b) return null

  return (
    <>
      <BoardTrack room={room} />
      <Resolution room={room} />
    </>
  )
}

function arrowFor(tile: BoardTile, next: BoardTile | undefined): string | null {
  if (!next) return null
  if (next.col > tile.col) return '→'
  if (next.col < tile.col) return '←'
  if (next.row > tile.row) return '↓'
  if (next.row < tile.row) return '↑'
  return null
}

function BoardTrack({ room }: { room: Room }) {
  const b = room.state!.board!
  const cols = b.cols ?? b.size ?? 4
  const rows = b.rows ?? b.size ?? 9

  return (
    <section className="card board-card">
      <p className="board-legend">🚦 Start → follow the path → 🏁 Finish</p>
      <div className="board-track">
        <div
          className="board-grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {b.tiles.map((tile, idx) => (
            <Tile
              key={tile.i}
              tile={tile}
              arrow={arrowFor(tile, b.tiles[idx + 1])}
            />
          ))}
        </div>
        <AnimatedPieces room={room} />
      </div>
    </section>
  )
}

function AnimatedPieces({ room }: { room: Room }) {
  const b = room.state!.board!
  const cols = b.cols ?? b.size ?? 4
  const rows = b.rows ?? b.size ?? 9
  const [displayPos, setDisplayPos] = useState<Record<string, number>>(() => ({ ...b.positions }))
  const animPosRef = useRef<Record<string, number>>({ ...b.positions })
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const isFirstRef = useRef(true)

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false
      animPosRef.current = { ...b.positions }
      setDisplayPos({ ...b.positions })
      return
    }

    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    const prev = { ...animPosRef.current }
    const next = b.positions
    let maxDelay = 0
    let anyMoving = false

    for (const p of room.players) {
      const from = prev[p.id] ?? 0
      const to = next[p.id] ?? 0
      if (from === to) continue
      anyMoving = true

      const step = from < to ? 1 : -1
      let current = from
      let delay = 0

      while (current !== to) {
        current += step
        const tileIdx = current
        const at = delay
        timersRef.current.push(
          setTimeout(() => {
            animPosRef.current = { ...animPosRef.current, [p.id]: tileIdx }
            setDisplayPos((d) => ({ ...d, [p.id]: tileIdx }))
          }, at)
        )
        delay += PIECE_STEP_MS
      }
      maxDelay = Math.max(maxDelay, delay)
    }

    if (!anyMoving) {
      animPosRef.current = { ...next }
      setDisplayPos({ ...next })
      return
    }

    timersRef.current.push(
      setTimeout(() => {
        animPosRef.current = { ...next }
      }, maxDelay)
    )

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [b.positions, room.players])

  const byTile: Record<number, typeof room.players> = {}
  for (const p of room.players) {
    const idx = displayPos[p.id] ?? b.positions[p.id] ?? 0
    ;(byTile[idx] ||= []).push(p)
  }

  return (
    <div className="board-pieces-layer" aria-hidden="false">
      {Object.entries(byTile).map(([idxStr, players]) => {
        const idx = Number(idxStr)
        const tile = b.tiles[idx]
        if (!tile) return null
        return players.map((p, i) => (
          <div
            key={p.id}
            className="board-piece-anim"
            style={{
              left: `${((tile.col + 0.5) / cols) * 100}%`,
              top: `${((tile.row + 0.5) / rows) * 100}%`,
              ['--stack' as string]: i,
              ['--stack-total' as string]: players.length,
            }}
            title={p.name}
          >
            <BoardPiece pieceId={p.avatar} size={28} className="tile-token board-piece-moving" />
          </div>
        ))
      })}
    </div>
  )
}

function Tile({
  tile,
  arrow,
}: {
  tile: BoardTile
  arrow: string | null
}) {
  const meta = TILE_META[tile.type]
  const special = tile.type === 'special' && tile.special != null ? SPECIAL_CHALLENGES[tile.special] : null
  const endpoint = tile.type === 'start' || tile.type === 'finish'
  return (
    <div
      className={`board-tile tile-${tile.type}`}
      style={{ gridColumn: tile.col + 1, gridRow: tile.row + 1, ['--tile' as string]: meta.color }}
      title={special ? special.label : meta.label}
    >
      <span className="tile-emoji">{special ? special.icon : meta.emoji}</span>
      {endpoint ? (
        <span className="tile-label">{tile.type === 'start' ? 'START' : 'FINISH'}</span>
      ) : (
        <span className="tile-num">{tile.i}</span>
      )}
      {arrow && !endpoint && <span className="tile-arrow">{arrow}</span>}
    </div>
  )
}

function Resolution({ room }: { room: Room }) {
  const b = room.state!.board!
  const playerById = (id: string | null) => room.players.find((p) => p.id === id) ?? null
  const roller = playerById(b.rollerId)

  if (b.phase === 'finished') {
    const winner = playerById(b.winnerId)
    return (
      <section className="card tod-stage">
        <p className="tod-kicker">🏁 Race over</p>
        <div className="tod-onspot">
          {winner && <BoardPiece pieceId={winner.avatar} size={72} />}
          <h2>{b.winnerName ?? 'Someone'} reached the finish! 🎉</h2>
        </div>
        {room.isHost ? (
          <button type="button" className="btn btn-primary full" onClick={room.restartBoard}>
            Back to lobby →
          </button>
        ) : (
          <p className="lobby-sub">Waiting for the host…</p>
        )}
      </section>
    )
  }

  if (b.phase === 'rolling') {
    const myTurn = b.rollerId === room.playerId
    return (
      <section className="card tod-stage">
        <p className="tod-kicker">Roll the dice 🎲</p>
        <div className="tod-onspot">
          {roller && <BoardPiece pieceId={roller.avatar} size={64} />}
          <h2>{myTurn ? "Your roll!" : `${roller?.name ?? 'Someone'}'s turn`}</h2>
        </div>
        {myTurn ? (
          <button type="button" className="btn btn-primary full dice-roll" onClick={room.rollDice}>
            🎲 Roll
          </button>
        ) : (
          <p className="lobby-sub">Waiting for {roller?.name ?? 'them'} to roll…</p>
        )}
        {room.isHost && (
          <button type="button" className="btn-ghost btn-sm tod-end" onClick={room.restartBoard}>
            End game to lobby
          </button>
        )}
      </section>
    )
  }

  if (b.phase === 'prompt' || b.phase === 'forfeit') {
    return <BoardPrompt room={room} />
  }

  if (b.phase === 'trivia') {
    return <BoardTrivia room={room} />
  }

  if (b.phase === 'minigame' && b.minigame && b.minigame.gameId) {
    const meta = getMinigame(b.minigame.gameId)
    const viewProps: GameViewProps = {
      session: b.minigame,
      players: room.players,
      progress: room.progress,
      playerId: room.playerId,
      isHost: room.isHost,
      report: room.boardReport,
      setSession: room.setBoardMinigameSession,
      startRound: () => {},
      now: room.now,
    }
    return (
      <section className="card minigame-play-shell">
        <p className="tod-kicker">
          {roller?.name ?? 'Someone'} landed on a mini game — everyone plays {meta?.emoji} {meta?.label}! Last place owes a dare.
        </p>
        <GameViewRouter gameId={b.minigame.gameId} {...viewProps} />
        <RaceLeaderboard
          players={room.players}
          progress={room.progress}
          playerId={room.playerId}
          lowerIsBetter={b.minigame.mode === 'reaction'}
          unit={b.minigame.mode === 'reaction' ? 'ms' : ''}
        />
      </section>
    )
  }

  // event (jail / movement / picture / group)
  const dice = b.dice
  const canAdvance = b.rollerId === room.playerId || room.isHost
  return (
    <section className="card tod-stage">
      <p className="tod-kicker">
        {roller?.name ?? 'Someone'} rolled {dice ?? ''} 🎲
      </p>
      <div className="tod-onspot">
        <span className="board-event-emoji">{b.tileType ? TILE_META[b.tileType].emoji : '✨'}</span>
        <h2>{b.message}</h2>
      </div>
      {canAdvance ? (
        <button type="button" className="btn btn-primary full" onClick={room.boardContinue}>
          Continue →
        </button>
      ) : (
        <p className="lobby-sub">Waiting for {roller?.name ?? 'them'}…</p>
      )}
    </section>
  )
}

function BoardPrompt({ room }: { room: Room }) {
  const b = room.state!.board!
  const onSpot = room.players.find((p) => p.id === b.onSpotId)
  const asker = room.players.find((p) => p.id === b.askerId)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setDraft('')
  }, [b.onSpotId, b.choice])

  const isMine = b.onSpotId === room.playerId
  const askerAway = !room.isAvailable(b.askerId)
  const canWrite = b.askerId ? b.askerId === room.playerId || (askerAway && room.isHost) : isMine || room.isHost
  const canAdvance = isMine || room.isHost
  const forfeit = b.phase === 'forfeit'

  function submit(e: FormEvent) {
    e.preventDefault()
    if (draft.trim()) {
      room.signalTyping(false)
      room.boardSubmitPrompt(draft)
    }
  }

  return (
    <section className="card tod-stage">
      <p className="tod-kicker">
        {forfeit ? 'Mini game forfeit' : TILE_META[b.tileType ?? 'truth'].label + ' tile'}
      </p>
      <div className="tod-onspot">
        {onSpot && <BoardPiece pieceId={onSpot.avatar} size={72} />}
        <h2>
          {forfeit
            ? `${onSpot?.name ?? 'Loser'} came last 💀`
            : isMine
              ? "You're on the spot!"
              : `${onSpot?.name ?? 'Someone'} is on the spot`}
        </h2>
        {asker && (
          <p className="tod-asker">
            asked by <BoardPiece pieceId={asker.avatar} size={20} className="inline-avatar tile-token" />{' '}
            {asker.name}
          </p>
        )}
      </div>

      {!b.choice ? (
        isMine ? (
          <div className="tod-choice">
            <button type="button" className="btn tod-truth" onClick={() => room.boardPickChoice('truth')}>
              Truth
            </button>
            <button type="button" className="btn tod-dare" onClick={() => room.boardPickChoice('dare')}>
              Dare
            </button>
          </div>
        ) : (
          <p className="lobby-sub">Waiting for {onSpot?.name ?? 'them'} to choose…</p>
        )
      ) : !b.prompt ? (
        canWrite ? (
          <form className="tod-write" onSubmit={submit}>
            <span className={`tod-badge ${b.choice}`}>{b.choice.toUpperCase()}</span>
            <p className="tod-write-label">
              Write a {b.choice} for {isMine ? 'yourself' : onSpot?.name ?? 'them'}:
            </p>
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                room.signalTyping(e.target.value.trim().length > 0)
              }}
              onBlur={() => room.signalTyping(false)}
              placeholder={b.choice === 'truth' ? 'Ask them anything…' : 'Dare them to…'}
              maxLength={400}
              rows={3}
              className="tod-textarea"
              autoFocus
            />
            <button
              type="button"
              className="btn-ghost btn-sm tod-generate"
              onClick={() => {
                setDraft(randomTodPrompt(b.choice!))
                room.signalTyping(true)
              }}
            >
              🎲 Can&apos;t think of one? Surprise me
            </button>
            <button type="submit" className="btn btn-primary full" disabled={!draft.trim()}>
              Submit for everyone →
            </button>
          </form>
        ) : (
          <p className="lobby-sub">
            <span className={`tod-badge ${b.choice}`}>{b.choice.toUpperCase()}</span>
            <br />
            Waiting for {asker?.name ?? 'the asker'} to write a {b.choice}…
            {room.typing && (
              <span className="typing-indicator">
                {room.typing.name} is typing<span className="typing-dots"><i></i><i></i><i></i></span>
              </span>
            )}
          </p>
        )
      ) : (
        <div className="tod-prompt-wrap">
          <span className={`tod-badge ${b.choice}`}>{b.choice.toUpperCase()}</span>
          <p className="tod-prompt">{b.prompt}</p>
          {asker && <p className="tod-asker">— from {asker.name}</p>}
          {canAdvance ? (
            <>
              <p className="tod-write-label">Do your {b.choice}, then post it in the chat 👇</p>
              <button type="button" className="btn btn-primary full" onClick={room.boardContinue}>
                I&apos;m done — next player →
              </button>
            </>
          ) : (
            <p className="lobby-sub">Waiting for {onSpot?.name ?? 'them'} to finish…</p>
          )}
        </div>
      )}
    </section>
  )
}

function BoardTrivia({ room }: { room: Room }) {
  const b = room.state!.board!
  const q = b.questionId ? getQuestionById(b.questionId) : null
  const answerer = room.players.find((p) => p.id === b.answeredBy)
  const isMine = b.answeredBy === room.playerId
  const answered = b.answerIndex != null
  const canAdvance = isMine || room.isHost

  if (!q) {
    return (
      <section className="card tod-stage">
        <p className="lobby-sub">Loading question…</p>
        {canAdvance && (
          <button type="button" className="btn btn-primary full" onClick={room.boardContinue}>
            Skip →
          </button>
        )}
      </section>
    )
  }

  return (
    <section className="card tod-stage">
      <p className="tod-kicker">🧠 Trivia for {answerer?.name ?? 'someone'}</p>
      <p className="trivia-q">{q.question}</p>
      <div className="trivia-choices">
        {q.choices.map((choice, idx) => {
          const isCorrect = idx === q.correctIndex
          const isPicked = idx === b.answerIndex
          const cls = answered
            ? isCorrect
              ? 'correct'
              : isPicked
                ? 'wrong'
                : ''
            : ''
          return (
            <button
              key={idx}
              type="button"
              className={`btn trivia-choice ${cls}`}
              disabled={!isMine || answered}
              onClick={() => room.boardAnswerTrivia(idx)}
            >
              {choice}
            </button>
          )
        })}
      </div>
      {!answered && !isMine && (
        <p className="lobby-sub">Waiting for {answerer?.name ?? 'them'} to answer…</p>
      )}
      {answered && (
        <>
          <p className={`trivia-result ${b.answerCorrect ? 'good' : 'bad'}`}>
            {b.answerCorrect ? 'Correct! Jump ahead a tile 🎉' : 'Not quite!'}
          </p>
          {canAdvance ? (
            <button type="button" className="btn btn-primary full" onClick={room.boardContinue}>
              Continue →
            </button>
          ) : (
            <p className="lobby-sub">Waiting for {answerer?.name ?? 'them'}…</p>
          )}
        </>
      )}
    </section>
  )
}
