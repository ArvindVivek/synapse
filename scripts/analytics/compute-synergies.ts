/**
 * Compute champion synergies with Bayesian smoothing and archetype fallback
 *
 * Aggregates synergy stats from champion pairs that played together:
 * - Win rates for champion pairs (Bayesian smoothed)
 * - Synergy delta (deviation from 50% baseline)
 * - Confidence levels and Wilson confidence intervals
 * - Archetype-based fallback for rare pairs
 *
 * Run: cd scripts/etl && npx tsx ../analytics/compute-synergies.ts
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

interface SynergyRow {
  champion_a: string
  champion_b: string
  patch_version: string
  games_together: number
  wins_together: number
  raw_win_rate: number | null
  smoothed_win_rate: number
  synergy_delta: number
  confidence: string
  ci_lower: number
  ci_upper: number
}

interface ArchetypeRow {
  champion_name: string
  archetype: string
  damage_type: 'physical' | 'magic' | 'mixed'
}

interface ArchetypeSynergyRow {
  archetype_a: string
  archetype_b: string
  games_together: number
  smoothed_win_rate: number
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
 * Aggregate synergy stats for champion pairs
 */
async function aggregateSynergies(patches: string[]): Promise<SynergyRow[]> {
  console.log('Querying champion pair performance...')

  // Self-join champion_picks to find pairs that played together
  const { data: pairs, error } = await supabase.rpc('get_champion_pairs', {
    patch_filters: patches
  }).select()

  // If RPC doesn't exist, fall back to manual aggregation
  // Query all champion picks for the patches
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

  // Group picks by draft_id and team_side to find pairs
  const draftPairs: Map<string, {
    draft_id: string
    team_side: string
    patch: string
    blue_won: boolean
    champions: string[]
  }> = new Map()

  for (const pick of picks || []) {
    const draftKey = `${pick.draft_id}|${pick.team_side}`
    const patch = (pick as any).drafts.games.series.patch_version
    const blueWon = (pick as any).drafts.games.blue_team_won

    if (!draftPairs.has(draftKey)) {
      draftPairs.set(draftKey, {
        draft_id: pick.draft_id,
        team_side: pick.team_side,
        patch,
        blue_won: blueWon,
        champions: []
      })
    }

    draftPairs.get(draftKey)!.champions.push(pick.champion_name)
  }

  console.log(`Grouped into ${draftPairs.size} team compositions`)

  // Generate all pairs from each team and aggregate stats
  const synergyMap: Map<string, {
    champion_a: string
    champion_b: string
    patch: string
    games: number
    wins: number
  }> = new Map()

  for (const [_, draft] of draftPairs) {
    const champions = draft.champions
    const won = (draft.team_side === 'blue' && draft.blue_won) || (draft.team_side === 'red' && !draft.blue_won)

    // Generate all pairs (combination, not permutation)
    for (let i = 0; i < champions.length; i++) {
      for (let j = i + 1; j < champions.length; j++) {
        // Ensure consistent ordering (alphabetical)
        const [champA, champB] = champions[i] < champions[j]
          ? [champions[i], champions[j]]
          : [champions[j], champions[i]]

        const key = `${champA}|${champB}|${draft.patch}`

        if (!synergyMap.has(key)) {
          synergyMap.set(key, {
            champion_a: champA,
            champion_b: champB,
            patch: draft.patch,
            games: 0,
            wins: 0
          })
        }

        const stats = synergyMap.get(key)!
        stats.games += 1
        if (won) stats.wins += 1
      }
    }
  }

  console.log(`Found ${synergyMap.size} unique champion pairs`)

  // Filter pairs with minimum games threshold (5+)
  const filteredPairs = Array.from(synergyMap.values()).filter(p => p.games >= 5)
  console.log(`${filteredPairs.length} pairs meet 5+ games threshold`)

  // Transform to SynergyRow format with smoothing and confidence
  const rows: SynergyRow[] = filteredPairs.map(stats => {
    // Raw win rate
    const rawWinRate = stats.games > 0 ? stats.wins / stats.games : null

    // Bayesian smoothed win rate (prior: 50% with weight 10)
    const smoothedWinRate = bayesianSmoothedWinRate(stats.wins, stats.games)

    // Synergy delta (positive = good synergy)
    const synergyDelta = smoothedWinRate - 0.50

    // Confidence scoring
    const confidence = getConfidenceLevel(stats.games)
    const ci = wilsonConfidenceInterval(stats.wins, stats.games)

    return {
      champion_a: stats.champion_a,
      champion_b: stats.champion_b,
      patch_version: stats.patch,
      games_together: stats.games,
      wins_together: stats.wins,
      raw_win_rate: rawWinRate,
      smoothed_win_rate: smoothedWinRate,
      synergy_delta: synergyDelta,
      confidence,
      ci_lower: ci.lower,
      ci_upper: ci.upper
    }
  })

  return rows
}

