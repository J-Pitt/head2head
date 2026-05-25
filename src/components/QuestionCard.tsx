'use client'

import type { GamePhase } from '@/lib/types'
import type { TriviaQuestion } from '@/lib/types'

type Props = {
  question: TriviaQuestion
  phase: GamePhase
  correctIndex?: number
  selectedIndex?: number | null
  onSelect?: (index: number) => void
  disabled?: boolean
  currentPlayerName?: string
  subtitle?: string
}

export default function QuestionCard({
  question,
  phase,
  correctIndex,
  selectedIndex,
  onSelect,
  disabled,
  currentPlayerName,
  subtitle,
}: Props) {
  const categoryLabel = question.category === 'science' ? 'Science' : "90's Pop Culture"
  const showChoices = phase === 'question' || phase === 'answering' || phase === 'reveal'
  const choicesLocked = phase === 'reveal'

  return (
    <div className="question-card">
      <span className="question-category">{categoryLabel}</span>
      {(subtitle || (currentPlayerName && (phase === 'question' || phase === 'answering'))) && (
        <p className="question-turn">{subtitle ?? `${currentPlayerName}'s turn`}</p>
      )}
      <h2 className="question-text">{question.question}</h2>
      {showChoices && (
        <ul className="choice-list">
          {question.choices.map((choice, i) => {
            let cls = 'choice-btn'
            if (phase === 'reveal') {
              if (i === correctIndex) cls += ' correct'
              else if (i === selectedIndex && selectedIndex !== correctIndex) cls += ' wrong'
            } else if (i === selectedIndex) cls += ' selected'

            return (
              <li key={i}>
                <button
                  type="button"
                  className={cls}
                  disabled={disabled || choicesLocked}
                  onClick={() => onSelect?.(i)}
                >
                  {choice}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {phase === 'buzzing' && (
        <p className="buzz-hint">Buzz in first to lock the answer!</p>
      )}
      {phase === 'reveal' && selectedIndex != null && (
        <p className="reveal-msg">
          {selectedIndex === correctIndex ? 'Correct!' : 'Not quite.'}
        </p>
      )}
      {phase === 'reveal' && selectedIndex == null && (
        <p className="reveal-msg muted">Time&apos;s up — no answer.</p>
      )}
    </div>
  )
}
