/**
 * Ban strategy recommendations
 *
 * Generates ban recommendations distinguishing between:
 * - Target bans: Player-specific bans based on individual champion pools
 * - Priority bans: Meta-based bans for high-priority champions
 * - Situational bans: Context-specific bans
 *
 * Each target ban references the specific player being targeted with their
 * games played and win rate statistics.
 */

import {
  getPlayerSignaturePicks,
  getPlayerChampionPool,
  PlayerChampion
} from '@/lib/queries/player-pools'
import {
  getTopBannedChampions,
  BanAnalytics
} from '@/lib/queries/ban-analytics'

export type BanType = 'target' | 'priority' | 'situational'

export interface BanRecommendation {
  champion: string
  score: number          // 0.0-1.0
  type: BanType
  reasoning: string      // "Target ban vs Faker: 47 games, 68% WR"
  targetPlayer?: {
    playerId: string
    playerName: string
    gamesPlayed: number
    winRate: number
  }
}

export interface BanContext {
  opponentPlayers: Array<{
    playerId: string
    playerName: string
    role: string
  }>
  alreadyBanned: string[]
  currentTurn: number    // For phase-appropriate bans
  patchVersion: string
}

/**
 * Score a target ban against a specific player
 *
 * Scoring factors:
 * - Games played (40%): More games = more valuable ban
 * - Win rate (40%): Higher WR = more valuable ban
 * - Comfort level (20%): Signature picks worth more
 */
function scoreTargetBan(
  champion: PlayerChampion,
  player: { playerId: string; playerName: string }
): BanRecommendation {
  // Higher score for: more games, higher WR, signature comfort
  const gamesScore = Math.min(champion.games_played / 30, 1.0) * 0.40
  const winRateScore = (champion.smoothed_win_rate - 0.50) * 2 * 0.40
  const comfortScore = champion.comfort_level === 'signature' ? 0.20 : 0.10

  const totalScore = Math.max(0, Math.min(1.0, gamesScore + winRateScore + comfortScore))

  const winRatePercent = Math.round(champion.smoothed_win_rate * 100)

  return {
    champion: champion.champion_name,
    score: totalScore,
    type: 'target',
    reasoning: `Target ban vs ${player.playerName}: ${champion.games_played} games, ${winRatePercent}% WR`,
    targetPlayer: {
      playerId: player.playerId,
      playerName: player.playerName,
      gamesPlayed: champion.games_played,
      winRate: champion.smoothed_win_rate
    }
  }
}

/**
 * Score a priority ban based on meta ban rate
 *
 * Scoring based on:
 * - Smoothed ban rate (primary factor)
 * - Confidence level (high confidence bans weighted more)
 */
function scorePriorityBan(ban: BanAnalytics): BanRecommendation {
  // Base score from smoothed ban rate
  let score = ban.smoothed_ban_rate

  // Boost for high confidence data
  const confidenceBoost = {
    high: 1.2,
    medium: 1.0,
    low: 0.8,
    insufficient: 0.5
  }[ban.confidence]

  score = Math.min(1.0, score * confidenceBoost)

  const banRatePercent = Math.round(ban.smoothed_ban_rate * 100)

  return {
    champion: ban.champion_name,
    score,
    type: 'priority',
    reasoning: `Priority ban: ${banRatePercent}% ban rate in meta (${ban.times_banned}/${ban.total_games_in_context} games)`
  }
}

/**
 * Score ban targets for current draft context
 *
 * Returns all potential ban recommendations sorted by score.
 * Combines both target bans (player-specific) and priority bans (meta).
 *
 * @example
 * const bans = await scoreBanTargets({
 *   opponentPlayers: [
 *     { playerId: 'faker-uuid', playerName: 'Faker', role: 'mid' },
 *     { playerId: 'gumayusi-uuid', playerName: 'Gumayusi', role: 'adc' }
 *   ],
 *   alreadyBanned: ['Azir'],
 *   currentTurn: 1,
 *   patchVersion: '14.23'
 * })
 * // Returns [
 * //   { champion: 'Orianna', score: 0.85, type: 'target', reasoning: 'Target ban vs Faker: 47 games, 68% WR', ... },
 * //   { champion: 'Caitlyn', score: 0.78, type: 'priority', reasoning: 'Priority ban: 65% ban rate in meta', ... },
 * //   ...
 * // ]
 */
export async function scoreBanTargets(
  context: BanContext
): Promise<BanRecommendation[]> {
  const recommendations: BanRecommendation[] = []
  const alreadyBannedSet = new Set(context.alreadyBanned)

  // 1. Generate target bans for each opponent player
  for (const player of context.opponentPlayers) {
    try {
      // Get signature picks for this player
      const signaturePicks = await getPlayerSignaturePicks(player.playerId)

      // Score each signature pick as a potential ban
      for (const pick of signaturePicks) {
        // Skip if already banned
        if (alreadyBannedSet.has(pick.champion_name)) {
          continue
        }

        recommendations.push(scoreTargetBan(pick, player))
      }
    } catch (error) {
      console.error(`Error fetching signature picks for ${player.playerName}:`, error)
      // Continue with other players
    }
  }

  // 2. Generate priority bans from meta data
  try {
    const topBanned = await getTopBannedChampions(context.patchVersion, 15)

    for (const ban of topBanned) {
      // Skip if already banned
      if (alreadyBannedSet.has(ban.champion_name)) {
        continue
      }

      // Skip if already in recommendations as a target ban (target bans take precedence)
      const alreadyTargeted = recommendations.some(
        rec => rec.champion === ban.champion_name && rec.type === 'target'
      )
      if (alreadyTargeted) {
        continue
      }

      recommendations.push(scorePriorityBan(ban))
    }
  } catch (error) {
    console.error('Error fetching top banned champions:', error)
    // Continue with just target bans
  }

  // 3. Sort by score descending
  recommendations.sort((a, b) => b.score - a.score)

  return recommendations
}

/**
 * Get comprehensive ban strategy with categorized recommendations
 *
 * Separates target bans (player-specific) from priority bans (meta),
 * and provides top 3 overall recommendations.
 *
 * @example
 * const strategy = await getBanStrategy(context)
 * console.log('Target bans:', strategy.targetBans)
 * console.log('Priority bans:', strategy.priorityBans)
 * console.log('Recommended:', strategy.recommended)
 */
export async function getBanStrategy(
  context: BanContext
): Promise<{
  targetBans: BanRecommendation[]
  priorityBans: BanRecommendation[]
  recommended: BanRecommendation[]  // Top 3 overall
}> {
  const allBans = await scoreBanTargets(context)

  const targetBans = allBans.filter(ban => ban.type === 'target')
  const priorityBans = allBans.filter(ban => ban.type === 'priority')

  return {
    targetBans,
    priorityBans,
    recommended: allBans.slice(0, 3)
  }
}
