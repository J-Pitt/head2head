'use client'

import Link from 'next/link'
import { useClassicTod } from '@/hooks/useClassicTod'
import { useRoomChat } from '@/hooks/useRoomChat'
import ChatPanel from '@/components/ChatPanel'
import ClassicResultModal from '@/components/tod/classic/ClassicResultModal'
import type { ClassicListMode } from '@/lib/tod/classic/lists'
import '@/app/classic-tod.css'

function ModePicker({
  value,
  onChange,
  disabled,
}: {
  value: ClassicListMode
  onChange: (m: ClassicListMode) => void
  disabled?: boolean
}) {
  return (
    <fieldset className="setup-fieldset" disabled={disabled}>
      <legend className="setup-legend">Game style</legend>
      <div className="setup-mode-buttons">
        <button
          type="button"
          className={`setup-mode-btn setup-mode-btn-friendly ${value === 'friendly' ? 'selected' : ''}`}
          onClick={() => onChange('friendly')}
        >
          Friendly
        </button>
        <button
          type="button"
          className={`setup-mode-btn setup-mode-btn-sexy ${value === 'sexy' ? 'selected' : ''}`}
          onClick={() => onChange('sexy')}
        >
          Sexy
        </button>
      </div>
    </fieldset>
  )
}

export default function ClassicTruthOrDare() {
  const g = useClassicTod()
  const me = g.players.find((p) => p.id === g.playerId)
  const chat = useRoomChat(g.roomId, {
    playerId: g.playerId,
    playerName: me?.name ?? g.playerName ?? 'Player',
    avatar: me?.avatar ?? g.avatar,
  })

  const inGame = g.isOnline || !!g.activeState
  const onSpotId = g.currentSpotId
  const onSpotName = g.spotName(onSpotId)
  const showModal =
    !!g.activeState?.prompt &&
    !!g.activeState.chosenCategory &&
    (g.modalOpen || (!g.isOnline && !!g.activeState.prompt))

  if (!inGame) {
    return (
      <div className="qtd-game qtd-game-fullscreen">
        <header className="qtd-game-header">
          <Link href="/" className="btn btn-cancel btn-back">
            ← Home
          </Link>
        </header>
        <div className="qtd-game-body">
          {g.screen === 'title' && (
            <div className="game title-page">
              <div className="title-page-bg" aria-hidden>
                <span className="title-page-orb title-page-orb-1" />
                <span className="title-page-orb title-page-orb-2" />
              </div>
              <h1 className="dare-title" data-text="Do you Dare??">
                Do you Dare??
              </h1>
              <p className="tagline">Truth · Dare</p>
              <p className="subtitle">Choose how to play</p>
              <div className="setup-actions play-mode-actions">
                <button type="button" className="btn btn-play" onClick={() => g.setScreen('local-setup')}>
                  Play locally
                </button>
                <button
                  type="button"
                  className="btn btn-play btn-play-secondary"
                  onClick={() => g.setScreen('online-choice')}
                >
                  Play with others
                </button>
              </div>
            </div>
          )}

          {g.screen === 'local-setup' && (
            <div className="game">
              <h1>Truth · Dare</h1>
              <p className="subtitle">Set up your game</p>
              <form
                className="setup-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  g.startLocalGame(g.listMode)
                }}
              >
                <ModePicker value={g.listMode} onChange={g.setListMode} />
                <label className="setup-label">
                  Number of players
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={g.numLocal}
                    onChange={(e) => {
                      const n = Math.max(2, Math.min(20, Number(e.target.value) || 2))
                      g.setNumLocal(n)
                      g.setLocalNames((prev) => {
                        const next = [...prev]
                        while (next.length < n) next.push('')
                        return next.slice(0, n)
                      })
                    }}
                    className="setup-input"
                  />
                </label>
                <div className="setup-names">
                  {Array.from({ length: g.numLocal }).map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      value={g.localNames[i] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        g.setLocalNames((prev) => {
                          const next = [...prev]
                          next[i] = v
                          return next
                        })
                      }}
                      placeholder={`Player ${i + 1}`}
                      className="setup-input"
                    />
                  ))}
                </div>
                <div className="setup-actions">
                  <button type="submit" className="btn btn-play">
                    Start game
                  </button>
                  <button type="button" className="btn btn-cancel" onClick={() => g.setScreen('title')}>
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {g.screen === 'online-choice' && (
            <div className="game title-page">
              <h1 className="dare-title" data-text="Do you Dare??">
                Do you Dare??
              </h1>
              <p className="subtitle">Play with others using a game code</p>
              <div className="setup-actions play-mode-actions">
                <button type="button" className="btn btn-play" onClick={() => g.setScreen('online-create')}>
                  Create game
                </button>
                <button type="button" className="btn btn-play btn-play-secondary" onClick={() => g.setScreen('online-join')}>
                  Join game
                </button>
                <button type="button" className="btn btn-cancel" onClick={() => g.setScreen('title')}>
                  Back
                </button>
              </div>
            </div>
          )}

          {g.screen === 'online-create' && (
            <div className="game">
              <h1>Create game</h1>
              <p className="subtitle">Enter your name. You&apos;ll get a code to share.</p>
              <form
                className="setup-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  g.hostRoom(g.createPassword || undefined)
                }}
              >
                <label className="setup-label">
                  Your name
                  <input
                    value={g.playerName}
                    onChange={(e) => g.setPlayerName(e.target.value)}
                    className="setup-input"
                    placeholder="Host"
                  />
                </label>
                <label className="setup-label">
                  Game password (optional)
                  <input
                    value={g.createPassword}
                    onChange={(e) => g.setCreatePassword(e.target.value.toUpperCase())}
                    className="setup-input"
                    maxLength={6}
                    placeholder="Optional"
                  />
                </label>
                {g.error && <p className="room-error">{g.error}</p>}
                <div className="setup-actions">
                  <button type="submit" className="btn btn-play">
                    Create game
                  </button>
                  <button type="button" className="btn btn-cancel" onClick={() => g.setScreen('online-choice')}>
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {g.screen === 'online-join' && (
            <div className="game">
              <h1>Join game</h1>
              <p className="subtitle">Enter the game code and your name.</p>
              <form
                className="setup-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  g.joinRoom()
                }}
              >
                <label className="setup-label">
                  Game code
                  <input
                    value={g.gameCodeInput}
                    onChange={(e) => g.setGameCodeInput(e.target.value.toUpperCase())}
                    className="setup-input"
                    maxLength={6}
                  />
                </label>
                <label className="setup-label">
                  Your name
                  <input
                    value={g.playerName}
                    onChange={(e) => g.setPlayerName(e.target.value)}
                    className="setup-input"
                  />
                </label>
                {g.error && <p className="room-error">{g.error}</p>}
                <div className="setup-actions">
                  <button type="submit" className="btn btn-play">
                    Join
                  </button>
                  <button type="button" className="btn btn-cancel" onClick={() => g.setScreen('online-choice')}>
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    )
  }

  const s = g.activeState!
  const inLobby = s.subPhase === 'lobby'

  return (
    <div className="qtd-game qtd-game-fullscreen">
      <header className="qtd-game-header">
        <Link href="/" className="btn btn-cancel btn-back" onClick={(e) => { e.preventDefault(); g.leaveRoom() }}>
          ← Home
        </Link>
      </header>
      <div className="qtd-game-body">
        <div className="game-with-chat">
          <div className="game-area">
            <div className="game">
              {inLobby ? (
                <>
                  <h1>{g.isHost ? 'Your game' : "You're in"}</h1>
                  {g.isHost ? (
                    <>
                      <p className="subtitle">Share this game code with friends</p>
                      <p className="room-code-display">{g.gameCode}</p>
                      <ModePicker value={s.listMode} onChange={g.pushListMode} disabled={!g.isHost} />
                      <p className="room-players-label">Players ({g.players.length})</p>
                      <ul className="room-players-list">
                        {g.players.map((p) => (
                          <li key={p.id}>{p.name}</li>
                        ))}
                      </ul>
                      <div className="setup-actions">
                        <button
                          type="button"
                          className="btn btn-play"
                          disabled={g.players.length < 2}
                          onClick={g.startOnlineGame}
                        >
                          Start game
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="subtitle">Waiting for the host to start the game…</p>
                      <ul className="room-players-list">
                        {g.players.map((p) => (
                          <li key={p.id}>{p.name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <>
                  <h1>Truth · Dare</h1>
                  <p className="turn">
                    It&apos;s <strong>{onSpotName}</strong>&apos;s turn!
                  </p>

                  {!s.waitingForChoice && !s.prompt && (g.isOnline ? g.myTurn : true) && (
                    <button type="button" className="btn btn-play" onClick={g.beginTurn}>
                      Ready? Pick Truth or Dare
                    </button>
                  )}

                  {!s.waitingForChoice && !s.prompt && g.isOnline && !g.myTurn && (
                    <p className="hint">Waiting for {onSpotName} to go…</p>
                  )}

                  {s.waitingForChoice && (
                    <div className="truth-dare-picker">
                      <p className="truth-dare-picker-label">
                        <strong>{onSpotName}</strong>, choose:
                      </p>
                      {(g.isOnline ? g.myTurn : true) ? (
                        <div className="truth-dare-picker-buttons">
                          <button type="button" className="btn btn-truth" onClick={() => g.pickChoice('truth')}>
                            💜 Truth
                          </button>
                          <button type="button" className="btn btn-dare" onClick={() => g.pickChoice('dare')}>
                            🔥 Dare
                          </button>
                        </div>
                      ) : (
                        <p className="truth-dare-picker-waiting">Waiting for {onSpotName} to choose…</p>
                      )}
                    </div>
                  )}

                  <ClassicResultModal
                    isOpen={showModal}
                    onClose={g.closeModal}
                    category={s.chosenCategory}
                    forPlayer={onSpotName}
                    text={s.prompt}
                    canDismiss={!g.isOnline || g.myTurn}
                  />

                  <div className="setup-actions setup-actions-center">
                    <button type="button" className="btn btn-new-game" onClick={g.resetGame}>
                      New game
                    </button>
                    {g.isOnline && (
                      <button type="button" className="btn btn-cancel" onClick={g.leaveRoom}>
                        Leave
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          {g.isOnline && (
            <div className="chat-sidebar">
              <ChatPanel messages={chat.messages} meId={g.playerId} onSend={chat.send} title="Chat" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
