/**
 * Estimated meta numbers from lib/fixtures/meta.json: champion win rates, pair synergies and
 * lane counters. They are Synapse's original hand-tuned pro-play tables; the match database they
 * came from is gone, so the UI calls them estimates.
 */

import metaJson from '@/lib/fixtures/meta.json'

interface MetaFile {
  sideAdvantage: number
  winRates: Record<string, number>
  synergies: [string, string, number][]
  counters: [string, string, number][]
}

const META = metaJson as unknown as MetaFile

/** Blue side's edge from first pick: +2 points of win chance. */
export const SIDE_ADVANTAGE = META.sideAdvantage

/** Estimated win rate (0-1); champions without an estimate count as 0.50. */
export function metaWinRate(champion: string): number {
  return META.winRates[champion] ?? 0.5
}

const key = (a: string, b: string) => `${a}\u0000${b}`

const SYNERGY = new Map<string, number>()
for (const [a, b, s] of META.synergies) SYNERGY.set(key(a, b), s)

const COUNTER = new Map<string, number>()
for (const [a, b, s] of META.counters) COUNTER.set(key(a, b), s)

/**
 * How well two teammates work together, the same whichever order they're named in. A pair both
 * champions list gets the full bonus from one side and 70% from the other (the original
 * projector's weighting).
 */
export function pairSynergy(a: string, b: string): number {
  const ab = SYNERGY.get(key(a, b)) ?? 0
  const ba = SYNERGY.get(key(b, a)) ?? 0
  return Math.max(ab, ba) + 0.7 * Math.min(ab, ba)
}

/** Positive when `a` beats `b` head to head, negative when `b` beats `a`. */
export function counterEdge(a: string, b: string): number {
  return (COUNTER.get(key(a, b)) ?? 0) - (COUNTER.get(key(b, a)) ?? 0)
}

/** The champions a champion is listed as beating. */
export function beats(champion: string): string[] {
  return META.counters.filter(([a]) => a === champion).map(([, b]) => b)
}
