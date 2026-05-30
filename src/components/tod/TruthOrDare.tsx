'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import AvatarPicker from '@/components/AvatarPicker'
import Avatar from '@/components/Avatar'
import { useTodRoom } from '@/hooks/useTodRoom'
import { useRoomChat } from '@/hooks/useRoomChat'
import ChatPanel from '@/components/ChatPanel'
import { randomTodPrompt } from '@/lib/tod/prompts'

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
        <div className="room-bar-actions">
          <span className="party-count">{room.players.length} in</span>
          <button type="button" className="btn-ghost btn-sm" onClick={room.toggleBreak}>
            {room.isOnBreak ? "I'm back" : 'Take a break'}
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={room.leaveRoom}>
            Leave
          </button>
        </div>
      </header>

      {state.phase === 'lobby' && <Lobby room={room} />}

      {state.phase === 'turn' && <TurnPhase room={room} />}

      {state.phase === 'picture' && <PicturePhase room={room} />}

      <ChatPanel
        messages={chat.messages}
        meId={room.playerId}
        onSend={chat.send}
        title="Group chat 📸 — share your pictures here"
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
          A spicy party game. Players take turns answering Truth or Dare, and every 3 rounds it&apos;s
          picture time — everyone sends a picture to the group chat. 18+.
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
            <li key={p.id} className={p.status === 'break' ? 'is-away' : ''}>
              <Avatar seed={p.avatar} size={34} />
              <span>
                {p.name}
                {p.id === room.playerId ? ' (you)' : ''}
                {p.status === 'break' && <span className="away-badge">away</span>}
              </span>
              {room.isHost && p.id !== room.playerId && (
                <button
                  type="button"
                  className="btn-ghost btn-sm kick-btn"
                  onClick={() => room.kickPlayer(p.id)}
                  title={`Remove ${p.name}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="card tod-stage">
        {room.isHost ? (
          <button type="button" className="btn btn-primary full" onClick={room.startGame}>
            Start round 1 →
          </button>
        ) : (
          <p className="lobby-sub">Waiting for the host to start…</p>
        )}
        <p className="party-hint">Share the code so everyone can join before you start.</p>
      </section>
    </>
  )
}

function PicturePhase({ room }: { room: Room }) {
  const state = room.state
  if (!state) return null
  return (
    <section className="card tod-stage">
      <p className="tod-kicker">After round {state.round}</p>
      <div className="tod-picture">
        <span className="tod-picture-emoji">📸</span>
        <h2>Picture time!</h2>
        <p className="tod-forfeit">
          Everyone has to send a picture to the group chat below. No skipping!
        </p>
      </div>
      {room.isHost ? (
        <button type="button" className="btn btn-primary full" onClick={room.continueFromPicture}>
          Everyone&apos;s posted — next round →
        </button>
      ) : (
        <p className="lobby-sub">Snap your pic, then wait for the host to continue…</p>
      )}
      {room.isHost && (
        <button type="button" className="btn-ghost btn-sm tod-end" onClick={room.endParty}>
          End to lobby
        </button>
      )}
    </section>
  )
}

function TurnPhase({ room }: { room: Room }) {
  const state = room.state
  const onSpot = room.players.find((p) => p.id === state?.onSpotId)
  const asker = room.players.find((p) => p.id === state?.askerId)
  const [draft, setDraft] = useState('')

  // Clear the draft when the turn or choice changes.
  useEffect(() => {
    setDraft('')
  }, [state?.onSpotId, state?.choice])

  if (!state) return null
  const isMine = state.onSpotId === room.playerId
  const onSpotAway = !room.isAvailable(state.onSpotId)
  // The asker writes, unless they've gone missing — then the host can step in.
  const askerAway = !room.isAvailable(state.askerId)
  const canWrite = state.askerId
    ? state.askerId === room.playerId || (askerAway && room.isHost)
    : isMine || room.isHost
  const turnNum = state.turnIndex + 1
  const total = state.turnOrder.length

  function submit(e: FormEvent) {
    e.preventDefault()
    if (draft.trim()) {
      room.signalTyping(false)
      room.submitPrompt(draft)
    }
  }

  return (
    <section className="card tod-stage">
      <p className="tod-kicker">
        Turn {turnNum} of {total} · Round {state.round}
      </p>

      <div className="tod-onspot">
        {onSpot && <Avatar seed={onSpot.avatar} size={72} />}
        <h2>{isMine ? "You're up!" : `${onSpot?.name ?? 'Someone'} is on the spot`}</h2>
        {asker && (
          <p className="tod-asker">
            asked by <Avatar seed={asker.avatar} size={20} className="inline-avatar" /> {asker.name}
          </p>
        )}
      </div>

      {onSpotAway ? (
        <div className="tod-prompt-wrap">
          <p className="lobby-sub">{onSpot?.name ?? 'This player'} has stepped away.</p>
          <button type="button" className="btn btn-primary full" onClick={room.skipTurn}>
            Skip them →
          </button>
        </div>
      ) : !state.choice ? (
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
      ) : !state.prompt ? (
        // Choice made — the asker writes the truth/dare.
        canWrite ? (
          <form className="tod-write" onSubmit={submit}>
            <span className={`tod-badge ${state.choice}`}>{state.choice.toUpperCase()}</span>
            <p className="tod-write-label">
              Write a {state.choice} for {isMine ? 'yourself' : onSpot?.name ?? 'them'}:
            </p>
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                room.signalTyping(e.target.value.trim().length > 0)
              }}
              onBlur={() => room.signalTyping(false)}
              placeholder={state.choice === 'truth' ? 'Ask them anything…' : 'Dare them to…'}
              maxLength={400}
              rows={3}
              className="tod-textarea"
              autoFocus
            />
            <button
              type="button"
              className="btn-ghost btn-sm tod-generate"
              onClick={() => {
                const idea = randomTodPrompt(state.choice!)
                setDraft(idea)
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
            <span className={`tod-badge ${state.choice}`}>{state.choice.toUpperCase()}</span>
            <br />
            Waiting for {asker?.name ?? 'the asker'} to write a {state.choice} for{' '}
            {onSpot?.name ?? 'them'}…
            {room.typing && (
              <span className="typing-indicator">
                {room.typing.name} is typing<span className="typing-dots"><i></i><i></i><i></i></span>
              </span>
            )}
          </p>
        )
      ) : (
        // Prompt submitted — everyone reads it, but only the player on the spot advances.
        <div className="tod-prompt-wrap">
          <span className={`tod-badge ${state.choice}`}>{state.choice.toUpperCase()}</span>
          <p className="tod-prompt">{state.prompt}</p>
          {asker && <p className="tod-asker">— from {asker.name}</p>}
          {isMine ? (
            <>
              <p className="tod-write-label">Do your {state.choice}, then post it in the chat below 👇</p>
              <button type="button" className="btn btn-primary full" onClick={room.nextTurn}>
                {turnNum >= total
                  ? state.round % 3 === 0
                    ? "I'm done — picture time 📸"
                    : "I'm done — finish round →"
                  : "I'm done — next player →"}
              </button>
            </>
          ) : (
            <p className="lobby-sub">
              Waiting for {onSpot?.name ?? 'them'} to do their {state.choice} and post it in the chat…
            </p>
          )}
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
