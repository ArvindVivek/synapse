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
import { DAMAGE_TYPES, HAS_ENGAGE, IS_FRONTLINE, HAS_PEEL, assessTeamNeeds } from './champion-properties'

/**
 * Synergy pairs - champions that work well together in pro play
 * Used as fallback when database unavailable
 * Higher score = stronger synergy (0.04-0.08 per pair)
 */
const SYNERGY_PAIRS: Record<string, { partners: string[], strength: number }> = {
  // S-tier synergies (iconic combos)
  'Xayah': { partners: ['Rakan'], strength: 0.08 },
  'Rakan': { partners: ['Xayah', 'Kai\'Sa', 'Orianna', 'Syndra'], strength: 0.07 },
  'Orianna': { partners: ['Jarvan IV', 'Sejuani', 'Malphite', 'Rell', 'Camille'], strength: 0.06 },
  // Engage + follow-up
  'Sejuani': { partners: ['Orianna', 'Viktor', 'Syndra', 'Jinx', 'Aphelios', 'Ahri'], strength: 0.06 },
  'Jarvan IV': { partners: ['Orianna', 'Syndra', 'Zoe', 'Viktor', 'Rumble'], strength: 0.06 },
  'Rell': { partners: ['Jinx', 'Aphelios', 'Kai\'Sa', 'Xayah', 'Samira', 'Yasuo'], strength: 0.06 },
  'Leona': { partners: ['Aphelios', 'Jinx', 'Kai\'Sa', 'Draven', 'Lucian'], strength: 0.05 },
  'Nautilus': { partners: ['Aphelios', 'Jinx', 'Kai\'Sa', 'Jhin', 'Varus'], strength: 0.05 },
  'Alistar': { partners: ['Jinx', 'Aphelios', 'Xayah', 'Varus', 'Kalista'], strength: 0.05 },
  // Peel supports + hypercarries
  'Lulu': { partners: ['Jinx', 'Kog\'Maw', 'Zeri', 'Aphelios', 'Twitch', 'Vayne'], strength: 0.07 },
  'Karma': { partners: ['Ezreal', 'Ashe', 'Jhin', 'Sivir', 'Kai\'Sa'], strength: 0.05 },
  'Janna': { partners: ['Jinx', 'Zeri', 'Kog\'Maw', 'Aphelios'], strength: 0.06 },
  'Thresh': { partners: ['Aphelios', 'Lucian', 'Kai\'Sa', 'Kalista'], strength: 0.05 },
  // Mid-jungle synergy
  'Lee Sin': { partners: ['Syndra', 'Orianna', 'Ahri', 'LeBlanc', 'Zoe'], strength: 0.05 },
  'Elise': { partners: ['Sylas', 'LeBlanc', 'Syndra', 'Twisted Fate', 'Renekton'], strength: 0.05 },
  'Nidalee': { partners: ['LeBlanc', 'Syndra', 'Sylas', 'Jayce'], strength: 0.05 },
  'Viego': { partners: ['Orianna', 'Syndra', 'Ahri', 'Viktor'], strength: 0.04 },
  // Dive comps
  'Camille': { partners: ['Orianna', 'Galio', 'Lulu', 'Renata Glasc', 'Zilean'], strength: 0.06 },
  'Renekton': { partners: ['Elise', 'Lee Sin', 'Jarvan IV', 'Nidalee'], strength: 0.05 },
  // ADC synergies
  'Jinx': { partners: ['Lulu', 'Thresh', 'Nautilus', 'Leona', 'Rell'], strength: 0.05 },
  'Aphelios': { partners: ['Thresh', 'Nautilus', 'Lulu', 'Renata Glasc'], strength: 0.05 },
  'Kai\'Sa': { partners: ['Nautilus', 'Leona', 'Alistar', 'Galio'], strength: 0.05 },
}

/**
 * Counter matchups - champions that counter others
 * Higher delta = stronger counter (0.04-0.07 per matchup)
 */
