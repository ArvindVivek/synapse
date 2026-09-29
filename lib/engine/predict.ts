/**
 * Which champion an opponent player is likely to pick next, from their pool (Synapse's original
 * Bayesian-style weighting). Probabilities are capped at 50% so one comfort pick never looks
 * certain, then renormalised to add up to 100%.
 */

import type { Draft, Role } from '@/lib/draft/types'
import { otherSide, unavailable } from '@/lib/draft/draft'
import { fillsNeed, teamNeeds, type Need } from './composition'
import type { Comfort, Player, PoolEntry } from './teams'

export interface PickPrediction {
  champion: string
  /** 0-0.5 after the cap; all predictions for a player add up to 1. */
  probability: number
  reasoning: string
  comfort: Comfort
  games: number
  winRate: number
}

const COMFORT_WEIGHT: Record<Comfort, number> = { signature: 3, comfort: 1.5, occasional: 1, rare: 0.5 }
const CAP = 0.5

function rawWeight(entry: PoolEntry, needs: Need[]): number {
  const games = Math.min(entry.games / 50, 1) * 0.4 // more games, more likely
  const recent = entry.daysAgo < 30 ? 1.5 : 1 // played in the last month
  const fills = needs.some((n) => fillsNeed(entry.champion, n)) ? 1.3 : 1
  const form = entry.winRate / 0.5 // players reach for what wins
  return games * COMFORT_WEIGHT[entry.comfort] * recent * fills * form
}

function reasonFor(entry: PoolEntry, fills: boolean): string {
  const wr = `${Math.round(entry.winRate * 100)}% wins`
  if (entry.comfort === 'signature') return `Signature pick: ${entry.games} games, ${wr}${fills ? ', and it fills a gap' : ''}`
  if (entry.comfort === 'comfort') {
    return entry.daysAgo < 30 ? `Comfort pick, played recently (${entry.games} games)` : `Comfort pick: ${entry.games} games, ${wr}`
  }
  if (fills) return `Fills a gap in their team`
  return `Plays it sometimes: ${entry.games} games, ${wr}`
}

/** Spreads a list of weights into probabilities that add to 1, none above the cap. */
export function capAndNormalise(weights: number[], cap = CAP): number[] {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return weights.map(() => 0)
  let probs = weights.map((w) => w / total)
  // Water-filling: fix capped entries at the cap and share what's left among the rest.
  for (let round = 0; round < weights.length; round++) {
    const over = probs.some((p) => p > cap + 1e-9)
    if (!over) break
    const capped = probs.map((p) => p >= cap - 1e-9)
    const free = 1 - cap * capped.filter(Boolean).length
    const restTotal = weights.reduce((sum, w, i) => (capped[i] ? sum : sum + w), 0)
    if (restTotal <= 0) break
    probs = weights.map((w, i) => (capped[i] ? cap : (w / restTotal) * free))
  }
  return probs
}

/**
 * Top predictions for `player` in `draft`, where the player is on the side that isn't the
 * user's. Champions already banned, picked or locked are left out.
 */
export function predictPicks(draft: Draft, player: Player, limit = 5): PickPrediction[] {
  const taken = unavailable(draft)
  const theirPicks = draft[otherSide(draft.userSide)].picks
  const needs = teamNeeds(theirPicks)
  const pool = player.pool.filter((e) => !taken.has(e.champion))
  const probs = capAndNormalise(pool.map((e) => rawWeight(e, needs)))
  return pool
    .map((entry, i) => ({
      champion: entry.champion,
      probability: probs[i],
      reasoning: reasonFor(entry, needs.some((n) => fillsNeed(entry.champion, n))),
      comfort: entry.comfort,
      games: entry.games,
      winRate: entry.winRate,
    }))
    .sort((a, b) => b.probability - a.probability || a.champion.localeCompare(b.champion))
    .slice(0, limit)
}

/** Predictions keyed by role, for the opponent's roles still open. */
export type RolePredictions = Partial<Record<Role, PickPrediction[]>>
