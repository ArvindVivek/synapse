/**
 * The champion pool: names, roles, damage type and team-fight tags, from
 * lib/fixtures/champions.json. Icons are bundled from Riot's Data Dragon (docs/CREDITS.md).
 */

import championsJson from '@/lib/fixtures/champions.json'
import type { Role } from '@/lib/draft/types'

export type Damage = 'ap' | 'ad' | 'mixed'
export type Tag = 'engage' | 'frontline' | 'peel'

export interface Champion {
  name: string
  /** Data Dragon id: the icon is /champions/<img>.png */
  img: string
  /** Roles it's usually played in, main role first. */
  roles: Role[]
  damage: Damage
  tags: Tag[]
  /** Pro-play flex pick: the roles it can hide between, and how well (0-1). */
  flex?: { roles: Role[]; score: number }
}

export const CHAMPIONS: readonly Champion[] = championsJson as Champion[]

const BY_NAME = new Map(CHAMPIONS.map((c) => [c.name, c]))

/** Every champion name, alphabetical. */
export const ALL_CHAMPIONS: readonly string[] = CHAMPIONS.map((c) => c.name)

export function getChampion(name: string): Champion | undefined {
  return BY_NAME.get(name)
}

export function isChampion(name: string): boolean {
  return BY_NAME.has(name)
}

export function damageOf(name: string): Damage | undefined {
  return BY_NAME.get(name)?.damage
}

export function hasTag(name: string, tag: Tag): boolean {
  return BY_NAME.get(name)?.tags.includes(tag) ?? false
}

/** Main roles plus flex roles. */
export function rolesOf(name: string): Role[] {
  const c = BY_NAME.get(name)
  if (!c) return []
  return [...new Set([...c.roles, ...(c.flex?.roles ?? [])])]
}

export function playsRole(name: string, role: Role): boolean {
  return rolesOf(name).includes(role)
}

/** True when it's a real flex pick (listed in two or more main roles, or a pro flex pick). */
export function isFlex(name: string): boolean {
  const c = BY_NAME.get(name)
  return !!c && (c.roles.length >= 2 || !!c.flex)
}

export function championImageUrl(name: string): string {
  return `/champions/${BY_NAME.get(name)?.img ?? name.replace(/['\s.]/g, '')}.png`
}
