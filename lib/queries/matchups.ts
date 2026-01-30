/**
 * Matchup query helpers
 *
 * Provides typed access to champion matchup data and pick order statistics.
 * Supports counter-pick lookups, blind pick recommendations, and matchup scoring.
 */

import { createClient } from '@/lib/supabase/server'

export interface MatchupScore {
  champion: string
  opponent: string
  role: string
  matchup_delta: number  // positive = favorable
  games: number
  confidence: 'high' | 'medium' | 'low' | 'insufficient'
}

export interface PickOrderStats {
  champion_name: string
  role: string
  pick_phase: 'early' | 'mid' | 'late'
  blind_pick_success: number
  counter_pick_success: number
  recommendation: 'good_blind_pick' | 'better_late' | 'neutral'
}

/**
 * Get counters to a specific champion
 *
 * Returns champions that counter the given champion in the specified role.
 * Higher matchup_delta = stronger counter.
 *
 * @param champion - Champion being countered
 * @param role - Lane role
 * @param patchVersion - Patch version
 * @param limit - Maximum results to return (default: 10)
 * @returns Array of counters sorted by matchup_delta (descending)
 *
 * @example
 * // Find what counters Camille in top lane
 * const counters = await getCountersTo('Camille', 'top', '15.2')
 * // Returns: [{ opponent: 'Gnar', matchup_delta: 0.08, ... }, ...]
 */
