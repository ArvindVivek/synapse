/**
 * Flex pick detection and scoring
 *
 * Identifies champions with multi-role viability. Flex picks are valuable
 * in early draft as they hide role intentions and force opponent to guess.
 *
 * Uses role_confidence scores from database when available,
 * falls back to hardcoded pro play flex picks.
 */

import { createClient } from '@/lib/supabase/server'

export interface FlexPickInfo {
  champion: string
  viableRoles: string[]
  primaryRole: string
  flexibilityScore: number   // 0.0-1.0
  isTrueFlex: boolean        // Played 3+ games in 2+ roles
  roleConfidences: Record<string, number>  // role -> confidence
}

/**
 * Known flex picks from pro play - used as fallback when database unavailable
 */
const PRO_FLEX_PICKS: Record<string, { roles: string[], score: number }> = {
  // Mid/Top flex
  'Jayce': { roles: ['top', 'mid'], score: 0.85 },
  'Akali': { roles: ['mid', 'top'], score: 0.80 },
  'Sylas': { roles: ['mid', 'top', 'jungle'], score: 0.90 },
  'Rumble': { roles: ['top', 'jungle', 'mid'], score: 0.85 },
  'Kennen': { roles: ['top', 'mid', 'adc'], score: 0.75 },
  'Gragas': { roles: ['jungle', 'top', 'support'], score: 0.90 },
  // Jungle/Support flex
  'Maokai': { roles: ['jungle', 'support', 'top'], score: 0.85 },
  'Sejuani': { roles: ['jungle', 'top'], score: 0.70 },
  'Poppy': { roles: ['jungle', 'support', 'top'], score: 0.80 },
  // Support/Mid flex
  'Karma': { roles: ['support', 'mid', 'top'], score: 0.80 },
  'Morgana': { roles: ['support', 'mid', 'jungle'], score: 0.75 },
  'Lux': { roles: ['support', 'mid'], score: 0.70 },
  // ADC flex
  'Senna': { roles: ['adc', 'support'], score: 0.85 },
  'Seraphine': { roles: ['support', 'mid', 'adc'], score: 0.80 },
  // Multi-role flex
  'Viego': { roles: ['jungle', 'mid', 'top'], score: 0.75 },
  'Pantheon': { roles: ['support', 'mid', 'top', 'jungle'], score: 0.95 },
  'Nautilus': { roles: ['support', 'jungle', 'top'], score: 0.70 },
  'Lee Sin': { roles: ['jungle', 'mid'], score: 0.65 },
  'Nidalee': { roles: ['jungle', 'mid'], score: 0.65 },
  'Taliyah': { roles: ['mid', 'jungle', 'support'], score: 0.80 },
  'Twisted Fate': { roles: ['mid', 'adc'], score: 0.70 },
  // Top/Mid/Jungle flex
  'Camille': { roles: ['top', 'jungle'], score: 0.70 },
  'Gnar': { roles: ['top'], score: 0.50 }, // Single role example for filtering
}

/**
 * Detect flex picks from available champions
 *
 * Queries champion_stats_computed for role distribution data.
 * Falls back to hardcoded pro play flex picks if database unavailable.
 *
 * @param availableChampions - Champions still available for pick
 * @param patchVersion - Patch version for data queries
 * @returns Array of flex pick info for viable flex champions
 */
