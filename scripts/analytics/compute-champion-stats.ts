/**
 * Compute champion statistics with Bayesian smoothing and confidence scoring
 *
 * Aggregates champion stats from raw draft data:
 * - Win rates (Bayesian smoothed)
 * - Pick rates and ban rates
 * - Side-specific stats (blue, red, combined)
 * - Confidence levels and Wilson confidence intervals
 *
 * Run: cd scripts/etl && npx tsx ../analytics/compute-champion-stats.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { bayesianSmoothedWinRate } from '../../lib/statistics/bayesian-smoothing.js'
import { getConfidenceLevel, wilsonConfidenceInterval } from '../../lib/statistics/confidence-scoring.js'

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

interface ChampionStatRow {
  champion_name: string
  patch_version: string
  role: string
  side: 'blue' | 'red' | null
  games_played: number
  wins: number
  bans: number
  total_games_in_context: number
  raw_win_rate: number | null
  smoothed_win_rate: number
  pick_rate: number
  ban_rate: number
  confidence: string
  ci_lower: number
  ci_upper: number
}

/**
 * Fetch recent patches (last 3 distinct patch versions)
 */
async function getRecentPatches(): Promise<string[]> {
  const { data, error } = await supabase
    .from('series')
    .select('patch_version')
    .not('patch_version', 'is', null)
    .order('started_at', { ascending: false })

  if (error) throw error

  // Get unique patch versions (take first 3)
  const uniquePatches = [...new Set(data?.map(s => s.patch_version) || [])]
  return uniquePatches.slice(0, 3)
}

/**
 * Aggregate champion stats for a given context
 */
