'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import BoardPiece from '@/components/tod/BoardPiece'
import type { useTodRoom } from '@/hooks/useTodRoom'
import {
  TILE_META,
  SPECIAL_CHALLENGES,
  buildTiles,
  BOARD_COLS,
  BOARD_ROWS,
  getBoardDisplayLayout,
  tileCenterPercent,
  tileSlotStyle,
} from '@/lib/tod/board'
import type { BoardDisplayLayout, BoardTile } from '@/lib/tod/board'
import { getQuestionById } from '@/lib/trivia'
import { getDaresForMode, getTruthsForMode, pickRandomPrompt } from '@/lib/tod/classic/lists'
import { getMinigame } from '@/lib/minigames/catalog'
import type { GameViewProps } from '@/lib/minigames/types'
import { GameViewRouter } from '@/components/minigames/views/GameViewRouter'
import BoardAnswerForm from '@/components/tod/board/BoardAnswerForm'
import TodGameLayout from '@/components/tod/board/TodGameLayout'
import { RaceLeaderboard } from '@/components/minigames/views/shared'

type Room = ReturnType<typeof useTodRoom>

const PIECE_STEP_MS = 165

function boardPromptSessionKey(b: NonNullable<Room['state']>['board']) {
  if (!b || !b.onSpotId || !b.choice || b.prompt) return null
  const pos = b.positions[b.onSpotId] ?? 0
  return `${b.onSpotId}:${pos}:${b.choice}:${b.dice ?? 0}`
}

export default function BoardView({
  room,
  chatSidebar,
}: {
  room: Room
  chatSidebar: ReactNode | null
}) {
  const b = room.state?.board
  if (!b) return null

  const overlayKey = `${b.phase}-${b.rollerId ?? ''}-${b.onSpotId ?? ''}-${b.questionId ?? ''}-${b.dice ?? ''}-${b.prompt ?? ''}`

  const overlay = b.phase !== 'rolling' ? <Resolution key={overlayKey} room={room} /> : null

  return (
    <TodGameLayout
      board={<BoardTrack room={room} />}
      overlay={overlay}
      chat={chatSidebar}
    />
  )
}

function CourseTrail({
  tiles,
  layout,
}: {
  tiles: BoardTile[]
  layout: BoardDisplayLayout
}) {
  if (tiles.length < 2) return null
  const pts = tiles.map((t) => tileCenterPercent(layout, t))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.left.toFixed(2)} ${p.top.toFixed(2)}`).join(' ')
  return (
    <svg className="board-course-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path d={d} className="board-course-trail-glow" vectorEffect="non-scaling-stroke" />
      <path d={d} className="board-course-trail-line" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function BoardMaze({
  tiles,
  children,
}: {
  tiles: BoardTile[]
  children?: ReactNode
}) {
  const layout = getBoardDisplayLayout(tiles)

  return (
    <div className="board-track">
      <div
        className="board-course-canvas"
        style={{ aspectRatio: `${layout.spanCols} / ${layout.spanRows}` }}
      >
        <CourseTrail tiles={tiles} layout={layout} />
        {tiles.map((tile, idx) => (
          <Tile
            key={tile.i}
            tile={tile}
            layout={layout}
            prev={tiles[idx - 1]}
            next={tiles[idx + 1]}
            arrow={arrowFor(tile, tiles[idx + 1])}
          />
        ))}
        {children}
      </div>
    </div>
  )
}

export function BoardPreview() {
  const tiles = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: false })
  return (
    <div className="board-play-panel board-play-panel-preview">
      <p className="board-legend">Zig left · zag right · claim the crown</p>
      <BoardMaze tiles={tiles} />
    </div>
  )
}

function dirBetween(from: BoardTile, to: BoardTile): 'n' | 's' | 'e' | 'w' | null {
  if (to.col > from.col) return 'e'
  if (to.col < from.col) return 'w'
  if (to.row > from.row) return 's'
  if (to.row < from.row) return 'n'
  return null
}

function tilePathClasses(tile: BoardTile, prev: BoardTile | undefined, next: BoardTile | undefined): string {
  const cls: string[] = []
  if (prev) {
    const d = dirBetween(prev, tile)
    if (d) cls.push(`path-in-${d}`)
  }
  if (next) {
    const d = dirBetween(tile, next)
    if (d) cls.push(`path-out-${d}`)
  }
  return cls.join(' ')
}

function arrowFor(tile: BoardTile, next: BoardTile | undefined): string | null {
  if (!next) return null
  const d = dirBetween(tile, next)
  if (d === 'e') return '→'
  if (d === 'w') return '←'
  if (d === 's') return '↓'
  if (d === 'n') return '↑'
  return null
}

function BoardTrack({ room }: { room: Room }) {
  const b = room.state!.board!
  const roller = room.players.find((p) => p.id === b.rollerId)
  const canRoll = b.rollerId === room.playerId || (room.isLocal && !!b.rollerId)

  return (
    <div className="board-play-panel">
      <header className="board-play-head">
        <p className="board-legend">Zig left · zag right · claim the crown</p>

        {b.phase === 'rolling' && (
          <div className="board-turn-bar">
            {canRoll ? (
              <>
                <p className="board-turn-label">
                  {room.isLocal
                    ? `${roller?.name ?? 'Someone'}'s turn — roll the dice!`
                    : `Your turn, ${roller?.name ?? 'you'}!`}
                </p>
                <button type="button" className="btn btn-primary board-roll-btn" onClick={room.rollDice}>
                  🎲 Roll the dice
                </button>
              </>
            ) : (
              <p className="board-turn-label">
                Waiting for {roller?.name ?? 'someone'} to roll…
              </p>
            )}
            {room.isHost && (
              <button type="button" className="btn-ghost btn-sm tod-end" onClick={room.restartBoard}>
                End game
              </button>
            )}
          </div>
        )}
      </header>

      <BoardMaze tiles={b.tiles}>
        <AnimatedPieces room={room} />
      </BoardMaze>
    </div>
  )
}

