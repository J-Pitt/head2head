'use client'

import Link from 'next/link'
import { useClassicTod } from '@/hooks/useClassicTod'
import { useRoomChat } from '@/hooks/useRoomChat'
import ChatPanel from '@/components/ChatPanel'
import ClassicAnswerForm from '@/components/tod/classic/ClassicAnswerForm'
import LocalPlayerName from '@/components/LocalPlayerName'
import RatingPicker from '@/components/tod/RatingPicker'
import '@/app/classic-tod.css'

export default function ClassicTruthOrDare() {
  const g = useClassicTod()
  const me = g.players.find((p) => p.id === g.playerId)
  const chat = useRoomChat(g.isLocal ? null : g.roomId, {
    playerId: g.playerId,
    playerName: me?.name ?? g.playerName ?? 'Player',
    avatar: me?.avatar ?? g.avatar,
  })

  const onSpotName = g.spotName(g.onSpotId)
  const s = g.state

  async function submitAnswer(text: string, image?: string) {
    if (!g.isLocal) {
      const label = s?.chosenCategory === 'truth' ? 'Truth answer' : 'Dare complete'
      const body = text ? `${label}: ${text}` : label
      await chat.send(body, image)
    }
    g.completeAnswer()
  }

  if (!g.inRoom || !s) {
    return (
      <div className="qtd-game qtd-game-fullscreen">
        <header className="qtd-game-header">
          <Link href="/" className="btn btn-cancel btn-back">
            ← Home
          </Link>
        </header>
        <div className="qtd-game-body">
          <div className="game">
            <h1 className="dare-title" data-text="Truth · Dare">
              Truth · Dare
            </h1>
            <p className="subtitle">Classic mode — turns, prompts, and picture dares</p>
            {g.intent === 'join' && g.joinCode && (
              <p className="setup-code-hint">
                Room code: <strong className="room-code-display">{g.joinCode}</strong>
              </p>
            )}
            <form
              className="setup-form"
              onSubmit={(e) => {
                e.preventDefault()
                g.enterLobby()
              }}
            >
              <label className="setup-label">
                Your name
                <input
                  value={g.playerName}
                  onChange={(e) => g.setPlayerName(e.target.value)}
                  className="setup-input"
                  placeholder="Alex"
                  autoFocus
                  maxLength={24}
                />
              </label>
              <RatingPicker value={g.listMode} onChange={g.setListMode} />
              {g.error && <p className="room-error">{g.error}</p>}
              <div className="setup-actions">
                <button type="submit" className="btn btn-play">
                  Enter lobby
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const chatPanel = g.isLocal ? null : (
    <ChatPanel
      messages={chat.messages}
      meId={g.playerId}
      onSend={chat.send}
      title="Group chat 📸"
    />
  )

  return (
    <div className="qtd-game qtd-game-fullscreen">
      <header className="qtd-game-header classic-header">
        <Link
          href="/"
          className="btn btn-cancel btn-back"
          onClick={(e) => {
            e.preventDefault()
            g.leaveRoom()
          }}
        >
          ← Home
        </Link>
        <span className="classic-header-title">
          Truth · Dare
          {g.isLocal ? (
            <span className="classic-header-badge">Pass &amp; play</span>
          ) : g.gameCode ? (
            <span className="classic-header-badge">{g.gameCode}</span>
          ) : null}
        </span>
        <span className="classic-header-meta">{s.listMode === 'pg' ? 'PG' : 'NSFW'}</span>
      </header>

      <div className="qtd-game-body">
        <div className={`game-with-chat classic-layout${chatPanel ? '' : ' classic-layout-solo'}`}>
          <div className="game-area">
            <div className="game">
              {s.subPhase === 'lobby' && (
                <>
                  <h2>Lobby</h2>
                  <p className="subtitle">
                    {g.isLocal
                      ? 'Add everyone playing on this device, then start when ready.'
                      : `Share code ${g.gameCode} so friends can join.`}
                  </p>

                  <ul className="classic-player-list">
                    {g.players.map((p) => (
                      <li key={p.id}>
                        <LocalPlayerName
                          name={p.name}
                          editable={g.isLocal && p.id !== g.playerId}
                          onRename={(name) => g.renameLocalPlayer(p.id, name)}
                        />
                        {p.id === g.playerId ? ' (you)' : ''}
                      </li>
                    ))}
                  </ul>

                  {g.isLocal && (
                    <button type="button" className="btn btn-play-secondary" onClick={g.addLocalPlayer}>
                      + Add player
                    </button>
                  )}

                  {!g.isLocal && g.isHost && (
                    <RatingPicker value={g.listMode} onChange={g.setListMode} />
                  )}

                  {g.isHost || g.isLocal ? (
                    <button
                      type="button"
                      className="btn btn-play"
                      disabled={!g.isLocal && g.players.length < 2}
                      onClick={g.startPlaying}
                    >
                      Start game
                    </button>
                  ) : (
                    <p className="hint">Waiting for the host to start…</p>
                  )}
                </>
              )}

              {s.subPhase === 'playing' && (
                <>
                  <p className="turn">
                    It&apos;s <strong>{onSpotName}</strong>&apos;s turn
                  </p>

                  {s.turnPhase === 'choose' && g.myTurn && (
                    <div className="truth-dare-picker">
                      <p className="truth-dare-picker-label">Pick one:</p>
                      <div className="truth-dare-picker-buttons">
                        <button type="button" className="btn btn-truth" onClick={() => g.pickChoice('truth')}>
                          💜 Truth
                        </button>
                        <button type="button" className="btn btn-dare" onClick={() => g.pickChoice('dare')}>
                          🔥 Dare
                        </button>
                      </div>
                    </div>
                  )}

                  {s.turnPhase === 'choose' && !g.myTurn && (
                    <p className="hint">Waiting for {onSpotName} to pick Truth or Dare…</p>
                  )}

                  {s.turnPhase === 'answer' && s.prompt && s.chosenCategory && g.myTurn && (
                    <ClassicAnswerForm
                      key={`${s.prompt}-${s.chosenCategory}`}
                      category={s.chosenCategory}
                      prompt={s.prompt}
                      onSubmit={submitAnswer}
                    />
                  )}

                  {s.turnPhase === 'answer' && s.prompt && s.chosenCategory && !g.myTurn && (
                    <div className="classic-answer">
                      <div className={`classic-prompt-card classic-prompt-${s.chosenCategory}`}>
                        <span className="classic-prompt-badge">
                          {s.chosenCategory === 'truth' ? 'Truth' : 'Dare'}
                        </span>
                        <p className="classic-prompt-text">{s.prompt}</p>
                      </div>
                      <p className="hint">Waiting for {onSpotName} to answer…</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {chatPanel && <aside className="chat-sidebar">{chatPanel}</aside>}
        </div>
      </div>
    </div>
  )
}
