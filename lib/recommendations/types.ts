/**
 * Type definitions for the recommendation engine
 *
 * Defines scoring weights, score breakdowns, and recommendation types
 * for the multi-criteria decision-making (MCDM) pick scoring system.
 */

/**
 * Scoring weights for MCDM aggregation
 * All weights must sum to 1.0
 */
export interface ScoringWeights {
  /** Team synergy contribution (0.0-1.0) */
  synergy: number
  /** Matchup advantage (0.0-1.0) */
  counter: number
  /** Team composition balance (0.0-1.0) */
  composition: number
  /** Blue/red side advantage (0.0-1.0) */
  side: number
  /** Multi-role flexibility potential (0.0-1.0) */
  flex: number
}

/**
 * Score breakdown showing individual component scores
 * Each component normalized to 0.0-1.0 range
 */
export interface ScoreBreakdown {
  /** Synergy score with existing team picks */
  synergy: number
  /** Counter-pick advantage against opponents */
  counter: number
  /** Composition balance contribution */
  composition: number
  /** Side-specific advantage */
  side: number
  /** Flex potential (multi-role viability) */
  flex: number
}

/**
 * Complete pick recommendation with scoring and reasoning
 */
export interface PickRecommendation {
  /** Champion name */
  champion: string
  /** Weighted total score (0.0-1.0) */
  totalScore: number
  /** Individual component scores */
  scores: ScoreBreakdown
  /** Confidence level based on data quality */
  confidence: 'high' | 'medium' | 'low'
  /** Human-readable explanations (populated by 04-04 reasoning generator) */
  reasoning: string[]
}

/**
 * Draft context for scoring calculations
 */
export interface DraftContext {
  /** Current turn number (1-20) */
  currentTurn: number
  /** Current draft phase */
  phase: 'ban1' | 'pick1' | 'ban2' | 'pick2'
  /** Which side the user is on */
  userSide: 'blue' | 'red'
  /** User's champion picks */
  userPicks: string[]
  /** User's bans */
  userBans: string[]
  /** Opponent's champion picks */
  opponentPicks: string[]
  /** Opponent's bans */
  opponentBans: string[]
  /** Champions still available for pick/ban */
  availableChampions: Set<string>
}

/**
 * Turn phase classification for weight adaptation
 */
export type TurnPhase = 'early' | 'mid' | 'late'

/**
 * Early pick weights (turns 1-3)
 * Favors flex picks and composition building
 */
export const EARLY_PICK_WEIGHTS: ScoringWeights = {
  synergy: 0.20,
  counter: 0.10,
  composition: 0.20,
  side: 0.10,
  flex: 0.40
}

/**
 * Mid pick weights (turns 4-7)
 * Balanced between all factors
 */
export const MID_PICK_WEIGHTS: ScoringWeights = {
  synergy: 0.25,
  counter: 0.25,
  composition: 0.25,
  side: 0.10,
  flex: 0.15
}

/**
 * Late pick weights (turns 8-10)
 * Favors counter-picking and synergy completion
 */
export const LATE_PICK_WEIGHTS: ScoringWeights = {
  synergy: 0.25,
  counter: 0.40,
  composition: 0.20,
  side: 0.10,
  flex: 0.05
}

/**
 * Classify draft turn into early/mid/late phase
 * Only counts pick turns (excludes ban turns)
 *
 * Pick turns are:
 * - Ban phase 1 (turns 1-6): bans only
 * - Pick phase 1 (turns 7-12): 6 pick turns total
 *   - Turn 7-9: early (picks 1-3)
 *   - Turn 10-12: mid (picks 4-6)
 * - Ban phase 2 (turns 13-16): bans only
 * - Pick phase 2 (turns 17-20): 4 pick turns total
 *   - Turn 17-20: late (picks 7-10)
 *
 * @param turn - Current turn number (1-20)
 * @returns Turn phase classification
 */
export function getTurnPhase(turn: number): TurnPhase {
  // Map turn to pick number (skip ban phases)
  // Ban phase 1: turns 1-6
  // Pick phase 1: turns 7-12 (picks 1-6)
  // Ban phase 2: turns 13-16
  // Pick phase 2: turns 17-20 (picks 7-10)

  if (turn <= 6) {
    // Ban phase 1 - treat as early for weight purposes
    return 'early'
  } else if (turn <= 9) {
    // Pick phase 1, turns 7-9 (picks 1-3)
    return 'early'
  } else if (turn <= 16) {
    // Pick phase 1 turns 10-12 (picks 4-6) + ban phase 2
    return 'mid'
  } else {
    // Pick phase 2, turns 17-20 (picks 7-10)
    return 'late'
  }
}
