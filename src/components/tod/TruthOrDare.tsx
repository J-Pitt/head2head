'use client'

import Link from 'next/link'
import AvatarPicker from '@/components/AvatarPicker'
import Avatar from '@/components/Avatar'
import { useTodRoom } from '@/hooks/useTodRoom'
import { useRoomChat } from '@/hooks/useRoomChat'
import ChatPanel from '@/components/ChatPanel'
import { getMinigame } from '@/lib/minigames/catalog'
import type { GameViewProps } from '@/lib/minigames/types'
import { GameViewRouter } from '@/components/minigames/views/GameViewRouter'
import { RaceLeaderboard } from '@/components/minigames/views/shared'
import { FORFEIT } from '@/lib/tod/prompts'

export default function TruthOrDare() {
  const room = useTodRoom()
  const me = room.players.find((p) => p.id === room.playerId)
  const chat = useRoomChat(room.roomId, {
    playerId: room.playerId,
    playerName: me?.name ?? room.playerName ?? 'Player',
    avatar: me?.avatar ?? room.avatar,
  })

  if (!room.roomId || !room.state) return <TodJoin room={room} />

  const { state } = room
  const playerById = (id: string | null) => room.players.find((p) => p.id === id) ?? null

  return (
    <div className="app-shell">
      <header className="room-bar">
        <div>
          <Link href="/" className="btn-ghost btn-sm">
            ←
          </Link>
          <span className="logo-sm">💋 Truth or Dare</span>
          {room.gameCode && <span className="room-code">{room.gameCode}</span>}
        </div>
        <span className="party-count">{room.players.length} in</span>
      </header>

      {state.phase === 'lobby' && (
        <Lobby room={room} />
      )}

      {state.phase === 'minigame' && state.minigame && state.minigame.gameId && (
        <MinigamePhase room={room} />
      )}

      {state.phase === 'forfeit' && (
        <section className="card tod-stage">
          <p className="tod-kicker">Round {state.round} forfeit</p>
          <div className="tod-loser">
            {playerById(state.loserId) && <Avatar seed={playerById(state.loserId)!.avatar} size={72} />}
            <h2>{state.loserName ?? 'Nobody'} lost!</h2>
          </div>
          <p className="tod-forfeit">{FORFEIT}</p>
          <button type="button" className="btn btn-primary full" onClick={room.beginTurns}>
            On with Truth or Dare →
          </button>
        </section>
      )}

      {state.phase === 'turn' && <TurnPhase room={room} />}

      <ChatPanel
        messages={chat.messages}
        meId={room.playerId}
        onSend={chat.send}
        title="Group chat 📸 — share your forfeit here"
      />
    </div>
  )
}

type Room = ReturnType<typeof useTodRoom>

