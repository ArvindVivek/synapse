/**
 * Synergy query helpers with hierarchical fallback
 *
 * Returns neutral scores if tables don't exist (MVP fallback).
 */

import { createClient } from '@supabase/supabase-js'

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

// Create Supabase client directly for server-side queries
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Create a neutral synergy score (for when no data exists)
 */
function createNeutralScore(championA: string, championB: string): SynergyScore {
  const [champA, champB] = championA < championB
    ? [championA, championB]
    : [championB, championA]

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
 * Get synergy score between two champions with fallback
 */
export async function getSynergyScore(
  championA: string,
  championB: string,
  patchVersion: string
): Promise<SynergyScore> {
  const supabase = getSupabaseClient()
  if (!supabase) return createNeutralScore(championA, championB)

  const [champA, champB] = championA < championB
    ? [championA, championB]
    : [championB, championA]

  try {
    // Try direct champion pair lookup
    const { data: directSynergy, error } = await supabase
      .from('champion_synergies')
      .select('*')
      .eq('champion_a', champA)
      .eq('champion_b', champB)
      .eq('patch_version', patchVersion)
      .single()

    if (!error && directSynergy) {
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
  } catch (error) {
    // Table doesn't exist or query failed
  }

  // Return neutral (no data available or tables don't exist)
  return createNeutralScore(championA, championB)
}

/**
 * Get all synergies for a champion
 */
export async function getChampionSynergies(
  champion: string,
  patchVersion: string,
  limit: number = 10
): Promise<SynergyScore[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data: synergiesA } = await supabase
      .from('champion_synergies')
      .select('*')
      .eq('champion_a', champion)
      .eq('patch_version', patchVersion)
      .order('synergy_delta', { ascending: false })
      .limit(limit)

    const { data: synergiesB } = await supabase
      .from('champion_synergies')
      .select('*')
      .eq('champion_b', champion)
      .eq('patch_version', patchVersion)
      .order('synergy_delta', { ascending: false })
      .limit(limit)

    const allSynergies = [
      ...(synergiesA || []).map(s => ({
        champion_a: s.champion_a,
        champion_b: s.champion_b,
        games_together: s.games_together,
        smoothed_win_rate: parseFloat(s.smoothed_win_rate),
        synergy_delta: parseFloat(s.synergy_delta),
        confidence: s.confidence as any,
        source: 'direct' as const
      })),
      ...(synergiesB || []).map(s => ({
        champion_a: s.champion_a,
        champion_b: s.champion_b,
        games_together: s.games_together,
        smoothed_win_rate: parseFloat(s.smoothed_win_rate),
        synergy_delta: parseFloat(s.synergy_delta),
        confidence: s.confidence as any,
        source: 'direct' as const
      }))
    ]

    return allSynergies
      .sort((a, b) => b.synergy_delta - a.synergy_delta)
      .slice(0, limit)
  } catch (error) {
    return []
  }
}

/**
 * Get best synergies with a team composition
 */
export async function getTeamSynergies(
  teamChampions: string[],
  candidateChampion: string,
  patchVersion: string
): Promise<{ total_synergy: number; pairs: SynergyScore[] }> {
  const pairs = await Promise.all(
    teamChampions.map(teammate =>
      getSynergyScore(teammate, candidateChampion, patchVersion)
    )
  )

  const totalSynergy = pairs.reduce((sum, pair) => sum + pair.synergy_delta, 0)

  return { total_synergy: totalSynergy, pairs }
}
