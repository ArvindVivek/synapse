/**
 * Ban Analytics Computation Script
 *
 * Computes ban statistics from raw draft data:
 * - Global ban analytics (most banned champions)
 * - Team-specific ban preferences
 * - Target bans (bans directed at specific players)
 *
 * Usage: npx tsx scripts/analytics/compute-ban-analytics.ts
 */

import { config } from 'dotenv'
import path from 'path'

// Load env from project root
config({ path: path.resolve(process.cwd(), '.env.local') })
config({ path: path.resolve(process.cwd(), '.env') })

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Config
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'synapse' }
})

/**
 * Bayesian smoothing for ban rates
 * Prior: 50% ban rate with weight of 10 games
 */
function smoothBanRate(timesBanned: number, totalGames: number): number {
  const priorBanRate = 0.5
  const priorWeight = 10
  const priorBans = priorBanRate * priorWeight

  return (timesBanned + priorBans) / (totalGames + priorWeight)
}

/**
 * Assign confidence level based on sample size
 */
function getConfidenceLevel(sampleSize: number): 'high' | 'medium' | 'low' | 'insufficient' {
  if (sampleSize >= 30) return 'high'
  if (sampleSize >= 10) return 'medium'
  if (sampleSize >= 5) return 'low'
  return 'insufficient'
}

/**
 * Get recent patches (last 3)
 */
async function getRecentPatches(): Promise<string[]> {
  const { data, error } = await supabase
    .from('series')
    .select('patch_version')
    .not('patch_version', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1000)  // Get enough data to find distinct patches

  if (error) {
    console.error('Error fetching patches:', error)
    return []
  }

  // Get unique patches
  const uniquePatches = [...new Set(data.map(s => s.patch_version))]
    .filter(p => p) as string[]

  return uniquePatches.slice(0, 3)
}

/**
 * Compute global ban analytics
 */
async function computeGlobalBanAnalytics(patches: string[]) {
  console.log('\n📊 Computing global ban analytics...')

  // Query all drafts for recent patches
  const { data: drafts, error: draftsError } = await supabase
    .from('drafts')
    .select(`
      id,
      blue_bans,
      red_bans,
      games!inner (
        id,
        series!inner (
          patch_version
        )
      )
    `)
    .in('games.series.patch_version', patches)

  if (draftsError) {
    console.error('Error fetching drafts:', draftsError)
    return
  }

  console.log(`Found ${drafts?.length || 0} drafts across ${patches.length} patches`)

  // Aggregate ban counts per champion per patch
  const banCounts: Record<string, Record<string, number>> = {}  // patch -> champion -> count
  const totalGamesPerPatch: Record<string, number> = {}

  for (const draft of drafts || []) {
    const patch = (draft.games as any).series.patch_version
    if (!patch) continue

    totalGamesPerPatch[patch] = (totalGamesPerPatch[patch] || 0) + 1

    if (!banCounts[patch]) banCounts[patch] = {}

    // Count blue bans
    for (const champion of draft.blue_bans || []) {
      banCounts[patch][champion] = (banCounts[patch][champion] || 0) + 1
    }

    // Count red bans
    for (const champion of draft.red_bans || []) {
      banCounts[patch][champion] = (banCounts[patch][champion] || 0) + 1
    }
  }

  // Build analytics records
  type BanAnalyticsRecord = {
    champion_name: string
    patch_version: string
    context_type: string
    context_id: string | null
    times_banned: number
    total_games_in_context: number
    ban_rate: number
    smoothed_ban_rate: number
    confidence: string
    rank_in_context: number
  }
  const analyticsRecords: BanAnalyticsRecord[] = []

  for (const patch of patches) {
    const totalGames = totalGamesPerPatch[patch] || 0
    if (totalGames === 0) continue

    const champions = Object.keys(banCounts[patch] || {})

    // Calculate rates and sort by ban count
    const championStats = champions.map(champion => {
      const timesBanned = banCounts[patch][champion] || 0
      const banRate = timesBanned / (totalGames * 2)  // Each game has 2 teams banning
      const smoothedBanRate = smoothBanRate(timesBanned, totalGames * 2)
      const confidence = getConfidenceLevel(timesBanned)

      return {
        champion_name: champion,
        patch_version: patch,
        context_type: 'global',
        context_id: null,
        times_banned: timesBanned,
        total_games_in_context: totalGames,
        ban_rate: banRate,
        smoothed_ban_rate: smoothedBanRate,
        confidence,
      }
    })

    // Sort by ban rate descending and assign ranks
    championStats.sort((a, b) => b.ban_rate - a.ban_rate)
    championStats.forEach((stat, index) => {
      analyticsRecords.push({
        ...stat,
        rank_in_context: index + 1
      })
    })
  }

  console.log(`Computed analytics for ${analyticsRecords.length} champion/patch combinations`)

  // Upsert to database
  if (analyticsRecords.length > 0) {
    const { error: upsertError } = await supabase
      .from('ban_analytics')
      .upsert(analyticsRecords, {
        onConflict: 'champion_name,patch_version,context_type,context_id'
      })

    if (upsertError) {
      console.error('Error upserting ban analytics:', upsertError)
    } else {
      console.log(`✅ Upserted ${analyticsRecords.length} global ban analytics records`)
    }
  }
}