/**
 * Seed champion archetypes (for fallback)
 */
async function seedArchetypes(): Promise<number> {
  console.log('Seeding champion archetypes...')

  const archetypes: ArchetypeRow[] = [
    // Engage tanks
    { champion_name: 'Sejuani', archetype: 'engage_tank', damage_type: 'magic' },
    { champion_name: 'Nautilus', archetype: 'engage_tank', damage_type: 'magic' },
    { champion_name: 'Leona', archetype: 'engage_tank', damage_type: 'magic' },
    { champion_name: 'Maokai', archetype: 'engage_tank', damage_type: 'magic' },
    { champion_name: 'Rell', archetype: 'engage_tank', damage_type: 'magic' },
    { champion_name: 'Amumu', archetype: 'engage_tank', damage_type: 'magic' },

    // Poke mages
    { champion_name: 'Xerath', archetype: 'poke_mage', damage_type: 'magic' },
    { champion_name: 'Ziggs', archetype: 'poke_mage', damage_type: 'magic' },
    { champion_name: 'Zoe', archetype: 'poke_mage', damage_type: 'magic' },
    { champion_name: 'Lux', archetype: 'poke_mage', damage_type: 'magic' },

    // Control mages
    { champion_name: 'Orianna', archetype: 'control_mage', damage_type: 'magic' },
    { champion_name: 'Viktor', archetype: 'control_mage', damage_type: 'magic' },
    { champion_name: 'Azir', archetype: 'control_mage', damage_type: 'magic' },
    { champion_name: 'Syndra', archetype: 'control_mage', damage_type: 'magic' },

    // Assassins
    { champion_name: 'Zed', archetype: 'assassin', damage_type: 'physical' },
    { champion_name: 'Talon', archetype: 'assassin', damage_type: 'physical' },
    { champion_name: 'Akali', archetype: 'assassin', damage_type: 'mixed' },
    { champion_name: 'LeBlanc', archetype: 'assassin', damage_type: 'magic' },
    { champion_name: 'Katarina', archetype: 'assassin', damage_type: 'magic' },

    // Scaling ADCs
    { champion_name: 'Jinx', archetype: 'scaling_adc', damage_type: 'physical' },
    { champion_name: 'Tristana', archetype: 'scaling_adc', damage_type: 'physical' },
    { champion_name: "Kog'Maw", archetype: 'scaling_adc', damage_type: 'mixed' },
    { champion_name: 'Aphelios', archetype: 'scaling_adc', damage_type: 'physical' },
    { champion_name: 'Zeri', archetype: 'scaling_adc', damage_type: 'physical' },

    // Utility ADCs
    { champion_name: 'Jhin', archetype: 'utility_adc', damage_type: 'physical' },
    { champion_name: 'Ashe', archetype: 'utility_adc', damage_type: 'physical' },
    { champion_name: 'Varus', archetype: 'utility_adc', damage_type: 'mixed' },
    { champion_name: 'Sivir', archetype: 'utility_adc', damage_type: 'physical' },

    // Enchanters
    { champion_name: 'Lulu', archetype: 'enchanter', damage_type: 'magic' },
    { champion_name: 'Janna', archetype: 'enchanter', damage_type: 'magic' },
    { champion_name: 'Soraka', archetype: 'enchanter', damage_type: 'magic' },
    { champion_name: 'Nami', archetype: 'enchanter', damage_type: 'magic' },
    { champion_name: 'Renata Glasc', archetype: 'enchanter', damage_type: 'magic' },

    // Bruisers
    { champion_name: 'Aatrox', archetype: 'bruiser', damage_type: 'physical' },
    { champion_name: 'Jax', archetype: 'bruiser', damage_type: 'mixed' },
    { champion_name: 'Irelia', archetype: 'bruiser', damage_type: 'physical' },
    { champion_name: 'Fiora', archetype: 'bruiser', damage_type: 'physical' },
    { champion_name: 'Camille', archetype: 'bruiser', damage_type: 'physical' },

    // Tanks
    { champion_name: 'Ornn', archetype: 'tank', damage_type: 'magic' },
    { champion_name: 'Sion', archetype: 'tank', damage_type: 'physical' },
    { champion_name: "Cho'Gath", archetype: 'tank', damage_type: 'magic' },
    { champion_name: 'Malphite', archetype: 'tank', damage_type: 'magic' },

    // Skirmishers
    { champion_name: 'Yasuo', archetype: 'skirmisher', damage_type: 'physical' },
    { champion_name: 'Yone', archetype: 'skirmisher', damage_type: 'mixed' },
    { champion_name: 'Riven', archetype: 'skirmisher', damage_type: 'physical' },
    { champion_name: 'Gwen', archetype: 'skirmisher', damage_type: 'magic' }
  ]

  const { error } = await supabase
    .from('champion_archetypes')
    .upsert(archetypes, {
      onConflict: 'champion_name'
    })

  if (error) throw error

  console.log(`✓ Seeded ${archetypes.length} champion archetypes`)
  return archetypes.length
}

