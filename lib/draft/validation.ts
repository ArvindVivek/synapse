/**
 * Validation system for draft actions
 *
 * Provides typed validation results with specific error codes
 * for UI feedback and internationalization
 */

import { DraftState, DraftAction, DraftTurn } from './types'
import * as guards from './guards'
import { getTurnInfo } from './sequence'

// ============================================================================
// Error Codes
// ============================================================================

export const ValidationErrorCode = {
  // Champion errors
  CHAMPION_NOT_AVAILABLE: 'CHAMPION_NOT_AVAILABLE',
  CHAMPION_ALREADY_BANNED: 'CHAMPION_ALREADY_BANNED',
  CHAMPION_ALREADY_PICKED: 'CHAMPION_ALREADY_PICKED',
  CHAMPION_INVALID: 'CHAMPION_INVALID',

  // Turn/phase errors
  WRONG_PHASE: 'WRONG_PHASE',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  DRAFT_NOT_STARTED: 'DRAFT_NOT_STARTED',
  DRAFT_COMPLETE: 'DRAFT_COMPLETE',

  // Action errors
  INVALID_ACTION: 'INVALID_ACTION',
} as const

export type ValidationErrorCode =
  (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode]

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  code: ValidationErrorCode
  message: string
  details?: {
    champion?: string
    expectedPhase?: string
    actualPhase?: string
    expectedSide?: 'blue' | 'red'
    actualSide?: 'blue' | 'red'
  }
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: ValidationError }

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a draft action against current state
 *
 * @param state - Current draft state
 * @param action - Action to validate
 * @returns ValidationResult indicating success or specific error
 */
export function validateAction(
  state: DraftState,
  action: DraftAction
): ValidationResult {
  // Handle RESET and UNDO (always valid)
  if (action.type === 'RESET' || action.type === 'UNDO') {
    return { valid: true }
  }

  // Check draft started
  if (!guards.isDraftStarted(state.currentTurn)) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.DRAFT_NOT_STARTED,
        message: 'Draft has not started yet',
      },
    }
  }

  // Check draft not complete
  if (guards.isDraftComplete(state.currentTurn, state.isComplete)) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.DRAFT_COMPLETE,
        message: 'Draft is already complete',
      },
    }
  }

  // Get current turn info
  const turnInfo = getTurnInfo(state.currentTurn)
  if (!turnInfo) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.INVALID_ACTION,
        message: 'Invalid turn state',
      },
    }
  }

  // Check it's user's turn
  if (turnInfo.side !== state.userSide) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.NOT_YOUR_TURN,
        message: `It's ${turnInfo.side} team's turn`,
        details: {
          expectedSide: state.userSide,
          actualSide: turnInfo.side,
        },
      },
    }
  }

  // Validate BAN action
  if (action.type === 'BAN') {
    return validateBanAction(state, action.champion, turnInfo)
  }

  // Validate PICK action
  if (action.type === 'PICK') {
    return validatePickAction(state, action.champion, turnInfo)
  }

  return {
    valid: false,
    error: {
      code: ValidationErrorCode.INVALID_ACTION,
      message: 'Unknown action type',
    },
  }
}

// ============================================================================
// Helper Validators
// ============================================================================

/**
 * Validate a ban action
 */
function validateBanAction(
  state: DraftState,
  champion: string,
  turnInfo: DraftTurn
): ValidationResult {
  // Check correct phase
  if (!guards.isBanPhase(state.phase)) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.WRONG_PHASE,
        message: `Cannot ban during ${state.phase} phase`,
        details: {
          expectedPhase: 'ban1 or ban2',
          actualPhase: state.phase,
        },
      },
    }
  }

  // Check champion available
  if (!guards.isChampionAvailable(champion, state.availableChampions)) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.CHAMPION_NOT_AVAILABLE,
        message: `${champion} is not available`,
        details: {
          champion,
        },
      },
    }
  }

  // Check not already banned
  if (guards.isChampionBanned(champion, state.blue.bans, state.red.bans)) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.CHAMPION_ALREADY_BANNED,
        message: `${champion} is already banned`,
        details: {
          champion,
        },
      },
    }
  }

  return { valid: true }
}

/**
 * Validate a pick action
 */
function validatePickAction(
  state: DraftState,
  champion: string,
  turnInfo: DraftTurn
): ValidationResult {
  // Check correct phase
  if (!guards.isPickPhase(state.phase)) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.WRONG_PHASE,
        message: `Cannot pick during ${state.phase} phase`,
        details: {
          expectedPhase: 'pick1 or pick2',
          actualPhase: state.phase,
        },
      },
    }
  }

  // Check champion available
  if (!guards.isChampionAvailable(champion, state.availableChampions)) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.CHAMPION_NOT_AVAILABLE,
        message: `${champion} is not available`,
        details: {
          champion,
        },
      },
    }
  }

  // Check not already picked
  if (guards.isChampionPicked(champion, state.blue.picks, state.red.picks)) {
    return {
      valid: false,
      error: {
        code: ValidationErrorCode.CHAMPION_ALREADY_PICKED,
        message: `${champion} is already picked`,
        details: {
          champion,
        },
      },
    }
  }

  return { valid: true }
}
