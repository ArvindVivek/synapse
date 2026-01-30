/**
 * Analytics cache for recommendation API performance
 *
 * Caches pre-computed analytics from Phase 2 tables to avoid
 * repeated database queries during active draft sessions.
 *
 * TTL: 60 seconds (analytics don't change during a draft)
 */

import { createClient } from '@/lib/supabase/server'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface ChampionStats {
  champion_name: string
  win_rate: number
  pick_rate: number
  ban_rate: number
  games: number
  role_confidence: Record<string, number>
}

interface SynergyData {
  champion1: string
  champion2: string
  win_rate: number
  delta: number
  games: number
}

interface MatchupData {
  champion: string
  opponent: string
  role: string
  win_rate: number
  delta: number
  games: number
}

interface PlayerPoolData {
  player_id: string
  champion_name: string
  games_played: number
  win_rate: number
  comfort_level: string
}

export interface CachedAnalytics {
  championStats: Map<string, ChampionStats>
  synergies: Map<string, SynergyData[]>
  matchups: Map<string, MatchupData[]>
  playerPools: Map<string, PlayerPoolData[]>
}

const CACHE_TTL = 60000 // 60 seconds

class AnalyticsCache {
  private cache = new Map<string, CacheEntry<CachedAnalytics>>()

  getCacheKey(patchVersion: string, tournamentId?: string): string {
    return `${patchVersion}:${tournamentId || 'global'}`
  }

  get(key: string): CachedAnalytics | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: CachedAnalytics): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  // Singleton instance
  private static instance: AnalyticsCache
  static getInstance(): AnalyticsCache {
    if (!AnalyticsCache.instance) {
      AnalyticsCache.instance = new AnalyticsCache()
    }
    return AnalyticsCache.instance
  }
}

export const analyticsCache = AnalyticsCache.getInstance()

/**
 * Get cached analytics or fetch from database using direct queries
 *
 * Uses direct queries to Phase 2 computed tables:
 * - champion_stats_computed
 * - team_synergies_computed
 * - matchups_computed
 * - player_champion_stats
 *
 * No RPC required - direct queries are fast enough with proper indexes.
 */
export async function getCachedAnalytics(
  patchVersion: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CachedAnalytics> {
  const key = analyticsCache.getCacheKey(patchVersion)

  // Try cache first
  const cached = analyticsCache.get(key)
  if (cached) {
    return cached
  }

  // Fetch from database using parallel direct queries
  const [championStatsResult, synergiesResult, matchupsResult] = await Promise.all([
    supabase
      .from('champion_stats_computed')
      .select('champion_name, win_rate, pick_rate, ban_rate, games, role_confidence')
      .eq('patch_version', patchVersion)
      .gte('games', 5),

    supabase
      .from('team_synergies_computed')
      .select('champion1, champion2, win_rate, delta, games')
      .eq('patch_version', patchVersion)
      .gte('games', 3),

    supabase
      .from('matchups_computed')
      .select('champion, opponent, role, win_rate, delta, games')
      .eq('patch_version', patchVersion)
      .gte('games', 3)
  ])

  // Build Maps for fast lookup
  const championStats = new Map<string, ChampionStats>()
  for (const row of championStatsResult.data || []) {
    championStats.set(row.champion_name, row)
  }

  const synergies = new Map<string, SynergyData[]>()
  for (const row of synergiesResult.data || []) {
    const key = row.champion1
    if (!synergies.has(key)) synergies.set(key, [])
    synergies.get(key)!.push(row)
  }

  const matchups = new Map<string, MatchupData[]>()
  for (const row of matchupsResult.data || []) {
    const key = `${row.champion}:${row.role}`
    if (!matchups.has(key)) matchups.set(key, [])
    matchups.get(key)!.push(row)
  }

  const analytics: CachedAnalytics = {
    championStats,
    synergies,
    matchups,
    playerPools: new Map() // Populated lazily per-player
  }

  // Store in cache
  analyticsCache.set(key, analytics)

  return analytics
}

/**
 * Get player pool data (separate function for lazy loading)
 */
export async function getPlayerPoolFromCache(
  playerId: string,
  patchVersion: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<PlayerPoolData[]> {
  const { data, error } = await supabase
    .from('player_champion_stats')
    .select('player_id, champion_name, games_played, win_rate, comfort_level')
    .eq('player_id', playerId)
    .eq('patch_version', patchVersion)
    .gte('games_played', 3)
    .order('games_played', { ascending: false })

  if (error) {
    console.error('[getPlayerPoolFromCache] Error:', error)
    return []
  }

  return data || []
}
