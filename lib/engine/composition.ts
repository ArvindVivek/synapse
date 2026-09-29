/**
 * What a team composition is missing, in the four things a pro draft checks first:
 * magic damage, physical damage, a way to start fights (engage) and someone to stand in front.
 */

import { damageOf, hasTag } from './champions'

export type Need = 'ap_damage' | 'ad_damage' | 'engage' | 'frontline'

/** Plain-English names for the UI. */
export const NEED_LABELS: Record<Need, string> = {
  ap_damage: 'magic damage',
  ad_damage: 'physical damage',
  engage: 'a fight starter',
  frontline: 'a frontline',
}

/**
 * Needs only count once the team has enough picks for them to matter: damage mix from two
 * picks, engage and frontline from three (the original Synapse thresholds).
 */
export function teamNeeds(picks: readonly string[]): Need[] {
  const needs: Need[] = []
  const ap = picks.filter((c) => damageOf(c) === 'ap').length
  const ad = picks.filter((c) => damageOf(c) === 'ad').length
  if (picks.length >= 2 && ap === 0) needs.push('ap_damage')
  if (picks.length >= 2 && ad === 0) needs.push('ad_damage')
  if (picks.length >= 3 && !picks.some((c) => hasTag(c, 'engage'))) needs.push('engage')
  if (picks.length >= 3 && !picks.some((c) => hasTag(c, 'frontline'))) needs.push('frontline')
  return needs
}

export function fillsNeed(champion: string, need: Need): boolean {
  switch (need) {
    case 'ap_damage':
      return damageOf(champion) === 'ap'
    case 'ad_damage':
      return damageOf(champion) === 'ad'
    case 'engage':
      return hasTag(champion, 'engage')
    case 'frontline':
      return hasTag(champion, 'frontline')
  }
}

export function needsFilled(champion: string, needs: readonly Need[]): Need[] {
  return needs.filter((n) => fillsNeed(champion, n))
}

export interface DamageMix {
  ap: number
  ad: number
  mixed: number
}

export function damageMix(picks: readonly string[]): DamageMix {
  const mix = { ap: 0, ad: 0, mixed: 0 }
  for (const c of picks) {
    const d = damageOf(c)
    if (d) mix[d]++
  }
  return mix
}
