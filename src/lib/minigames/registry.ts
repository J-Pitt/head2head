import type { Player } from '@/lib/types'
import type { MinigameId } from './catalog'
import type { Progress, Session, SyncMode } from './types'

type EndWhen = 'all' | 'any' | 'time'

export type GameConfig = {
  mode: SyncMode
  // Countdown before play starts (synced via session.startAt).
  countdownMs: number
  // Hard time cap for the round (null = no cap, e.g. turn-based Connect 4).
  durationMs: number | null
  // When to declare the round over:
  //  all  -> every player is dead or finished (or time cap hit)
  //  any  -> as soon as one player finishes (or time cap)
  //  time -> only when the time cap is reached
  endWhen: EndWhen
  // Lower score is better (Reaction = fewest ms).
  lowerIsBetter?: boolean
  // Extra session fields injected when a round starts.
  buildSession?: (players: Player[], seed: number) => Partial<Session>
}

export const GAME_CONFIG: Record<MinigameId, GameConfig> = {
  frogger: { mode: 'race', countdownMs: 3200, durationMs: 75000, endWhen: 'all' },
  snake: { mode: 'race', countdownMs: 3200, durationMs: 90000, endWhen: 'all' },
  flappy: { mode: 'race', countdownMs: 3200, durationMs: 90000, endWhen: 'all' },
  memory: { mode: 'race', countdownMs: 3200, durationMs: 120000, endWhen: 'any' },
  dino: { mode: 'race', countdownMs: 3200, durationMs: 90000, endWhen: 'all' },
  breakout: { mode: 'race', countdownMs: 3200, durationMs: 90000, endWhen: 'all' },
  meteor: { mode: 'race', countdownMs: 3200, durationMs: 90000, endWhen: 'all' },
  pong: { mode: 'race', countdownMs: 3200, durationMs: 90000, endWhen: 'all' },
  connect4: {
    mode: 'turn',
    countdownMs: 600,
    durationMs: null,
    endWhen: 'time',
    buildSession: (players) => ({
      connect4: {
        board: new Array(42).fill(0),
        turnPlayerId: players[0]?.id ?? '',
        lastCol: null,
      },
    }),
  },
}

export function getGameConfig(gameId: MinigameId): GameConfig {
  return GAME_CONFIG[gameId]
}

// Decide the winner from collected progress for race/reaction games.
export function computeRaceWinner(
  config: GameConfig,
  players: Player[],
  progress: Progress[]
): { id: string; name: string } | null {
  const named = (id: string) => players.find((p) => p.id === id)?.name ?? 'Winner'

  if (config.mode === 'reaction' || config.lowerIsBetter) {
    const valid = progress.filter((p) => p.finished && p.finishAt != null)
    if (!valid.length) return null
    valid.sort((a, b) => (a.score - b.score) || ((a.finishAt ?? 0) - (b.finishAt ?? 0)))
    return { id: valid[0].playerId, name: named(valid[0].playerId) }
  }

  // Race: a finisher beats a non-finisher; earliest finish wins; else top score.
  const finishers = progress.filter((p) => p.finished && p.finishAt != null)
  if (finishers.length) {
    finishers.sort((a, b) => (a.finishAt ?? 0) - (b.finishAt ?? 0))
    return { id: finishers[0].playerId, name: named(finishers[0].playerId) }
  }
  if (!progress.length) return null
  const ranked = [...progress].sort((a, b) => b.score - a.score)
  if (ranked[0].score <= 0) return null
  return { id: ranked[0].playerId, name: named(ranked[0].playerId) }
}

// Decide the LOSER (for Truth-or-Dare forfeits). Players who never reported are
// treated as worst. Only used for race / reaction games (clear ranking).
export function computeRaceLoser(
  config: GameConfig,
  players: Player[],
  progress: Progress[]
): { id: string; name: string } | null {
  if (!players.length) return null
  const byId = new Map(progress.map((p) => [p.playerId, p]))
  const worseThan = (a: Player, b: Player) => rankValue(config, byId.get(a.id)) - rankValue(config, byId.get(b.id))
  // For lowerIsBetter, bigger rankValue = worse; for race, smaller = worse.
  const sorted = [...players].sort((a, b) =>
    config.lowerIsBetter || config.mode === 'reaction' ? worseThan(b, a) : worseThan(a, b)
  )
  const loser = sorted[0]
  return { id: loser.id, name: players.find((p) => p.id === loser.id)?.name ?? 'Loser' }
}

function rankValue(config: GameConfig, prog: Progress | undefined): number {
  if (config.lowerIsBetter || config.mode === 'reaction') {
    // Slowest / no-show is worst (largest value).
    if (!prog || !prog.finished || prog.finishAt == null) return Number.POSITIVE_INFINITY
    return prog.score
  }
  // Higher score is better, so lowest is worst. No-show counts as below zero.
  if (!prog) return -1
  return prog.score
}

export function isRoundComplete(
  config: GameConfig,
  players: Player[],
  progress: Progress[],
  now: number,
  endAt: number | null
): boolean {
  if (endAt != null && now >= endAt) return true
  if (!progress.length) return false
  const done = (p: Progress) => p.finished || !p.alive
  if (config.endWhen === 'any') return progress.some((p) => p.finished)
  if (config.endWhen === 'all') {
    // Every player who has reported is done, and everyone has reported in.
    return progress.length >= players.length && progress.every(done)
  }
  return false
}
