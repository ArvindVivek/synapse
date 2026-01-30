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
import { createClient } from '@/lib/supabase/server'

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
   * Update projection after a pick
   *
   * Calculates incremental deltas for each breakdown component and applies them:
   * 1. Base composition: Champion's win rate vs 50% baseline
   * 2. Synergies: Pairwise synergy with existing teammates
   * 3. Matchups: Head-to-head advantage/disadvantage vs enemies
   * 4. Side advantage: Already factored in initial state (+2% blue)
   *
   * @param champion - Champion picked
   * @param role - Role assignment (null if not yet assigned)
   * @param side - Which team picked
   * @param turnNumber - Current turn number
   * @returns Updated projection
   */
  async updateAfterPick(
    champion: string,
    role: string | null,
    side: 'blue' | 'red',
    turnNumber: number
  ): Promise<WinRateProjection> {
    // Add pick to internal tracking
    const pickRecord: PickRecord = { champion, role, side }
    if (side === 'blue') {
      this.bluePicks.push(pickRecord)
    } else {
      this.redPicks.push(pickRecord)
    }

    // Calculate deltas for each breakdown component
    const baseCompDelta = await this.calculateBaseCompositionDelta(champion, role)
    const synergyDelta = await this.calculateSynergyDelta(champion, side)
    const matchupDelta = await this.calculateMatchupDelta(champion, role, side)

    // Apply sign based on side (positive for blue, negative for red)
    const sideMultiplier = side === 'blue' ? 1 : -1

    // Clamp each delta to prevent wild swings (max ±5% per pick)
    const clampedBaseDelta = this.clampDelta(baseCompDelta * sideMultiplier, 0.05)
    const clampedSynergyDelta = this.clampDelta(synergyDelta * sideMultiplier, 0.05)
    const clampedMatchupDelta = this.clampDelta(matchupDelta * sideMultiplier, 0.05)

    // Apply incremental deltas to breakdown
    this.projection.breakdown.baseComposition += clampedBaseDelta
    this.projection.breakdown.synergies += clampedSynergyDelta
    this.projection.breakdown.matchups += clampedMatchupDelta

    // Recalculate total win rate
    this.recalculateTotal()

    // Update turn number and confidence
    this.projection.turnNumber = turnNumber
    this.projection.confidence = this.assessConfidence(turnNumber)

    return this.getCurrentProjection()
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
   * Calculate base composition delta from champion's win rate
   *
   * Uses champion_stats_computed to get base win rate.
   * Delta = (championWinRate - 0.50) * 0.20 (20% weight)
   *
   * @param champion - Champion name
   * @param role - Role (may be null)
   * @returns Delta from baseline
   */
  private async calculateBaseCompositionDelta(
    champion: string,
    role: string | null
  ): Promise<number> {
    try {
      const supabase = await createClient()

      // Query champion stats (prefer role-specific, fall back to combined)
      let query = supabase
        .from('champion_stats_computed')
        .select('smoothed_win_rate')
        .eq('champion_name', champion)
        .eq('patch_version', this.patchVersion)

      // If role is provided, try to get role-specific stats
      if (role) {
        query = query.eq('role', role)
      } else {
        query = query.is('role', null)
      }

      const { data, error } = await query.is('side', null).single()

      if (error || !data) {
        // Fall back to neutral if no data
        return 0
      }

      const championWinRate = parseFloat(data.smoothed_win_rate)
      const delta = (championWinRate - 0.50) * 0.20 // 20% weight

      return delta
    } catch {
      // Fail gracefully - no data means neutral contribution
      return 0
    }
  }

  /**
   * Calculate synergy delta with existing teammates
   *
   * Sums pairwise synergy deltas for all existing teammates.
   * Only includes synergies with games_together >= 5.
   * Delta = sum((synergyWinRate - 0.50) * 0.10) per pair (10% weight)
   *
   * @param champion - Champion picked
   * @param side - Which team
   * @returns Total synergy delta
   */
  private async calculateSynergyDelta(
    champion: string,
    side: 'blue' | 'red'
  ): Promise<number> {
    const teammates = side === 'blue' ? this.bluePicks : this.redPicks

    if (teammates.length === 0) {
      // First pick has no synergies
      return 0
    }

    try {
      // Get synergy with each teammate
      const synergyPromises = teammates.map(teammate =>
        getSynergyScore(champion, teammate.champion, this.patchVersion)
      )

      const synergies = await Promise.all(synergyPromises)

      // Sum synergy deltas (only count direct data with enough games)
      const totalDelta = synergies.reduce((sum, synergy) => {
        // Only use direct synergy data with sufficient games
        if (synergy.source === 'direct' && synergy.games_together >= 5) {
          return sum + synergy.synergy_delta * 0.10 // 10% weight per synergy pair
        }
        return sum
      }, 0)

      return totalDelta
    } catch {
      // Fail gracefully
      return 0
    }
  }

  /**
   * Calculate matchup delta against enemy picks
   *
   * Sums matchup deltas for all enemy picks in the same or relevant roles.
   * Only includes matchups with games >= 3.
   * Delta = sum(matchup_delta * 0.15) per matchup (15% weight)
   *
   * @param champion - Champion picked
   * @param role - Role assignment (may be null)
   * @param side - Which team
   * @returns Total matchup delta
   */
  private async calculateMatchupDelta(
    champion: string,
    role: string | null,
    side: 'blue' | 'red'
  ): Promise<number> {
    const enemies = side === 'blue' ? this.redPicks : this.bluePicks

    if (enemies.length === 0 || !role) {
      // No enemies yet or no role assigned = no matchup data
      return 0
    }

    try {
      // Get matchup scores for enemies in same role
      const matchupPromises = enemies
        .filter(enemy => enemy.role === role) // Only check same-role matchups
        .map(enemy => getMatchup(champion, enemy.champion, role, this.patchVersion))

      const matchups = await Promise.all(matchupPromises)

      // Sum matchup deltas (only valid matchups with enough games)
      const totalDelta = matchups.reduce((sum, matchup) => {
        if (matchup && matchup.games >= 3) {
          return sum + matchup.matchup_delta * 0.15 // 15% weight per matchup
        }
        return sum
      }, 0)

      return totalDelta
    } catch {
      // Fail gracefully
      return 0
    }
  }

  /**
   * Clamp delta to prevent single pick from causing wild swings
   *
   * @param delta - Raw delta value
   * @param maxDelta - Maximum absolute delta (default 0.05 = 5%)
   * @returns Clamped delta
   */
  private clampDelta(delta: number, maxDelta: number = 0.05): number {
    return Math.max(-maxDelta, Math.min(maxDelta, delta))
  }

  /**
   * Recalculate total win rate from breakdown components
   *
   * Total = 0.50 + sum of all breakdown deltas
   * Clamped to [0.05, 0.95]
   */
  private recalculateTotal(): void {
    const { breakdown } = this.projection
    const blueTotal =
      0.50 +
      breakdown.baseComposition +
      breakdown.synergies +
      breakdown.matchups +
      breakdown.sideAdvantage

    this.projection.blueWinRate = this.clampWinRate(blueTotal)
    this.projection.redWinRate = 1 - this.projection.blueWinRate
  }

  /**
   * Clamp win rate to [0.05, 0.95] range
   * Never show 0% or 100%
   *
   * @param value - Raw win rate
   * @returns Clamped win rate
   */
  private clampWinRate(value: number): number {
    return Math.max(0.05, Math.min(0.95, value))
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

/**
 * Factory function for creating a win-rate projector
 *
 * Provides clean API for instantiation.
 *
 * @param patchVersion - Patch version for data queries
 * @returns New WinRateProjector instance
 *
 * @example
 * const projector = createWinRateProjector('14.23')
 */
export function createWinRateProjector(patchVersion: string): WinRateProjector {
  return new WinRateProjector(patchVersion)
}

/**
 * Calculate win-rate projection for a complete draft state
 *
 * Useful for stateless API usage where full draft state is provided.
 * Creates a projector, applies all picks in order, and returns final projection.
 *
 * @param bluePicks - Array of blue team picks (champion names)
 * @param blueRoles - Array of blue team roles (parallel to bluePicks)
 * @param redPicks - Array of red team picks (champion names)
 * @param redRoles - Array of red team roles (parallel to redPicks)
 * @param patchVersion - Patch version for data queries
 * @returns Final win-rate projection
 *
 * @example
 * const projection = await calculateWinRateForState(
 *   ['Sejuani', 'Orianna', 'Jinx'],
 *   ['jungle', 'mid', 'adc'],
 *   ['Rell', 'Ahri', 'Kai\'Sa'],
 *   ['support', 'mid', 'adc'],
 *   '14.23'
 * )
 * // Returns: { blueWinRate: 0.52, breakdown: {...}, ... }
 */
export async function calculateWinRateForState(
  bluePicks: string[],
  blueRoles: (string | null)[],
  redPicks: string[],
  redRoles: (string | null)[],
  patchVersion: string
): Promise<WinRateProjection> {
  const projector = new WinRateProjector(patchVersion)

  // Simulate draft sequence - interleave picks based on standard draft order
  // For simplicity, assume picks are already ordered chronologically
  // Real implementation would need to know exact turn sequence

  let turnNumber = 7 // Picks start at turn 7 (after ban phase 1)

  // Apply picks in order (alternating or as provided)
  const maxLength = Math.max(bluePicks.length, redPicks.length)

  for (let i = 0; i < maxLength; i++) {
    // Apply blue pick if available
    if (i < bluePicks.length) {
      await projector.updateAfterPick(
        bluePicks[i],
        blueRoles[i] || null,
        'blue',
        turnNumber
      )
      turnNumber++
    }

    // Apply red pick if available
    if (i < redPicks.length) {
      await projector.updateAfterPick(
        redPicks[i],
        redRoles[i] || null,
        'red',
        turnNumber
      )
      turnNumber++
    }
  }

  return projector.getCurrentProjection()
}