const COUNTER_MATCHUPS: Record<string, { counters: string[], strength: number }> = {
  // Mid counters
  'Sylas': { counters: ['Orianna', 'Syndra', 'Azir', 'Viktor', 'Lissandra'], strength: 0.06 },
  'Syndra': { counters: ['Ahri', 'LeBlanc', 'Viktor', 'Zoe'], strength: 0.05 },
  'Azir': { counters: ['Viktor', 'Orianna', 'Corki', 'Syndra'], strength: 0.05 },
  'LeBlanc': { counters: ['Viktor', 'Azir', 'Orianna', 'Syndra'], strength: 0.06 },
  'Ahri': { counters: ['Syndra', 'Viktor', 'Azir'], strength: 0.04 },
  'Viktor': { counters: ['Zoe', 'Ahri', 'Neeko'], strength: 0.04 },
  'Zoe': { counters: ['Orianna', 'Syndra', 'Azir'], strength: 0.05 },
  // Top counters
  'Gnar': { counters: ['Aatrox', 'Renekton', 'Jax', 'Camille'], strength: 0.06 },
  'Fiora': { counters: ['Jax', 'Camille', 'Aatrox', 'K\'Sante', 'Gnar'], strength: 0.07 },
  'K\'Sante': { counters: ['Gnar', 'Jax', 'Aatrox', 'Renekton'], strength: 0.05 },
  'Jax': { counters: ['Gnar', 'Renekton', 'Camille'], strength: 0.05 },
  'Aatrox': { counters: ['Fiora', 'Gnar', 'Kennen'], strength: 0.04 },
  'Camille': { counters: ['Jax', 'Renekton', 'Fiora'], strength: 0.05 },
  'Renekton': { counters: ['Camille', 'Aatrox', 'K\'Sante'], strength: 0.05 },
  // Jungle counters
  'Lee Sin': { counters: ['Sejuani', 'Maokai', 'Skarner'], strength: 0.04 },
  'Elise': { counters: ['Viego', 'Lee Sin', 'Jarvan IV'], strength: 0.05 },
  'Viego': { counters: ['Elise', 'Nidalee', 'Lee Sin'], strength: 0.04 },
  'Sejuani': { counters: ['Nidalee', 'Elise', 'Lee Sin'], strength: 0.04 },
  // ADC counters
  'Caitlyn': { counters: ['Jinx', 'Aphelios', 'Kai\'Sa', 'Zeri'], strength: 0.06 },
  'Draven': { counters: ['Ezreal', 'Jhin', 'Ashe'], strength: 0.06 },
  'Lucian': { counters: ['Aphelios', 'Jinx', 'Kai\'Sa'], strength: 0.05 },
  'Ezreal': { counters: ['Draven', 'Lucian', 'Tristana'], strength: 0.04 },
  'Kai\'Sa': { counters: ['Caitlyn', 'Draven'], strength: 0.04 },
  // Support counters
  'Morgana': { counters: ['Thresh', 'Leona', 'Nautilus', 'Blitzcrank'], strength: 0.07 },
  'Lulu': { counters: ['Leona', 'Nautilus', 'Rell'], strength: 0.05 },
  'Thresh': { counters: ['Lulu', 'Janna', 'Karma'], strength: 0.04 },
}

/**
 * Champion base win rates (approximation from pro play data)
 * Spread from 0.46-0.56 for meaningful variation
 */
