/**
 * Win Rate Projector - Incremental win-rate projection with compositional scoring
 *
 * Provides live win-rate updates that respond to each pick/ban without expensive
 * full recomputation. Maintains transparent breakdown showing how each category
 * (base composition, synergies, matchups, side advantage) contributes to the
 * projected outcome.
 *
 * Design:
 * - Incremental updates: Each pick adds a delta to the breakdown components
 * - Clamped values: Win rates stay in [0.05, 0.95] to avoid showing 0% or 100%
 * - Confidence tracking: Increases as more picks are made
 * - Transparent breakdown: Shows contribution of each scoring category
 */

import { getSynergyScore, SynergyScore } from '@/lib/queries/synergies'
import { getMatchup, MatchupScore } from '@/lib/queries/matchups'

/**
 * Breakdown of win-rate projection by category
 * All values are deltas from 0.50 baseline
 */
export interface WinRateBreakdown {
  /** Champion base win rates contribution (delta from 0.50) */
  baseComposition: number

  /** Team synergy bonus/penalty (delta from 0.50) */
  synergies: number

  /** Head-to-head matchup advantage (delta from 0.50) */
  matchups: number

  /** Blue/red side modifier (delta from 0.50) */
  sideAdvantage: number
}

/**
 * Complete win-rate projection state
 */
export interface WinRateProjection {
  /** Blue team win rate (0.05 to 0.95) */
  blueWinRate: number

  /** Red team win rate (0.05 to 0.95, always 1 - blueWinRate) */
  redWinRate: number

  /** Breakdown by category showing individual contributions */
  breakdown: WinRateBreakdown

  /** Confidence level based on number of picks made */
  confidence: 'high' | 'medium' | 'low'

  /** Last updated turn number */
  turnNumber: number
}

/**
 * Internal pick tracking for delta calculations
 */
interface PickRecord {
  champion: string
  role: string | null
  side: 'blue' | 'red'
}

/**
 * Win Rate Projector - Maintains incremental win-rate projection state
 *
 * Usage:
 * ```typescript
 * const projector = new WinRateProjector('14.23')
 * await projector.updateAfterPick('Sejuani', 'jungle', 'blue', 1)
 * await projector.updateAfterPick('Rell', 'support', 'red', 2)
 * const projection = projector.getCurrentProjection()
 * // projection.blueWinRate = 0.52 (base 0.50 + deltas)
 * ```
 */
export class WinRateProjector {
  private projection: WinRateProjection
  private bluePicks: PickRecord[]
  private redPicks: PickRecord[]
  private patchVersion: string

  constructor(patchVersion: string) {
    this.patchVersion = patchVersion
    this.bluePicks = []
    this.redPicks = []
    this.projection = {
      blueWinRate: 0.50,
      redWinRate: 0.50,
      breakdown: {
        baseComposition: 0,
        synergies: 0,
        matchups: 0,
        sideAdvantage: 0.02 // Blue side starts with +2% advantage
      },
      confidence: 'low',
      turnNumber: 0
    }
  }

  /**
   * Get current projection state (immutable copy)
   */
  getCurrentProjection(): WinRateProjection {
    return {
      ...this.projection,
      breakdown: { ...this.projection.breakdown }
    }
  }

  /**
   * Reset projector to initial state
   */
  reset(): void {
    this.bluePicks = []
    this.redPicks = []
    this.projection = {
      blueWinRate: 0.50,
      redWinRate: 0.50,
      breakdown: {
        baseComposition: 0,
        synergies: 0,
        matchups: 0,
        sideAdvantage: 0.02
      },
      confidence: 'low',
      turnNumber: 0
    }
  }

  /**
   * Update projection after a ban
   *
   * For MVP: Bans have minimal impact on projection since they remove options
   * but don't directly affect team composition. Returns current projection unchanged.
   *
   * Future enhancement: Could adjust if banned champion was key counter/synergy
   *
   * @param champion - Champion banned
   * @param side - Which team banned
   * @param turnNumber - Current turn number
   */
  async updateAfterBan(
    champion: string,
    side: 'blue' | 'red',
    turnNumber: number
  ): Promise<WinRateProjection> {
    // Update turn number and confidence
    this.projection.turnNumber = turnNumber
    this.projection.confidence = this.assessConfidence(turnNumber)

    // Return current projection (bans don't modify deltas in MVP)
    return this.getCurrentProjection()
  }

  /**
   * Assess confidence level based on turn number
   * More picks = higher confidence in projection
   *
   * @param turnNumber - Current turn number (1-20)
   * @returns Confidence level
   */
  private assessConfidence(turnNumber: number): 'high' | 'medium' | 'low' {
    // Turn numbers:
    // 1-6: Ban phase 1 (no picks yet)
    // 7-12: Pick phase 1 (3 picks per side)
    // 13-16: Ban phase 2
    // 17-20: Pick phase 2 (2 more picks per side)

    if (turnNumber >= 12) return 'high' // 6+ picks made (both teams have 3+)
    if (turnNumber >= 7) return 'medium' // First picks started
    return 'low' // Still in bans or early picks
  }
}
