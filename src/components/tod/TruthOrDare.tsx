'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import BoardPiecePicker from '@/components/tod/BoardPiecePicker'
import PlayerMark from '@/components/tod/PlayerMark'
import { useTodRoom } from '@/hooks/useTodRoom'
import { useRoomChat } from '@/hooks/useRoomChat'
import ChatPanel from '@/components/ChatPanel'
import { randomTodPrompt } from '@/lib/tod/prompts'
import BoardView, { BoardPreview } from '@/components/tod/board/BoardView'
import TodGameLayout from '@/components/tod/board/TodGameLayout'

function ChatPlaceholder() {
  return (
    <div className="chat-panel chat-embed chat-placeholder">
      <div className="chat-header">Group chat 📸</div>
      <p className="chat-empty">Chat opens once you enter the lobby.</p>
    </div>
  )
}

function TodHeader({
  gameCode,
  isLocal,
  playerCount,
  isOnBreak,
  onToggleBreak,
  onLeave,
}: {
  gameCode: string | null
  isLocal: boolean
  playerCount: number
  isOnBreak: boolean
  onToggleBreak: () => void
  onLeave: () => void
}) {
  return (
    <header className="room-bar">
      <div>
        <Link href="/" className="btn-ghost btn-sm">
          ←
        </Link>
        <span className="logo-sm">💋 Truth or Dare</span>
        {isLocal ? (
          <span className="room-code">Pass &amp; play</span>
        ) : gameCode ? (
          <span className="room-code">{gameCode}</span>
        ) : null}
      </div>
      <div className="room-bar-actions">
        <span className="party-count">{playerCount} in</span>
        {!isLocal && (
          <button type="button" className="btn-ghost btn-sm" onClick={onToggleBreak}>
            {isOnBreak ? "I'm back" : 'Take a break'}
          </button>
        )}
        <button type="button" className="btn-ghost btn-sm" onClick={onLeave}>
          Leave
        </button>
      </div>
    </header>
  )
}

export default function TruthOrDare() {
  const room = useTodRoom()
  const me = room.players.find((p) => p.id === room.playerId)
  const chat = useRoomChat(room.roomId, {
    playerId: room.playerId,
    playerName: me?.name ?? room.playerName ?? 'Player',
    avatar: me?.avatar ?? room.avatar,
  })

  if (!room.roomId || !room.state) {
    return <TodJoin room={room} />
  }

  const { state } = room
  const chatPanel = (
    <ChatPanel
      messages={chat.messages}
      meId={room.playerId}
      onSend={chat.send}
      title="Group chat 📸 — share your pictures here"
    />
  )

  return (
    <div className="app-shell tod-room-shell">
      <TodHeader
        gameCode={room.gameCode}
        isLocal={room.isLocal}
        playerCount={room.players.length}
        isOnBreak={room.isOnBreak}
        onToggleBreak={room.toggleBreak}
        onLeave={room.leaveRoom}
      />

      {state.phase === 'board' ? (
        <BoardView room={room} chatSidebar={chatPanel} />
      ) : (
        <TodGameLayout
          stage={
            state.phase === 'lobby' ? (
              <Lobby room={room} />
            ) : state.phase === 'turn' ? (
              <TurnPhase room={room} />
            ) : (
              <PicturePhase room={room} />
            )
          }
          board={<BoardPreview />}
          chat={chatPanel}
        />
      )}
    </div>
  )
}

type Room = ReturnType<typeof useTodRoom>

