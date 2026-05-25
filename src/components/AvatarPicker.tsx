'use client'

import { AVATARS } from '@/lib/avatars'

type Props = {
  selected: string
  onSelect: (id: string) => void
}

export default function AvatarPicker({ selected, onSelect }: Props) {
  return (
    <div className="avatar-picker">
      <p className="label">Pick your avatar</p>
      <div className="avatar-grid">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`avatar-option ${selected === a.id ? 'selected' : ''}`}
            onClick={() => onSelect(a.id)}
            title={a.label}
            aria-label={a.label}
            aria-pressed={selected === a.id}
          >
            <span className="avatar-emoji">{a.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