function AnimatedPieces({ room }: { room: Room }) {
  const b = room.state!.board!
  const layout = getBoardDisplayLayout(b.tiles)
  const [displayPos, setDisplayPos] = useState<Record<string, number>>(() => ({ ...b.positions }))
  const [movingIds, setMovingIds] = useState<Set<string>>(() => new Set())
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
    const movers = new Set<string>()

    for (const p of room.players) {
      const from = prev[p.id] ?? 0
      const to = next[p.id] ?? 0
      if (from === to) continue
      anyMoving = true
      movers.add(p.id)

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
      setMovingIds(new Set())
      return
    }

    setMovingIds(movers)

    timersRef.current.push(
      setTimeout(() => {
        animPosRef.current = { ...next }
        setMovingIds(new Set())
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
        const center = tileCenterPercent(layout, tile)
        return players.map((p, i) => {
          const tileIdx = displayPos[p.id] ?? b.positions[p.id] ?? 0
          const hopping = movingIds.has(p.id)
          return (
            <div
              key={p.id}
              className={`board-piece-anim${hopping ? ' board-piece-anim--moving' : ''}`}
              style={{
                left: `${center.left}%`,
                top: `${center.top}%`,
                ['--stack' as string]: i,
                ['--stack-total' as string]: players.length,
              }}
              title={p.name}
            >
              <div key={hopping ? tileIdx : 'idle'} className="board-piece-hop">
                <BoardPiece pieceId={p.avatar} size={22} className="tile-token" />
              </div>
            </div>
          )
        })
      })}
    </div>
  )
}

function isPathCorner(prev: BoardTile | undefined, tile: BoardTile, next: BoardTile | undefined): boolean {
  if (!prev || !next) return false
  const din = dirBetween(prev, tile)
  const dout = dirBetween(tile, next)
  if (!din || !dout) return false
  return din !== dout
}

function cornerTilt(
  prev: BoardTile | undefined,
  tile: BoardTile,
  next: BoardTile | undefined
): string {
  if (!prev || !next) return '0deg'
  const din = dirBetween(prev, tile)
  const dout = dirBetween(tile, next)
  const key = `${din}-${dout}`
  const tilts: Record<string, string> = {
    'e-n': '-6deg',
    'e-s': '6deg',
    'w-n': '6deg',
    'w-s': '-6deg',
    'n-e': '6deg',
    'n-w': '-6deg',
    's-e': '-6deg',
    's-w': '6deg',
  }
  return tilts[key] ?? '0deg'
}

