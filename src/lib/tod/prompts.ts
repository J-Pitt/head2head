// NSFW / spicy Truth or Dare prompts for an adults-only (18+) party game.
export const TRUTHS: string[] = [
  "What's the wildest place you've ever hooked up?",
  "What's a fantasy you've never told your partner about?",
  "Who in this room would you most want to spend a night with?",
  "What's the kinkiest thing you're secretly into?",
  "When was the last time you sent or received a nude?",
  "What's your favorite position, and why?",
  "What's the most adventurous thing you've done in bed?",
  "Have you ever had a one-night stand? Spill the details.",
  "What's a turn-on you're a little embarrassed about?",
  "What's the dirtiest thought you've had about someone here?",
  "What's your body count, roughly?",
  "Have you ever faked it? How often?",
  "What's the naughtiest dream you can remember?",
  "Where on your body do you most like to be touched?",
  "What's the most scandalous thing in your search history?",
  "Have you ever been caught in the act? What happened?",
  "What's something you've always wanted to try but haven't?",
  "Who was the best you've ever had, and what made them great?",
  "What's your go-to move to turn someone on?",
  "What's the most recent thing that got you hot and bothered?",
]

export const DARES: string[] = [
  'Give someone in the room a slow, sensual shoulder massage for 30 seconds.',
  'Demonstrate your best moan.',
  'Take off one item of clothing of your choice.',
  'Whisper the dirtiest thing you can think of to the person on your right.',
  'Do your sexiest slow dance for the group for 20 seconds.',
  'Send a flirty "I want you" text to your crush right now.',
  'Let the group pick someone for you to give a lap dance for 15 seconds.',
  'Show the spiciest photo currently in your camera roll.',
  'Suck on your finger as seductively as you can for 10 seconds.',
  'Describe in detail what you would do to the person across from you.',
  'Recreate your favorite intimate sound effect.',
  'Let someone in the room leave a (clothed) handprint anywhere they choose.',
  'Do your best striptease to one verse of any song.',
  'Bite your lip and give every person here your most seductive look.',
  'Text your ex something flirty and read their reply aloud.',
  'Act out your favorite position using only your hands.',
  'Give a hickey-free neck kiss to the person of the group\'s choice.',
  'Read the last spicy message you sent out loud.',
  'Crawl across the room in your most seductive way.',
  'Let the group dare you to do one thing — no take-backs.',
]

// The minigame loser's forfeit.
export const FORFEIT = 'Send a sexy photo to the group chat 📸🔥'

// Random prompt for the "surprise me" generator.
export function randomTodPrompt(kind: 'truth' | 'dare'): string {
  const list = kind === 'truth' ? TRUTHS : DARES
  return list[Math.floor(Math.random() * list.length)]
}

export function randomPrompt(kind: 'truth' | 'dare', seed: number): string {
  const list = kind === 'truth' ? TRUTHS : DARES
  return list[Math.abs(seed) % list.length]
}
