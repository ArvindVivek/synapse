/**
 * Synergy score calculator
 *
 * Evaluates how well a candidate champion synergizes with existing team picks.
 * Uses pre-computed synergy data from Phase 2 with fallback to heuristic-based synergies.
 */

import { getTeamSynergies } from '@/lib/queries/synergies'
import { DAMAGE_TYPES, HAS_ENGAGE, IS_FRONTLINE, HAS_PEEL } from '../champion-properties'

export interface SynergyDetails {
  partner: string
  delta: number
  games: number
}

export interface SynergyScoreResult {
  /** Normalized score 0.0-1.0 */
  score: number
  /** Individual synergy contributions */
  details: SynergyDetails[]
}

/**
 * Synergy pairs - champions that work well together
 * Used as fallback when database unavailable
 */
const SYNERGY_PAIRS: Record<string, string[]> = {
  // Engage + follow-up
  'Sejuani': ['Orianna', 'Viktor', 'Syndra', 'Jinx', 'Aphelios', 'Ahri'],
  'Jarvan IV': ['Orianna', 'Syndra', 'Zoe', 'Viktor'],
  'Rell': ['Jinx', 'Aphelios', 'Kai\'Sa', 'Xayah', 'Zeri'],
  'Rakan': ['Xayah', 'Kai\'Sa', 'Orianna', 'Syndra'],
  'Leona': ['Aphelios', 'Jinx', 'Kai\'Sa', 'Draven'],
  'Alistar': ['Jinx', 'Aphelios', 'Xayah', 'Varus'],
  'Nautilus': ['Aphelios', 'Jinx', 'Kai\'Sa', 'Jhin'],
  // Peel for ADC
  'Lulu': ['Jinx', 'Kog\'Maw', 'Zeri', 'Aphelios', 'Twitch'],
  'Karma': ['Ezreal', 'Ashe', 'Jhin', 'Sivir'],
  'Janna': ['Jinx', 'Zeri', 'Kog\'Maw'],
  'Thresh': ['Aphelios', 'Lucian', 'Kai\'Sa'],
  // Mid-jungle synergy
  'Lee Sin': ['Syndra', 'Orianna', 'Ahri', 'LeBlanc'],
  'Elise': ['Sylas', 'LeBlanc', 'Syndra', 'Twisted Fate'],
  'Nidalee': ['LeBlanc', 'Syndra', 'Sylas'],
  'Viego': ['Orianna', 'Syndra', 'Ahri'],
  // Dive comps
  'Camille': ['Orianna', 'Galio', 'Lulu', 'Renata Glasc'],
  // Top-support synergy
  'Renekton': ['Elise', 'Lee Sin', 'Jarvan IV'],
  'Gnar': ['Orianna', 'Syndra', 'Jarvan IV'],
  'Aatrox': ['Jarvan IV', 'Lee Sin', 'Sejuani'],
  // ADC-specific
  'Xayah': ['Rakan'],
  'Kai\'Sa': ['Nautilus', 'Leona', 'Alistar'],
}

/**
 * Calculate heuristic synergy between two champions
 * Returns values 0.04-0.15 for meaningful score variations
 */
function getHeuristicSynergy(champ1: string, champ2: string): number {
  let synergy = 0

  // Check explicit synergy pairs (larger values for visible impact)
  if (SYNERGY_PAIRS[champ1]?.includes(champ2)) synergy += 0.10
  if (SYNERGY_PAIRS[champ2]?.includes(champ1)) synergy += 0.08

  // Engage + follow-up damage (larger bonuses)
  if (HAS_ENGAGE.has(champ1) && DAMAGE_TYPES[champ2] === 'ap') synergy += 0.06
  if (HAS_ENGAGE.has(champ2) && DAMAGE_TYPES[champ1] === 'ap') synergy += 0.06
  if (HAS_ENGAGE.has(champ1) && DAMAGE_TYPES[champ2] === 'ad' && !IS_FRONTLINE.has(champ2)) synergy += 0.05
  if (HAS_ENGAGE.has(champ2) && DAMAGE_TYPES[champ1] === 'ad' && !IS_FRONTLINE.has(champ1)) synergy += 0.05

  // Frontline + carry synergy
  if (IS_FRONTLINE.has(champ1) && !IS_FRONTLINE.has(champ2)) synergy += 0.04
  if (IS_FRONTLINE.has(champ2) && !IS_FRONTLINE.has(champ1)) synergy += 0.04

  // Peel + carry synergy (higher bonus)
  if (HAS_PEEL.has(champ1) && DAMAGE_TYPES[champ2]) synergy += 0.06
  if (HAS_PEEL.has(champ2) && DAMAGE_TYPES[champ1]) synergy += 0.06

  return synergy
}

/**
 * Calculate synergy score for a candidate champion with team
 *
 * Uses getTeamSynergies to get pairwise synergy deltas with each teammate.
 * Falls back to heuristic-based synergies if database is unavailable.
 *
 * @param candidate - Champion being evaluated
 * @param teamPicks - Champions already on the team
 * @param patchVersion - Patch version for data lookup
 * @returns Normalized score and details for reasoning
 */
export async function calculateSynergyScore(
  candidate: string,
  teamPicks: string[],
  patchVersion: string
): Promise<SynergyScoreResult> {
  // No team picks yet - neutral score
  if (teamPicks.length === 0) {
    return {
      score: 0.5,
      details: []
    }
  }

  // Try database first
  let hadDatabaseData = false
  let total_synergy = 0
  let details: SynergyDetails[] = []

  try {
    const result = await getTeamSynergies(teamPicks, candidate, patchVersion)

    // Check if we got real data (not all neutral)
    hadDatabaseData = result.pairs.some(p => p.source === 'direct' && p.games_together > 0)

    if (hadDatabaseData) {
      total_synergy = result.total_synergy
      details = result.pairs.map(pair => ({
        partner: pair.champion_a === candidate ? pair.champion_b : pair.champion_a,
        delta: pair.synergy_delta,
        games: pair.games_together
      }))
    }
  } catch {
    // Database unavailable
  }

  // Fallback to heuristic synergies if no database data
  if (!hadDatabaseData) {
    details = teamPicks.map(teammate => {
      const delta = getHeuristicSynergy(candidate, teammate)
      return {
        partner: teammate,
        delta,
        games: 100 // Indicate heuristic data
      }
    })
    total_synergy = details.reduce((sum, d) => sum + d.delta, 0)
  }

  // Normalize total synergy using sigmoid function
  // Adjusted multiplier for heuristic ranges
  const multiplier = hadDatabaseData ? 10 : 8
  const normalizedScore = 1 / (1 + Math.exp(-total_synergy * multiplier))

  return {
    score: normalizedScore,
    details
  }
}