/**
 * Aggregate archetype synergies from champion pair data
 */
async function aggregateArchetypeSynergies(): Promise<number> {
  console.log('Aggregating archetype synergies...')

  // Query all synergies with archetype info
  const { data: synergies, error: synergiesError } = await supabase
    .from('champion_synergies')
    .select('champion_a, champion_b, games_together, wins_together')

  if (synergiesError) throw synergiesError

  // Query archetypes
  const { data: archetypes, error: archetypesError } = await supabase
    .from('champion_archetypes')
    .select('champion_name, archetype')

  if (archetypesError) throw archetypesError

  // Build archetype lookup
  const archetypeLookup = new Map<string, string>()
  for (const a of archetypes || []) {
    archetypeLookup.set(a.champion_name, a.archetype)
  }

  // Aggregate by archetype pairs
  const archetypeMap: Map<string, {
    archetype_a: string
    archetype_b: string
    games: number
    wins: number
  }> = new Map()

  for (const syn of synergies || []) {
    const archetypeA = archetypeLookup.get(syn.champion_a)
    const archetypeB = archetypeLookup.get(syn.champion_b)

    if (!archetypeA || !archetypeB) continue

    // Ensure consistent ordering
    const [archA, archB] = archetypeA < archetypeB
      ? [archetypeA, archetypeB]
      : [archetypeB, archetypeA]

    const key = `${archA}|${archB}`

    if (!archetypeMap.has(key)) {
      archetypeMap.set(key, {
        archetype_a: archA,
        archetype_b: archB,
        games: 0,
        wins: 0
      })
    }

    const stats = archetypeMap.get(key)!
    stats.games += syn.games_together
    stats.wins += syn.wins_together
  }

  // Transform to ArchetypeSynergyRow with smoothing
  const rows: ArchetypeSynergyRow[] = Array.from(archetypeMap.values()).map(stats => ({
    archetype_a: stats.archetype_a,
    archetype_b: stats.archetype_b,
    games_together: stats.games,
    smoothed_win_rate: bayesianSmoothedWinRate(stats.wins, stats.games)
  }))

  if (rows.length === 0) {
    console.log('No archetype synergies to compute (no champion synergies yet)')
    return 0
  }

  // Upsert to database
  const { error } = await supabase
    .from('archetype_synergies')
    .upsert(rows, {
      onConflict: 'archetype_a,archetype_b'
    })

  if (error) throw error

  console.log(`✓ Computed ${rows.length} archetype synergy rows`)
  return rows.length
}

/**
 * Upsert synergies to champion_synergies table
 */
async function upsertSynergies(rows: SynergyRow[]): Promise<number> {
  if (rows.length === 0) {
    console.log('No synergies to upsert')
    return 0
  }

  console.log(`Upserting ${rows.length} rows to champion_synergies...`)

  const { error } = await supabase
    .from('champion_synergies')
    .upsert(rows, {
      onConflict: 'champion_a,champion_b,patch_version'
    })

  if (error) throw error

  console.log(`✓ Upserted ${rows.length} synergy rows`)
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
    job_name: 'champion_synergies',
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
    console.log('=== Champion Synergy Computation ===\n')

    // Step 1: Get recent patches
    console.log('Step 1: Fetching recent patches...')
    const patches = await getRecentPatches()
    console.log(`Fetched ${patches.length} recent patches: ${patches.join(', ')}\n`)

    if (patches.length === 0) {
      console.log('No patches found in database. Exiting.')
      return
    }

    // Step 2: Aggregate synergies
    console.log('Step 2: Aggregating champion synergies...')
    const synergies = await aggregateSynergies(patches)
    console.log(`Computed synergies for ${synergies.length} champion pairs\n`)

    // Step 3: Upsert to database
    console.log('Step 3: Upserting to champion_synergies...')
    const synergyRows = await upsertSynergies(synergies)

    // Step 4: Seed archetypes
    console.log('\nStep 4: Seeding champion archetypes...')
    const archetypeCount = await seedArchetypes()

    // Step 5: Aggregate archetype synergies
    console.log('\nStep 5: Aggregating archetype synergies...')
    const archetypeSynergyCount = await aggregateArchetypeSynergies()

    const duration = Date.now() - startTime

    // Step 6: Log success
    console.log('\nStep 6: Logging refresh...')
    await logRefresh('success', duration, synergyRows)

    console.log(`\n✓ Synergy computation complete in ${duration}ms`)
    console.log(`✓ Processed ${synergyRows} synergy rows`)
    console.log(`✓ Seeded ${archetypeCount} archetypes`)
    console.log(`✓ Computed ${archetypeSynergyCount} archetype synergy rows`)

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('\n✗ Synergy computation failed:', error)

    await logRefresh('failed', duration, 0, (error as Error).message)
    process.exit(1)
  }
}

main()
