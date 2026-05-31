'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Avatar from '@/components/Avatar'
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

export default function BoardView({ room }: { room: Room }) {
  const b = room.state?.board
  if (!b) return null

  return (
    <>
      <Spiral room={room} />
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

function Spiral({ room }: { room: Room }) {
  const b = room.state!.board!
  const tokensByTile: Record<number, typeof room.players> = {}
  for (const p of room.players) {
    const pos = b.positions[p.id] ?? 0
    ;(tokensByTile[pos] ||= []).push(p)
  }

  return (
    <section className="card board-card">
      <p className="board-legend">🚦 Start → follow the arrows → 🏁 Finish (center)</p>
      <div
        className="board-grid"
        style={{ gridTemplateColumns: `repeat(${b.size}, 1fr)` }}
      >
        {b.tiles.map((tile, idx) => (
          <Tile
            key={tile.i}
            tile={tile}
            arrow={arrowFor(tile, b.tiles[idx + 1])}
            tokens={tokensByTile[tile.i] || []}
          />
        ))}
      </div>
    </section>
  )
}

function Tile({
  tile,
  arrow,
  tokens,
}: {
  tile: BoardTile
  arrow: string | null
  tokens: { id: string; name: string; avatar: string }[]
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
      {tokens.length > 0 && (
        <span className="tile-tokens">
          {tokens.map((t) => (
            <Avatar key={t.id} seed={t.avatar} size={20} className="tile-token" />
          ))}
        </span>
      )}
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
          {winner && <Avatar seed={winner.avatar} size={72} />}
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
          {roller && <Avatar seed={roller.avatar} size={64} />}
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
        {onSpot && <Avatar seed={onSpot.avatar} size={72} />}
        <h2>
          {forfeit
            ? `${onSpot?.name ?? 'Loser'} came last 💀`
            : isMine
              ? "You're on the spot!"
              : `${onSpot?.name ?? 'Someone'} is on the spot`}
        </h2>
        {asker && (
          <p className="tod-asker">
            asked by <Avatar seed={asker.avatar} size={20} className="inline-avatar" /> {asker.name}
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