function Tile({
  tile,
  layout,
  prev,
  next,
  arrow,
}: {
  tile: BoardTile
  layout: BoardDisplayLayout
  prev?: BoardTile
  next?: BoardTile
  arrow: string | null
}) {
  const meta = TILE_META[tile.type]
  const special = tile.type === 'special' && tile.special != null ? SPECIAL_CHALLENGES[tile.special] : null
  const endpoint = tile.type === 'start' || tile.type === 'finish'
  const pathCls = tilePathClasses(tile, prev, next)
  const label = special ? 'Special' : meta.label
  const hasTunnel = pathCls.includes('path-')
  const corner = isPathCorner(prev, tile, next)
  const slot = tileSlotStyle(layout, tile)
  return (
    <div className="board-tile-slot" style={slot}>
      <div
        className={`board-tile tile-${tile.type} ${pathCls}${hasTunnel ? ' has-tunnel' : ''}${corner ? ' board-tile-corner' : ''}${endpoint ? ' board-tile-endpoint' : ''}`}
        style={{
          ['--tile-glow' as string]: meta.color,
          ['--tile-i' as string]: tile.i,
          ['--tile-tilt' as string]: corner ? cornerTilt(prev, tile, next) : '0deg',
        }}
        title={special ? special.label : meta.label}
      >
        <span className="board-tile-shine" aria-hidden />
        <span className="board-tile-glow" aria-hidden />
        <div className="board-tile-inner">
          <span className="tile-emoji" aria-hidden>
            {special ? special.icon : meta.emoji}
          </span>
          <span className={endpoint ? 'tile-label' : 'tile-type-name'}>
            {endpoint ? (tile.type === 'start' ? 'GO' : 'WIN') : label}
          </span>
        </div>
        {arrow && corner && !endpoint && (
          <span className="tile-arrow" aria-hidden>
            {arrow}
          </span>
        )}
      </div>
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

  // rolling phase is handled inline on the board — no overlay returned
  if (b.phase === 'rolling') return null

  if (b.phase === 'prompt' || b.phase === 'forfeit') {
    return <BoardPrompt key={`${b.onSpotId}-${b.choice}`} room={room} />
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
        />
      </section>
    )
  }

  // event (jail / movement / picture / group)
  const dice = b.dice
  const canAdvance = b.rollerId === room.playerId || (room.isLocal && !!b.rollerId) || room.isHost
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
  const [promptMode, setPromptMode] = useState<'list' | 'custom'>('list')
  const [suggestion, setSuggestion] = useState<{ text: string; idx: number } | null>(null)

  const isMine = b.onSpotId === room.playerId
  const canAnswer = isMine || (room.isLocal && !!b.onSpotId)
  const askerAway = !room.isAvailable(b.askerId)
  const canWrite = b.askerId
    ? b.askerId === room.playerId ||
      (askerAway && room.isHost) ||
      (room.isLocal && !!b.askerId)
    : isMine || room.isHost || (room.isLocal && !!b.onSpotId)
  const canAdvance = isMine || (room.isLocal && !!b.onSpotId)
  const forfeit = b.phase === 'forfeit'

  const listMode = b.listMode ?? 'nsfw'
  const choice = b.choice
  const promptSessionKey = boardPromptSessionKey(b)

  useEffect(() => {
    if (!promptSessionKey || !choice) return
    const pool = choice === 'truth' ? getTruthsForMode(listMode) : getDaresForMode(listMode)
    const used = choice === 'truth' ? (b.usedTruths ?? []) : (b.usedDares ?? [])
    const pick = pickRandomPrompt(pool, used)
    if (pick) {
      setSuggestion(pick)
      setPromptMode('list')
    } else {
      setSuggestion(null)
      setPromptMode('custom')
    }
    setDraft('')
    // Only re-pick when a new truth/dare round starts — not when refreshing or marking used.
  }, [promptSessionKey, listMode, choice])

  function refreshSuggestion() {
    if (!choice) return
    const pool = choice === 'truth' ? getTruthsForMode(listMode) : getDaresForMode(listMode)
    const used = choice === 'truth' ? (b.usedTruths ?? []) : (b.usedDares ?? [])
    const next = pickRandomPrompt(pool, used, suggestion?.idx)
    if (next) {
      setSuggestion(next)
      setPromptMode('list')
    } else {
      setSuggestion(null)
      setPromptMode('custom')
    }
  }

  const canRefresh = promptMode === 'list'

  function useSuggestion() {
    if (!suggestion || !choice) return
    room.signalTyping(false)
    room.boardSubmitPrompt(suggestion.text, { choice, idx: suggestion.idx })
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault()
    if (draft.trim()) {
      room.signalTyping(false)
      room.boardSubmitPrompt(draft)
    }
  }

  const targetName = isMine ? 'yourself' : onSpot?.name ?? 'them'

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
        isMine || (room.isLocal && !!b.onSpotId) ? (
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
          <div className="tod-write">
            <span className={`tod-badge ${b.choice}`}>{b.choice!.toUpperCase()}</span>
            <p className="tod-write-label">
              {promptMode === 'list' && suggestion
                ? `Suggested ${b.choice} for ${targetName}:`
                : `Pick a ${b.choice} for ${targetName}:`}
            </p>
            {promptMode === 'list' && suggestion ? (
              <>
                <div className="tod-prompt-suggestion">
                  <p className="tod-prompt">{suggestion.text}</p>
                </div>
                <button type="button" className="btn btn-primary full" onClick={useSuggestion}>
                  Use this prompt →
                </button>
                <div className="tod-prompt-alt">
                  {canRefresh && suggestion && (
                    <button type="button" className="btn-ghost btn-sm" onClick={refreshSuggestion}>
                      🔄 Refresh
                    </button>
                  )}
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setPromptMode('custom')}>
                    ✏️ Write your own
                  </button>
                </div>
              </>
            ) : (
              <>
                {promptMode === 'list' && !suggestion && (
                  <p className="lobby-sub">All suggested prompts have been used — write your own:</p>
                )}
                <form className="tod-write-custom" onSubmit={submitCustom}>
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
                  <button type="submit" className="btn btn-primary full" disabled={!draft.trim()}>
                    Submit for everyone →
                  </button>
                  {suggestion && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setPromptMode('list')
                        setDraft('')
                        room.signalTyping(false)
                      }}
                    >
                      ← Back to suggestions
                    </button>
                  )}
                </form>
              </>
            )}
          </div>
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
      ) : !b.answerSubmitted ? (
        <>
          <div className="tod-prompt-wrap">
            <span className={`tod-badge ${b.choice}`}>{b.choice.toUpperCase()}</span>
            <p className="tod-prompt">{b.prompt}</p>
            {asker && <p className="tod-asker">— from {asker.name}</p>}
          </div>
          {canAnswer ? (
            <BoardAnswerForm
              category={b.choice!}
              onSubmit={(text, image) => room.boardSubmitAnswer(text, image)}
            />
          ) : (
            <p className="lobby-sub">Waiting for {onSpot?.name ?? 'them'} to answer…</p>
          )}
        </>
      ) : (
        <div className="tod-prompt-wrap">
          <span className={`tod-badge ${b.choice}`}>{b.choice.toUpperCase()}</span>
          <p className="tod-prompt">{b.prompt}</p>
          {asker && <p className="tod-asker">— from {asker.name}</p>}
          <div className="board-answer-reveal">
            <p className="board-answer-reveal-label">{onSpot?.name ?? 'Player'}&apos;s answer</p>
            {b.answerText && <p className="board-answer-reveal-text">{b.answerText}</p>}
            {b.answerImage && (
              <div className="board-answer-reveal-photo">
                <img src={b.answerImage} alt={`${onSpot?.name ?? 'Player'}'s answer`} />
              </div>
            )}
            {!b.answerText && !b.answerImage && (
              <p className="lobby-sub">No answer posted.</p>
            )}
          </div>
          {canAdvance ? (
            <button type="button" className="btn btn-primary full" onClick={room.boardContinue}>
              Next player rolls →
            </button>
          ) : (
            <p className="lobby-sub">
              {onSpot?.name ?? 'Player'}&apos;s answer is in — waiting for them to continue…
            </p>
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
  const canAdvance = isMine || (room.isLocal && !!b.answeredBy)

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