export async function detectFlexPicks(
  availableChampions: string[],
  patchVersion: string
): Promise<FlexPickInfo[]> {
  let hadDatabaseData = false
  const flexPicks: FlexPickInfo[] = []

  try {
    const supabase = await createClient()

    // Query champion stats for all available champions
    const { data: championStats, error } = await supabase
      .from('champion_stats_computed')
      .select('champion_name, role, games, role_confidence')
      .in('champion_name', availableChampions)
      .eq('patch_version', patchVersion)
      .gte('games', 3)
      .order('champion_name')
      .order('games', { ascending: false })

    if (!error && championStats && championStats.length > 0) {
      hadDatabaseData = true

      // Group by champion
      const championRoles = new Map<string, Array<{
        role: string
        games: number
        confidence: number
      }>>()

      for (const stat of championStats) {
        if (!championRoles.has(stat.champion_name)) {
          championRoles.set(stat.champion_name, [])
        }
        championRoles.get(stat.champion_name)!.push({
          role: stat.role,
          games: stat.games,
          confidence: parseFloat(stat.role_confidence.toString())
        })
      }

      // Calculate flex potential for each champion
      for (const [champion, roleData] of championRoles.entries()) {
        if (roleData.length >= 2) {
          const flexInfo = scoreFlexPotential(champion, roleData)
          if (flexInfo.isTrueFlex) {
            flexPicks.push(flexInfo)
          }
        }
      }
    }
  } catch {
    // Database unavailable, will use fallback
  }

  // Fallback to hardcoded flex picks if no database data
  if (!hadDatabaseData || flexPicks.length === 0) {
    for (const champion of availableChampions) {
      const flexData = PRO_FLEX_PICKS[champion]
      if (flexData && flexData.roles.length >= 2) {
        const roleConfidences: Record<string, number> = {}
        flexData.roles.forEach((role, idx) => {
          roleConfidences[role] = 0.7 - idx * 0.1 // Primary role has higher confidence
        })

        flexPicks.push({
          champion,
          viableRoles: flexData.roles,
          primaryRole: flexData.roles[0],
          flexibilityScore: flexData.score,
          isTrueFlex: true,
          roleConfidences
        })
      }
    }
  }

  return flexPicks.sort((a, b) => b.flexibilityScore - a.flexibilityScore)
}

/**
 * Score flex potential for a single champion
 *
 * Calculates flexibility score based on:
 * - Number of viable roles (2+ roles with 3+ games)
 * - Game distribution across roles (balanced = higher score)
 *
 * @param champion - Champion name
 * @param roleData - Array of role stats (role, games, confidence)
 * @returns FlexPickInfo with viability assessment
 */
export function scoreFlexPotential(
  champion: string,
  roleData: Array<{ role: string; games: number; confidence: number }>
): FlexPickInfo {
  // Get roles with meaningful games (3+)
  const viableRoles = roleData
    .filter(r => r.games >= 3)
    .sort((a, b) => b.games - a.games)
    .map(r => r.role)

  // Calculate flexibility score
  // Higher score for: more roles, balanced games across roles
  const roleCount = viableRoles.length

  // Base score from role count (max at 3+ roles)
  let flexibilityScore = Math.min(roleCount / 3, 1.0)

  // Bonus for balanced distribution
  // If top 2 roles have similar games, it's more flexible
  if (roleData.length >= 2) {
    const topTwoGames = roleData.slice(0, 2).map(r => r.games)
    const ratio = Math.min(...topTwoGames) / Math.max(...topTwoGames)
    // ratio close to 1.0 = balanced, close to 0 = one-trick in one role
    flexibilityScore *= (0.7 + 0.3 * ratio) // Boost if balanced
  }

  // Build role confidences map
  const roleConfidences: Record<string, number> = {}
  for (const role of roleData) {
    roleConfidences[role.role] = role.confidence
  }

  return {
    champion,
    viableRoles,
    primaryRole: viableRoles[0] || 'unknown',
    flexibilityScore: Math.min(flexibilityScore, 1.0),
    isTrueFlex: roleCount >= 2,
    roleConfidences
  }
}

/**
 * Get flex pick recommendations for early draft
 *
 * In early draft (turns 1-3), flex picks hide role intentions
 * and force opponent to guess, providing strategic advantage.
 *
 * @param availableChampions - Champions still available for pick
 * @param patchVersion - Patch version for data queries
 * @param limit - Maximum number of recommendations (default: 5)
 * @returns Top flex picks sorted by flexibility score
 */
export async function getFlexPicksForEarlyDraft(
  availableChampions: string[],
  patchVersion: string,
  limit: number = 5
): Promise<FlexPickInfo[]> {
  const flexPicks = await detectFlexPicks(availableChampions, patchVersion)

  return flexPicks
    .filter(fp => fp.isTrueFlex)
    .sort((a, b) => b.flexibilityScore - a.flexibilityScore)
    .slice(0, limit)
}
