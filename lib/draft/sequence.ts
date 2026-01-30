/**
 * 20-turn draft sequence lookup table
 *
 * Encodes the exact LoL professional draft order:
 * - Ban Phase 1: B-R-B-R-B-R (turns 1-6)
 * - Pick Phase 1: B-RR-BB-R (turns 7-12)
 * - Ban Phase 2: R-B-R-B (turns 13-16)
 * - Pick Phase 2: R-BB-R (turns 17-20)
 */

import { DraftTurn, DraftPhase } from './types'

/**
 * Complete 20-turn draft sequence
 * Readonly to prevent mutation
 */
export const DRAFT_SEQUENCE: readonly DraftTurn[] = [
  // Ban Phase 1 (turns 1-6)
  { turnNumber: 1, phase: 'ban1', side: 'blue', action: 'ban' },
  { turnNumber: 2, phase: 'ban1', side: 'red', action: 'ban' },
  { turnNumber: 3, phase: 'ban1', side: 'blue', action: 'ban' },
  { turnNumber: 4, phase: 'ban1', side: 'red', action: 'ban' },
  { turnNumber: 5, phase: 'ban1', side: 'blue', action: 'ban' },
  { turnNumber: 6, phase: 'ban1', side: 'red', action: 'ban' },

  // Pick Phase 1 (turns 7-12)
  { turnNumber: 7, phase: 'pick1', side: 'blue', action: 'pick' },  // B1
  { turnNumber: 8, phase: 'pick1', side: 'red', action: 'pick' },   // R1
  { turnNumber: 9, phase: 'pick1', side: 'red', action: 'pick' },   // R2
  { turnNumber: 10, phase: 'pick1', side: 'blue', action: 'pick' }, // B2
  { turnNumber: 11, phase: 'pick1', side: 'blue', action: 'pick' }, // B3
  { turnNumber: 12, phase: 'pick1', side: 'red', action: 'pick' },  // R3

  // Ban Phase 2 (turns 13-16)
  { turnNumber: 13, phase: 'ban2', side: 'red', action: 'ban' },
  { turnNumber: 14, phase: 'ban2', side: 'blue', action: 'ban' },
  { turnNumber: 15, phase: 'ban2', side: 'red', action: 'ban' },
  { turnNumber: 16, phase: 'ban2', side: 'blue', action: 'ban' },

  // Pick Phase 2 (turns 17-20)
  { turnNumber: 17, phase: 'pick2', side: 'red', action: 'pick' },  // R4
  { turnNumber: 18, phase: 'pick2', side: 'blue', action: 'pick' }, // B4
  { turnNumber: 19, phase: 'pick2', side: 'blue', action: 'pick' }, // B5
  { turnNumber: 20, phase: 'pick2', side: 'red', action: 'pick' },  // R5
] as const

/**
 * Get turn information by turn number (1-indexed)
 *
 * @param turnNumber - Turn number (1-20)
 * @returns DraftTurn object or null if invalid
 */
export function getTurnInfo(turnNumber: number): DraftTurn | null {
  if (turnNumber < 1 || turnNumber > 20) {
    return null
  }
  return DRAFT_SEQUENCE[turnNumber - 1]
}

/**
 * Get the next turn after the current one
 *
 * @param currentTurn - Current turn number (1-20)
 * @returns Next DraftTurn or null if draft is complete
 */
export function getNextTurn(currentTurn: number): DraftTurn | null {
  if (currentTurn < 0 || currentTurn >= 20) {
    return null
  }
  return DRAFT_SEQUENCE[currentTurn]
}

/**
 * Determine the phase for a given turn number
 *
 * @param turnNumber - Turn number (1-20)
 * @returns DraftPhase or null if invalid
 */
export function getPhaseForTurn(turnNumber: number): DraftPhase | null {
  const turn = getTurnInfo(turnNumber)
  return turn ? turn.phase : null
}

/**
 * Count turns remaining in the current phase
 *
 * @param turnNumber - Current turn number (1-20)
 * @returns Number of turns remaining in current phase (including current turn)
 */
export function getTurnsRemainingInPhase(turnNumber: number): number {
  const currentTurn = getTurnInfo(turnNumber)
  if (!currentTurn) return 0

  let count = 1 // Include current turn
  let nextTurnNum = turnNumber + 1

  while (nextTurnNum <= 20) {
    const nextTurn = getTurnInfo(nextTurnNum)
    if (!nextTurn || nextTurn.phase !== currentTurn.phase) {
      break
    }
    count++
    nextTurnNum++
  }

  return count
}

/**
 * Check if it's the user's turn
 *
 * @param turnNumber - Current turn number (1-20)
 * @param userSide - Which side the user is playing ('blue' or 'red')
 * @returns true if it's the user's turn, false otherwise
 */
export function isUserTurn(
  turnNumber: number,
  userSide: 'blue' | 'red'
): boolean {
  const turn = getTurnInfo(turnNumber)
  return turn ? turn.side === userSide : false
}
