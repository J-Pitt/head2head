// Flirty / spicy (but tasteful) Truth or Dare prompts for an adult party game.
export const TRUTHS: string[] = [
  'Who in this room would you most want to be stuck in an elevator with?',
  "What's the most attractive thing someone can do?",
  'Whats your biggest turn-on?',
  'When did you last have a crush, and on who?',
  "What's the boldest thing you've ever done to get someone's attention?",
  'Describe your ideal date night in detail.',
  'Whats a secret you have never told anyone here?',
  'Who here gives the best hugs, and why?',
  "What's your worst kiss story?",
  'Whats the most spontaneous romantic thing youve ever done?',
  'If you had to rate your flirting skills out of 10, what would it be and why?',
  'Whats something you find irresistibly attractive that others might find weird?',
  'Who was your most embarrassing crush?',
  'Whats the cheesiest pickup line that has actually worked on you?',
  'Whats a fantasy you have never admitted out loud?',
  'Whos the last person you stalked on social media?',
  'Whats the most daring outfit youve ever worn out?',
  'Have you ever sent a risky text? What did it say?',
]

export const DARES: string[] = [
  'Do your best seductive dance for 15 seconds.',
  'Send a flirty text to the 3rd contact in your phone.',
  'Do your best impression of someone in this room flirting.',
  'Whisper something flirty to the person on your left.',
  'Let the group pick an emoji and text it to your crush.',
  'Strike your sexiest pose and hold it for 10 seconds.',
  'Give someone in the room a genuine compliment about how they look.',
  'Talk in your most seductive voice until your next turn.',
  'Do 10 squats and make them look good.',
  'Show the group the last selfie in your camera roll.',
  'Let someone draw a tiny heart somewhere on your skin.',
  'Bite your lip and wink at everyone, one by one.',
  'Reenact a romantic movie scene with a pillow.',
  'Text "I have a confession..." to a random contact and read their reply aloud.',
  'Do a catwalk strut across the room.',
  'Serenade the person across from you for 10 seconds.',
]

// The minigame loser's forfeit.
export const FORFEIT = 'Send a sexy photo to the group chat 📸🔥'

export function randomPrompt(kind: 'truth' | 'dare', seed: number): string {
  const list = kind === 'truth' ? TRUTHS : DARES
  return list[Math.abs(seed) % list.length]
}
