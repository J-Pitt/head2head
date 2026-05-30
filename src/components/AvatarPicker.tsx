'use client'

import { AVATARS } from '@/lib/avatars'
import Avatar from '@/components/Avatar'

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
            <Avatar seed={a.id} size={52} />
          </button>
        ))}
      </div>
    </div>
  )
}
