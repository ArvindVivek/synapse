/**
 * Matchup query helpers
 *
 * Returns empty results if tables don't exist (MVP fallback).
 */

import { createClient } from '@supabase/supabase-js'

export interface MatchupScore {
  champion: string
  opponent: string
  role: string
  matchup_delta: number
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

// Create Supabase client directly for server-side queries
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Get counters to a specific champion
 */
export async function getCountersTo(
  champion: string,
  role: string,
  patchVersion: string,
  limit: number = 10
): Promise<MatchupScore[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('champion_matchups')
      .select('opponent, champion, role, matchup_delta, games, confidence')
      .eq('champion', champion)
      .eq('role', role)
      .eq('patch_version', patchVersion)
      .in('confidence', ['high', 'medium', 'low'])
      .order('matchup_delta', { ascending: false })
      .limit(limit)

    if (error) return []

    return (data || []).map(row => ({
      champion: row.opponent,
      opponent: row.champion,
      role: row.role,
      matchup_delta: -row.matchup_delta,
      games: row.games,
      confidence: row.confidence as 'high' | 'medium' | 'low' | 'insufficient'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Get champions that the given champion counters
 */
export async function getCounteredBy(
  champion: string,
  role: string,
  patchVersion: string,
  limit: number = 10
): Promise<MatchupScore[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('champion_matchups')
      .select('champion, opponent, role, matchup_delta, games, confidence')
      .eq('champion', champion)
      .eq('role', role)
      .eq('patch_version', patchVersion)
      .in('confidence', ['high', 'medium', 'low'])
      .gt('matchup_delta', 0)
      .order('matchup_delta', { ascending: false })
      .limit(limit)

    if (error) return []

    return (data || []).map(row => ({
      champion: row.champion,
      opponent: row.opponent,
      role: row.role,
      matchup_delta: row.matchup_delta,
      games: row.games,
      confidence: row.confidence as 'high' | 'medium' | 'low' | 'insufficient'
    }))
  } catch (error) {
    return []
  }
}

/**
 * Get matchup score between two specific champions
 * Returns null if no data
 */
export async function getMatchup(
  champion: string,
  opponent: string,
  role: string,
  patchVersion: string
): Promise<MatchupScore | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('champion_matchups')
      .select('champion, opponent, role, matchup_delta, games, confidence')
      .eq('champion', champion)
      .eq('opponent', opponent)
      .eq('role', role)
      .eq('patch_version', patchVersion)
      .single()

    if (error || !data) return null

    return {
      champion: data.champion,
      opponent: data.opponent,
      role: data.role,
      matchup_delta: data.matchup_delta,
      games: data.games,
      confidence: data.confidence as 'high' | 'medium' | 'low' | 'insufficient'
    }
  } catch (error) {
    return null
  }
}

/**
 * Get pick order recommendation for a champion
 * Returns null if no data
 */
export async function getPickOrderRecommendation(
  champion: string,
  role: string,
  patchVersion: string
): Promise<PickOrderStats | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('pick_order_stats')
      .select('champion_name, role, pick_phase, blind_pick_success, counter_pick_success, confidence')
      .eq('champion_name', champion)
      .eq('role', role)
      .eq('patch_version', patchVersion)
      .in('confidence', ['high', 'medium', 'low'])

    if (error || !data || data.length === 0) return null

    let totalBlindSuccess = 0
    let totalCounterSuccess = 0
    let count = 0

    for (const row of data) {
      if (row.blind_pick_success !== null) totalBlindSuccess += row.blind_pick_success
      if (row.counter_pick_success !== null) totalCounterSuccess += row.counter_pick_success
      count++
    }

    if (count === 0) return null

    const avgBlindSuccess = totalBlindSuccess / count
    const avgCounterSuccess = totalCounterSuccess / count

    let recommendation: 'good_blind_pick' | 'better_late' | 'neutral'
    if (avgBlindSuccess >= 0.52 && avgBlindSuccess >= avgCounterSuccess) {
      recommendation = 'good_blind_pick'
    } else if (avgCounterSuccess > avgBlindSuccess + 0.05) {
      recommendation = 'better_late'
    } else {
      recommendation = 'neutral'
    }

    const firstPhase = data[0]
    return {
      champion_name: champion,
      role,
      pick_phase: firstPhase.pick_phase as 'early' | 'mid' | 'late',
      blind_pick_success: avgBlindSuccess,
      counter_pick_success: avgCounterSuccess,
      recommendation
    }
  } catch (error) {
    return null
  }
}

/**
 * Get best blind picks for a role
 */
export async function getBestBlindPicks(
  role: string,
  patchVersion: string,
  limit: number = 10
): Promise<PickOrderStats[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('pick_order_stats')
      .select('champion_name, role, pick_phase, blind_pick_success, counter_pick_success, confidence')
      .eq('role', role)
      .eq('patch_version', patchVersion)
      .eq('pick_phase', 'early')
      .in('confidence', ['high', 'medium'])
      .not('blind_pick_success', 'is', null)
      .order('blind_pick_success', { ascending: false })
      .limit(limit)

    if (error) return []

    return (data || []).map(row => {
      const blindSuccess = row.blind_pick_success || 0
      const counterSuccess = row.counter_pick_success || 0

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
  } catch (error) {
    return []
  }
}
