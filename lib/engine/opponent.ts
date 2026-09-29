/**
 * The practice opponent: decides the other side's bans and picks. It uses the scouted team's
 * pools when there is one (so it plays like them), and Synapse's own advice otherwise. Choices
 * are random but seeded by the draft id and turn, so the same draft replays the same way (and
 * tests are repeatable).
 */

import type { Draft, DraftAction } from '@/lib/draft/types'
import { availableChampions, otherSide, turnInfo } from '@/lib/draft/draft'
import { predictPicks } from './predict'
import { recommend } from './recommend'
import { openRoles } from './roles'
import { getTeam } from './teams'

/** FNV-1a: turns the draft id and turn into a 32-bit seed. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function weightedChoice<T>(items: { item: T; weight: number }[], rand: () => number): T | null {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0)
  if (items.length === 0) return null
  if (total <= 0) return items[0].item
  let r = rand() * total
  for (const i of items) {
    r -= Math.max(0, i.weight)
    if (r <= 0) return i.item
  }
  return items[items.length - 1].item
}

/** The opponent's move for the current turn, or null when it isn't their turn. */
export function opponentMove(draft: Draft): DraftAction | null {
  const turn = turnInfo(draft)
  if (!turn || turn.side === draft.userSide) return null
  const rand = seededRandom(hashSeed(`${draft.id}:${draft.game}:${turn.turnNumber}`))
  const type = turn.action === 'ban' ? 'BAN' : 'PICK'

  if (turn.action === 'pick') {
    const team = getTeam(draft.opponentTeamId)
    if (team) {
      const open = openRoles(draft[otherSide(draft.userSide)].picks)
      const options = team.players
        .filter((p) => open.includes(p.role))
        .flatMap((p) => predictPicks(draft, p, 3))
      // Squaring sharpens the odds towards comfort picks while leaving room for surprises.
      const choice = weightedChoice(options.map((o) => ({ item: o.champion, weight: o.probability ** 2 })), rand)
      if (choice) return { type, champion: choice }
    }
  }

  // Bans, or picks with no scouting data: follow the engine's own top suggestions.
  const advice = recommend(draft, 4)
  const top = advice?.recommendations ?? []
  const choice = weightedChoice(top.map((r) => ({ item: r.champion, weight: r.totalScore ** 4 })), rand)
  if (choice) return { type, champion: choice }
  const any = availableChampions(draft)
  return any.length ? { type, champion: any[Math.floor(rand() * any.length)] } : null
}
