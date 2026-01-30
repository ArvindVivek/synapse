/**
 * Synergy query helpers with hierarchical fallback
 *
 * Provides functions to query champion synergies with intelligent fallback:
 * 1. Direct champion pair data (if games >= 5)
 * 2. Archetype-based synergy (if both champions have archetypes)
 * 3. Neutral assumption (0.50 win rate, synergy_delta = 0)
 */

import { createClient } from '@/lib/supabase/server'
import { bayesianSmoothedWinRate } from '@/lib/statistics'

export interface SynergyScore {
  champion_a: string
  champion_b: string
  games_together: number
  smoothed_win_rate: number
  synergy_delta: number
  confidence: 'high' | 'medium' | 'low' | 'insufficient' | 'archetype_fallback'
  source: 'direct' | 'archetype' | 'neutral'
  ci_lower?: number
  ci_upper?: number
}

/**
 * Get synergy score between two champions with fallback
 *
 * Fallback chain:
 * 1. Direct pair data (if games >= 5)
 * 2. Archetype-based synergy (if both champions have archetypes)
 * 3. Neutral assumption (0.50 win rate)
 *
 * @param championA - First champion name
 * @param championB - Second champion name
 * @param patchVersion - Patch version to query
 * @returns Synergy score with source indicator
 *
 * @example
 * // Common pair with direct data
 * const sejAshe = await getSynergyScore('Sejuani', 'Ashe', '14.1')
 * // { smoothed_win_rate: 0.54, synergy_delta: 0.04, source: 'direct' }
 *
 * // Rare pair with archetype fallback
 * const ivRen = await getSynergyScore('Ivern', 'Rengar', '14.1')
 * // { smoothed_win_rate: 0.51, synergy_delta: 0.01, source: 'archetype' }
 */
export async function getSynergyScore(
  championA: string,
  championB: string,
  patchVersion: string
): Promise<SynergyScore> {
  const supabase = await createClient()

  // Ensure consistent ordering (alphabetical)
  const [champA, champB] = championA < championB
    ? [championA, championB]
    : [championB, championA]

  // Step 1: Try direct champion pair lookup
  const { data: directSynergy, error: directError } = await supabase
    .from('champion_synergies')
    .select('*')
    .eq('champion_a', champA)
    .eq('champion_b', champB)
    .eq('patch_version', patchVersion)
    .single()

  if (!directError && directSynergy) {
    // Direct data available
    return {
      champion_a: champA,
      champion_b: champB,
      games_together: directSynergy.games_together,
      smoothed_win_rate: parseFloat(directSynergy.smoothed_win_rate),
      synergy_delta: parseFloat(directSynergy.synergy_delta),
      confidence: directSynergy.confidence as any,
      source: 'direct',
      ci_lower: directSynergy.ci_lower ? parseFloat(directSynergy.ci_lower) : undefined,
      ci_upper: directSynergy.ci_upper ? parseFloat(directSynergy.ci_upper) : undefined
    }
  }

  // Step 2: Try archetype-based fallback
  const { data: archetypes, error: archetypesError } = await supabase
    .from('champion_archetypes')
    .select('champion_name, archetype')
    .in('champion_name', [champA, champB])

  if (!archetypesError && archetypes && archetypes.length === 2) {
    const archetypeA = archetypes.find(a => a.champion_name === champA)?.archetype
    const archetypeB = archetypes.find(a => a.champion_name === champB)?.archetype

    if (archetypeA && archetypeB) {
      // Ensure consistent ordering for archetype lookup
      const [archA, archB] = archetypeA < archetypeB
        ? [archetypeA, archetypeB]
        : [archetypeB, archetypeA]

      const { data: archetypeSynergy, error: archSynError } = await supabase
        .from('archetype_synergies')
        .select('*')
        .eq('archetype_a', archA)
        .eq('archetype_b', archB)
        .single()

      if (!archSynError && archetypeSynergy) {
        // Archetype-based synergy available
        const smoothedWinRate = parseFloat(archetypeSynergy.smoothed_win_rate)
        return {
          champion_a: champA,
          champion_b: champB,
          games_together: archetypeSynergy.games_together,
          smoothed_win_rate: smoothedWinRate,
          synergy_delta: smoothedWinRate - 0.50,
          confidence: 'archetype_fallback',
          source: 'archetype'
        }
      }
    }
  }

  // Step 3: Neutral assumption (no data available)
  return {
    champion_a: champA,
    champion_b: champB,
    games_together: 0,
    smoothed_win_rate: 0.50,
    synergy_delta: 0,
    confidence: 'insufficient',
    source: 'neutral'
  }
}

