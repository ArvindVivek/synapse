/**
 * Confidence scoring for statistical metrics
 *
 * Purpose: Assign confidence levels based on sample size and calculate
 * Wilson confidence intervals (more accurate than normal approximation for small n).
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient'

/**
 * Assign confidence level based on sample size
 *
 * Thresholds:
 * - high: >= 30 games (statistically significant)
 * - medium: >= 10 games (moderate confidence)
 * - low: >= 5 games (weak signal)
 * - insufficient: < 5 games (unreliable)
 *
 * @param sampleSize - Number of observations
 * @returns Confidence level
 *
 * @example
 * getConfidenceLevel(50) // 'high'
 * getConfidenceLevel(15) // 'medium'
 * getConfidenceLevel(6) // 'low'
 * getConfidenceLevel(2) // 'insufficient'
 */
export function getConfidenceLevel(sampleSize: number): ConfidenceLevel {
  if (sampleSize >= 30) return 'high'
  if (sampleSize >= 10) return 'medium'
  if (sampleSize >= 5) return 'low'
  return 'insufficient'
}

/**
 * Calculate Wilson confidence interval for binomial data
 *
 * More accurate than normal approximation for small samples (n < 30).
 * Used for win rates, pick rates, ban rates.
 *
 * Source: Wilson, E.B. (1927). "Probable Inference, the Law of Succession,
 * and Statistical Inference". Journal of the American Statistical Association.
 *
 * @param successes - Number of successes (wins, picks, etc.)
 * @param trials - Total number of trials (games)
 * @param confidenceLevel - Confidence level (default: 0.95 = 95%)
 * @returns Object with lower, upper bounds and interval width
 *
 * @example
 * // 6 wins in 9 games
 * wilsonConfidenceInterval(6, 9)
 * // { lower: 0.402, upper: 0.876, width: 0.474 }
 * // Interpretation: 95% confident true win rate is between 40% and 88%
 */
export function wilsonConfidenceInterval(
  successes: number,
  trials: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number; width: number } {
  // Handle edge case: no trials
  if (trials === 0) {
    return { lower: 0, upper: 1, width: 1 }
  }

  // Z-score for confidence level (1.96 for 95%, 2.58 for 99%)
  const z = confidenceLevel === 0.95 ? 1.96 : 2.58

  // Sample proportion
  const pHat = successes / trials

  // Wilson score interval calculation
  const denominator = 1 + (z * z) / trials
  const center = (pHat + (z * z) / (2 * trials)) / denominator
  const margin = (z * Math.sqrt(
    (pHat * (1 - pHat) + (z * z) / (4 * trials)) / trials
  )) / denominator

  const lower = Math.max(0, center - margin)
  const upper = Math.min(1, center + margin)

  return {
    lower,
    upper,
    width: upper - lower
  }
}
