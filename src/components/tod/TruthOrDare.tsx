'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import RatingPicker from '@/components/tod/RatingPicker'
import BoardPiecePicker from '@/components/tod/BoardPiecePicker'
import PlayerMark from '@/components/tod/PlayerMark'
import { useTodRoom } from '@/hooks/useTodRoom'
import { useRoomChat } from '@/hooks/useRoomChat'
import ChatPanel from '@/components/ChatPanel'
import BoardView from '@/components/tod/board/BoardView'

function TodSideLayout({ main, chat }: { main: ReactNode; chat: ReactNode }) {
  return (
    <div className="tod-setup-layout">
      <main className="tod-setup-main">{main}</main>
      <aside className="tod-room-sidebar">{chat}</aside>
    </div>
  )
}

function TodSetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tod-setup-only">
      <main className="tod-setup-main">{children}</main>
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
        <TodSideLayout main={<Lobby room={room} />} chat={chatPanel} />
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
        gameCode={online ? room.gameCodeInput || null : null}
        isLocal={mode === 'local'}
        playerCount={0}
        isOnBreak={false}
        onToggleBreak={() => {}}
        onLeave={() => {}}
      />

      <TodSetupLayout>
        <section className="card tod-stage tod-setup-card">
          <p className="tod-kicker">
            {mode === 'local' ? 'Pass & play' : mode === 'join' ? 'Join the board game' : 'Start a board game'}
          </p>
          <h2 className="tod-setup-title">Set up your game</h2>
          <p className="lobby-sub">
            {mode === 'local'
              ? 'Enter your name and pick a game piece. Everyone plays on this device.'
              : mode === 'join'
                ? room.gameCodeInput
                  ? `Room code ${room.gameCodeInput} — enter your name and pick a game piece.`
                  : 'Enter your name and pick a game piece to join the room.'
                : 'Enter your name and pick a game piece. You\'ll get a room code in the lobby to share.'}
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
      </TodSetupLayout>
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
            Share the code <strong>{room.gameCode}</strong> so friends can join on their devices.
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

      {room.isHost && (
        <RatingPicker value={room.boardListMode} onChange={room.setBoardListMode} />
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