/**
 * Compute team-specific ban analytics
 */
async function computeTeamBanAnalytics(patches: string[]) {
  console.log('\n🎯 Computing team-specific ban analytics...')

  // Query drafts with team info
  const { data: drafts, error: draftsError } = await supabase
    .from('drafts')
    .select(`
      id,
      blue_bans,
      red_bans,
      games!inner (
        id,
        blue_team_won,
        series!inner (
          id,
          patch_version,
          blue_team:blue_team_id (grid_id),
          red_team:red_team_id (grid_id)
        )
      )
    `)
    .in('games.series.patch_version', patches)

  if (draftsError) {
    console.error('Error fetching team drafts:', draftsError)
    return
  }

  // Aggregate team ban preferences
  const teamBans: Record<string, Record<string, Record<string, number>>> = {}  // patch -> team -> champion -> count
  const teamGamesCount: Record<string, Record<string, number>> = {}  // patch -> team -> count

  for (const draft of drafts || []) {
    const patch = (draft.games as any).series.patch_version
    const blueTeamId = (draft.games as any).series.blue_team?.grid_id
    const redTeamId = (draft.games as any).series.red_team?.grid_id

    if (!patch) continue

    if (!teamBans[patch]) teamBans[patch] = {}
    if (!teamGamesCount[patch]) teamGamesCount[patch] = {}

    // Track blue team bans
    if (blueTeamId) {
      if (!teamBans[patch][blueTeamId]) teamBans[patch][blueTeamId] = {}
      teamGamesCount[patch][blueTeamId] = (teamGamesCount[patch][blueTeamId] || 0) + 1

      for (const champion of draft.blue_bans || []) {
        teamBans[patch][blueTeamId][champion] = (teamBans[patch][blueTeamId][champion] || 0) + 1
      }
    }

    // Track red team bans
    if (redTeamId) {
      if (!teamBans[patch][redTeamId]) teamBans[patch][redTeamId] = {}
      teamGamesCount[patch][redTeamId] = (teamGamesCount[patch][redTeamId] || 0) + 1

      for (const champion of draft.red_bans || []) {
        teamBans[patch][redTeamId][champion] = (teamBans[patch][redTeamId][champion] || 0) + 1
      }
    }
  }

  // Build analytics records
  type TeamBanAnalyticsRecord = {
    champion_name: string
    patch_version: string
    context_type: string
    context_id: string
    times_banned: number
    total_games_in_context: number
    ban_rate: number
    smoothed_ban_rate: number
    confidence: string
    rank_in_context: number
  }
  const analyticsRecords: TeamBanAnalyticsRecord[] = []

  for (const patch of patches) {
    const teams = Object.keys(teamBans[patch] || {})

    for (const teamId of teams) {
      const totalGames = teamGamesCount[patch][teamId] || 0
      if (totalGames === 0) continue

      const champions = Object.keys(teamBans[patch][teamId] || {})

      const championStats: Array<{
        champion_name: string
        patch_version: string
        context_type: string
        context_id: string
        times_banned: number
        total_games_in_context: number
        ban_rate: number
        smoothed_ban_rate: number
        confidence: string
      }> = champions.map(champion => {
        const timesBanned = teamBans[patch][teamId][champion] || 0
        const banRate = timesBanned / totalGames
        const smoothedBanRate = smoothBanRate(timesBanned, totalGames)
        const confidence = getConfidenceLevel(timesBanned)

        return {
          champion_name: champion,
          patch_version: patch,
          context_type: 'team',
          context_id: teamId,
          times_banned: timesBanned,
          total_games_in_context: totalGames,
          ban_rate: banRate,
          smoothed_ban_rate: smoothedBanRate,
          confidence,
        }
      })

      // Sort and rank
      championStats.sort((a, b) => b.ban_rate - a.ban_rate)
      championStats.forEach((stat, index) => {
        analyticsRecords.push({
          ...stat,
          rank_in_context: index + 1
        })
      })
    }
  }

  console.log(`Computed team analytics for ${analyticsRecords.length} team/champion combinations`)

  // Upsert to database
  if (analyticsRecords.length > 0) {
    const { error: upsertError } = await supabase
      .from('ban_analytics')
      .upsert(analyticsRecords, {
        onConflict: 'champion_name,patch_version,context_type,context_id'
      })

    if (upsertError) {
      console.error('Error upserting team ban analytics:', upsertError)
    } else {
      console.log(`✅ Upserted ${analyticsRecords.length} team ban analytics records`)
    }
  }
}