export async function getCountersTo(
  champion: string,
  role: string,
  patchVersion: string,
  limit: number = 10
): Promise<MatchupScore[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('champion_matchups')
    .select('opponent, champion, role, matchup_delta, games, confidence')
    .eq('champion', champion)
    .eq('role', role)
    .eq('patch_version', patchVersion)
    .in('confidence', ['high', 'medium', 'low'])
    .order('matchup_delta', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map(row => ({
    champion: row.opponent,  // From opponent's perspective, they counter us
    opponent: row.champion,
    role: row.role,
    matchup_delta: -row.matchup_delta,  // Flip sign (negative for us = positive for them)
    games: row.games,
    confidence: row.confidence as 'high' | 'medium' | 'low' | 'insufficient'
  }))
}

/**
 * Get champions that the given champion counters
 *
 * Returns opponents that this champion performs well against.
 * Higher matchup_delta = stronger advantage.
 *
 * @param champion - Champion doing the countering
 * @param role - Lane role
 * @param patchVersion - Patch version
 * @param limit - Maximum results to return (default: 10)
 * @returns Array of countered champions sorted by matchup_delta (descending)
 *
 * @example
 * // Find what Gnar counters in top lane
 * const countered = await getCounteredBy('Gnar', 'top', '15.2')
 * // Returns: [{ opponent: 'Camille', matchup_delta: 0.08, ... }, ...]
 */
export async function getCounteredBy(
  champion: string,
  role: string,
  patchVersion: string,
  limit: number = 10
): Promise<MatchupScore[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('champion_matchups')
    .select('champion, opponent, role, matchup_delta, games, confidence')
    .eq('champion', champion)
    .eq('role', role)
    .eq('patch_version', patchVersion)
    .in('confidence', ['high', 'medium', 'low'])
    .gt('matchup_delta', 0)  // Only favorable matchups
    .order('matchup_delta', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map(row => ({
    champion: row.champion,
    opponent: row.opponent,
    role: row.role,
    matchup_delta: row.matchup_delta,
    games: row.games,
    confidence: row.confidence as 'high' | 'medium' | 'low' | 'insufficient'
  }))
}

/**
 * Get matchup score between two specific champions
 *
 * Returns the matchup relationship from the champion's perspective.
 * Positive matchup_delta = favorable, negative = unfavorable.
 *
 * @param champion - First champion
 * @param opponent - Second champion
 * @param role - Lane role
 * @param patchVersion - Patch version
 * @returns Matchup score or null if insufficient data
 *
 * @example
 * // Check Gnar vs Camille matchup
 * const matchup = await getMatchup('Gnar', 'Camille', 'top', '15.2')
 * // Returns: { matchup_delta: 0.08, games: 45, confidence: 'high' }
 */
export async function getMatchup(
  champion: string,
  opponent: string,
  role: string,
  patchVersion: string
): Promise<MatchupScore | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('champion_matchups')
    .select('champion, opponent, role, matchup_delta, games, confidence')
    .eq('champion', champion)
    .eq('opponent', opponent)
    .eq('role', role)
    .eq('patch_version', patchVersion)
    .single()

  if (error) return null

  return {
    champion: data.champion,
    opponent: data.opponent,
    role: data.role,
    matchup_delta: data.matchup_delta,
    games: data.games,
    confidence: data.confidence as 'high' | 'medium' | 'low' | 'insufficient'
  }
}

/**
 * Get pick order recommendation for a champion
 *
 * Analyzes blind pick vs counter pick success to classify champion.
 * - good_blind_pick: Strong when picked early (before opponent revealed)
 * - better_late: Stronger as counter-pick (after seeing opponent)
 * - neutral: Similar performance early or late
 *
 * @param champion - Champion name
 * @param role - Lane role
 * @param patchVersion - Patch version
 * @returns Pick order stats with recommendation, or null if insufficient data
 *
 * @example
 * // Check if Azir is a good blind pick
 * const stats = await getPickOrderRecommendation('Azir', 'mid', '15.2')
 * // Returns: { recommendation: 'good_blind_pick', blind_pick_success: 0.54, ... }
 */
export async function getPickOrderRecommendation(
  champion: string,
  role: string,
  patchVersion: string
): Promise<PickOrderStats | null> {
  const supabase = await createClient()

  // Get stats for all pick phases
  const { data, error } = await supabase
    .from('pick_order_stats')
    .select('champion_name, role, pick_phase, blind_pick_success, counter_pick_success, confidence')
    .eq('champion_name', champion)
    .eq('role', role)
    .eq('patch_version', patchVersion)
    .in('confidence', ['high', 'medium', 'low'])

  if (error || !data || data.length === 0) return null

  // Aggregate across pick phases (weighted by confidence)
  let totalBlindSuccess = 0
  let totalCounterSuccess = 0
  let count = 0

  for (const row of data) {
    if (row.blind_pick_success !== null) {
      totalBlindSuccess += row.blind_pick_success
    }
    if (row.counter_pick_success !== null) {
      totalCounterSuccess += row.counter_pick_success
    }
    count++
  }

  if (count === 0) return null

  const avgBlindSuccess = totalBlindSuccess / count
  const avgCounterSuccess = totalCounterSuccess / count

  // Determine recommendation
  let recommendation: 'good_blind_pick' | 'better_late' | 'neutral'

  if (avgBlindSuccess >= 0.52 && avgBlindSuccess >= avgCounterSuccess) {
    recommendation = 'good_blind_pick'
  } else if (avgCounterSuccess > avgBlindSuccess + 0.05) {
    recommendation = 'better_late'
  } else {
    recommendation = 'neutral'
  }

  // Return with the first pick phase for context
  const firstPhase = data[0]

  return {
    champion_name: champion,
    role,
    pick_phase: firstPhase.pick_phase as 'early' | 'mid' | 'late',
    blind_pick_success: avgBlindSuccess,
    counter_pick_success: avgCounterSuccess,
    recommendation
  }
}

/**
 * Get best blind picks for a role
 *
 * Returns champions with high blind pick success rates.
 * These champions are safe early picks that perform well without
 * knowing the opponent's champion.
 *
 * @param role - Lane role
 * @param patchVersion - Patch version
 * @param limit - Maximum results to return (default: 10)
 * @returns Array of champions sorted by blind_pick_success (descending)
 *
 * @example
 * // Find best blind picks for mid lane
 * const blindPicks = await getBestBlindPicks('mid', '15.2')
 * // Returns: [{ champion_name: 'Azir', blind_pick_success: 0.54, ... }, ...]
 */
export async function getBestBlindPicks(
  role: string,
  patchVersion: string,
  limit: number = 10
): Promise<PickOrderStats[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pick_order_stats')
    .select('champion_name, role, pick_phase, blind_pick_success, counter_pick_success, confidence')
    .eq('role', role)
    .eq('patch_version', patchVersion)
    .eq('pick_phase', 'early')  // Focus on early pick phase
    .in('confidence', ['high', 'medium'])
    .not('blind_pick_success', 'is', null)
    .order('blind_pick_success', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map(row => {
    const blindSuccess = row.blind_pick_success || 0
    const counterSuccess = row.counter_pick_success || 0

    // Determine recommendation
    let recommendation: 'good_blind_pick' | 'better_late' | 'neutral'
    if (blindSuccess >= 0.52 && blindSuccess >= counterSuccess) {
      recommendation = 'good_blind_pick'
    } else if (counterSuccess > blindSuccess + 0.05) {
      recommendation = 'better_late'
    } else {
      recommendation = 'neutral'
    }

    return {
      champion_name: row.champion_name,
      role: row.role,
      pick_phase: row.pick_phase as 'early' | 'mid' | 'late',
      blind_pick_success: blindSuccess,
      counter_pick_success: counterSuccess,
      recommendation
    }
  })
}
