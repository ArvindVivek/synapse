/**
 * Recency weighting functions for time-decayed statistics
 *
 * Purpose: Weight recent games higher than old games to adapt to meta shifts
 * caused by champion buffs/nerfs and patch changes.
 *
 * Uses exponential decay with configurable half-life.
 */

/**
 * Calculate recency weight using exponential decay
 *
 * Formula: weight = exp(-days_ago / half_life)
 *
 * Half-life interpretation:
 * - 14 days: Weight halves every 2 weeks (one patch cycle)
 * - 30 days: Weight halves every month (conservative)
 * - 60 days: Weight halves every 2 months (slow decay)
 *
 * @param gameDate - When the game was played
 * @param halfLifeDays - Number of days for weight to decay to 50% (default: 30)
 * @returns Weight between 0 and 1 (1 = today, 0.5 = halfLife days ago)
 *
 * @example
 * // Game played 30 days ago with 30-day half-life
 * calculateRecencyWeight(new Date('2025-12-29'), 30) // ~0.5 (50% weight)
 *
 * // Game played today
 * calculateRecencyWeight(new Date(), 30) // ~1.0 (100% weight)
 */
export function calculateRecencyWeight(
  gameDate: Date,
  halfLifeDays: number = 30
): number {
  const daysAgo = (Date.now() - gameDate.getTime()) / (1000 * 60 * 60 * 24)

  // Exponential decay formula
  return Math.exp(-daysAgo / halfLifeDays)
}

interface GameRecord {
  won: boolean
  date: Date
}

/**
 * Calculate weighted win rate with recency bias
 *
 * Applies exponential decay weights to each game, giving more importance
 * to recent matches than old ones.
 *
 * @param games - Array of game records with win/loss and date
 * @param halfLifeDays - Half-life for decay (default: 30)
 * @returns Weighted win rate between 0 and 1
 *
 * @example
 * const games = [
 *   { won: true, date: new Date('2026-01-20') },   // Recent, high weight
 *   { won: false, date: new Date('2025-12-15') },  // 45 days ago, lower weight
 *   { won: true, date: new Date('2025-11-01') }    // 89 days ago, very low weight
 * ]
 * weightedWinRate(games) // ~0.7 (recent win dominates)
 */
export function weightedWinRate(
  games: GameRecord[],
  halfLifeDays: number = 30
): number {
  if (games.length === 0) {
    return 0.50  // No data, assume neutral
  }

  let weightedWins = 0
  let totalWeight = 0

  for (const game of games) {
    const weight = calculateRecencyWeight(game.date, halfLifeDays)
    weightedWins += (game.won ? 1 : 0) * weight
    totalWeight += weight
  }

  // Handle edge case: all games have zero weight (shouldn't happen unless halfLife is very small)
  if (totalWeight === 0) {
    return 0.50
  }

  return weightedWins / totalWeight
}
