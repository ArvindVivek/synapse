/**
 * Bayesian smoothing functions for champion statistics
 *
 * Purpose: Prevent overfitting to small sample sizes by blending observed data
 * with a global prior (e.g., 50% win rate with weight of 10 games).
 *
 * Example: Raw 100% win rate from 2 games → Smoothed 58% (more realistic)
 */

/**
 * Apply Bayesian smoothing to win rate
 *
 * Formula: (wins + prior_wins) / (games + prior_weight)
 *
 * @param wins - Number of wins observed
 * @param games - Total games played
 * @param priorMean - Expected win rate (default: 0.50 = 50%)
 * @param priorWeight - Equivalent number of prior observations (default: 10)
 * @returns Smoothed win rate between 0 and 1
 *
 * @example
 * // Raw: 2 wins in 2 games = 100% win rate
 * // Smoothed: (2+5)/(2+10) = 58% win rate (more realistic)
 * bayesianSmoothedWinRate(2, 2) // 0.583
 */
export function bayesianSmoothedWinRate(
  wins: number,
  games: number,
  priorMean: number = 0.50,
  priorWeight: number = 10
): number {
  // Handle edge case: no games played
  if (games === 0) {
    return priorMean
  }

  const priorWins = priorMean * priorWeight
  return (wins + priorWins) / (games + priorWeight)
}

/**
 * Apply Bayesian smoothing to pick rate
 *
 * @param picks - Number of times champion was picked
 * @param totalGames - Total games in context (patch/role/region)
 * @param priorRate - Expected pick rate (global average)
 * @param priorWeight - Weight of prior (default: 10)
 * @returns Smoothed pick rate between 0 and 1
 *
 * @example
 * // Champion picked 5 times in 100 games, global pick rate is 8%
 * smoothedPickRate(5, 100, 0.08) // ~0.075 (slightly below global average)
 */
export function smoothedPickRate(
  picks: number,
  totalGames: number,
  priorRate: number,
  priorWeight: number = 10
): number {
  // Handle edge case: no games in context
  if (totalGames === 0) {
    return priorRate
  }

  const priorPicks = priorRate * priorWeight
  return (picks + priorPicks) / (totalGames + priorWeight)
}
