/**
 * Data Verification Script
 * Inspects what data has been loaded into the synapse schema
 */

import { config } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load env
config({ path: path.resolve(process.cwd(), '../../.env.local') })
config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function verifyData() {
  console.log('========================================')
  console.log('Synapse Data Verification')
  console.log('========================================\n')

  // 1. Count records in each table
  console.log('📊 Record Counts:\n')

  const tables = [
    'tournaments',
    'teams',
    'players',
    'series',
    'games',
    'drafts',
    'champion_picks',
  ]

  const counts: Record<string, number> = {}

  for (const table of tables) {
    const { count, error } = await supabase
      .schema('synapse')
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`  ❌ ${table}: Error - ${error.message}`)
    } else {
      counts[table] = count || 0
      console.log(`  ✓ ${table}: ${count || 0} records`)
    }
  }

  // 2. Show sample tournament data
  console.log('\n📋 Sample Tournament Data:\n')
  const { data: tournaments } = await supabase
    .schema('synapse')
    .from('tournaments')
    .select('*')
    .limit(3)

  tournaments?.forEach((t) => {
    console.log(`  - ${t.name} (${t.region})`)
    console.log(`    ID: ${t.grid_id}`)
    console.log(`    Dates: ${t.start_date || 'N/A'} to ${t.end_date || 'N/A'}\n`)
  })

  // 3. Show sample series with relationships
  console.log('🎮 Sample Series Data:\n')
  const { data: series } = await supabase
    .schema('synapse')
    .from('series')
    .select(`
      *,
      tournament:tournaments(name, region),
      blue_team:teams!series_blue_team_id_fkey(name),
      red_team:teams!series_red_team_id_fkey(name),
      games(id)
    `)
    .not('finished_at', 'is', null)
    .limit(3)

  series?.forEach((s) => {
    console.log(`  - ${s.blue_team?.name} vs ${s.red_team?.name}`)
    console.log(`    Tournament: ${s.tournament?.name}`)
    console.log(`    Games: ${s.games?.length || 0}`)
    console.log(`    Started: ${s.started_at}`)
    console.log(`    Finished: ${s.finished_at}\n`)
  })

  // 4. Champion pick statistics
  console.log('🏆 Top 10 Most Picked Champions:\n')
  const { data: topPicks } = await supabase
    .schema('synapse')
    .from('champion_picks')
    .select('champion_name, role')
    .then((res) => {
      if (res.error || !res.data) return { data: [] }

      // Group by champion and role
      const grouped = res.data.reduce((acc, pick) => {
        const key = `${pick.champion_name}|${pick.role}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Sort by count
      const sorted = Object.entries(grouped)
        .map(([key, count]) => {
          const [champion, role] = key.split('|')
          return { champion, role, count }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      return { data: sorted }
    })

  topPicks?.forEach((pick, i) => {
    console.log(`  ${i + 1}. ${pick.champion} (${pick.role}): ${pick.count} picks`)
  })

  // 5. Role inference quality
  console.log('\n🎯 Role Inference Quality:\n')
  const { data: roleStats } = await supabase
    .schema('synapse')
    .from('champion_picks')
    .select('role_confidence')

  if (roleStats) {
    const total = roleStats.length
    const high = roleStats.filter((r) => r.role_confidence > 0.9).length
    const medium = roleStats.filter((r) => r.role_confidence >= 0.5 && r.role_confidence <= 0.9).length
    const low = roleStats.filter((r) => r.role_confidence < 0.5).length

    console.log(`  High Confidence (>0.9):   ${high}/${total} (${((high / total) * 100).toFixed(1)}%)`)
    console.log(`  Medium Confidence (0.5-0.9): ${medium}/${total} (${((medium / total) * 100).toFixed(1)}%)`)
    console.log(`  Low Confidence (<0.5):    ${low}/${total} (${((low / total) * 100).toFixed(1)}%)`)
  }

  // 6. Sample champion picks with details
  console.log('\n📝 Sample Champion Picks (Latest 5):\n')
  const { data: samplePicks } = await supabase
    .schema('synapse')
    .from('champion_picks')
    .select(`
      champion_name,
      role,
      role_confidence,
      team_side,
      pick_order,
      player:players(name),
      draft:drafts(
        game:games(
          game_number,
          series:series(
            blue_team:teams!series_blue_team_id_fkey(name),
            red_team:teams!series_red_team_id_fkey(name)
          )
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  samplePicks?.forEach((pick) => {
    const series = pick.draft?.game?.series
    const game = pick.draft?.game
    console.log(`  - ${pick.champion_name} (${pick.role})`)
    console.log(`    Player: ${pick.player?.name || 'Unknown'}`)
    console.log(`    Side: ${pick.team_side} | Order: ${pick.pick_order}`)
    console.log(`    Confidence: ${(pick.role_confidence * 100).toFixed(1)}%`)
    console.log(`    Match: ${series?.blue_team?.name} vs ${series?.red_team?.name} (Game ${game?.game_number})\n`)
  })

  // 7. Data completeness check
  console.log('✅ Data Completeness Check:\n')

  // Series with all games
  const { data: seriesWithGames } = await supabase
    .schema('synapse')
    .from('series')
    .select('id, games(id)')

  const seriesWithoutGames = seriesWithGames?.filter((s) => !s.games || s.games.length === 0).length || 0
  console.log(`  Series with no games: ${seriesWithoutGames}/${seriesWithGames?.length || 0}`)

  // Games with drafts
  const { data: gamesWithDrafts } = await supabase
    .schema('synapse')
    .from('games')
    .select('id, drafts(id)')

  const gamesWithoutDrafts = gamesWithDrafts?.filter((g) => !g.drafts || g.drafts.length === 0).length || 0
  console.log(`  Games with no drafts: ${gamesWithoutDrafts}/${gamesWithDrafts?.length || 0}`)

  // Drafts with picks
  const { data: draftsWithPicks } = await supabase
    .schema('synapse')
    .from('drafts')
    .select('id, champion_picks(id)')

  const draftsWithoutPicks = draftsWithPicks?.filter((d) => !d.champion_picks || d.champion_picks.length === 0).length || 0
  console.log(`  Drafts with no picks: ${draftsWithoutPicks}/${draftsWithPicks?.length || 0}`)

  // Expected picks per draft (should be ~10)
  const avgPicksPerDraft = counts.champion_picks / counts.drafts
  console.log(`  Average picks per draft: ${avgPicksPerDraft.toFixed(1)} (expected: ~10)`)

  console.log('\n========================================')
  console.log('Verification Complete!')
  console.log('========================================')
}

verifyData().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