function TodJoin({ room }: { room: Room }) {
  const mode = room.entryMode

  if (!mode) {
    return (
      <div className="app-shell tod-room-shell">
        <TodHeader
          gameCode={null}
          isLocal={false}
          playerCount={0}
          isOnBreak={false}
          onToggleBreak={() => {}}
          onLeave={() => {}}
        />
        <section className="card tod-stage">
          <p className="lobby-sub">Choose Play locally or Play online from the home screen.</p>
          <Link href="/" className="btn btn-primary full">
            Back to home
          </Link>
        </section>
      </div>
    )
  }

  const online = mode !== 'local'

  function enterLobby() {
    if (mode === 'local') room.enterLocalLobby()
    else if (mode === 'join') room.joinRoom()
    else room.hostRoom()
  }

  return (
    <div className="app-shell tod-room-shell">
      <TodHeader
        gameCode={online ? room.gameCodeInput || room.createPassword || null : null}
        isLocal={mode === 'local'}
        playerCount={0}
        isOnBreak={false}
        onToggleBreak={() => {}}
        onLeave={() => {}}
      />

      <TodGameLayout
        stage={
          <section className="card tod-stage">
            <p className="tod-kicker">{online ? 'Join the board game' : 'Pass & play'}</p>
            <h2 className="tod-setup-title">Set up your game</h2>
            <p className="lobby-sub">
              {online
                ? mode === 'join'
                  ? 'Enter your name and pick a game piece to join the room.'
                  : 'Enter your name and pick a game piece. Share the password once you\'re in the lobby.'
                : 'Enter your name and pick a game piece. Everyone plays on this device.'}
            </p>
            <label className="field">
              <span>Your name</span>
              <input
                value={room.playerName}
                onChange={(e) => room.setPlayerName(e.target.value)}
                placeholder="Alex"
                maxLength={24}
                autoFocus
              />
            </label>
            <BoardPiecePicker selected={room.avatar} onSelect={room.setAvatar} />
            <button type="button" className="btn btn-primary full tod-lets-go" onClick={enterLobby}>
              {mode === 'join' ? 'Join lobby' : 'Enter lobby'}
            </button>
            {room.error && <p className="error">{room.error}</p>}
          </section>
        }
        board={<BoardPreview />}
        chat={<ChatPlaceholder />}
      />
    </div>
  )
}

function Lobby({ room }: { room: Room }) {
  const online = !room.isLocal

  return (
    <section className="card tod-stage lobby-stage">
      <p className="tod-kicker">{online ? 'Waiting room' : 'Pass & play'}</p>
      {online && room.gameCode && <p className="room-code-display">{room.gameCode}</p>}
      <p className="lobby-sub">
        {online ? (
          <>
            Share the password <strong>{room.gameCode}</strong> so friends can join on their devices.
          </>
        ) : (
          <>Add everyone playing on this device, then start the board.</>
        )}
      </p>

      <p className="room-players-label">Players ({room.players.length})</p>
      <ul className="party-players">
        {room.players.map((p) => (
          <li key={p.id} className={p.status === 'break' ? 'is-away' : ''}>
            <PlayerMark avatar={p.avatar} size={34} board />
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

      {room.isHost && !online && (
        <button type="button" className="btn btn-sm lobby-add-player" onClick={room.addLocalPlayer}>
          + Add player
        </button>
      )}

      {room.isHost ? (
        <button
          type="button"
          className="btn btn-primary full tod-lets-go"
          disabled={online && room.players.length < 2}
          onClick={room.startBoardGame}
        >
          Let&apos;s go!
        </button>
      ) : (
        <p className="lobby-sub">Waiting for the host to start…</p>
      )}
    </section>
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
          Everyone has to send a picture to the group chat. No skipping!
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

  useEffect(() => {
    setDraft('')
  }, [state?.onSpotId, state?.choice])

  if (!state) return null
  const isMine = state.onSpotId === room.playerId
  const onSpotAway = !room.isAvailable(state.onSpotId)
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
        {onSpot && <PlayerMark avatar={onSpot.avatar} size={72} />}
        <h2>{isMine ? "You're up!" : `${onSpot?.name ?? 'Someone'} is on the spot`}</h2>
        {asker && (
          <p className="tod-asker">
            asked by <PlayerMark avatar={asker.avatar} size={20} className="inline-avatar" /> {asker.name}
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
        <div className="tod-prompt-wrap">
          <span className={`tod-badge ${state.choice}`}>{state.choice.toUpperCase()}</span>
          <p className="tod-prompt">{state.prompt}</p>
          {asker && <p className="tod-asker">— from {asker.name}</p>}
          {isMine ? (
            <>
              <p className="tod-write-label">Do your {state.choice}, then post it in the chat →</p>
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
