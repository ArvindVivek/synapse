/**
 * Compute player champion pools with role flexibility scores
 *
 * Aggregates player-specific champion statistics:
 * - Champion pool with comfort levels (signature, comfort, occasional, rare)
 * - Recency-weighted win rates (30-day half-life)
 * - Flex picks (champions played in multiple roles)
 *
 * Run: cd scripts/etl && npx tsx ../analytics/compute-player-pools.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { bayesianSmoothedWinRate } from '../../lib/statistics/bayesian-smoothing.js'
import { calculateRecencyWeight } from '../../lib/statistics/recency-weighting.js'

// Load environment variables from scripts/etl/.env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../etl/.env.local') })

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: { schema: 'synapse' }
  }
)

interface PickRecord {
  player_id: string
  champion_name: string
  role: string
  role_confidence: number
  team_side: 'blue' | 'red'
  blue_team_won: boolean
  started_at: string
}

interface PlayerPoolRow {
  player_id: string
  champion_name: string
  role: string
  games_played: number
  wins: number
  raw_win_rate: number | null
  smoothed_win_rate: number
  weighted_win_rate: number
  avg_role_confidence: number
  last_played: string
  days_since_played: number
  comfort_level: 'signature' | 'comfort' | 'occasional' | 'rare'
}

interface FlexPickRow {
  player_id: string
  champion_name: string
  roles_played: string[]
  primary_role: string
  secondary_role: string | null
  total_games: number
  is_true_flex: boolean
  flexibility_score: number
}

/**
 * Assign comfort level based on games and win rate
 */
function getComfortLevel(games: number, winRate: number): 'signature' | 'comfort' | 'occasional' | 'rare' {
  if (games >= 10 && winRate >= 0.55) return 'signature'
  if (games >= 5 && winRate >= 0.50) return 'comfort'
  if (games >= 3) return 'occasional'
  return 'rare'
}

/**
 * Calculate days since a given date
 */
function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Query all picks with player and game data
 */
async function fetchPlayerPicks(): Promise<PickRecord[]> {
  console.log('Querying champion picks with player data...')

  const { data, error } = await supabase
    .from('champion_picks')
    .select(`
      player_id,
      champion_name,
      role,
      role_confidence,
      team_side,
      draft_id,
      drafts!inner (
        game_id,
        games!inner (
          blue_team_won,
          series!inner (
            started_at
          )
        )
      )
    `)
    .not('player_id', 'is', null)

  if (error) throw error

  // Flatten nested data
  const picks: PickRecord[] = (data || []).map((pick: any) => ({
    player_id: pick.player_id,
    champion_name: pick.champion_name,
    role: pick.role,
    role_confidence: pick.role_confidence,
    team_side: pick.team_side,
    blue_team_won: pick.drafts.games.blue_team_won,
    started_at: pick.drafts.games.series.started_at
  }))

  console.log(`Fetched ${picks.length} champion picks`)
  return picks
}

/**
 * Aggregate player champion pools
 */
function aggregatePlayerPools(picks: PickRecord[]): PlayerPoolRow[] {
  console.log('Aggregating player champion pools...')

  // Group by (player_id, champion_name, role)
  const poolMap = new Map<string, {
    player_id: string
    champion_name: string
    role: string
    games: Array<{ won: boolean; date: Date; role_confidence: number }>
    last_played: Date
  }>()

  for (const pick of picks) {
    const key = `${pick.player_id}|${pick.champion_name}|${pick.role}`
    const won = (pick.team_side === 'blue' && pick.blue_team_won) ||
                (pick.team_side === 'red' && !pick.blue_team_won)
    const gameDate = new Date(pick.started_at)

    const pool = poolMap.get(key) || {
      player_id: pick.player_id,
      champion_name: pick.champion_name,
      role: pick.role,
      games: [],
      last_played: gameDate
    }

    pool.games.push({
      won,
      date: gameDate,
      role_confidence: pick.role_confidence
    })

    // Track most recent game
    if (gameDate > pool.last_played) {
      pool.last_played = gameDate
    }

    poolMap.set(key, pool)
  }

  console.log(`Aggregated ${poolMap.size} unique player/champion/role combinations`)

  // Transform to PlayerPoolRow with statistics
  const rows: PlayerPoolRow[] = []

  for (const [key, pool] of poolMap.entries()) {
    const gamesPlayed = pool.games.length
    const wins = pool.games.filter(g => g.won).length

    // Raw win rate
    const rawWinRate = gamesPlayed > 0 ? wins / gamesPlayed : null

    // Bayesian smoothed win rate (lighter prior for player pools: weight 5)
    const smoothedWinRate = bayesianSmoothedWinRate(wins, gamesPlayed, 0.50, 5)

    // Recency-weighted win rate (30-day half-life)
    let weightedWins = 0
    let totalWeight = 0

    for (const game of pool.games) {
      const weight = calculateRecencyWeight(game.date, 30)
      weightedWins += (game.won ? 1 : 0) * weight
      totalWeight += weight
    }

    const weightedWinRate = totalWeight > 0 ? weightedWins / totalWeight : smoothedWinRate

    // Average role confidence
    const avgRoleConfidence = pool.games.reduce((sum, g) => sum + g.role_confidence, 0) / gamesPlayed

    // Comfort level
    const comfortLevel = getComfortLevel(gamesPlayed, smoothedWinRate)

    // Days since played
    const daysSincePlayed = daysSince(pool.last_played.toISOString())

    rows.push({
      player_id: pool.player_id,
      champion_name: pool.champion_name,
      role: pool.role,
      games_played: gamesPlayed,
      wins,
      raw_win_rate: rawWinRate,
      smoothed_win_rate: smoothedWinRate,
      weighted_win_rate: weightedWinRate,
      avg_role_confidence: avgRoleConfidence,
      last_played: pool.last_played.toISOString(),
      days_since_played: daysSincePlayed,
      comfort_level: comfortLevel
    })
  }

  return rows
}

