/**
 * Compute champion matchup statistics and pick order analytics
 *
 * Aggregates:
 * - Champion matchups (lane-specific counter-pick data with Bayesian smoothing)
 * - Pick order stats (blind pick vs counter-pick success rates)
 *
 * Run: cd scripts/etl && npx tsx ../analytics/compute-matchups.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { bayesianSmoothedWinRate } from '../../lib/statistics/bayesian-smoothing.js'
import { getConfidenceLevel } from '../../lib/statistics/confidence-scoring.js'

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

interface MatchupRow {
  champion: string
  opponent: string
  role: string
  patch_version: string
  games: number
  wins: number
  raw_win_rate: number | null
  smoothed_win_rate: number
  matchup_delta: number
  confidence: string
}

interface PickOrderRow {
  champion_name: string
  role: string
  patch_version: string
  pick_phase: 'early' | 'mid' | 'late'
  games_in_phase: number
  wins_in_phase: number
  smoothed_win_rate: number
  blind_pick_success: number | null
  counter_pick_success: number | null
  confidence: string
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

  const uniquePatches = [...new Set(data?.map(s => s.patch_version) || [])]
  return uniquePatches.slice(0, 3)
}

/**
 * Aggregate champion matchups (lane vs lane)
 */
async function aggregateMatchups(patches: string[]): Promise<MatchupRow[]> {
  console.log('Querying champion picks for matchup analysis...')

  // Query champion picks with opposing lane opponent
  const { data: picks, error } = await supabase
    .from('champion_picks')
    .select(`
      champion_name,
      role,
      role_confidence,
      team_side,
      pick_order,
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
    .gte('role_confidence', 0.5)
    .in('drafts.games.series.patch_version', patches)

  if (error) throw error

  console.log(`Fetched ${picks?.length || 0} champion picks for matchup computation`)

  // Group picks by draft_id and role to find opposing matchups
  const draftRoleMap: Map<string, Array<{
    champion: string
    teamSide: string
    pickOrder: number
    blueWon: boolean
    patch: string
  }>> = new Map()

  for (const pick of picks || []) {
    const draftId = pick.draft_id
    const role = pick.role
    const key = `${draftId}|${role}`
    const patch = (pick as any).drafts.games.series.patch_version
    const blueWon = (pick as any).drafts.games.blue_team_won

    if (!draftRoleMap.has(key)) {
      draftRoleMap.set(key, [])
    }

    draftRoleMap.get(key)!.push({
      champion: pick.champion_name,
      teamSide: pick.team_side,
      pickOrder: pick.pick_order,
      blueWon,
      patch
    })
  }

  // Aggregate matchup stats
  const matchupMap: Map<string, {
    champion: string
    opponent: string
    role: string
    patch: string
    games: number
    wins: number
  }> = new Map()

  for (const [key, rolePicks] of draftRoleMap.entries()) {
    // Must have exactly 2 picks (blue vs red) for valid matchup
    if (rolePicks.length !== 2) continue

    const [pick1, pick2] = rolePicks
    const role = key.split('|')[1]

    // Ensure picks are from opposing teams
    if (pick1.teamSide === pick2.teamSide) continue

    // Process matchup from both perspectives
    for (let i = 0; i < 2; i++) {
      const champion = rolePicks[i]
      const opponent = rolePicks[1 - i]

      const matchupKey = `${champion.champion}|${opponent.champion}|${role}|${champion.patch}`

      const existing = matchupMap.get(matchupKey) || {
        champion: champion.champion,
        opponent: opponent.champion,
        role,
        patch: champion.patch,
        games: 0,
        wins: 0
      }

      existing.games += 1

      // Did this champion win?
      const won = (champion.teamSide === 'blue' && champion.blueWon) ||
                  (champion.teamSide === 'red' && !champion.blueWon)
      if (won) existing.wins += 1

      matchupMap.set(matchupKey, existing)
    }
  }

  console.log(`Aggregated ${matchupMap.size} unique matchup pairs`)

  // Transform to MatchupRow with smoothing
  const rows: MatchupRow[] = []

  for (const [key, stats] of matchupMap.entries()) {
    // Minimum threshold: 3 games (matchups are sparser than overall stats)
    if (stats.games < 3) continue

    const rawWinRate = stats.games > 0 ? stats.wins / stats.games : null
    const smoothedWinRate = bayesianSmoothedWinRate(stats.wins, stats.games)
    const matchupDelta = smoothedWinRate - 0.50
    const confidence = getConfidenceLevel(stats.games)

    rows.push({
      champion: stats.champion,
      opponent: stats.opponent,
      role: stats.role,
      patch_version: stats.patch,
      games: stats.games,
      wins: stats.wins,
      raw_win_rate: rawWinRate,
      smoothed_win_rate: smoothedWinRate,
      matchup_delta: matchupDelta,
      confidence
    })
  }

  return rows
}

/**
 * Aggregate pick order statistics
 */
async function aggregatePickOrderStats(patches: string[]): Promise<PickOrderRow[]> {
  console.log('Querying champion picks for pick order analysis...')

  const { data: picks, error } = await supabase
    .from('champion_picks')
    .select(`
      champion_name,
      role,
      role_confidence,
      team_side,
      pick_order,
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
    .gte('role_confidence', 0.5)
    .in('drafts.games.series.patch_version', patches)

  if (error) throw error

  // Classify pick phase
  function getPickPhase(pickOrder: number): 'early' | 'mid' | 'late' {
    if (pickOrder <= 3) return 'early'
    if (pickOrder <= 7) return 'mid'
    return 'late'
  }

  // Group picks by draft_id and role to compare pick orders
  const draftRoleMap: Map<string, Array<{
    champion: string
    teamSide: string
    pickOrder: number
    blueWon: boolean
    patch: string
  }>> = new Map()

  for (const pick of picks || []) {
    const draftId = pick.draft_id
    const role = pick.role
    const key = `${draftId}|${role}`
    const patch = (pick as any).drafts.games.series.patch_version
    const blueWon = (pick as any).drafts.games.blue_team_won

    if (!draftRoleMap.has(key)) {
      draftRoleMap.set(key, [])
    }

    draftRoleMap.get(key)!.push({
      champion: pick.champion_name,
      teamSide: pick.team_side,
      pickOrder: pick.pick_order,
      blueWon,
      patch
    })
  }

  // Aggregate pick order stats
  interface PickOrderStats {
    champion: string
    role: string
    patch: string
    phase: 'early' | 'mid' | 'late'
    games: number
    wins: number
    blindPickGames: number
    blindPickWins: number
    counterPickGames: number
    counterPickWins: number
  }

  const statsMap: Map<string, PickOrderStats> = new Map()

  for (const [key, rolePicks] of draftRoleMap.entries()) {
    if (rolePicks.length !== 2) continue

    const role = key.split('|')[1]

    for (const pick of rolePicks) {
      const opponent = rolePicks.find(p => p.teamSide !== pick.teamSide)
      if (!opponent) continue

      const phase = getPickPhase(pick.pickOrder)
      const statsKey = `${pick.champion}|${role}|${pick.patch}|${phase}`

      const existing = statsMap.get(statsKey) || {
        champion: pick.champion,
        role,
        patch: pick.patch,
        phase,
        games: 0,
        wins: 0,
        blindPickGames: 0,
        blindPickWins: 0,
        counterPickGames: 0,
        counterPickWins: 0
      }

      existing.games += 1

      const won = (pick.teamSide === 'blue' && pick.blueWon) ||
                  (pick.teamSide === 'red' && !pick.blueWon)
      if (won) existing.wins += 1

      // Blind pick: picked before opponent
      if (pick.pickOrder < opponent.pickOrder) {
        existing.blindPickGames += 1
        if (won) existing.blindPickWins += 1
      }

      // Counter pick: picked after opponent
      if (pick.pickOrder > opponent.pickOrder) {
        existing.counterPickGames += 1
        if (won) existing.counterPickWins += 1
      }

      statsMap.set(statsKey, existing)
    }
  }

  console.log(`Aggregated ${statsMap.size} pick order stat combinations`)

  // Transform to PickOrderRow
  const rows: PickOrderRow[] = []

  for (const [key, stats] of statsMap.entries()) {
    if (stats.games < 5) continue  // Minimum threshold

    const smoothedWinRate = bayesianSmoothedWinRate(stats.wins, stats.games)
    const confidence = getConfidenceLevel(stats.games)

    // Calculate blind pick and counter pick success
    const blindPickSuccess = stats.blindPickGames > 0
      ? bayesianSmoothedWinRate(stats.blindPickWins, stats.blindPickGames)
      : null

    const counterPickSuccess = stats.counterPickGames > 0
      ? bayesianSmoothedWinRate(stats.counterPickWins, stats.counterPickGames)
      : null

    rows.push({
      champion_name: stats.champion,
      role: stats.role,
      patch_version: stats.patch,
      pick_phase: stats.phase,
      games_in_phase: stats.games,
      wins_in_phase: stats.wins,
      smoothed_win_rate: smoothedWinRate,
      blind_pick_success: blindPickSuccess,
      counter_pick_success: counterPickSuccess,
      confidence
    })
  }

  return rows
}

/**
 * Upsert matchup stats
 */
async function upsertMatchups(rows: MatchupRow[]): Promise<number> {
  if (rows.length === 0) {
    console.log('No matchup stats to upsert')
    return 0
  }

  console.log(`Upserting ${rows.length} rows to champion_matchups...`)

  const { error } = await supabase
    .from('champion_matchups')
    .upsert(rows, {
      onConflict: 'champion,opponent,role,patch_version'
    })

  if (error) throw error

  console.log(`✓ Upserted ${rows.length} matchup rows`)
  return rows.length
}

/**
 * Upsert pick order stats
 */
async function upsertPickOrderStats(rows: PickOrderRow[]): Promise<number> {
  if (rows.length === 0) {
    console.log('No pick order stats to upsert')
    return 0
  }

  console.log(`Upserting ${rows.length} rows to pick_order_stats...`)

  const { error } = await supabase
    .from('pick_order_stats')
    .upsert(rows, {
      onConflict: 'champion_name,role,patch_version,pick_phase'
    })

  if (error) throw error

  console.log(`✓ Upserted ${rows.length} pick order rows`)
  return rows.length
}

/**
 * Log refresh job
 */
async function logRefresh(
  status: 'success' | 'failed',
  duration: number,
  rowsAffected: number,
  errorMessage?: string
) {
  await supabase.from('analytics_refresh_log').insert({
    job_name: 'matchup_stats',
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
    console.log('=== Matchup and Pick Order Stats Computation ===\n')

    // Step 1: Get recent patches
    console.log('Step 1: Fetching recent patches...')
    const patches = await getRecentPatches()
    console.log(`Fetched ${patches.length} recent patches: ${patches.join(', ')}\n`)

    if (patches.length === 0) {
      console.log('No patches found in database. Exiting.')
      return
    }

    // Step 2: Aggregate matchup stats
    console.log('Step 2: Aggregating matchup stats...')
    const matchups = await aggregateMatchups(patches)
    console.log(`Computed ${matchups.length} matchup combinations\n`)

    // Step 3: Aggregate pick order stats
    console.log('Step 3: Aggregating pick order stats...')
    const pickOrderStats = await aggregatePickOrderStats(patches)
    console.log(`Computed ${pickOrderStats.length} pick order combinations\n`)

    // Step 4: Upsert matchups
    console.log('Step 4: Upserting matchups...')
    const matchupRows = await upsertMatchups(matchups)

    // Step 5: Upsert pick order stats
    console.log('Step 5: Upserting pick order stats...')
    const pickOrderRows = await upsertPickOrderStats(pickOrderStats)

    const duration = Date.now() - startTime
    const totalRows = matchupRows + pickOrderRows

    // Step 6: Log success
    console.log('\nStep 6: Logging refresh...')
    await logRefresh('success', duration, totalRows)

    console.log(`\n✓ Matchup computation complete in ${duration}ms`)
    console.log(`✓ Processed ${matchupRows} matchup rows`)
    console.log(`✓ Processed ${pickOrderRows} pick order rows`)

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('\n✗ Matchup computation failed:', error)

    await logRefresh('failed', duration, 0, (error as Error).message)
    process.exit(1)
  }
}

main()
