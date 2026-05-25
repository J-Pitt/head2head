export const AVATARS = [
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'brain', emoji: '🧠', label: 'Brain' },
  { id: 'alien', emoji: '👽', label: 'Alien' },
  { id: 'disco', emoji: '🪩', label: 'Disco' },
  { id: 'cassette', emoji: '📼', label: 'Cassette' },
  { id: 'gamepad', emoji: '🎮', label: 'Gamer' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'lightning', emoji: '⚡', label: 'Lightning' },
  { id: 'cat', emoji: '🐱', label: 'Cat' },
  { id: 'ghost', emoji: '👻', label: 'Ghost' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'pizza', emoji: '🍕', label: 'Pizza' },
] as const

export type AvatarId = (typeof AVATARS)[number]['id']

export function avatarEmoji(id: string) {
  return AVATARS.find((a) => a.id === id)?.emoji ?? '🙂'
}
