/**
 * Counter/matchup score calculator
 *
 * Evaluates how well a candidate champion counters opponent picks.
 * Uses pre-computed matchup data from Phase 2, with fallback to heuristics.
 */

import { getMatchup } from '@/lib/queries/matchups'
import { DAMAGE_TYPES, IS_FRONTLINE, HAS_ENGAGE } from '../champion-properties'

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
 * Counter matchups - champions that counter others
 * Used as fallback when database unavailable
 */
const COUNTER_MATCHUPS: Record<string, string[]> = {
  // Mid counters
  'Sylas': ['Orianna', 'Syndra', 'Azir', 'Viktor'],
  'Syndra': ['Ahri', 'LeBlanc', 'Viktor'],
  'Azir': ['Viktor', 'Orianna', 'Corki'],
  'LeBlanc': ['Viktor', 'Azir', 'Orianna'],
  'Ahri': ['Syndra', 'Viktor'],
  'Viktor': ['Zoe', 'Ahri'],
  // Top counters
  'Gnar': ['Aatrox', 'Renekton', 'Jax'],
  'Fiora': ['Jax', 'Camille', 'Aatrox', 'K\'Sante'],
  'K\'Sante': ['Gnar', 'Jax', 'Aatrox'],
  'Jax': ['Gnar', 'Renekton'],
  'Aatrox': ['Fiora', 'Gnar'],
  'Camille': ['Jax', 'Renekton'],
  'Renekton': ['Camille', 'Aatrox'],
  // Jungle counters
  'Lee Sin': ['Sejuani', 'Maokai'],
  'Elise': ['Viego', 'Lee Sin'],
  'Viego': ['Elise', 'Nidalee'],
  'Sejuani': ['Nidalee', 'Elise'],
  // ADC counters
  'Caitlyn': ['Jinx', 'Aphelios', 'Kai\'Sa'],
  'Draven': ['Ezreal', 'Jhin'],
  'Lucian': ['Aphelios', 'Jinx'],
  'Ezreal': ['Draven', 'Lucian'],
  'Kai\'Sa': ['Caitlyn'],
  // Support counters
  'Morgana': ['Thresh', 'Leona', 'Nautilus'],
  'Lulu': ['Leona', 'Nautilus'],
  'Thresh': ['Lulu', 'Janna'],
}

/**
 * Calculate heuristic matchup advantage
 * Returns values 0.04-0.12 for meaningful score variations
 */
function getHeuristicMatchup(candidate: string, opponent: string): number {
  let delta = 0

  // Check explicit counter matchups (larger values)
  if (COUNTER_MATCHUPS[candidate]?.includes(opponent)) {
    delta += 0.08 // +8% for countering them
  }
  if (COUNTER_MATCHUPS[opponent]?.includes(candidate)) {
    delta -= 0.08 // -8% for being countered
  }

  // Damage type advantages
  const ourDamage = DAMAGE_TYPES[candidate]

  // Mixed damage is better against tanks
  if (IS_FRONTLINE.has(opponent) && ourDamage === 'mixed') {
    delta += 0.05 // +5% mixed damage vs tanks
  }

  // Frontline advantage against squishy enemies
  if (IS_FRONTLINE.has(candidate) && !IS_FRONTLINE.has(opponent)) {
    delta += 0.03 // +3% tank vs squishy
  }

  // Engage champions are good against immobile carries
  if (HAS_ENGAGE.has(candidate) && !HAS_ENGAGE.has(opponent) && !IS_FRONTLINE.has(opponent)) {
    delta += 0.04 // +4% engage vs immobile
  }

  // AP damage advantage vs single-type comps
  if (ourDamage === 'ap' && !IS_FRONTLINE.has(opponent)) {
    delta += 0.02 // +2% magic damage
  }

  return delta
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
  let hadDatabaseData = false

  // Get matchup data for each opponent from database
  for (const opponent of opponentPicks) {
    let bestMatchup = null
    let bestDelta = -Infinity

    for (const roleToCheck of possibleRoles) {
      try {
        const matchup = await getMatchup(candidate, opponent, roleToCheck, patchVersion)
        if (matchup && matchup.games > 0 && matchup.matchup_delta > bestDelta) {
          bestMatchup = matchup
          bestDelta = matchup.matchup_delta
          hadDatabaseData = true
        }
      } catch {
        // Database unavailable
      }
    }

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

  // Fallback to heuristic matchups if no database data
  if (!hadDatabaseData || matchupCount === 0) {
    const heuristicDetails: CounterDetails[] = opponentPicks.map(opponent => {
      const delta = getHeuristicMatchup(candidate, opponent)
      return {
        opponent,
        delta,
        games: 100 // Indicate heuristic data
      }
    })

    totalDelta = heuristicDetails.reduce((sum, d) => sum + d.delta, 0)
    details.length = 0
    details.push(...heuristicDetails)
    matchupCount = heuristicDetails.length
  }

  // Normalize using sigmoid
  const multiplier = hadDatabaseData ? 10 : 8
  const normalizedScore = 1 / (1 + Math.exp(-totalDelta * multiplier))

  return {
    score: normalizedScore,
    details
  }
}
