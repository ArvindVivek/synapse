/**
 * Team-aware scoring enhancement
 *
 * Boosts recommendation scores based on opponent team's actual champion pools.
 * Targets signature picks for bans and avoids unfavorable matchups.
 */

import { getPlayerChampionPool, PlayerChampion } from '@/lib/queries/player-pools'
import type { PickRecommendation } from './types'

export interface OpponentPlayer {
  id: string
  name: string
  role: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
}

export interface TeamAwareContext {
  opponentPlayers: OpponentPlayer[]
  phase: 'ban1' | 'pick1' | 'ban2' | 'pick2'
  isUserTurn: boolean
}

/**
 * Cache for player champion pools to avoid repeated database queries
 */
const playerPoolCache = new Map<string, {
  data: PlayerChampion[],
  timestamp: number
}>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get player champion pool with caching
 */
async function getCachedPlayerPool(
  playerId: string,
  role: string
): Promise<PlayerChampion[]> {
  const cacheKey = `${playerId}:${role}`
  const cached = playerPoolCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const data = await getPlayerChampionPool(playerId, role)
  playerPoolCache.set(cacheKey, { data, timestamp: Date.now() })
  return data
}

/**
 * Calculate ban priority boost based on opponent champion pools
 *
 * Returns a multiplier (0.5-2.0) to apply to ban scores:
 * - 2.0: Signature pick (10+ games, 55%+ WR) for opponent player
 * - 1.5: Comfort pick (5+ games, 50%+ WR)
 * - 1.2: Occasional pick (3+ games)
 * - 1.0: Neutral (champion not in opponent pools)
 * - 0.5: Rarely played (<3 games)
 */
export async function calculateBanPriorityBoost(
  champion: string,
  context: TeamAwareContext
): Promise<{ multiplier: number; reasoning: string }> {
  if (context.phase !== 'ban1' && context.phase !== 'ban2') {
    return { multiplier: 1.0, reasoning: 'Not in ban phase' }
  }

  // Fetch champion pools for all opponent players in parallel
  const poolPromises = context.opponentPlayers.map(player =>
    getCachedPlayerPool(player.id, player.role).catch(() => [])
  )
  const pools = await Promise.all(poolPromises)

  // Find if any opponent player plays this champion
  let bestMatch: { player: OpponentPlayer; champion: PlayerChampion } | null = null
  let highestPriority = 0

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const championData = pool.find(c => c.champion_name === champion)

    if (championData) {
      // Calculate priority score
      let priority = championData.games_played
      if (championData.comfort_level === 'signature') priority *= 2.0
      else if (championData.comfort_level === 'comfort') priority *= 1.5

      if (priority > highestPriority) {
        highestPriority = priority
        bestMatch = { player: context.opponentPlayers[i], champion: championData }
      }
    }
  }

  if (!bestMatch) {
    return { multiplier: 1.0, reasoning: '' }
  }

  // Determine multiplier and reasoning
  const { player, champion: champData } = bestMatch
  const winRatePercent = Math.round(champData.smoothed_win_rate * 100)

  if (champData.comfort_level === 'signature') {
    return {
      multiplier: 2.0,
      reasoning: `${player.name}'s signature pick (${champData.games_played}g, ${winRatePercent}% WR)`
    }
  }

  if (champData.comfort_level === 'comfort') {
    return {
      multiplier: 1.5,
      reasoning: `${player.name} comfort pick (${champData.games_played}g, ${winRatePercent}% WR)`
    }
  }

  if (champData.games_played >= 3) {
    return {
      multiplier: 1.2,
      reasoning: `${player.name} occasional pick (${champData.games_played}g)`
    }
  }

  return {
    multiplier: 0.8,
    reasoning: `Rarely played by ${player.name}`
  }
}

/**
 * Calculate pick counter-awareness boost
 *
 * When selecting picks, consider if opponent players have strong performance
 * against our potential pick. Returns a multiplier (0.7-1.2):
 * - 1.2: None of opponent players have strong matchups with this champion
 * - 1.0: Neutral matchup data
 * - 0.7: Opponent has a player with strong historical performance vs this champion
 */
export async function calculatePickCounterBoost(
  champion: string,
  context: TeamAwareContext
): Promise<{ multiplier: number; reasoning: string }> {
  if (context.phase !== 'pick1' && context.phase !== 'pick2') {
    return { multiplier: 1.0, reasoning: 'Not in pick phase' }
  }

  // For now, return neutral - full matchup analysis would require more complex queries
  // Future enhancement: Query champion_matchups table to see if opponent players
  // have historically strong performance with champions that counter this pick
  return { multiplier: 1.0, reasoning: '' }
}

/**
 * Apply team-aware adjustments to recommendation scores
 *
 * This is called after base scoring to boost/reduce scores based on
 * opponent team's actual champion preferences.
 */
export async function applyTeamAwareAdjustments(
  recommendations: PickRecommendation[],
  context: TeamAwareContext
): Promise<PickRecommendation[]> {
  // Apply adjustments in parallel
  const adjusted = await Promise.all(
    recommendations.map(async (rec) => {
      if (context.phase === 'ban1' || context.phase === 'ban2') {
        const banBoost = await calculateBanPriorityBoost(rec.champion, context)

        return {
          ...rec,
          totalScore: rec.totalScore * banBoost.multiplier,
          reasoning: banBoost.reasoning
            ? [...rec.reasoning, banBoost.reasoning]
            : rec.reasoning
        }
      } else {
        const pickBoost = await calculatePickCounterBoost(rec.champion, context)

        return {
          ...rec,
          totalScore: rec.totalScore * pickBoost.multiplier,
          reasoning: pickBoost.reasoning
            ? [...rec.reasoning, pickBoost.reasoning]
            : rec.reasoning
        }
      }
    })
  )

  // Re-sort by adjusted scores
  return adjusted.sort((a, b) => b.totalScore - a.totalScore)
}
