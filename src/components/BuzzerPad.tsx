'use client'

type Props = {
  onBuzz: () => void
  disabled?: boolean
  locked?: boolean
  buzzedByName?: string | null
}

export default function BuzzerPad({ onBuzz, disabled, locked, buzzedByName }: Props) {
  if (locked && buzzedByName) {
    return (
      <div className="buzzer-pad locked">
        <span className="buzzer-locked-label">{buzzedByName} buzzed in!</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="buzzer-pad"
      onClick={onBuzz}
      disabled={disabled}
      aria-label="Buzz in to answer"
    >
      <span className="buzzer-ring" />
      <span className="buzzer-text">BUZZ</span>
    </button>
  )
}
