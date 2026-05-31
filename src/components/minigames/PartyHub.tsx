'use client'

import Link from 'next/link'
import SpinWheel from '@/components/minigames/SpinWheel'
import Avatar from '@/components/Avatar'
import ChatPanel from '@/components/ChatPanel'
import LocalPlayerName from '@/components/LocalPlayerName'
import { WHEEL_GAMES, type MinigameId, type MinigameMeta } from '@/lib/minigames/catalog'
import type { Player } from '@/lib/types'
import { partyWinBoard } from '@/lib/minigames/types'

type Props = {
  players: Player[]
  playerId: string
  gameCode: string | null
  isSolo: boolean
  isLocal: boolean
  multiplayerPick: boolean
  pickerPlayerId: string | null
  canPickGame: boolean
  beginGame: (gameId: MinigameId) => void
  addLocalPlayer?: () => void
  renameLocalPlayer?: (id: string, name: string) => void
  partyWins: Record<string, number>
  chatMessages: ChatMsg[]
  onSendChat: (text: string, image?: string) => void | Promise<void>
}

export default function PartyHub({
  players,
  playerId,
  gameCode,
  isSolo,
  isLocal,
  multiplayerPick,
  pickerPlayerId,
  canPickGame,
  beginGame,
  addLocalPlayer,
  renameLocalPlayer,
  partyWins,
  chatMessages,
  onSendChat,
}: Props) {
  const play = (g: MinigameMeta) => beginGame(g.id)
  const showChat = !isSolo && !isLocal
  const picker = players.find((p) => p.id === pickerPlayerId)
  const isMyPickTurn = canPickGame

  const pickPrompt = !multiplayerPick
    ? null
    : isLocal
      ? picker
        ? `${picker.name}'s turn — pass the device and spin or pick a game.`
        : 'Take turns spinning or picking a game.'
      : isMyPickTurn
        ? 'Your turn — spin the wheel or pick a game below.'
        : picker
          ? `Waiting for ${picker.name} to spin or pick the next game…`
          : 'Waiting for someone to pick the next game…'

  const winBoard = partyWinBoard(players, partyWins)
  const showWinBoard = !isSolo && players.length >= 2
  const gamesPlayed = winBoard.reduce((sum, row) => sum + row.wins, 0)

  return (
    <div className="app-shell">
      <header className="app-header compact">
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
        <h1>{isSolo ? 'Solo games' : isLocal ? 'Local games' : 'Games room'}</h1>
      </header>

      <div className={`room-layout${showChat ? '' : ' room-layout-solo'}`}>
        <main className="party-hub-main">
          {multiplayerPick && pickPrompt && (
            <section className="card party-pick-turn" aria-live="polite">
              {picker && (
                <Avatar seed={picker.avatar} size={40} className="party-pick-avatar" />
              )}
              <p className="party-pick-turn-text">{pickPrompt}</p>
            </section>
          )}

          {showWinBoard && (
            <section className="card party-scoreboard">
              <div className="party-scoreboard-head">
                <h2 className="section-title">Overall wins</h2>
                {gamesPlayed > 0 && (
                  <span className="party-scoreboard-meta">{gamesPlayed} games played</span>
                )}
              </div>
              <p className="party-scoreboard-hint">
                Everyone plays each game — highest score wins the round and earns a win here.
              </p>
              <ol className="party-win-list">
                {winBoard.map(({ player, wins }, i) => (
                  <li
                    key={player.id}
                    className={`party-win-row${i === 0 && wins > 0 ? ' party-win-leader' : ''}${player.id === playerId ? ' party-win-me' : ''}`}
                  >
                    <span className="party-win-rank">{i + 1}</span>
                    <Avatar seed={player.avatar} size={28} />
                    <span className="party-win-name">
                      {player.name}
                      {player.id === playerId ? ' (you)' : ''}
                    </span>
                    <span className="party-win-count">
                      {wins} {wins === 1 ? 'win' : 'wins'}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="card party-roster">
            <div className="party-roster-head">
              {isSolo ? (
                <span>Solo play</span>
              ) : isLocal ? (
                <span>Pass & play</span>
              ) : (
                <span>
                  Room code: <strong className="room-code-display">{gameCode}</strong>
                </span>
              )}
              <span className="party-count">
                {players.length} {players.length === 1 ? 'player' : 'players'}
              </span>
            </div>
            <ul className="party-players">
              {players.map((p) => (
                <li
                  key={p.id}
                  className={multiplayerPick && p.id === pickerPlayerId ? 'is-picker' : undefined}
                >
                  <Avatar seed={p.avatar} size={34} />
                  {isLocal && renameLocalPlayer ? (
                    <LocalPlayerName
                      name={p.name}
                      editable={p.id !== playerId}
                      onRename={(name) => renameLocalPlayer(p.id, name)}
                    />
                  ) : (
                    <span>{p.name}</span>
                  )}
                  {p.id === playerId ? ' (you)' : ''}
                  {multiplayerPick && p.id === pickerPlayerId ? ' — picking' : ''}
                </li>
              ))}
            </ul>
            {isLocal && addLocalPlayer && (
              <button type="button" className="btn btn-sm lobby-add-player" onClick={addLocalPlayer}>
                + Add player
              </button>
            )}
            <p className="party-hint">
              {isSolo
                ? 'Pick any game below — no room code needed.'
                : multiplayerPick
                  ? 'Everyone plays — highest score wins each round.'
                  : isLocal
                    ? 'Add another player to take turns picking games.'
                    : 'Share the room code so friends can join.'}
            </p>
          </section>

          <section className={`card wheel-card${!canPickGame ? ' wheel-card-waiting' : ''}`}>
            <p className="intro">
              {multiplayerPick
                ? canPickGame
                  ? 'Spin to pick at random, or choose one below.'
                  : 'Only the picker can spin or choose right now.'
                : 'Spin to pick a game at random, or choose one below.'}
            </p>
            <SpinWheel onPlay={play} disabled={!canPickGame} />
          </section>

          <section className="card">
            <h2 className="section-title">Choose a game</h2>
            <ul className="minigame-list">
              {WHEEL_GAMES.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    className={`minigame-row playable${!canPickGame ? ' minigame-row-waiting' : ''}`}
                    onClick={() => play(g)}
                    disabled={!canPickGame}
                  >
                    <span className="minigame-emoji">{g.emoji}</span>
                    <div>
                      <strong>{g.label}</strong>
                      <span>{g.blurb}</span>
                    </div>
                    <span className="minigame-go">{canPickGame ? 'Play →' : 'Wait'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </main>

        {showChat && (
          <aside className="room-sidebar">
            <ChatPanel messages={chatMessages} meId={playerId} onSend={onSendChat} title="Room chat 📸" />
          </aside>
        )}
      </div>
    </div>
  )
}
