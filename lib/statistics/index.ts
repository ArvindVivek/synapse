/**
 * Statistics library for Synapse analytics
 *
 * Exports:
 * - Bayesian smoothing (prevent small-sample overfitting)
 * - Confidence scoring (Wilson intervals, confidence levels)
 * - Recency weighting (exponential decay for time-aware stats)
 */

export { bayesianSmoothedWinRate, smoothedPickRate } from './bayesian-smoothing.js'
export { getConfidenceLevel, wilsonConfidenceInterval } from './confidence-scoring.js'
export type { ConfidenceLevel } from './confidence-scoring.js'
export { calculateRecencyWeight, weightedWinRate } from './recency-weighting.js'
