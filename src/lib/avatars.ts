// Player avatars are powered by DiceBear (https://www.dicebear.com).
// We store only a short "seed" string per player; the same seed always
// produces the same character, so old emoji-style ids (e.g. "star") still
// resolve to a stable, unique avatar.

const DICEBEAR_VERSION = '9.x'
const DICEBEAR_STYLE = 'adventurer'
const BG_COLORS = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,c1f4d4'

// Curated starter set shown in the picker. Any string is a valid seed, these
// are just hand-picked ones that render distinct, friendly characters.
export const AVATARS = [
  { id: 'Maverick', label: 'Maverick' },
  { id: 'Luna', label: 'Luna' },
  { id: 'Pixel', label: 'Pixel' },
  { id: 'Ziggy', label: 'Ziggy' },
  { id: 'Nova', label: 'Nova' },
  { id: 'Bandit', label: 'Bandit' },
  { id: 'Coco', label: 'Coco' },
  { id: 'Ace', label: 'Ace' },
  { id: 'Willow', label: 'Willow' },
  { id: 'Mango', label: 'Mango' },
  { id: 'Echo', label: 'Echo' },
  { id: 'Biscuit', label: 'Biscuit' },
] as const

export type AvatarId = (typeof AVATARS)[number]['id']

export const DEFAULT_AVATAR: string = AVATARS[0].id

// Build the DiceBear HTTP-API URL for a given seed.
export function avatarUrl(seed: string, size = 96): string {
  const s = encodeURIComponent(seed && seed.trim() ? seed : 'player')
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${DICEBEAR_STYLE}/svg?seed=${s}&size=${size}&radius=50&backgroundColor=${BG_COLORS}`
}