function TodJoin({ room }: { room: Room }) {
  return (
    <div className="app-shell">
      <header className="app-header compact">
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
        <h1>💋 Truth or Dare</h1>
      </header>
      <section className="card setup-card">
        <p className="intro">
          A spicy party game. Each round kicks off with a mini game for everyone — the loser owes a
          forfeit — then players take turns answering Truth or Dare. 18+.
        </p>
        <label className="field">
          <span>Your name</span>
          <input
            value={room.playerName}
            onChange={(e) => room.setPlayerName(e.target.value)}
            placeholder="Alex"
            maxLength={24}
          />
        </label>
        <AvatarPicker selected={room.avatar} onSelect={room.setAvatar} />
        <div className="online-actions">
          <button type="button" className="btn btn-primary" onClick={room.hostRoom}>
            Create a room
          </button>
          <div className="join-row">
            <input
              value={room.gameCodeInput}
              onChange={(e) => room.setGameCodeInput(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={6}
              className="code-input"
            />
            <button type="button" className="btn" onClick={() => room.joinRoom()}>
              Join
            </button>
          </div>
        </div>
        {room.error && <p className="error">{room.error}</p>}
      </section>
    </div>
  )
}

function Lobby({ room }: { room: Room }) {
  return (
    <>
      <section className="card party-roster">
        <div className="party-roster-head">
          <span>
            Room code: <strong className="room-code-display">{room.gameCode}</strong>
          </span>
        </div>
        <ul className="party-players">
          {room.players.map((p) => (
            <li key={p.id}>
              <Avatar seed={p.avatar} size={34} />
              <span>
                {p.name}
                {p.id === room.playerId ? ' (you)' : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card tod-stage">
        {room.isHost ? (
          <button type="button" className="btn btn-primary full" onClick={room.startRound}>
            Start round 1 — launch a mini game 🎮
          </button>
        ) : (
          <p className="lobby-sub">Waiting for the host to start…</p>
        )}
        <p className="party-hint">Share the code so everyone can join before you start.</p>
      </section>
    </>
  )
}

function MinigamePhase({ room }: { room: Room }) {
  const state = room.state
  const mg = state?.minigame
  const gameId = mg?.gameId
  if (!state || !mg || !gameId) return null
  const meta = getMinigame(gameId)
  const over = mg.status === 'over'

  const viewProps: GameViewProps = {
    session: mg,
    players: room.players,
    progress: room.progress,
    playerId: room.playerId,
    isHost: room.isHost,
    report: room.report,
    setSession: room.setMinigameSession,
    startRound: () => {},
    now: room.now,
  }

  if (over) {
    const loser = room.players.find((p) => p.id === state.loserId)
    return (
      <section className="card tod-stage">
        <p className="tod-kicker">Round {state.round}: {meta?.label}</p>
        <div className="tod-loser">
          {loser && <Avatar seed={loser.avatar} size={64} />}
          <h2>{state.loserName ?? 'Someone'} came last 💀</h2>
        </div>
        <RaceLeaderboard
          players={room.players}
          progress={room.progress}
          playerId={room.playerId}
          lowerIsBetter={mg.mode === 'reaction'}
          unit={mg.mode === 'reaction' ? 'ms' : ''}
        />
        <button type="button" className="btn btn-primary full" onClick={room.revealForfeit}>
          Reveal the forfeit 👀
        </button>
      </section>
    )
  }

  return (
    <section className="card minigame-play-shell">
      <p className="tod-kicker">
        Round {state.round}: everyone plays {meta?.emoji} {meta?.label} — last place owes a forfeit!
      </p>
      <GameViewRouter gameId={gameId} {...viewProps} />
    </section>
  )
}

function TurnPhase({ room }: { room: Room }) {
  const state = room.state
  if (!state) return null
  const onSpot = room.players.find((p) => p.id === state.onSpotId)
  const asker = room.players.find((p) => p.id === state.askerId)
  const isMine = state.onSpotId === room.playerId
  const turnNum = state.turnIndex + 1
  const total = state.turnOrder.length

  return (
    <section className="card tod-stage">
      <p className="tod-kicker">
        Turn {turnNum} of {total} · Round {state.round}
      </p>

      <div className="tod-onspot">
        {onSpot && <Avatar seed={onSpot.avatar} size={72} />}
        <h2>
          {isMine ? "You're up!" : `${onSpot?.name ?? 'Someone'} is on the spot`}
        </h2>
        {asker && (
          <p className="tod-asker">
            asked by <Avatar seed={asker.avatar} size={20} className="inline-avatar" /> {asker.name}
          </p>
        )}
      </div>

      {!state.choice ? (
        isMine ? (
          <div className="tod-choice">
            <button type="button" className="btn tod-truth" onClick={() => room.pickChoice('truth')}>
              Truth
            </button>
            <button type="button" className="btn tod-dare" onClick={() => room.pickChoice('dare')}>
              Dare
            </button>
          </div>
        ) : (
          <p className="lobby-sub">Waiting for {onSpot?.name ?? 'them'} to choose…</p>
        )
      ) : (
        <div className="tod-prompt-wrap">
          <span className={`tod-badge ${state.choice}`}>{state.choice.toUpperCase()}</span>
          <p className="tod-prompt">{state.prompt}</p>
          <button type="button" className="btn btn-primary full" onClick={room.nextTurn}>
            {turnNum >= total ? 'Finish round — next mini game 🎮' : 'Next player →'}
          </button>
        </div>
      )}

      {room.isHost && (
        <button type="button" className="btn-ghost btn-sm tod-end" onClick={room.endParty}>
          End to lobby
        </button>
      )}
    </section>
  )
}
