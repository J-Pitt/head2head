// NSFW / spicy Truth or Dare prompts for an adults-only (18+) party game.

export type TodDeckId = 'party' | 'kink'

export const TOD_DECKS = [
  { id: 'party' as const, label: 'Party', icon: '💋' },
  { id: 'kink' as const, label: 'Kink', icon: '⛓️' },
]

const PARTY_TRUTHS: string[] = [
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

const PARTY_DARES: string[] = [
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
  "Give a hickey-free neck kiss to the person of the group's choice.",
  'Read the last spicy message you sent out loud.',
  'Crawl across the room in your most seductive way.',
  'Let the group dare you to do one thing — no take-backs.',
]

const KINK_TRUTHS: string[] = [
  'Do you want to own me tonight, or be owned — and how absolute should that feel?',
  "What's the filthiest order you've wanted to give me but never dared?",
  "What's the most humiliating praise or degradation that would actually turn you on?",
  "If I cuffed you and told you that you don't get to come, would you thank me or fight it?",
  'Where do you want to be restrained — wrists, ankles, both, collar, blindfold — rank them.',
  "Do you want me to fuck your throat / ride your face until I'm satisfied, even if you're a mess?",
  'What\'s a "no" you\'ve said during sex that you secretly wanted me to push past inside negotiated play?',
  'Do you get harder/wetter from being denied, used, or praised like property?',
  "What's the meanest (hottest) thing I could say while I'm inside you / on top of you?",
  'If I put you on your knees and told you to present, what would "good" look like to you?',
  'Do you want impact — spanking, hair pull, face hold — and how rough?',
  "What's one body part you'd let me claim as mine for the night?",
  "Have you fantasized about being tied and teased until you're shaking? Describe it dirty.",
  'Do you want me to decide when you come, how you come, and whether you come at all?',
  "What's a service act you'd do for me that feels submissive in the best way?",
  'Do you want aftercare soft, or do you want to stay in protocol until I release you?',
  "What's your ruin fantasy: overstimulation, orgasm control, or being left aching?",
  'If I told you to hold still while I used you, how still could you actually stay?',
  "What's a restraint setup you've mentally built for us down to the details?",
  'Do you want me to make you beg properly — full sentences, eye contact, no shortcuts?',
  "What's dirtier to you: being displayed for me, or being hidden and privately destroyed?",
  'Name the exact words you want me to use when I give permission to come.',
  "What's a Dom move that would make you drop into subspace / Domspace fast?",
  'Do you want pain mixed with pleasure, or pure control with almost no pain?',
  'If I put a collar, belt, or my hand on your throat (safe pressure only), what does that do to you?',
]

const KINK_DARES: string[] = [
  "Kneel. Ask permission to touch me. Don't move until I say yes.",
  'Present: hands behind your back, chest out / ass up — whichever I choose — and hold it.',
  "Let me restrain your wrists. You don't get them back until you earn it.",
  'Blindfold on. Mouth open. Wait for instruction without guessing.',
  'Edge yourself (or me) under orders: stop instantly when I say "stop," even mid-breath.',
  'Get face-fucked / sit on my face for a timed round — I control pace and depth within your limits.',
  'Ask to come. If I say no, thank me and keep going.',
  'Take 15 spanks (or swats) counting each one. Miss a count, we restart.',
  'Hands tied or held: use only your mouth for 3 minutes exactly as directed.',
  "Crawl (or walk on your knees if that's your dynamic) to me and kiss wherever I point.",
  'Hold eye contact while I talk down to you / worship-own you — no looking away.',
  'Let me put you in a hogtie-lite / ankles-to-wrists / belt restraint for 5 minutes of teasing only.',
  "Beg for my cock / cunt / hand in a full filthy paragraph. Rewrite it if I say it's not good enough.",
  "I choose your position. You stay in it while I use you — you don't adjust unless told.",
  'Wear a collar, tie, belt, or my hand as a collar. Address me as agreed (Sir/Goddess/etc.) for 10 minutes.',
  'Overstimulate after orgasm (with consent): keep going for 20–60 seconds after I say "again."',
  'Hands behind your back while I fuck you / ride you. If your hands move, I stop and make you ask to continue.',
  'Let me gag you (cloth/kiss-gag/proper gag if you have one). Tap out = safeword.',
  'Service round: undress me, warm me up, and ask how I want to finish using you.',
  "Press your face into me / between my legs and don't pull away until I release you.",
  'Restraint + denial: tied, touched to the edge 3 times, no orgasm. Then thank me.',
  'Hair pulled back, throat offered, mouth used — controlled, not reckless.',
  'I write a temporary rule on you (marker/lipstick): "Don\'t come," "Mine," "Ask." Obey it for the scene.',
  'Prone bone / bent over / folded — your choice of vulnerable position — and tell me to take you apart.',
  "Endgame: I pick one — fuck you restrained until I'm done, sit on your face until I come, or edge you until you break etiquette and get punished. You say \"yes\" and we start.",
]

const DECK_POOLS: Record<TodDeckId, { truth: string[]; dare: string[] }> = {
  party: { truth: PARTY_TRUTHS, dare: PARTY_DARES },
  kink: { truth: KINK_TRUTHS, dare: KINK_DARES },
}

// Kept for compatibility: the full pools across every deck.
export const TRUTHS: string[] = [...PARTY_TRUTHS, ...KINK_TRUTHS]
export const DARES: string[] = [...PARTY_DARES, ...KINK_DARES]

function poolFor(kind: 'truth' | 'dare', decks?: TodDeckId[]): string[] {
  const active = decks?.filter((d) => d in DECK_POOLS)
  const ids: TodDeckId[] = active && active.length ? active : ['party']
  return ids.flatMap((d) => DECK_POOLS[d][kind])
}

// The minigame loser's forfeit.
export const FORFEIT = 'Send a sexy photo to the group chat 📸🔥'

// Random prompt for the "surprise me" generator.
export function randomTodPrompt(kind: 'truth' | 'dare', decks?: TodDeckId[]): string {
  const list = poolFor(kind, decks)
  return list[Math.floor(Math.random() * list.length)]
}

export function randomPrompt(kind: 'truth' | 'dare', seed: number, decks?: TodDeckId[]): string {
  const list = poolFor(kind, decks)
  return list[Math.abs(seed) % list.length]
}
