/**
 * Player pool query helpers for player scouting
 *
 * Computes champion pools from synapse.champion_picks data.
 * Provides typed queries for:
 * - Player champion pools with comfort levels
 * - Signature picks (best bans against a player)
 * - Flex picks (multi-role champions)
 */

import { createClient } from '@supabase/supabase-js'

export interface PlayerChampion {
  champion_name: string
  role: string
  games_played: number
  smoothed_win_rate: number
  weighted_win_rate: number
  comfort_level: 'signature' | 'comfort' | 'occasional' | 'rare'
  days_since_played: number
  avg_role_confidence: number
}

export interface FlexPick {
  champion_name: string
  roles_played: string[]
  primary_role: string
  secondary_role: string | null
  flexibility_score: number
  is_true_flex: boolean
}

// Create Supabase client directly for server-side queries
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(url, key)
}

/**
 * Resolve player ID from name or UUID
 */
async function resolvePlayerId(
  supabase: ReturnType<typeof getSupabaseClient>,
  playerIdOrName: string
): Promise<{ id: string; name: string } | null> {
  try {
    // If it looks like a UUID, try that first
    if (playerIdOrName.includes('-')) {
      const { data, error } = await supabase
        .schema('synapse')
        .from('players')
        .select('id, name')
        .eq('id', playerIdOrName)
        .maybeSingle()
      if (!error && data) return data
    }

    // Try by name (case-insensitive exact match)
    const { data, error } = await supabase
      .schema('synapse')
      .from('players')
      .select('id, name')
      .ilike('name', playerIdOrName)
      .maybeSingle()

    if (!error && data) return data
    return null
  } catch (error) {
    console.error('[resolvePlayerId] Error:', error)
    return null
  }
}

/**
 * Classify comfort level based on games played and win rate
 */
function classifyComfortLevel(
  gamesPlayed: number,
  winRate: number
): 'signature' | 'comfort' | 'occasional' | 'rare' {
  if (gamesPlayed >= 10 && winRate >= 0.55) return 'signature'
  if (gamesPlayed >= 5 && winRate >= 0.50) return 'comfort'
  if (gamesPlayed >= 3) return 'occasional'
  return 'rare'
}

/**
 * Get a player's full champion pool computed from champion_picks
 *
 * @param playerId - Player UUID or name
 * @param role - Optional role filter (top, jungle, mid, adc, support)
 * @returns Array of player champions sorted by games played
 */
