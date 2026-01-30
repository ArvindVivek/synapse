/**
 * Bayesian player pick prediction
 *
 * Predicts what champion a specific player is likely to pick based on:
 * - Individual champion pool (games played, win rate, comfort level)
 * - Recent performance (recency weighting)
 * - Team composition needs
 * - Draft context (banned/picked champions)
 *
 * Uses Bayesian approach with multiple likelihood factors to produce
 * probability distribution over possible picks. Caps individual probabilities
 * at 0.50 to avoid overconfidence.
 */

import {
  getPlayerChampionPool,
  PlayerChampion
} from '@/lib/queries/player-pools'
import {
  assessTeamNeeds,
  championFillsTeamNeed
} from './champion-properties'

export interface PlayerPickPrediction {
  champion: string
  probability: number    // 0.0-1.0, normalized, never >0.50
  reasoning: string      // "Signature pick: 47 games, 68% WR"
  comfortLevel: 'signature' | 'comfort' | 'occasional' | 'rare'
  gamesPlayed: number
  winRate: number
}

export interface PredictionContext {
  playerId: string
  playerName: string
  role: string
  bannedChampions: string[]
  pickedChampions: string[]
  teamNeeds: string[]    // ['ap_damage', 'engage', etc.]
}

/**
 * Calculate raw probability for a champion pick using Bayesian approach
 *
 * Prior: Base rate from games played
 * Likelihoods:
 * 1. Comfort level (signature > comfort > occasional > rare)
 * 2. Recency (played in last 30 days)
 * 3. Team needs (fills missing team comp needs)
 * 4. Win rate (higher WR = more likely)
 */
function calculateRawProbability(
  entry: PlayerChampion,
  teamNeeds: string[]
): number {
  // Prior: base rate from games played (more games = higher prior)
  const gamesWeight = Math.min(entry.games_played / 50, 1.0) * 0.40

  // Likelihood 1: Comfort level multiplier
  const comfortMultiplier = {
    signature: 3.0,
    comfort: 1.5,
    occasional: 1.0,
    rare: 0.5
  }[entry.comfort_level]

  // Likelihood 2: Recency (played in last 30 days = boost)
  const recencyMultiplier = entry.days_since_played < 30 ? 1.5 : 1.0

  // Likelihood 3: Team needs (if champion fills need, boost)
  const fillsNeed = championFillsTeamNeed(entry.champion_name, teamNeeds)
  const needsMultiplier = fillsNeed ? 1.3 : 1.0

  // Likelihood 4: Win rate (higher WR = more likely to pick)
  const winRateMultiplier = entry.smoothed_win_rate / 0.50

  return gamesWeight * comfortMultiplier * recencyMultiplier *
         needsMultiplier * winRateMultiplier
}

/**
 * Generate human-readable reasoning for why this champion is predicted
 */
function generateReasoning(
  entry: PlayerChampion,
  teamNeeds: string[],
  fillsNeed: boolean
): string {
  const winRatePercent = Math.round(entry.smoothed_win_rate * 100)

  if (entry.comfort_level === 'signature') {
    if (fillsNeed) {
      return `Signature pick (${entry.games_played} games, ${winRatePercent}% WR) that fills team need`
    }
    return `Signature pick: ${entry.games_played} games, ${winRatePercent}% WR`
  }

  if (entry.comfort_level === 'comfort') {
    if (entry.days_since_played < 30) {
      return `Comfort pick with recent success (${entry.games_played} games)`
    }
    return `Comfort pick: ${entry.games_played} games, ${winRatePercent}% WR`
  }

  if (fillsNeed) {
    return `Fills team's ${teamNeeds.join('/')} need`
  }

  return `Occasional pick: ${entry.games_played} games, ${winRatePercent}% WR`
}

/**
 * Predict what champion a specific player is likely to pick
 *
 * Returns top 5 predictions with probability distribution.
 * Individual probabilities capped at 0.50 to avoid overconfidence.
 * Probabilities normalized to sum to 1.0.
 *
 * @example
 * const predictions = await predictOpponentPick({
 *   playerId: 'faker-uuid',
 *   playerName: 'Faker',
 *   role: 'mid',
 *   bannedChampions: ['Azir', 'LeBlanc'],
 *   pickedChampions: ['Jinx', 'Thresh'],
 *   teamNeeds: ['ap_damage', 'engage']
 * })
 * // Returns [
 * //   { champion: 'Orianna', probability: 0.35, reasoning: 'Signature pick: 47 games, 68% WR', ... },
 * //   { champion: 'Syndra', probability: 0.25, reasoning: 'Comfort pick with recent success', ... },
 * //   ...
 * // ]
 */
export async function predictOpponentPick(
  context: PredictionContext
): Promise<PlayerPickPrediction[]> {
  // 1. Fetch player's champion pool for their role
  const championPool = await getPlayerChampionPool(context.playerId, context.role)

  if (championPool.length === 0) {
    return []
  }

  // 2. Filter out banned and already-picked champions
  const allPickedBanned = new Set([
    ...context.bannedChampions,
    ...context.pickedChampions
  ])

  const availableChampions = championPool.filter(
    entry => !allPickedBanned.has(entry.champion_name)
  )

  if (availableChampions.length === 0) {
    return []
  }

  // 3. Calculate raw probabilities for each available champion
  const rawScores = availableChampions.map(entry => ({
    entry,
    rawProbability: calculateRawProbability(entry, context.teamNeeds)
  }))

  // 4. Normalize probabilities to sum to 1.0
  const totalRaw = rawScores.reduce((sum, { rawProbability }) => sum + rawProbability, 0)

  const normalized = rawScores.map(({ entry, rawProbability }) => ({
    entry,
    probability: totalRaw > 0 ? rawProbability / totalRaw : 0
  }))

  // 5. Cap individual probabilities at 0.50 (avoid overconfidence)
  let needsRenormalization = false
  const capped = normalized.map(({ entry, probability }) => {
    if (probability > 0.50) {
      needsRenormalization = true
      return { entry, probability: 0.50 }
    }
    return { entry, probability }
  })

  // If we capped any probabilities, renormalize again
  let finalProbabilities = capped
  if (needsRenormalization) {
    const cappedTotal = capped.reduce((sum, { probability }) => sum + probability, 0)
    finalProbabilities = capped.map(({ entry, probability }) => ({
      entry,
      probability: cappedTotal > 0 ? probability / cappedTotal : 0
    }))
  }

  // 6. Sort by probability descending
  finalProbabilities.sort((a, b) => b.probability - a.probability)

  // 7. Return top 5 predictions with reasoning
  return finalProbabilities.slice(0, 5).map(({ entry, probability }) => {
    const fillsNeed = championFillsTeamNeed(entry.champion_name, context.teamNeeds)

    return {
      champion: entry.champion_name,
      probability,
      reasoning: generateReasoning(entry, context.teamNeeds, fillsNeed),
      comfortLevel: entry.comfort_level,
      gamesPlayed: entry.games_played,
      winRate: entry.smoothed_win_rate
    }
  })
}
