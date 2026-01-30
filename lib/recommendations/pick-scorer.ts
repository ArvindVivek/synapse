/**
 * Main pick scorer with MCDM weighted aggregation
 *
 * Combines synergy, counter, composition, side, and flex scores
 * using turn-adaptive weights to produce final recommendations.
 */

import { calculateSynergyScore } from './scoring/synergy-score'
import { calculateCounterScore } from './scoring/counter-score'
import { calculateCompositionScore } from './scoring/composition-score'
import {
  ScoringWeights,
  PickRecommendation,
  DraftContext,
  EARLY_PICK_WEIGHTS,
  MID_PICK_WEIGHTS,
  LATE_PICK_WEIGHTS,
  getTurnPhase
} from './types'

/**
 * Get scoring weights for a given draft turn
 *
 * Weights adapt based on draft phase:
 * - Early (turns 1-9): Favor flex picks (0.40 weight)
 * - Mid (turns 10-16): Balanced approach
 * - Late (turns 17-20): Favor counter-picks (0.40 weight)
 *
 * @param turn - Current turn number (1-20)
 * @returns Scoring weights for this turn
 */
export function getWeightsForTurn(turn: number): ScoringWeights {
  const phase = getTurnPhase(turn)
  switch (phase) {
    case 'early':
      return EARLY_PICK_WEIGHTS
    case 'mid':
      return MID_PICK_WEIGHTS
    case 'late':
      return LATE_PICK_WEIGHTS
  }
}

/**
 * Calculate side advantage score
 *
 * Simple heuristic based on blue side win rate advantage.
 * Most champions have slight blue side advantage in pro play.
 *
 * Future enhancement: Use champion_stats_computed.blue_side_wr
 *
 * @param champion - Champion name
 * @param userSide - Which side the user is on
 * @returns Score 0.0-1.0
 */
function calculateSideScore(champion: string, userSide: 'blue' | 'red'): number {
  // TODO: Query champion_stats_computed for actual blue_side_wr
  // For now, use simple heuristic: slight blue side advantage
  const blueSideAdvantage = 0.52

  if (userSide === 'blue') {
    // Normalize around 0.5: +0.02 becomes 0.52
    return blueSideAdvantage
  } else {
    // Red side gets inverse: 0.48
    return 1 - blueSideAdvantage
  }
}

/**
 * Calculate flex pick score
 *
 * Evaluates multi-role viability. Champions with low role confidence
 * (can be played in multiple roles) score higher.
 *
 * Future enhancement: Query champion_stats_computed.role_confidence
 *
 * @param champion - Champion name
 * @returns Score 0.0-1.0
 */
function calculateFlexScore(champion: string): number {
  // TODO: Query champion_stats_computed for actual role_confidence
  // Lower role_confidence = more flex potential
  // For now, use hardcoded flex champions

  const flexChampions = new Set([
    'Jayce', 'Swain', 'Sylas', 'Lucian', 'Gragas',
    'Yasuo', 'Yone', 'Sett', 'Pantheon', 'Pyke',
    'Karma', 'Lulu', 'Morgana', 'Twisted Fate'
  ])

  return flexChampions.has(champion) ? 0.75 : 0.50
}

/**
 * Score a single champion for the current draft context
 *
 * Applies MCDM methodology:
 * 1. Calculate each score component (0.0-1.0 normalized)
 * 2. Apply turn-adaptive weights
 * 3. Sum weighted scores
 * 4. Determine confidence based on data quality
 *
 * @param champion - Champion to score
 * @param context - Current draft state
 * @param patchVersion - Patch version for data queries
 * @returns Complete pick recommendation
 */
export async function scoreChampionForPick(
  champion: string,
  context: DraftContext,
  patchVersion: string
): Promise<PickRecommendation> {
  // Get turn-adaptive weights
  const weights = getWeightsForTurn(context.currentTurn)

  // Calculate all score components in parallel
  const [synergyResult, counterResult, compositionResult] = await Promise.all([
    calculateSynergyScore(champion, context.userPicks, patchVersion),
    calculateCounterScore(champion, context.opponentPicks, null, patchVersion),
    calculateCompositionScore(champion, context.userPicks, patchVersion)
  ])

  // Calculate simple scores
  const sideScore = calculateSideScore(champion, context.userSide)
  const flexScore = calculateFlexScore(champion)

  // Build score breakdown
  const scores = {
    synergy: synergyResult.score,
    counter: counterResult.score,
    composition: compositionResult.score,
    side: sideScore,
    flex: flexScore
  }

  // Apply weighted aggregation
  const totalScore =
    scores.synergy * weights.synergy +
    scores.counter * weights.counter +
    scores.composition * weights.composition +
    scores.side * weights.side +
    scores.flex * weights.flex

  // Determine confidence based on data quality
  // Check if we have sufficient game data for synergy and counter scores
  const synergyGames = synergyResult.details.reduce((sum, d) => sum + d.games, 0)
  const counterGames = counterResult.details.reduce((sum, d) => sum + d.games, 0)
  const totalGames = synergyGames + counterGames

  let confidence: 'high' | 'medium' | 'low'
  if (totalGames >= 20) {
    confidence = 'high'
  } else if (totalGames >= 10) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    champion,
    totalScore,
    scores,
    confidence,
    reasoning: [] // Populated by 04-04 reasoning-generator.ts
  }
}

/**
 * Score all available champions and return top recommendations
 *
 * Scores all champions in parallel and sorts by total score.
 * Returns top N recommendations for display.
 *
 * @param availableChampions - Champions still available for pick
 * @param context - Current draft state
 * @param patchVersion - Patch version for data queries
 * @param limit - Maximum number of recommendations to return (default: 5)
 * @returns Top N recommendations sorted by score descending
 */
export async function scoreAllChampions(
  availableChampions: string[],
  context: DraftContext,
  patchVersion: string,
  limit: number = 5
): Promise<PickRecommendation[]> {
  // Score all champions in parallel
  const allScores = await Promise.all(
    availableChampions.map(champion =>
      scoreChampionForPick(champion, context, patchVersion)
    )
  )

  // Sort by total score descending and take top N
  return allScores
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
}
