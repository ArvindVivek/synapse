/**
 * Pure guard functions for draft rule validation
 *
 * All guards are pure predicates (no side effects, deterministic)
 * Used by validation.ts for composable rule checking
 */

import { DraftState, DraftPhase, Role } from './types'
import { getTurnInfo } from './sequence'

// ============================================================================
// Champion Availability Guards
// ============================================================================

/**
 * Check if champion is in the available set
 */
export function isChampionAvailable(
  champion: string,
  availableChampions: Set<string>
): boolean {
  return availableChampions.has(champion)
}

/**
 * Check if champion has been banned by either team
 */
export function isChampionBanned(
  champion: string,
  blueBans: string[],
  redBans: string[]
): boolean {
  return blueBans.includes(champion) || redBans.includes(champion)
}

/**
 * Check if champion has been picked by either team
 */
export function isChampionPicked(
  champion: string,
  bluePicks: Array<{ champion: string }>,
  redPicks: Array<{ champion: string }>
): boolean {
  return (
    bluePicks.some((p) => p.champion === champion) ||
    redPicks.some((p) => p.champion === champion)
  )
}

/**
 * Check if champion is valid (exists in champion pool)
 * For now, any non-empty string is considered valid
 * This could be enhanced with a champion list in the future
 */
export function isValidChampion(
  champion: string,
  allChampions: string[]
): boolean {
  return allChampions.includes(champion)
}

// ============================================================================
// Phase Guards
// ============================================================================

/**
 * Check if current turn is in a ban phase
 */
export function isBanPhase(phase: DraftPhase): boolean {
  return phase === 'ban1' || phase === 'ban2'
}

/**
 * Check if current turn is in a pick phase
 */
export function isPickPhase(phase: DraftPhase): boolean {
  return phase === 'pick1' || phase === 'pick2'
}

/**
 * Check if draft is complete
 */
export function isDraftComplete(currentTurn: number, isComplete: boolean): boolean {
  return currentTurn > 20 || isComplete
}

// ============================================================================
// Turn Guards
// ============================================================================

/**
 * Check if it's the specified side's turn
 */
export function isSideTurn(currentTurn: number, side: 'blue' | 'red'): boolean {
  const turnInfo = getTurnInfo(currentTurn)
  return turnInfo ? turnInfo.side === side : false
}

/**
 * Check if user can act (it's their turn)
 */
export function isUserTurn(currentTurn: number, userSide: 'blue' | 'red'): boolean {
  return isSideTurn(currentTurn, userSide)
}

/**
 * Check if draft has started
 */
export function isDraftStarted(currentTurn: number): boolean {
  return currentTurn >= 1
}

// ============================================================================
// Composite Guards
// ============================================================================

/**
 * Can user execute a ban action?
 * Checks: ban phase, champion available, not already banned, user's turn
 */
export function canBan(state: DraftState, champion: string): boolean {
  // Must be ban phase
  if (!isBanPhase(state.phase)) {
    return false
  }

  // Must be user's turn
  if (!isUserTurn(state.currentTurn, state.userSide)) {
    return false
  }

  // Champion must be available (not picked or banned)
  if (!isChampionAvailable(champion, state.availableChampions)) {
    return false
  }

  // Must not be already banned
  if (isChampionBanned(champion, state.blue.bans, state.red.bans)) {
    return false
  }

  return true
}

/**
 * Can user execute a pick action?
 * Checks: pick phase, champion available, not already picked, user's turn
 */
export function canPick(state: DraftState, champion: string): boolean {
  // Must be pick phase
  if (!isPickPhase(state.phase)) {
    return false
  }

  // Must be user's turn
  if (!isUserTurn(state.currentTurn, state.userSide)) {
    return false
  }

  // Champion must be available (not picked or banned)
  if (!isChampionAvailable(champion, state.availableChampions)) {
    return false
  }

  // Must not be already picked
  if (isChampionPicked(champion, state.blue.picks, state.red.picks)) {
    return false
  }

  return true
}

/**
 * Can user execute any action?
 * Generic check for action validity
 */
export function canExecuteAction(
  state: DraftState,
  action: 'ban' | 'pick',
  champion: string
): boolean {
  if (action === 'ban') {
    return canBan(state, champion)
  } else if (action === 'pick') {
    return canPick(state, champion)
  }
  return false
}