/**
 * Compute flex picks from player pools
 */
function computeFlexPicks(pools: PlayerPoolRow[]): FlexPickRow[] {
  console.log('Computing flex picks...')

  // Group by (player_id, champion_name) across roles
  const flexMap = new Map<string, Map<string, number>>()

  for (const pool of pools) {
    // Only consider pools with at least 2 games
    if (pool.games_played < 2) continue

    const key = `${pool.player_id}|${pool.champion_name}`
    const roleGames = flexMap.get(key) || new Map<string, number>()
    roleGames.set(pool.role, pool.games_played)
    flexMap.set(key, roleGames)
  }

  // Filter to only multi-role champions
  const flexPicks: FlexPickRow[] = []

  for (const [key, roleGames] of flexMap.entries()) {
    // Must have 2+ roles
    if (roleGames.size < 2) continue

    const [playerId, championName] = key.split('|')
    const roles = Array.from(roleGames.keys())
    const totalGames = Array.from(roleGames.values()).reduce((sum, games) => sum + games, 0)

    // Sort roles by games to find primary and secondary
    const sortedRoles = roles.sort((a, b) => (roleGames.get(b) || 0) - (roleGames.get(a) || 0))
    const primaryRole = sortedRoles[0]
    const secondaryRole = sortedRoles.length > 1 ? sortedRoles[1] : null

    // Calculate flexibility score: 1 - (max_role_games / total_games)
    const maxRoleGames = Math.max(...roleGames.values())
    const flexibilityScore = 1 - (maxRoleGames / totalGames)

    // Is this a true flex? (2+ roles with 3+ games each)
    const rolesWithThreePlus = Array.from(roleGames.values()).filter(games => games >= 3).length
    const isTrueFlex = rolesWithThreePlus >= 2

    flexPicks.push({
      player_id: playerId,
      champion_name: championName,
      roles_played: roles,
      primary_role: primaryRole,
      secondary_role: secondaryRole,
      total_games: totalGames,
      is_true_flex: isTrueFlex,
      flexibility_score: flexibilityScore
    })
  }

  console.log(`Found ${flexPicks.length} multi-role champions`)
  console.log(`True flex picks (2+ roles with 3+ games each): ${flexPicks.filter(f => f.is_true_flex).length}`)

  return flexPicks
}

/**
 * Upsert player pools to database
 */
async function upsertPlayerPools(rows: PlayerPoolRow[]): Promise<number> {
  if (rows.length === 0) {
    console.log('No player pools to upsert')
    return 0
  }

  console.log(`Upserting ${rows.length} rows to player_champion_pools...`)

  const { error } = await supabase
    .from('player_champion_pools')
    .upsert(rows, {
      onConflict: 'player_id,champion_name,role'
    })

  if (error) throw error

  console.log(`✓ Upserted ${rows.length} player pool rows`)
  return rows.length
}

/**
 * Upsert flex picks to database
 */
async function upsertFlexPicks(rows: FlexPickRow[]): Promise<number> {
  if (rows.length === 0) {
    console.log('No flex picks to upsert')
    return 0
  }

  console.log(`Upserting ${rows.length} rows to flex_picks...`)

  const { error } = await supabase
    .from('flex_picks')
    .upsert(rows, {
      onConflict: 'player_id,champion_name'
    })

  if (error) throw error

  console.log(`✓ Upserted ${rows.length} flex pick rows`)
  return rows.length
}

/**
 * Log refresh job to analytics_refresh_log
 */
async function logRefresh(
  status: 'success' | 'failed',
  duration: number,
  rowsAffected: number,
  errorMessage?: string
) {
  await supabase.from('analytics_refresh_log').insert({
    job_name: 'player_pools',
    status,
    duration_ms: duration,
    rows_affected: rowsAffected,
    error_message: errorMessage || null
  })
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now()

  try {
    console.log('=== Player Pool Computation ===\n')

    // Step 1: Fetch all player picks
    console.log('Step 1: Fetching player picks...')
    const picks = await fetchPlayerPicks()
    console.log()

    if (picks.length === 0) {
      console.log('No picks found. Exiting.')
      return
    }

    // Step 2: Aggregate player pools
    console.log('Step 2: Aggregating player champion pools...')
    const pools = aggregatePlayerPools(picks)
    console.log()

    // Step 3: Compute flex picks
    console.log('Step 3: Computing flex picks...')
    const flexPicks = computeFlexPicks(pools)
    console.log()

    // Step 4: Upsert player pools
    console.log('Step 4: Upserting player pools...')
    const poolRows = await upsertPlayerPools(pools)
    console.log()

    // Step 5: Upsert flex picks
    console.log('Step 5: Upserting flex picks...')
    const flexRows = await upsertFlexPicks(flexPicks)
    console.log()

    const duration = Date.now() - startTime
    const totalRows = poolRows + flexRows

    // Step 6: Log success
    console.log('Step 6: Logging refresh...')
    await logRefresh('success', duration, totalRows)

    console.log(`\n✓ Player pool computation complete in ${duration}ms`)
    console.log(`✓ Processed ${poolRows} player pool rows`)
    console.log(`✓ Processed ${flexRows} flex pick rows`)
    console.log(`✓ Total: ${totalRows} rows`)

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('\n✗ Player pool computation failed:', error)

    await logRefresh('failed', duration, 0, (error as Error).message)
    process.exit(1)
  }
}

main()
