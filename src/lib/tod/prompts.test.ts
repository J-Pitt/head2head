import { describe, expect, it } from 'vitest'
import { DARES, randomPrompt, TRUTHS } from '@/lib/tod/prompts'

describe('tod prompts', () => {
  it('randomPrompt is deterministic by seed', () => {
    expect(randomPrompt('truth', 7)).toBe(randomPrompt('truth', 7))
    expect(randomPrompt('dare', 7)).toBe(randomPrompt('dare', 7))
  })

  it('randomPrompt stays in list bounds', () => {
    const t = randomPrompt('truth', 9999)
    const d = randomPrompt('dare', -3)
    expect(TRUTHS).toContain(t)
    expect(DARES).toContain(d)
  })
})