const BASE_WIN_RATES: Record<string, number> = {
  // Top tier picks (54-56% wr) - meta champions
  'Orianna': 0.55, 'Syndra': 0.54, 'Sejuani': 0.55, 'Maokai': 0.54,
  'Jinx': 0.55, 'Lulu': 0.54, 'Thresh': 0.53, 'Nautilus': 0.53,
  'Gnar': 0.54, 'Rell': 0.54, 'Ahri': 0.53,
  // Strong picks (52-53% wr)
  'Aphelios': 0.53, 'Viktor': 0.52, 'Lee Sin': 0.52, 'Viego': 0.53,
  'Jax': 0.53, 'Camille': 0.52, 'Elise': 0.52, 'Jarvan IV': 0.52,
  'Kai\'Sa': 0.52, 'Leona': 0.52, 'Rakan': 0.53, 'Xayah': 0.52,
  // Standard picks (50-51% wr)
  'Aatrox': 0.51, 'Renekton': 0.50, 'K\'Sante': 0.51, 'Fiora': 0.51,
  'Sylas': 0.51, 'LeBlanc': 0.50, 'Azir': 0.50, 'Zoe': 0.51,
  'Ezreal': 0.50, 'Caitlyn': 0.51, 'Jhin': 0.50, 'Ashe': 0.50,
  'Karma': 0.50, 'Morgana': 0.51, 'Alistar': 0.50,
  // Below average (47-49% wr) - skill-dependent or off-meta
  'Draven': 0.49, 'Kalista': 0.48, 'Nidalee': 0.49, 'Jayce': 0.49,
  'Lucian': 0.49, 'Kennen': 0.48,
  // Default for unknown champions
  '_default': 0.50
}

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
   * Uses champion_stats_computed if available, otherwise falls back to
   * hardcoded approximations from pro play data.
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

      if (!error && data) {
        const championWinRate = parseFloat(data.smoothed_win_rate)
        const delta = (championWinRate - 0.50) * 0.20 // 20% weight
        return delta
      }
    } catch {
      // Database query failed, continue to fallback
    }

    // Fallback: Use hardcoded win rates from pro play approximations
    // Higher weight (0.5) to make champion strength more visible
    const fallbackWinRate = BASE_WIN_RATES[champion] ?? BASE_WIN_RATES['_default']
    const delta = (fallbackWinRate - 0.50) * 0.5 // 50% weight - if champ is 55% wr, add +2.5%
    return delta
  }

  /**
   * Calculate synergy delta with existing teammates
   *
   * Sums pairwise synergy deltas for all existing teammates.
   * Uses database data if available, otherwise falls back to hardcoded synergy pairs.
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

    let totalDelta = 0
    let hadDatabaseData = false

    try {
      // Get synergy with each teammate from database
      const synergyPromises = teammates.map(teammate =>
        getSynergyScore(champion, teammate.champion, this.patchVersion)
      )

      const synergies = await Promise.all(synergyPromises)

      // Sum synergy deltas (only count direct data with enough games)
      totalDelta = synergies.reduce((sum, synergy) => {
        if (synergy.source === 'direct' && synergy.games_together >= 5) {
          hadDatabaseData = true
          return sum + synergy.synergy_delta * 0.10 // 10% weight per synergy pair
        }
        return sum
      }, 0)
    } catch {
      // Database query failed
    }

    // If no database data, use fallback synergy pairs with strength values
    if (!hadDatabaseData || totalDelta === 0) {
      const championSynergyData = SYNERGY_PAIRS[champion]
      for (const teammate of teammates) {
        // Check if champion synergizes with this teammate
        if (championSynergyData?.partners.includes(teammate.champion)) {
          totalDelta += championSynergyData.strength // Use defined strength (0.04-0.08)
        }
        // Check reverse (teammate has synergy with champion)
        const teammateSynergyData = SYNERGY_PAIRS[teammate.champion]
        if (teammateSynergyData?.partners.includes(champion)) {
          totalDelta += teammateSynergyData.strength * 0.7 // 70% of teammate's synergy strength
        }
      }

      // Composition-based synergy bonuses (larger values for visibility)
      // Engage + follow-up damage bonus
      const teamHasEngage = teammates.some(t => HAS_ENGAGE.has(t.champion))
      if (teamHasEngage && DAMAGE_TYPES[champion] === 'ap') {
        totalDelta += 0.04 // +4% AP carry benefits from engage
      }
      if (teamHasEngage && DAMAGE_TYPES[champion] === 'ad' && !IS_FRONTLINE.has(champion)) {
        totalDelta += 0.03 // +3% AD carry benefits from engage
      }

      // Peel + carry bonus
      const teamHasPeel = teammates.some(t => HAS_PEEL.has(t.champion))
      if (teamHasPeel && !IS_FRONTLINE.has(champion)) {
        totalDelta += 0.03 // +3% carries benefit from peel
      }

      // Frontline + backline balance
      const teamHasFrontline = teammates.some(t => IS_FRONTLINE.has(t.champion))
      if (teamHasFrontline && !IS_FRONTLINE.has(champion)) {
        totalDelta += 0.02 // +2% good to have frontline for carries
      }
      if (!teamHasFrontline && IS_FRONTLINE.has(champion)) {
        totalDelta += 0.03 // +3% filling frontline need
      }
    }

    return totalDelta
  }

  /**
   * Calculate matchup delta against enemy picks
   *
   * Sums matchup deltas for all enemy picks.
   * Uses database data if available, otherwise falls back to hardcoded counters.
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

    if (enemies.length === 0) {
      // No enemies yet = no matchup data
      return 0
    }

    let totalDelta = 0
    let hadDatabaseData = false

    // Try database first if role is provided
    if (role) {
      try {
        const matchupPromises = enemies
          .filter(enemy => enemy.role === role)
          .map(enemy => getMatchup(champion, enemy.champion, role, this.patchVersion))

        const matchups = await Promise.all(matchupPromises)

        totalDelta = matchups.reduce((sum, matchup) => {
          if (matchup && matchup.games >= 3) {
            hadDatabaseData = true
            return sum + matchup.matchup_delta * 0.15
          }
          return sum
        }, 0)
      } catch {
        // Database query failed
      }
    }

    // If no database data, use fallback counter matchups with strength values
    if (!hadDatabaseData || totalDelta === 0) {
      const championCounterData = COUNTER_MATCHUPS[champion]

      for (const enemy of enemies) {
        // Check if champion counters the enemy
        if (championCounterData?.counters.includes(enemy.champion)) {
          totalDelta += championCounterData.strength // Use defined strength (0.04-0.07)
        }
        // Check if enemy counters our champion (negative)
        const enemyCounterData = COUNTER_MATCHUPS[enemy.champion]
        if (enemyCounterData?.counters.includes(champion)) {
          totalDelta -= enemyCounterData.strength // Negative for being countered
        }
      }

      // Composition-based matchup advantages (larger values for visibility)
      // Check if we counter their damage type
      const enemyDamageTypes = enemies.map(e => DAMAGE_TYPES[e.champion]).filter(Boolean)
      const myDamageType = DAMAGE_TYPES[champion]

      // Frontline vs all-AD enemy comp advantage
      if (IS_FRONTLINE.has(champion) && enemyDamageTypes.length > 0 && enemyDamageTypes.every(t => t === 'ad')) {
        totalDelta += 0.05 // +5% Tank advantage vs full AD
      }

      // Mixed damage is better against tanks
      if (enemies.some(e => IS_FRONTLINE.has(e.champion)) && myDamageType === 'mixed') {
        totalDelta += 0.03 // +3% mixed damage vs tanks
      }

      // Engage advantage against squishy comps
      if (HAS_ENGAGE.has(champion) && !enemies.some(e => IS_FRONTLINE.has(e.champion))) {
        totalDelta += 0.03 // +3% engage vs no frontline
      }
    }

    return totalDelta
  }

  /**
   * Clamp delta to prevent single pick from causing wild swings
   *
   * @param delta - Raw delta value
   * @param maxDelta - Maximum absolute delta (default 0.08 = 8%)
   * @returns Clamped delta
   */
  private clampDelta(delta: number, maxDelta: number = 0.08): number {
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
