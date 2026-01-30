/**
 * Composition score calculator
 *
 * Evaluates how well a candidate champion fills team composition needs.
 * Analyzes damage balance, engage, frontline, and other strategic elements.
 */

import {
  DAMAGE_TYPES,
  HAS_ENGAGE,
  IS_FRONTLINE,
  assessTeamNeeds,
  getFilledNeeds
} from '../champion-properties'

export interface TeamNeeds {
  needsAP: boolean
  needsAD: boolean
  needsEngage: boolean
  needsFrontline: boolean
}

export interface CompositionScoreResult {
  /** Normalized score 0.0-1.0 */
  score: number
  /** Team needs assessment */
  needs: TeamNeeds
  /** Which needs this champion fills */
  fills: string[]
}

/**
 * Calculate composition score for a candidate champion
 *
 * Assesses team needs and scores the candidate based on how many needs it fills.
 * Base score of 0.5, plus 0.1 for each need filled (capped at 1.0).
 *
 * @param candidate - Champion being evaluated
 * @param teamPicks - Champions already on the team
 * @param patchVersion - Patch version (unused for now, for future expansion)
 * @returns Score, needs assessment, and filled needs
 */
export async function calculateCompositionScore(
  candidate: string,
  teamPicks: string[],
  patchVersion: string
): Promise<CompositionScoreResult> {
  // Assess what the team needs
  const needsArray = assessTeamNeeds(teamPicks)

  // Convert to structured needs object
  const needs: TeamNeeds = {
    needsAP: needsArray.includes('ap_damage'),
    needsAD: needsArray.includes('ad_damage'),
    needsEngage: needsArray.includes('engage'),
    needsFrontline: needsArray.includes('frontline')
  }

  // Check which needs this champion fills
  const fills = getFilledNeeds(candidate, needsArray)

  // Calculate score: base 0.5 + 0.1 per need filled
  const score = Math.min(1.0, 0.5 + 0.1 * fills.length)

  return {
    score,
    needs,
    fills
  }
}
