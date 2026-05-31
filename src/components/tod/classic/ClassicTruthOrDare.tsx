'use client'

import Link from 'next/link'
import { useClassicTod } from '@/hooks/useClassicTod'
import ClassicResultModal from '@/components/tod/classic/ClassicResultModal'
import type { ClassicListMode } from '@/lib/tod/classic/lists'
import '@/app/classic-tod.css'

function ModePicker({
  value,
  onChange,
}: {
  value: ClassicListMode
  onChange: (m: ClassicListMode) => void
}) {
  return (
    <fieldset className="setup-fieldset">
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

  const onSpotId = g.currentSpotId
  const onSpotName = g.spotName(onSpotId)
  const s = g.activeState
  const showModal =
    !!s?.prompt &&
    !!s.chosenCategory &&
    (g.modalOpen || !!s.prompt)

  if (!s) {
    return (
      <div className="qtd-game qtd-game-fullscreen">
        <header className="qtd-game-header">
          <Link href="/" className="btn btn-cancel btn-back">
            ← Home
          </Link>
        </header>
        <div className="qtd-game-body">
          <div className="game">
            <h1>Truth · Dare</h1>
            <p className="subtitle">Enter your name, pick a style, and start</p>
            <form
              className="setup-form"
              onSubmit={(e) => {
                e.preventDefault()
                g.startGame()
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
              <ModePicker value={g.listMode} onChange={g.setListMode} />
              {g.error && <p className="room-error">{g.error}</p>}
              <div className="setup-actions">
                <button type="submit" className="btn btn-play">
                  Start game
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="qtd-game qtd-game-fullscreen">
      <header className="qtd-game-header">
        <Link
          href="/"
          className="btn btn-cancel btn-back"
          onClick={(e) => {
            e.preventDefault()
            g.leaveGame()
          }}
        >
          ← Home
        </Link>
      </header>
      <div className="qtd-game-body">
        <div className="game">
          <h1>Truth · Dare</h1>
          <p className="turn">
            It&apos;s <strong>{onSpotName}</strong>&apos;s turn!
          </p>

          {!s.waitingForChoice && !s.prompt && (
            <button type="button" className="btn btn-play" onClick={g.beginTurn}>
              Ready? Pick Truth or Dare
            </button>
          )}

          {s.waitingForChoice && (
            <div className="truth-dare-picker">
              <p className="truth-dare-picker-label">
                <strong>{onSpotName}</strong>, choose:
              </p>
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

          <ClassicResultModal
            isOpen={showModal}
            onClose={g.closeModal}
            category={s.chosenCategory}
            forPlayer={onSpotName}
            text={s.prompt}
            canDismiss
          />

          <div className="setup-actions setup-actions-center">
            <button type="button" className="btn btn-new-game" onClick={g.resetGame}>
              New game
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
