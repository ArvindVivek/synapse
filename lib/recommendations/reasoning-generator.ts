/**
 * Template-based reasoning generator for XAI (Explainable AI)
 *
 * Generates human-readable explanations that justify pick recommendations.
 * Each reason includes specific data (win rates, games played, advantages)
 * to support transparent decision-making.
 */

import type { ScoreBreakdown, DraftContext } from './types'

export interface ReasoningContext {
  champion: string
  scores: ScoreBreakdown
  draftContext: DraftContext
  // Data backing the scores (includes games count from 04-01 scoring modules)
  synergyDetails?: Array<{ partner: string; delta: number; games: number }>
  matchupDetails?: Array<{ opponent: string; delta: number; games: number }>
  compositionNeeds?: string[]
  sideWinRate?: number
  flexRoles?: string[]
}

/**
 * Generate reasoning for a pick recommendation
 *
 * Analyzes score components and generates human-readable explanations
 * for high-scoring factors (score >= 0.60).
 *
 * @param context - Reasoning context with scores and supporting data
 * @returns Array of human-readable reasons (max 5-6 total)
 */
export function generateReasoning(context: ReasoningContext): string[] {
  const reasons: string[] = []

  // Generate reasons for high-scoring components (score >= 0.60)
  if (context.scores.synergy >= 0.60) {
    reasons.push(...generateSynergyReasons(context))
  }

  if (context.scores.counter >= 0.60) {
    reasons.push(...generateCounterReasons(context))
  }

  if (context.scores.composition >= 0.60) {
    reasons.push(...generateCompositionReasons(context))
  }

  if (context.scores.side >= 0.60) {
    reasons.push(...generateSideReasons(context))
  }

  if (context.scores.flex >= 0.60) {
    reasons.push(...generateFlexReasons(context))
  }

  // No fallback - only show real data-backed reasons
  // Empty array means no analytics data available for this champion
  return reasons
}

/**
 * Generate synergy-based reasoning
 *
 * Highlights strong champion synergies with existing team picks.
 * Includes win rate and games played for transparency.
 */
export function generateSynergyReasons(context: ReasoningContext): string[] {
  const reasons: string[] = []

  for (const synergy of context.synergyDetails || []) {
    if (synergy.delta >= 0.05) {
      const winRate = ((0.50 + synergy.delta) * 100).toFixed(1)
      reasons.push(
        `Strong synergy with ${synergy.partner} (${winRate}% WR, ${synergy.games} games)`
      )
    }
  }

  return reasons.slice(0, 2) // Max 2 synergy reasons
}

/**
 * Generate counter-pick reasoning
 *
 * Highlights favorable matchups against opponent picks.
 * Shows advantage percentage and data backing.
 */
export function generateCounterReasons(context: ReasoningContext): string[] {
  const reasons: string[] = []

  for (const matchup of context.matchupDetails || []) {
    if (matchup.delta >= 0.05) {
      const advantage = (matchup.delta * 100).toFixed(1)
      reasons.push(
        `Counters ${matchup.opponent} (+${advantage}% advantage, ${matchup.games} games)`
      )
    }
  }

  return reasons.slice(0, 2) // Max 2 counter reasons
}

/**
 * Generate composition-based reasoning
 *
 * Explains which team needs this champion fills
 * (damage type, engage, frontline, peel).
 */
export function generateCompositionReasons(context: ReasoningContext): string[] {
  const reasons: string[] = []
  const needs = context.compositionNeeds || []

  const needDescriptions: Record<string, string> = {
    ap_damage: 'Adds needed AP damage to composition',
    ad_damage: 'Adds needed AD damage to composition',
    engage: 'Provides team fight engage',
    frontline: 'Adds frontline tankiness',
    peel: 'Provides protection for carries'
  }

  for (const need of needs) {
    if (needDescriptions[need]) {
      reasons.push(needDescriptions[need])
    }
  }

  return reasons.slice(0, 2) // Max 2 composition reasons
}

/**
 * Generate side advantage reasoning
 *
 * Explains blue/red side advantage for this champion.
 * Only generates reason if advantage is significant (>3%).
 */
export function generateSideReasons(context: ReasoningContext): string[] {
  const reasons: string[] = []

  if (context.sideWinRate && context.sideWinRate > 0.53) {
    const side = context.draftContext.userSide
    const advantage = ((context.sideWinRate - 0.50) * 100).toFixed(1)
    reasons.push(`+${advantage}% ${side} side advantage`)
  }

  return reasons
}

/**
 * Generate flex pick reasoning
 *
 * Highlights multi-role viability for early draft picks.
 * Flex picks hide role intentions and force opponent guessing.
 */
export function generateFlexReasons(context: ReasoningContext): string[] {
  const reasons: string[] = []

  if (context.flexRoles && context.flexRoles.length >= 2) {
    reasons.push(`Flex pick: viable in ${context.flexRoles.join(', ')} roles`)
  }

  return reasons
}
