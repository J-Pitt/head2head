'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { MinigameId } from '@/lib/minigames/catalog'
import { getMinigame } from '@/lib/minigames/catalog'
import type { GameViewProps } from '@/lib/minigames/types'
import MinigameLobby from './MinigameLobby'
import { useMinigameRoom } from '@/hooks/useMinigameRoom'
import { GameViewRouter } from './views/GameViewRouter'

type Props = { gameId: MinigameId }

export default function MinigameRouter({ gameId }: Props) {
  const room = useMinigameRoom(gameId)
  const meta = getMinigame(gameId)

  if (!meta) {
    return (
      <div className="app-shell">
        <p>Unknown game.</p>
        <Link href="/minigames">Back</Link>
      </div>
    )
  }

  if (room.screen === 'lobby') {
    return <MinigameLobby gameId={gameId} {...room} joinRoom={() => room.joinRoom()} />
  }

  if (!room.state) return null

  const winnerName =
    room.state.winnerName ??
    (room.state.winnerId
      ? room.players.find((p) => p.id === room.state?.winnerId)?.name
      : null)

  const viewProps: GameViewProps = {
    state: room.state,
    players: room.players,
    playerId: room.playerId,
    isHost: room.isHost,
    pushState: room.pushState,
    tick: room.tick,
  }

  return (
    <div className="app-shell minigame-play-shell">
      <header className="room-bar">
        <div>
          <Link href="/minigames" className="btn-ghost btn-sm">
            ←
          </Link>
          <span className="logo-sm">
            {meta.emoji} {meta.label}
          </span>
          {room.gameCode && <span className="room-code">{room.gameCode}</span>}
        </div>
      </header>

      {room.state.winnerId && winnerName && (
        <div className="frogger-win-banner">
          🏆 {winnerName} wins!
          {room.isHost && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => room.startGame()}
            >
              Play again
            </button>
          )}
        </div>
      )}

      <GameViewRouter gameId={gameId} {...viewProps} />
    </div>
  )
}

export function WinBanner({
  winnerName,
  isHost,
  onAgain,
}: {
  winnerName?: string | null
  isHost: boolean
  onAgain?: () => void
}) {
  if (!winnerName) return null
  return (
    <div className="frogger-win-banner">
      🏆 {winnerName} wins!
      {isHost && onAgain && (
        <button type="button" className="btn btn-sm" onClick={onAgain}>
          Play again
        </button>
      )}
    </div>
  )
}

export function useGameTick(active: boolean, fn: () => void, ms = 100) {
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => fnRef.current(), ms)
    return () => clearInterval(id)
  }, [active, ms])
}