/**
 * Compute target bans (bans directed at specific players)
 */
async function computeTargetBans() {
  console.log('\n🎯 Computing target bans...')

  // Get all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, grid_id')

  if (playersError) {
    console.error('Error fetching players:', playersError)
    return
  }

  console.log(`Processing target bans for ${players?.length || 0} players...`)

  const targetBanRecords = []

  for (const player of players || []) {
    // Get player's champion pool (champions they've played 3+ times)
    const { data: picks, error: picksError } = await supabase
      .from('champion_picks')
      .select('champion_name')
      .eq('player_id', player.id)

    if (picksError) continue

    const championPool = new Set(picks.map(p => p.champion_name))
    const championCounts: Record<string, number> = {}

    for (const pick of picks) {
      championCounts[pick.champion_name] = (championCounts[pick.champion_name] || 0) + 1
    }

    // Get games where this player's team played
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select(`
        id,
        drafts!inner (
          id,
          blue_bans,
          red_bans
        ),
        series!inner (
          id,
          blue_team_id,
          red_team_id
        )
      `)
      .or(`series.blue_team_id.eq.${player.id},series.red_team_id.eq.${player.id}`)

    if (gamesError) continue

    // Count bans made BY opponents against this player's champion pool
    const banCounts: Record<string, number> = {}
    let totalGamesAgainstPlayer = 0

    for (const game of games || []) {
      totalGamesAgainstPlayer++

      // Determine which side the player was on
      const isPlayerBlue = (game.series as any).blue_team_id === player.id
      const opponentBans = isPlayerBlue
        ? (game.drafts as any).red_bans || []
        : (game.drafts as any).blue_bans || []

      // Count opponent bans
      for (const champion of opponentBans) {
        if (championPool.has(champion)) {
          banCounts[champion] = (banCounts[champion] || 0) + 1
        }
      }
    }

    // Create target ban records
    for (const champion of championPool) {
      const timesBannedAgainst = banCounts[champion] || 0
      const isComfortPick = (championCounts[champion] || 0) >= 3

      if (timesBannedAgainst > 0) {
        targetBanRecords.push({
          player_id: player.id,
          champion_name: champion,
          times_banned_against: timesBannedAgainst,
          total_games_against_player: totalGamesAgainstPlayer,
          ban_rate_against: timesBannedAgainst / Math.max(totalGamesAgainstPlayer, 1),
          is_comfort_pick: isComfortPick
        })
      }
    }
  }

  console.log(`Computed ${targetBanRecords.length} target ban records`)

  // Upsert to database
  if (targetBanRecords.length > 0) {
    const { error: upsertError } = await supabase
      .from('target_bans')
      .upsert(targetBanRecords, {
        onConflict: 'player_id,champion_name'
      })

    if (upsertError) {
      console.error('Error upserting target bans:', upsertError)
    } else {
      console.log(`✅ Upserted ${targetBanRecords.length} target ban records`)
    }
  }
}

/**
 * Log refresh to analytics_refresh_log
 */
async function logRefresh(jobName: string, status: 'success' | 'failed', durationMs: number, rowsAffected?: number) {
  // Check if analytics_refresh_log table exists, if not, skip logging
  const { error } = await supabase
    .from('analytics_refresh_log')
    .insert({
      job_name: jobName,
      status,
      duration_ms: durationMs,
      rows_affected: rowsAffected,
      refreshed_at: new Date().toISOString()
    })

  if (error && !error.message.includes('does not exist')) {
    console.warn('Could not log refresh:', error.message)
  }
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now()

  console.log('🚀 Starting ban analytics computation...')

  try {
    // Get recent patches
    const patches = await getRecentPatches()
    console.log(`\n📅 Using patches: ${patches.join(', ')}`)

    if (patches.length === 0) {
      console.error('No patches found. Exiting.')
      return
    }

    // Compute analytics
    await computeGlobalBanAnalytics(patches)
    await computeTeamBanAnalytics(patches)
    await computeTargetBans()

    const duration = Date.now() - startTime
    console.log(`\n✅ Ban analytics computation complete in ${duration}ms`)

    // Log success
    await logRefresh('ban_analytics', 'success', duration)

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('\n❌ Ban analytics computation failed:', error)

    // Log failure
    await logRefresh('ban_analytics', 'failed', duration)

    process.exit(1)
  }
}

main()
