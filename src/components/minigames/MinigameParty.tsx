'use client'

import { useMinigameParty } from '@/hooks/useMinigameRoom'
import { useRoomChat } from '@/hooks/useRoomChat'
import { getMinigame } from '@/lib/minigames/catalog'
import type { GameViewProps } from '@/lib/minigames/types'
import PartyJoin from './PartyJoin'
import PartyHub from './PartyHub'
import { GameViewRouter } from './views/GameViewRouter'

export default function MinigameParty() {
  const party = useMinigameParty()
  const me = party.players.find((p) => p.id === party.playerId)
  const chat = useRoomChat(party.roomId, {
    playerId: party.playerId,
    playerName: me?.name ?? party.playerName ?? 'Player',
    avatar: me?.avatar ?? party.avatar,
  })

  if (party.screen === 'join') {
    return <PartyJoin {...party} joinRoom={() => party.joinRoom()} />
  }

  if (party.screen === 'hub') {
    return (
      <PartyHub
        players={party.players}
        playerId={party.playerId}
        gameCode={party.gameCode}
        beginGame={party.beginGame}
        chatMessages={chat.messages}
        onSendChat={chat.send}
      />
    )
  }

  const gameId = party.activeGameId
  const meta = gameId ? getMinigame(gameId) : null
  if (!party.session || !gameId || !meta) return null

  const over = party.session.status === 'over'
  const viewProps: GameViewProps = {
    session: party.session,
    players: party.players,
    progress: party.progress,
    playerId: party.playerId,
    isHost: party.isHost,
    report: party.report,
    setSession: party.setSession,
    startRound: party.startRound,
    now: party.now,
  }

  return (
    <div className="app-shell minigame-play-shell">
      <header className="room-bar">
        <div>
          <button type="button" className="btn-ghost btn-sm" onClick={party.backToHub}>
            ← Games
          </button>
          <span className="logo-sm">
            {meta.emoji} {meta.label}
          </span>
          {party.gameCode && <span className="room-code">{party.gameCode}</span>}
        </div>
      </header>

      {over && (
        <div className="frogger-win-banner">
          <span>{party.session.winnerName ? `🏆 ${party.session.winnerName} wins!` : 'Round over'}</span>
          <div className="banner-actions">
            <button type="button" className="btn btn-sm" onClick={() => party.startRound()}>
              Play again
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={party.backToHub}>
              Pick game
            </button>
          </div>
        </div>
      )}

      <GameViewRouter gameId={gameId} {...viewProps} />
    </div>
  )
}
