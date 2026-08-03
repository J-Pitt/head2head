import type { ClassicListMode } from '@/lib/tod/classic/lists'

export default function RatingPicker({
  value,
  onChange,
}: {
  value: ClassicListMode
  onChange: (m: ClassicListMode) => void
}) {
  return (
    <fieldset className="setup-fieldset">
      <legend className="setup-legend">Content rating</legend>
      <div className="setup-mode-buttons">
        <button
          type="button"
          className={`setup-mode-btn setup-mode-btn-friendly ${value === 'pg' ? 'selected' : ''}`}
          onClick={() => onChange('pg')}
        >
          PG
        </button>
        <button
          type="button"
          className={`setup-mode-btn setup-mode-btn-sexy ${value === 'nsfw' ? 'selected' : ''}`}
          onClick={() => onChange('nsfw')}
        >
          NSFW
        </button>
      </div>
      <p className="setup-rating-hint">
        {value === 'pg'
          ? 'Playful truths and dares for any group.'
          : '18+ — each prompt you can pick Standard NSFW or the Kink deck.'}
      </p>
    </fieldset>
  )
}
