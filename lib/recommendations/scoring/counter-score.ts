/**
 * Counter/matchup score calculator
 *
 * Evaluates how well a candidate champion counters opponent picks.
 * Uses pre-computed matchup data from Phase 2.
 */

import { getMatchup } from '@/lib/queries/matchups'

export interface CounterDetails {
  opponent: string
  delta: number
  games: number
}

export interface CounterScoreResult {
  /** Normalized score 0.0-1.0 */
  score: number
  /** Individual matchup contributions */
  details: CounterDetails[]
}

/**
 * Calculate counter score for a candidate champion against opponents
 *
 * Sums matchup deltas across all opponent picks and normalizes using sigmoid.
 * Positive delta = favorable matchup, negative = unfavorable.
 *
 * @param candidate - Champion being evaluated
 * @param opponentPicks - Champions picked by opponent team
 * @param role - Role for the candidate (null if unknown)
 * @param patchVersion - Patch version for data lookup
 * @returns Normalized score and details for reasoning
 */
export async function calculateCounterScore(
  candidate: string,
  opponentPicks: string[],
  role: string | null,
  patchVersion: string
): Promise<CounterScoreResult> {
  // No opponent picks yet - neutral score
  if (opponentPicks.length === 0) {
    return {
      score: 0.5,
      details: []
    }
  }

  // Possible roles to check if role is unknown
  const possibleRoles = role
    ? [role]
    : ['top', 'jungle', 'mid', 'adc', 'support']

  const details: CounterDetails[] = []
  let totalDelta = 0
  let matchupCount = 0

  // Get matchup data for each opponent
  for (const opponent of opponentPicks) {
    // Try each possible role to find matchup data
    let bestMatchup = null
    let bestDelta = -Infinity

    for (const roleToCheck of possibleRoles) {
      const matchup = await getMatchup(
        candidate,
        opponent,
        roleToCheck,
        patchVersion
      )

      if (matchup && matchup.matchup_delta > bestDelta) {
        bestMatchup = matchup
        bestDelta = matchup.matchup_delta
      }
    }

    // If we found matchup data, include it
    if (bestMatchup) {
      details.push({
        opponent: bestMatchup.opponent,
        delta: bestMatchup.matchup_delta,
        games: bestMatchup.games
      })
      totalDelta += bestMatchup.matchup_delta
      matchupCount++
    }
  }

  // If no matchup data found, return neutral
  if (matchupCount === 0) {
    return {
      score: 0.5,
      details: []
    }
  }

  // Normalize using sigmoid
  // totalDelta * 10 maps typical ranges to sigmoid input
  const normalizedScore = 1 / (1 + Math.exp(-totalDelta * 10))

  return {
    score: normalizedScore,
    details
  }
}
