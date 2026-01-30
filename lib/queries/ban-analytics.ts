/**
 * Ban Analytics Query Helpers
 *
 * Provides typed query functions for accessing ban analytics data
 */

import { createClient } from '@/lib/supabase/server'

export interface BanAnalytics {
  champion_name: string
  ban_rate: number
  smoothed_ban_rate: number
  rank_in_context: number
  confidence: 'high' | 'medium' | 'low' | 'insufficient'
  times_banned: number
  total_games_in_context: number
}

export interface TargetBan {
  player_id: string
  champion_name: string
  ban_rate_against: number
  is_comfort_pick: boolean
  times_banned_against: number
  total_games_against_player: number
}

/**
 * Get top banned champions globally for a specific patch
 *
 * @param patchVersion - Patch version (e.g., "14.23")
 * @param limit - Maximum number of champions to return (default: 10)
 * @returns Array of ban analytics sorted by rank
 */
export async function getTopBannedChampions(
  patchVersion: string,
  limit: number = 10
): Promise<BanAnalytics[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ban_analytics')
    .select('*')
    .eq('context_type', 'global')
    .eq('patch_version', patchVersion)
    .is('context_id', null)
    .order('rank_in_context', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching top banned champions:', error)
    throw new Error(`Failed to fetch top banned champions: ${error.message}`)
  }

  return (data || []).map(record => ({
    champion_name: record.champion_name,
    ban_rate: record.ban_rate || 0,
    smoothed_ban_rate: record.smoothed_ban_rate || 0,
    rank_in_context: record.rank_in_context || 0,
    confidence: record.confidence as 'high' | 'medium' | 'low' | 'insufficient',
    times_banned: record.times_banned || 0,
    total_games_in_context: record.total_games_in_context || 0,
  }))
}

/**
 * Get bans to target a specific player
 *
 * Returns champions that are frequently banned against this player,
 * prioritizing comfort picks (champions they play often)
 *
 * @param playerId - Player UUID
 * @returns Array of target bans sorted by ban rate descending
 */
export async function getTargetBansForPlayer(
  playerId: string
): Promise<TargetBan[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('target_bans')
    .select('*')
    .eq('player_id', playerId)
    .order('ban_rate_against', { ascending: false })

  if (error) {
    console.error('Error fetching target bans for player:', error)
    throw new Error(`Failed to fetch target bans: ${error.message}`)
  }

  return (data || []).map(record => ({
    player_id: record.player_id,
    champion_name: record.champion_name,
    ban_rate_against: record.ban_rate_against || 0,
    is_comfort_pick: record.is_comfort_pick || false,
    times_banned_against: record.times_banned_against || 0,
    total_games_against_player: record.total_games_against_player || 0,
  }))
}

/**
 * Get a team's ban preferences for a specific patch
 *
 * Returns champions this team prefers to ban, useful for predicting
 * opponent ban strategies
 *
 * @param teamId - Team grid ID
 * @param patchVersion - Patch version (e.g., "14.23")
 * @returns Array of ban analytics sorted by rank
 */
export async function getTeamBanPreferences(
  teamId: string,
  patchVersion: string
): Promise<BanAnalytics[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ban_analytics')
    .select('*')
    .eq('context_type', 'team')
    .eq('context_id', teamId)
    .eq('patch_version', patchVersion)
    .order('rank_in_context', { ascending: true })

  if (error) {
    console.error('Error fetching team ban preferences:', error)
    throw new Error(`Failed to fetch team ban preferences: ${error.message}`)
  }

  return (data || []).map(record => ({
    champion_name: record.champion_name,
    ban_rate: record.ban_rate || 0,
    smoothed_ban_rate: record.smoothed_ban_rate || 0,
    rank_in_context: record.rank_in_context || 0,
    confidence: record.confidence as 'high' | 'medium' | 'low' | 'insufficient',
    times_banned: record.times_banned || 0,
    total_games_in_context: record.total_games_in_context || 0,
  }))
}

/**
 * Get ban analytics for multiple champions in a specific context
 *
 * Useful for evaluating ban effectiveness for a set of potential bans
 *
 * @param championNames - Array of champion names
 * @param patchVersion - Patch version
 * @param contextType - Context type ('global', 'team', 'player')
 * @param contextId - Context ID (null for global, team/player ID otherwise)
 * @returns Array of ban analytics for the specified champions
 */
export async function getBanAnalyticsForChampions(
  championNames: string[],
  patchVersion: string,
  contextType: 'global' | 'team' | 'player' = 'global',
  contextId: string | null = null
): Promise<BanAnalytics[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ban_analytics')
    .select('*')
    .in('champion_name', championNames)
    .eq('patch_version', patchVersion)
    .eq('context_type', contextType)

  if (contextType === 'global') {
    query = query.is('context_id', null)
  } else if (contextId) {
    query = query.eq('context_id', contextId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching ban analytics for champions:', error)
    throw new Error(`Failed to fetch ban analytics: ${error.message}`)
  }

  return (data || []).map(record => ({
    champion_name: record.champion_name,
    ban_rate: record.ban_rate || 0,
    smoothed_ban_rate: record.smoothed_ban_rate || 0,
    rank_in_context: record.rank_in_context || 0,
    confidence: record.confidence as 'high' | 'medium' | 'low' | 'insufficient',
    times_banned: record.times_banned || 0,
    total_games_in_context: record.total_games_in_context || 0,
  }))
}