export async function getPlayerChampionPool(
  playerId: string,
  role?: string
): Promise<PlayerChampion[]> {
  const supabase = getSupabaseClient()

  // Resolve player ID
  const player = await resolvePlayerId(supabase, playerId)
  if (!player) return []

  // Query champion picks with win/loss data
  let query = supabase
    .schema('synapse')
    .from('champion_picks')
    .select(`
      champion_name,
      role,
      role_confidence,
      team_side,
      created_at,
      draft:drafts!inner(
        game:games!inner(
          winning_side
        )
      )
    `)
    .eq('player_id', player.id)

  if (role) {
    query = query.eq('role', role)
  }

  const { data: picks, error } = await query

  if (error || !picks) return []

  // Aggregate by champion and role
  const aggregated = new Map<string, {
    champion_name: string
    role: string
    games: number
    wins: number
    totalConfidence: number
    lastPlayed: Date
  }>()

  for (const pick of picks) {
    const key = `${pick.champion_name}|${pick.role}`
    const game = (pick.draft as any)?.game
    const isWin = game?.winning_side === pick.team_side
    const pickDate = new Date(pick.created_at)

    const existing = aggregated.get(key)
    if (existing) {
      existing.games++
      if (isWin) existing.wins++
      existing.totalConfidence += pick.role_confidence || 0.5
      if (pickDate > existing.lastPlayed) existing.lastPlayed = pickDate
    } else {
      aggregated.set(key, {
        champion_name: pick.champion_name,
        role: pick.role || 'unknown',
        games: 1,
        wins: isWin ? 1 : 0,
        totalConfidence: pick.role_confidence || 0.5,
        lastPlayed: pickDate
      })
    }
  }

  // Transform to PlayerChampion format
  const now = new Date()
  const results: PlayerChampion[] = Array.from(aggregated.values()).map(entry => {
    const winRate = entry.games > 0 ? entry.wins / entry.games : 0.5
    const daysSincePlayed = Math.floor(
      (now.getTime() - entry.lastPlayed.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      champion_name: entry.champion_name,
      role: entry.role,
      games_played: entry.games,
      smoothed_win_rate: winRate,
      weighted_win_rate: winRate, // TODO: Apply recency weighting
      comfort_level: classifyComfortLevel(entry.games, winRate),
      days_since_played: daysSincePlayed,
      avg_role_confidence: entry.games > 0 ? entry.totalConfidence / entry.games : 0.5
    }
  })

  // Sort by games played descending
  return results.sort((a, b) => b.games_played - a.games_played)
}

/**
 * Get a player's signature picks (best bans against them)
 *
 * Signature picks are champions with:
 * - 10+ games played
 * - 55%+ win rate
 */
export async function getPlayerSignaturePicks(
  playerId: string
): Promise<PlayerChampion[]> {
  const pool = await getPlayerChampionPool(playerId)
  return pool.filter(c => c.comfort_level === 'signature')
}

/**
 * Get a player's flex picks (multi-role champions)
 */
export async function getPlayerFlexPicks(
  playerId: string
): Promise<FlexPick[]> {
  const pool = await getPlayerChampionPool(playerId)

  // Group by champion to find multi-role picks
  const byChampion = new Map<string, PlayerChampion[]>()
  for (const pick of pool) {
    const existing = byChampion.get(pick.champion_name) || []
    existing.push(pick)
    byChampion.set(pick.champion_name, existing)
  }

  // Find champions played in 2+ roles
  const flexPicks: FlexPick[] = []
  for (const [champion, picks] of byChampion) {
    if (picks.length >= 2) {
      const roles = picks.map(p => p.role)
      const sortedByGames = [...picks].sort((a, b) => b.games_played - a.games_played)
      const totalGames = picks.reduce((sum, p) => sum + p.games_played, 0)

      flexPicks.push({
        champion_name: champion,
        roles_played: roles,
        primary_role: sortedByGames[0].role,
        secondary_role: sortedByGames[1]?.role || null,
        flexibility_score: Math.min(totalGames / 20, 1.0), // Normalize to 0-1
        is_true_flex: roles.length >= 2 && totalGames >= 5
      })
    }
  }

  return flexPicks.sort((a, b) => b.flexibility_score - a.flexibility_score)
}

/**
 * Find players who play a specific champion
 */
export async function findPlayersForChampion(
  championName: string,
  role?: string,
  minGames: number = 3
): Promise<Array<{
  player_id: string
  player_name: string
  games_played: number
  win_rate: number
}>> {
  const supabase = getSupabaseClient()

  let query = supabase
    .schema('synapse')
    .from('champion_picks')
    .select(`
      player_id,
      team_side,
      player:players!inner(name),
      draft:drafts!inner(
        game:games!inner(winning_side)
      )
    `)
    .eq('champion_name', championName)

  if (role) {
    query = query.eq('role', role)
  }

  const { data: picks, error } = await query

  if (error || !picks) return []

  // Aggregate by player
  const byPlayer = new Map<string, {
    player_id: string
    player_name: string
    games: number
    wins: number
  }>()

  for (const pick of picks) {
    const playerName = (pick.player as any)?.name || 'Unknown'
    const game = (pick.draft as any)?.game
    const isWin = game?.winning_side === pick.team_side

    const existing = byPlayer.get(pick.player_id)
    if (existing) {
      existing.games++
      if (isWin) existing.wins++
    } else {
      byPlayer.set(pick.player_id, {
        player_id: pick.player_id,
        player_name: playerName,
        games: 1,
        wins: isWin ? 1 : 0
      })
    }
  }

  // Filter by min games and transform
  return Array.from(byPlayer.values())
    .filter(p => p.games >= minGames)
    .map(p => ({
      player_id: p.player_id,
      player_name: p.player_name,
      games_played: p.games,
      win_rate: p.games > 0 ? p.wins / p.games : 0.5
    }))
    .sort((a, b) => b.games_played - a.games_played)
}
