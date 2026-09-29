/**
 * Works out who plays which role. Picks carry no role in the draft (you pick a champion, not a
 * lane), so Synapse finds the most natural lineup: every champion in its main role if possible,
 * then a listed second role, then a flex role.
 */

import { ROLES, type Role } from '@/lib/draft/types'
import { getChampion } from './champions'

/** How natural it is for a champion to play a role: 3 main, 2 listed, 1 flex, 0 off-role. */
export function roleFit(champion: string, role: Role): number {
  const c = getChampion(champion)
  if (!c) return 0
  if (c.roles[0] === role) return 3
  if (c.roles.includes(role)) return 2
  if (c.flex?.roles.includes(role)) return 1
  return 0
}

function* permutations<T>(items: readonly T[], size: number): Generator<T[]> {
  if (size === 0) {
    yield []
    return
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)]
    for (const tail of permutations(rest, size - 1)) yield [items[i], ...tail]
  }
}

/**
 * Best role for each pick (at most five picks, so trying every arrangement is cheap: 120).
 * Ties go to the arrangement found first, which follows the pick order and ROLES order, so the
 * answer is always the same for the same picks.
 */
export function assignRoles(picks: readonly string[]): Record<string, Role> {
  const team = picks.slice(0, 5)
  let best: Role[] = []
  let bestScore = -1
  for (const roles of permutations(ROLES, team.length)) {
    const score = roles.reduce((sum, role, i) => sum + roleFit(team[i], role), 0)
    if (score > bestScore) {
      bestScore = score
      best = roles
    }
  }
  return Object.fromEntries(team.map((c, i) => [c, best[i]]))
}

/** Roles a team hasn't filled yet, given its picks so far. */
export function openRoles(picks: readonly string[]): Role[] {
  const taken = new Set(Object.values(assignRoles(picks)))
  return ROLES.filter((r) => !taken.has(r))
}