async function aggregateChampionStats(
  patches: string[]
): Promise<ChampionStatRow[]> {
  console.log('Querying champion picks and games...')

  // Query all champion picks with game outcomes for recent patches
  const { data: picks, error: picksError } = await supabase
    .from('champion_picks')
    .select(`
      champion_name,
      role,
      role_confidence,
      team_side,
      draft_id,
      drafts!inner (
        game_id,
        games!inner (
          series_id,
          blue_team_won,
          series!inner (
            patch_version
          )
        )
      )
    `)
    .gte('role_confidence', 0.5)  // Filter low-confidence role assignments
    .in('drafts.games.series.patch_version', patches)

  if (picksError) throw picksError

  console.log(`Fetched ${picks?.length || 0} champion picks`)

  // Query total games per patch (for pick/ban rate calculation)
  const { data: patchGames, error: patchError } = await supabase
    .from('games')
    .select('series!inner(patch_version)')
    .in('series.patch_version', patches)

  if (patchError) throw patchError

  const totalGamesByPatch = patchGames?.reduce((acc, g) => {
    const patch = (g as any).series.patch_version
    acc[patch] = (acc[patch] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Query bans (separate aggregation since bans are arrays)
  const { data: drafts, error: draftsError } = await supabase
    .from('drafts')
    .select(`
      blue_bans,
      red_bans,
      game_id,
      games!inner (
        series_id,
        series!inner (
          patch_version
        )
      )
    `)
    .in('games.series.patch_version', patches)

  if (draftsError) throw draftsError

  console.log(`Fetched ${drafts?.length || 0} drafts for ban aggregation`)

  // Flatten bans and count per champion/patch/side
  const banCounts: Record<string, number> = {}

  for (const draft of drafts || []) {
    const patch = (draft as any).games.series.patch_version

    // Blue side bans
    for (const champion of draft.blue_bans || []) {
      const key = `${champion}|${patch}|blue`
      banCounts[key] = (banCounts[key] || 0) + 1

      // Also count for combined (NULL side)
      const combinedKey = `${champion}|${patch}|null`
      banCounts[combinedKey] = (banCounts[combinedKey] || 0) + 1
    }

    // Red side bans
    for (const champion of draft.red_bans || []) {
      const key = `${champion}|${patch}|red`
      banCounts[key] = (banCounts[key] || 0) + 1

      // Also count for combined
      const combinedKey = `${champion}|${patch}|null`
      banCounts[combinedKey] = (banCounts[combinedKey] || 0) + 1
    }
  }

  // Aggregate picks by champion/patch/role/side
  const statsMap: Map<string, {
    champion_name: string
    patch_version: string
    role: string
    side: 'blue' | 'red' | null
    games: number
    wins: number
  }> = new Map()

  for (const pick of picks || []) {
    const patch = (pick as any).drafts.games.series.patch_version
    const blueWon = (pick as any).drafts.games.blue_team_won

    // Determine if this pick won
    const won = (pick.team_side === 'blue' && blueWon) || (pick.team_side === 'red' && !blueWon)

    // Aggregate for side-specific stats
    const sideKey = `${pick.champion_name}|${patch}|${pick.role}|${pick.team_side}`
    const sideStats = statsMap.get(sideKey) || {
      champion_name: pick.champion_name,
      patch_version: patch,
      role: pick.role,
      side: pick.team_side as 'blue' | 'red',
      games: 0,
      wins: 0
    }
    sideStats.games += 1
    if (won) sideStats.wins += 1
    statsMap.set(sideKey, sideStats)

    // Also aggregate for combined stats (side = null)
    const combinedKey = `${pick.champion_name}|${patch}|${pick.role}|null`
    const combinedStats = statsMap.get(combinedKey) || {
      champion_name: pick.champion_name,
      patch_version: patch,
      role: pick.role,
      side: null,
      games: 0,
      wins: 0
    }
    combinedStats.games += 1
    if (won) combinedStats.wins += 1
    statsMap.set(combinedKey, combinedStats)
  }

  console.log(`Aggregated stats for ${statsMap.size} unique champion/patch/role/side combinations`)

  // Transform to ChampionStatRow format with smoothing and confidence
  const rows: ChampionStatRow[] = []

  for (const [key, stats] of statsMap.entries()) {
    const totalGames = totalGamesByPatch[stats.patch_version] || 1

    // Raw win rate
    const rawWinRate = stats.games > 0 ? stats.wins / stats.games : null

    // Bayesian smoothed win rate (prior: 50% with weight 10)
    const smoothedWinRate = bayesianSmoothedWinRate(stats.wins, stats.games)

    // Pick rate
    const pickRate = stats.games / totalGames

    // Ban rate (lookup from banCounts)
    const banKey = `${stats.champion_name}|${stats.patch_version}|${stats.side || 'null'}`
    const bans = banCounts[banKey] || 0
    const banRate = bans / totalGames

    // Confidence scoring
    const confidence = getConfidenceLevel(stats.games)
    const ci = wilsonConfidenceInterval(stats.wins, stats.games)

    rows.push({
      champion_name: stats.champion_name,
      patch_version: stats.patch_version,
      role: stats.role,
      side: stats.side,
      games_played: stats.games,
      wins: stats.wins,
      bans,
      total_games_in_context: totalGames,
      raw_win_rate: rawWinRate,
      smoothed_win_rate: smoothedWinRate,
      pick_rate: pickRate,
      ban_rate: banRate,
      confidence,
      ci_lower: ci.lower,
      ci_upper: ci.upper
    })
  }

  return rows
}

/**
 * Upsert stats to champion_stats_computed table
 */
async function upsertStats(rows: ChampionStatRow[]): Promise<number> {
  if (rows.length === 0) {
    console.log('No stats to upsert')
    return 0
  }

  console.log(`Upserting ${rows.length} rows to champion_stats_computed...`)

  const { error } = await supabase
    .from('champion_stats_computed')
    .upsert(rows, {
      onConflict: 'champion_name,patch_version,role,side'
    })

  if (error) throw error

  console.log(`✓ Upserted ${rows.length} rows`)
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
    job_name: 'champion_stats',
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
    console.log('=== Champion Stats Computation ===\n')

    // Step 1: Get recent patches
    console.log('Step 1: Fetching recent patches...')
    const patches = await getRecentPatches()
    console.log(`Fetched ${patches.length} recent patches: ${patches.join(', ')}\n`)

    if (patches.length === 0) {
      console.log('No patches found in database. Exiting.')
      return
    }

    // Step 2: Aggregate champion stats
    console.log('Step 2: Aggregating champion stats...')
    const stats = await aggregateChampionStats(patches)
    console.log(`Computed stats for ${stats.length} combinations\n`)

    // Step 3: Upsert to database
    console.log('Step 3: Upserting to champion_stats_computed...')
    const rowsAffected = await upsertStats(stats)

    const duration = Date.now() - startTime

    // Step 4: Log success
    console.log('\nStep 4: Logging refresh...')
    await logRefresh('success', duration, rowsAffected)

    console.log(`\n✓ Champion stats computation complete in ${duration}ms`)
    console.log(`✓ Processed ${rowsAffected} stat rows`)

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('\n✗ Champion stats computation failed:', error)

    await logRefresh('failed', duration, 0, (error as Error).message)
    process.exit(1)
  }
}

main()
