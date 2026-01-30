/**
 * Player pool query helpers for player scouting
 *
 * Provides typed queries for:
 * - Player champion pools with comfort levels
 * - Signature picks (best bans against a player)
 * - Flex picks (multi-role champions)
 * - Full scouting reports
 */

import { createClient } from '@/lib/supabase/server'

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

export interface PlayerScouting {
  player_id: string
  player_name: string
  team_name: string | null
  primary_role: string
  signature_picks: PlayerChampion[]
  comfort_picks: PlayerChampion[]
  flex_picks: FlexPick[]
  total_games_analyzed: number
}

/**
 * Get a player's full champion pool
 *
 * @param playerId - Player UUID
 * @param role - Optional role filter (top, jungle, mid, adc, support)
 * @returns Array of player champions sorted by games played
 *
 * @example
 * const pool = await getPlayerChampionPool(fakerId, 'mid')
 * // Returns Faker's mid lane champion pool
 */
export async function getPlayerChampionPool(
  playerId: string,
  role?: string
): Promise<PlayerChampion[]> {
  const supabase = await createClient()

  let query = supabase
    .from('player_champion_pools')
    .select('*')
    .eq('player_id', playerId)
    .order('games_played', { ascending: false })

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

/**
 * Get a player's signature picks (best bans against them)
 *
 * Signature picks are champions with:
 * - 10+ games played
 * - 55%+ win rate
 * - Sorted by weighted win rate (recency-weighted)
 *
 * @param playerId - Player UUID
 * @returns Array of signature picks sorted by weighted win rate
 *
 * @example
 * const signatures = await getPlayerSignaturePicks(fakerId)
 * // Returns ["Azir", "LeBlanc", "Orianna"] - ban these!
 */
export async function getPlayerSignaturePicks(
  playerId: string
): Promise<PlayerChampion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('player_champion_pools')
    .select('*')
    .eq('player_id', playerId)
    .eq('comfort_level', 'signature')
    .order('weighted_win_rate', { ascending: false })

  if (error) throw error

  return data || []
}

/**
 * Get a player's flex picks
 *
 * Returns champions this player has played in multiple roles,
 * useful for identifying flexible players and role-swap threats.
 *
 * @param playerId - Player UUID
 * @returns Array of flex picks sorted by flexibility score
 *
 * @example
 * const flexPicks = await getPlayerFlexPicks(playerId)
 * // Returns [{champion: "Seraphine", roles: ["mid", "support"], ...}]
 */
export async function getPlayerFlexPicks(
  playerId: string
): Promise<FlexPick[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('flex_picks')
    .select('*')
    .eq('player_id', playerId)
    .order('flexibility_score', { ascending: false })

  if (error) throw error

  return data || []
}

/**
 * Get full scouting report for a player
 *
 * Aggregates:
 * - Player info (name, team, primary role)
 * - Signature picks (10+ games, 55%+ WR)
 * - Comfort picks (5+ games, 50%+ WR)
 * - Flex picks (multi-role champions)
 * - Total games analyzed
 *
 * @param playerId - Player UUID
 * @returns Complete scouting report
 *
 * @example
 * const report = await getPlayerScoutingReport(fakerId)
 * console.log(`${report.player_name} signature picks:`, report.signature_picks)
 */
export async function getPlayerScoutingReport(
  playerId: string
): Promise<PlayerScouting> {
  const supabase = await createClient()

  // Fetch player info
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select(`
      id,
      name,
      primary_role,
      teams (
        name
      )
    `)
    .eq('id', playerId)
    .single()

  if (playerError) throw playerError

  if (!player) {
    throw new Error(`Player not found: ${playerId}`)
  }

  // Fetch signature picks
  const signaturePicks = await getPlayerSignaturePicks(playerId)

  // Fetch comfort picks (exclude signatures to avoid duplicates)
  const { data: comfortData, error: comfortError } = await supabase
    .from('player_champion_pools')
    .select('*')
    .eq('player_id', playerId)
    .eq('comfort_level', 'comfort')
    .order('weighted_win_rate', { ascending: false })

  if (comfortError) throw comfortError

  const comfortPicks = comfortData || []

  // Fetch flex picks
  const flexPicks = await getPlayerFlexPicks(playerId)

  // Calculate total games
  const { data: totalGames, error: totalError } = await supabase
    .from('player_champion_pools')
    .select('games_played')
    .eq('player_id', playerId)

  if (totalError) throw totalError

  const totalGamesAnalyzed = (totalGames || []).reduce(
    (sum, row) => sum + row.games_played,
    0
  )

  return {
    player_id: player.id,
    player_name: player.name,
    team_name: (player as any).teams?.name || null,
    primary_role: player.primary_role,
    signature_picks: signaturePicks,
    comfort_picks: comfortPicks,
    flex_picks: flexPicks,
    total_games_analyzed: totalGamesAnalyzed
  }
}

/**
 * Find players who play a specific champion
 *
 * Useful for answering questions like:
 * - "Who plays Azir in LCK?"
 * - "Which ADCs have high Jinx win rates?"
 *
 * @param championName - Champion name
 * @param role - Optional role filter
 * @param minGames - Minimum games played (default: 3)
 * @returns Array of players who play this champion
 *
 * @example
 * const azirPlayers = await findPlayersForChampion('Azir', 'mid', 5)
 * // Returns [{player_name: "Faker", games: 47, win_rate: 0.68}, ...]
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
  const supabase = await createClient()

  let query = supabase
    .from('player_champion_pools')
    .select(`
      player_id,
      games_played,
      smoothed_win_rate,
      players!inner (
        name
      )
    `)
    .eq('champion_name', championName)
    .gte('games_played', minGames)
    .order('games_played', { ascending: false })

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map((row: any) => ({
    player_id: row.player_id,
    player_name: row.players.name,
    games_played: row.games_played,
    win_rate: row.smoothed_win_rate
  }))
}