/**
 * Get all synergies for a champion (for recommendation panel)
 *
 * Returns top synergies ordered by synergy_delta descending.
 * Only includes synergies with direct data (no archetype fallback).
 *
 * @param champion - Champion name
 * @param patchVersion - Patch version to query
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of synergy scores ordered by delta descending
 *
 * @example
 * const topSynergies = await getChampionSynergies('Sejuani', '14.1', 5)
 * // [
 * //   { champion_b: 'Ashe', synergy_delta: 0.04, ... },
 * //   { champion_b: 'Jinx', synergy_delta: 0.03, ... },
 * //   ...
 * // ]
 */
export async function getChampionSynergies(
  champion: string,
  patchVersion: string,
  limit: number = 10
): Promise<SynergyScore[]> {
  const supabase = await createClient()

  // Query where champion is either champion_a or champion_b
  const { data: synergiesA, error: errorA } = await supabase
    .from('champion_synergies')
    .select('*')
    .eq('champion_a', champion)
    .eq('patch_version', patchVersion)
    .order('synergy_delta', { ascending: false })
    .limit(limit)

  const { data: synergiesB, error: errorB } = await supabase
    .from('champion_synergies')
    .select('*')
    .eq('champion_b', champion)
    .eq('patch_version', patchVersion)
    .order('synergy_delta', { ascending: false })
    .limit(limit)

  if (errorA || errorB) {
    console.error('Error fetching champion synergies:', errorA || errorB)
    return []
  }

  // Combine and transform results
  const allSynergies = [
    ...(synergiesA || []).map(s => ({
      champion_a: s.champion_a,
      champion_b: s.champion_b,
      partner: s.champion_b, // The other champion in the pair
      games_together: s.games_together,
      smoothed_win_rate: parseFloat(s.smoothed_win_rate),
      synergy_delta: parseFloat(s.synergy_delta),
      confidence: s.confidence as any,
      source: 'direct' as const,
      ci_lower: s.ci_lower ? parseFloat(s.ci_lower) : undefined,
      ci_upper: s.ci_upper ? parseFloat(s.ci_upper) : undefined
    })),
    ...(synergiesB || []).map(s => ({
      champion_a: s.champion_a,
      champion_b: s.champion_b,
      partner: s.champion_a, // The other champion in the pair
      games_together: s.games_together,
      smoothed_win_rate: parseFloat(s.smoothed_win_rate),
      synergy_delta: parseFloat(s.synergy_delta),
      confidence: s.confidence as any,
      source: 'direct' as const,
      ci_lower: s.ci_lower ? parseFloat(s.ci_lower) : undefined,
      ci_upper: s.ci_upper ? parseFloat(s.ci_upper) : undefined
    }))
  ]

  // Sort by synergy_delta descending and take top N
  return allSynergies
    .sort((a, b) => b.synergy_delta - a.synergy_delta)
    .slice(0, limit)
}

/**
 * Get best synergies with a team composition
 *
 * Calculates total synergy score for a candidate champion with existing team.
 * Total synergy is the sum of pairwise synergy deltas.
 *
 * @param teamChampions - Array of champion names already on the team
 * @param candidateChampion - Champion to evaluate synergy for
 * @param patchVersion - Patch version to query
 * @returns Total synergy score and individual pair scores
 *
 * @example
 * const teamSynergy = await getTeamSynergies(
 *   ['Sejuani', 'Jinx', 'Orianna'],
 *   'Leona',
 *   '14.1'
 * )
 * // {
 * //   total_synergy: 0.12,
 * //   pairs: [
 * //     { champion_b: 'Sejuani', synergy_delta: 0.05 },
 * //     { champion_b: 'Jinx', synergy_delta: 0.04 },
 * //     { champion_b: 'Orianna', synergy_delta: 0.03 }
 * //   ]
 * // }
 */
export async function getTeamSynergies(
  teamChampions: string[],
  candidateChampion: string,
  patchVersion: string
): Promise<{ total_synergy: number; pairs: SynergyScore[] }> {
  // Get synergy with each team member
  const pairs = await Promise.all(
    teamChampions.map(teammate =>
      getSynergyScore(teammate, candidateChampion, patchVersion)
    )
  )

  // Sum synergy deltas
  const totalSynergy = pairs.reduce((sum, pair) => sum + pair.synergy_delta, 0)

  return {
    total_synergy: totalSynergy,
    pairs
  }
}
