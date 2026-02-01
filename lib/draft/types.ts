/**
 * Type definitions for the draft state machine
 *
 * Models the League of Legends professional draft sequence:
 * - Ban Phase 1: 3 bans per side (turns 1-6)
 * - Pick Phase 1: 3 picks per side (turns 7-12)
 * - Ban Phase 2: 2 bans per side (turns 13-16)
 * - Pick Phase 2: 2 picks per side (turns 17-20)
 */

/**
 * Role assignment for champion picks
 * Matches database schema from Phase 1
 */
export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

/**
 * Draft format types
 * - tournament: Standard pro draft (5 bans, 5 picks per side)
 * - fearless: Champions can only be picked once per series (tracked separately)
 * - scrim: Practice mode with relaxed rules
 */
export type DraftFormat = 'tournament' | 'fearless' | 'scrim'

/**
 * Four phases of the draft sequence
 */
export type DraftPhase = 'ban1' | 'pick1' | 'ban2' | 'pick2'

/**
 * Represents a single turn in the draft sequence (1-20)
 */
export type DraftTurn = {
  /** Turn number (1-20) */
  turnNumber: number
  /** Which phase this turn belongs to */
  phase: DraftPhase
  /** Which team has the turn */
  side: 'blue' | 'red'
  /** What action is performed */
  action: 'ban' | 'pick'
}

/**
 * Team's draft composition (picks and bans)
 */
export type TeamComposition = {
  /** Champions banned by this team */
  bans: string[]
  /** Champions picked by this team with role assignments */
  picks: Array<{
    champion: string
    role: Role | null  // null until role is assigned
  }>
}

/**
 * Opponent team info for scouting
 */
export interface OpponentTeam {
  id: string
  name: string
  players: Array<{
    id: string
    name: string
    role: Role
  }>
}

/**
 * Complete draft state
 */
export interface DraftState {
  /** Draft session ID (null if not initialized) */
  id: string | null

  /** Current turn number (0 = not started, 1-20 = active, 21+ = complete) */
  currentTurn: number

  /** Current draft phase */
  phase: DraftPhase

  /** Which side the user is playing */
  userSide: 'blue' | 'red'

  /** Draft format (tournament, fearless, scrim) */
  format: DraftFormat

  /** Opponent team info for scouting (optional) */
  opponentTeam: OpponentTeam | null

  /** Blue team composition */
  blue: TeamComposition

  /** Red team composition */
  red: TeamComposition

  /** Champions that can still be picked/banned (all - picked - banned) */
  availableChampions: Set<string>

  /** Whether the draft is complete */
  isComplete: boolean

  /** When the draft started */
  startedAt: Date | null

  /** When the draft completed */
  completedAt: Date | null
}

/**
 * Actions that can be performed on the draft state
 * Discriminated union for type-safe action handling
 */
export type DraftAction =
  | { type: 'BAN'; champion: string }
  | { type: 'PICK'; champion: string; role?: Role }
  | { type: 'UNDO' }
  | { type: 'RESET' }
