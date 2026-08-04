import {
  TRUTHS as NSFW_TRUTHS,
  DARES as NSFW_DARES,
  KINK_TRUTHS,
  KINK_DARES,
} from '@/lib/tod/prompts'

export const PG_TRUTHS = [
  "What's the most embarrassing thing you've ever done in front of a crush?",
  "What's a guilty pleasure you're willing to admit?",
  "Who was your first celebrity crush?",
  "What's the silliest rumor you've ever heard about yourself?",
  "What's the worst fashion phase you went through?",
  "What's something you believed as a kid that turned out to be totally wrong?",
  "What's the most childish thing you still do?",
  "What's your most embarrassing karaoke song?",
  "What's a skill you wish you had but don't?",
  "What's the weirdest dream you've had that you remember?",
  "What's the worst lie you've ever told and gotten away with?",
  "What's the most ridiculous thing you've searched on the internet?",
  "What's the longest you've gone without showering and why?",
  "What's something on your phone you'd be embarrassed if everyone saw?",
  "What's the worst date you've ever been on?",
  "What's the most petty thing you've ever done?",
  "What's the weirdest food combination you secretly enjoy?",
  "If you could swap lives with someone in this game for a day, who and why?",
  "What's a secret talent nobody here knows about?",
  "What's the most awkward text you've accidentally sent to the wrong person?",
  "What's something you pretend to like but actually can't stand?",
  "What's the craziest thing on your bucket list?",
  "What's a compliment you got that you still think about?",
  "What's the most embarrassing song in your recent playlist?",
  "If your search history was read aloud right now, what would surprise people most?",
]

export const PG_DARES = [
  "Do your best impression of someone in the game — everyone guesses who.",
  "Sing the chorus of a song of the group's choice.",
  "Do 10 jumping jacks while saying the alphabet backwards.",
  "Let the group choose an emoji — act it out until someone guesses it.",
  "Speak in an accent for the next 3 rounds.",
  "Dance with no music for 30 seconds (on camera if remote).",
  "Call a friend and say 'I have a secret to tell you' then hang up.",
  "Do a dramatic reading of a text from your phone (last non-spam message).",
  "Give everyone in the game a one-word compliment.",
  "📸 GROUP PHOTO: Everyone take a silly selfie and send it to the chat right now!",
  "Text a friend 'I just won a contest' and screenshot their response for the group.",
  "Show the group your most used emoji and explain why.",
  "Do your best celebrity impression for 30 seconds.",
  "Let the group pick a song — you have to lip-sync the chorus dramatically.",
  "Show the group the last photo you took on your phone.",
  "📸 GROUP PHOTO: Everyone send a pic of what's in front of you right now!",
  "Do a fake cooking show for 30 seconds using whatever's near you.",
  "Speak only in questions for the next 2 rounds.",
  "Let the group give you a nickname — you go by it for the rest of the game.",
  "Show the group your best 'surprised face' and hold it for 10 seconds.",
  "Read the last text you received out loud to the group.",
  "Do your best robot dance for 20 seconds.",
  "📸 GROUP PHOTO: Everyone take a photo making your best 'model' face and send to chat!",
  "Make up a 30-second commercial for the object closest to you.",
  "Tell a 1-minute story using only hand gestures (on camera if remote).",
]

export type ClassicListMode = 'pg' | 'nsfw'

/** Per-question deck when the game is NSFW. */
export type PromptDeckId = 'standard' | 'kink'

export function getTruthsForMode(mode: ClassicListMode): string[] {
  return mode === 'nsfw' ? NSFW_TRUTHS : PG_TRUTHS
}

export function getDaresForMode(mode: ClassicListMode): string[] {
  return mode === 'nsfw' ? NSFW_DARES : PG_DARES
}

export function getTruthsForDeck(deck: PromptDeckId): string[] {
  return deck === 'kink' ? KINK_TRUTHS : NSFW_TRUTHS
}

export function getDaresForDeck(deck: PromptDeckId): string[] {
  return deck === 'kink' ? KINK_DARES : NSFW_DARES
}

export function normalizePromptText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function findPromptIndex(pool: string[], text: string): number | null {
  const needle = normalizePromptText(text)
  const idx = pool.findIndex((p) => normalizePromptText(p) === needle)
  return idx >= 0 ? idx : null
}

export function pickRandomPrompt(
  pool: string[],
  used: number[],
  excludeIdx?: number,
  usedTexts: string[] = []
): { text: string; idx: number } | null {
  const picks = pickPromptChoices(
    pool,
    used,
    1,
    excludeIdx != null ? [excludeIdx] : [],
    usedTexts
  )
  return picks[0] ?? null
}

/** Pick up to `count` distinct unused prompts for the asker to choose from. */
export function pickPromptChoices(
  pool: string[],
  used: number[],
  count = 3,
  excludeIdxs: number[] = [],
  usedTexts: string[] = []
): { text: string; idx: number }[] {
  if (pool.length === 0 || count <= 0) return []
  const usedSet = new Set(used)
  const usedTextSet = new Set(usedTexts.map(normalizePromptText).filter(Boolean))
  const excludeSet = new Set(excludeIdxs)

  const unused = pool
    .map((text, idx) => ({ text, idx }))
    .filter((x) => !usedSet.has(x.idx) && !usedTextSet.has(normalizePromptText(x.text)))
  if (unused.length === 0) return []

  // Prefer prompts not shown yet this turn. Only recycle already-shown
  // unused ones when nothing else remains — never reuse played prompts.
  const fresh = unused.filter((x) => !excludeSet.has(x.idx))
  const recycled = unused.filter((x) => excludeSet.has(x.idx))

  function takeShuffled(source: { text: string; idx: number }[], n: number) {
    const bag = [...source]
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
    }
    return bag.slice(0, n)
  }

  const picks = takeShuffled(fresh, count)
  if (picks.length < count) {
    picks.push(...takeShuffled(recycled, count - picks.length))
  }
  return picks
}
