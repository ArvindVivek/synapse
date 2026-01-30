/**
 * Synergy score calculator
 *
 * Evaluates how well a candidate champion synergizes with existing team picks.
 * Uses pre-computed synergy data from Phase 2 with fallback to archetype-based synergies.
 */

import { getTeamSynergies } from '@/lib/queries/synergies'

export interface SynergyDetails {
  partner: string
  delta: number
  games: number
}

export interface SynergyScoreResult {
  /** Normalized score 0.0-1.0 */
  score: number
  /** Individual synergy contributions */
  details: SynergyDetails[]
}

/**
 * Calculate synergy score for a candidate champion with team
 *
 * Uses getTeamSynergies to get pairwise synergy deltas with each teammate.
 * Sums the deltas and normalizes using sigmoid function.
 *
 * @param candidate - Champion being evaluated
 * @param teamPicks - Champions already on the team
 * @param patchVersion - Patch version for data lookup
 * @returns Normalized score and details for reasoning
 */
export async function calculateSynergyScore(
  candidate: string,
  teamPicks: string[],
  patchVersion: string
): Promise<SynergyScoreResult> {
  // No team picks yet - neutral score
  if (teamPicks.length === 0) {
    return {
      score: 0.5,
      details: []
    }
  }

  // Get synergies with all teammates
  const { total_synergy, pairs } = await getTeamSynergies(
    teamPicks,
    candidate,
    patchVersion
  )

  // Map to details format for reasoning
  const details: SynergyDetails[] = pairs.map(pair => ({
    partner: pair.champion_a === candidate ? pair.champion_b : pair.champion_a,
    delta: pair.synergy_delta,
    games: pair.games_together
  }))

  // Normalize total synergy using sigmoid function
  // totalDelta * 10 maps typical ranges (-0.1 to +0.1) to (-1 to +1)
  // sigmoid(0) = 0.5 (neutral), sigmoid(1) ≈ 0.73, sigmoid(-1) ≈ 0.27
  const normalizedScore = 1 / (1 + Math.exp(-total_synergy * 10))

  return {
    score: normalizedScore,
    details
  }
}
