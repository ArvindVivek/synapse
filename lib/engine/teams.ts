/**
 * Sample opponent teams and each player's champion pool (lib/fixtures/teams.json, built by
 * scripts/build-fixtures.mjs). The teams and players are fictional.
 */

import teamsJson from '@/lib/fixtures/teams.json'
import type { Role } from '@/lib/draft/types'

export type Comfort = 'signature' | 'comfort' | 'occasional' | 'rare'

export interface PoolEntry {
  champion: string
  games: number
  wins: number
  winRate: number
  /** Days since the player last played it. */
  daysAgo: number
  comfort: Comfort
}

export interface Player {
  id: string
  name: string
  role: Role
  /** Most-played first. */
  pool: PoolEntry[]
}

export interface Team {
  id: string
  name: string
  /** Three letters for the initials badge (no team logos). */
  tag: string
  players: Player[]
}

type RawPool = [string, number, number, number]
type RawTeam = { id: string; name: string; tag: string; players: { id: string; name: string; role: Role; pool: RawPool[] }[] }

/**
 * Synapse's original thresholds: a signature pick is 10+ games at 55%+ wins (the best ban
 * target), a comfort pick 5+ games at 50%+, occasional 3+ games.
 */
export function comfortLevel(games: number, winRate: number): Comfort {
  if (games >= 10 && winRate >= 0.55) return 'signature'
  if (games >= 5 && winRate >= 0.5) return 'comfort'
  if (games >= 3) return 'occasional'
  return 'rare'
}

export const COMFORT_LABELS: Record<Comfort, string> = {
  signature: 'Signature pick',
  comfort: 'Comfort pick',
  occasional: 'Plays it sometimes',
  rare: 'Rarely plays it',
}

function toTeam(raw: RawTeam): Team {
  return {
    id: raw.id,
    name: raw.name,
    tag: raw.tag,
    players: raw.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      pool: p.pool.map(([champion, games, wins, daysAgo]) => {
        const winRate = games > 0 ? wins / games : 0.5
        return { champion, games, wins, winRate, daysAgo, comfort: comfortLevel(games, winRate) }
      }),
    })),
  }
}

export const TEAMS: readonly Team[] = (teamsJson as unknown as { teams: RawTeam[] }).teams.map(toTeam)

export function getTeam(id: string | null | undefined): Team | null {
  return TEAMS.find((t) => t.id === id) ?? null
}

/** A player by id, or by name (any case): the old API accepted either. */
export function findPlayer(idOrName: string): { team: Team; player: Player } | null {
  const needle = idOrName.toLowerCase()
  for (const team of TEAMS) {
    const player = team.players.find((p) => p.id === idOrName || p.name.toLowerCase() === needle)
    if (player) return { team, player }
  }
  return null
}
