'use client'

import Link from 'next/link'
import AvatarPicker from '@/components/AvatarPicker'
import { getMinigame } from '@/lib/minigames/catalog'
import type { MinigameId } from '@/lib/minigames/catalog'
import { avatarEmoji } from '@/lib/avatars'

type Props = {
  gameId: MinigameId
  playerName: string
  setPlayerName: (n: string) => void
  avatar: string
  setAvatar: (a: string) => void
  gameCodeInput: string
  setGameCodeInput: (c: string) => void
  roomId: string | null
  gameCode: string | null
  isHost: boolean
  players: { id: string; name: string; avatar: string }[]
  playerId: string
  error: string
  hostRoom: () => void
  joinRoom: () => void
  startGame: () => void
}

export default function MinigameLobby({
  gameId,
  playerName,
  setPlayerName,
  avatar,
  setAvatar,
  gameCodeInput,
  setGameCodeInput,
  roomId,
  gameCode,
  isHost,
  players,
  playerId,
  error,
  hostRoom,
  joinRoom,
  startGame,
}: Props) {
  const meta = getMinigame(gameId)

  return (
    <div className="app-shell">
      <header className="app-header compact">
        <Link href="/minigames" className="btn-ghost">
          ← Mini games
        </Link>
        <h1>
          {meta?.emoji} {meta?.label}
        </h1>
      </header>

      <section className="card setup-card">
        <p className="intro">{meta?.blurb}</p>
        <label className="field">
          <span>Your name</span>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Alex"
            maxLength={24}
          />
        </label>
        <AvatarPicker selected={avatar} onSelect={setAvatar} />

        {!roomId ? (
          <div className="online-actions">
            <button type="button" className="btn btn-primary" onClick={hostRoom}>
              Create room
            </button>
            <div className="join-row">
              <input
                value={gameCodeInput}
                onChange={(e) => setGameCodeInput(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={6}
                className="code-input"
              />
              <button type="button" className="btn" onClick={joinRoom}>
                Join
              </button>
            </div>
          </div>
        ) : (
          <div className="frogger-lobby">
            <p className="room-code-display">
              Room code: <strong>{gameCode}</strong>
            </p>
            <ul className="lobby-players">
              {players.map((p) => (
                <li key={p.id}>
                  {avatarEmoji(p.avatar)} {p.name} {p.id === playerId ? '(you)' : ''}
                </li>
              ))}
            </ul>
            {isHost && (
              <button type="button" className="btn btn-primary full" onClick={startGame}>
                Start game
              </button>
            )}
            {!isHost && <p className="lobby-sub">Waiting for host to start…</p>}
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  )
}
