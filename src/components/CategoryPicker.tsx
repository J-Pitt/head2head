'use client'

import { CATEGORIES } from '@/lib/trivia'
import type { CategoryId } from '@/lib/types'

type Props = {
  selected: CategoryId[]
  onChange: (categories: CategoryId[]) => void
  disabled?: boolean
}

export default function CategoryPicker({ selected, onChange, disabled }: Props) {
  function toggle(id: CategoryId) {
    if (disabled) return
    if (selected.includes(id)) {
      if (selected.length === 1) return
      onChange(selected.filter((c) => c !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="category-picker">
      <p className="label">Categories</p>
      <div className="category-chips">
        {CATEGORIES.map((c) => {
          const on = selected.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              className={`category-chip ${on ? 'on' : ''}`}
              onClick={() => toggle(c.id)}
              disabled={disabled}
              aria-pressed={on}
            >
              <span>{c.icon}</span> {c.label}
            </button>
          )
        })}
      </div>
      <p className="category-hint">
        Pick any mix — each category adds a $200–$1000 Jeopardy column (5 clues).
      </p>
    </div>
  )
}
