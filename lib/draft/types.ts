/**
 * The draft's data model.
 *
 * The professional draft is 20 turns (lib/draft/sequence.ts):
 * - Ban phase 1: 3 bans per side (turns 1-6)
 * - Pick phase 1: 3 picks per side (turns 7-12)
 * - Ban phase 2: 2 bans per side (turns 13-16)
 * - Pick phase 2: 2 picks per side (turns 17-20)
 *
 * A Draft stores only what happened (bans and picks in order); the turn, phase and the champions
 * still open are derived from it, so they can never drift out of step.
 */

export type Side = 'blue' | 'red'

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

export const ROLES: readonly Role[] = ['top', 'jungle', 'mid', 'adc', 'support']

/**
 * - tournament: the standard pro draft
 * - fearless: a series; champions picked in earlier games can't be picked again
 * - scrim: practice; you can take back your last move
 */
export type DraftFormat = 'tournament' | 'fearless' | 'scrim'

export type DraftPhase = 'ban1' | 'pick1' | 'ban2' | 'pick2'

export type DraftTurn = {
  /** 1-20 */
  turnNumber: number
  phase: DraftPhase
  side: Side
  action: 'ban' | 'pick'
}

export interface TeamDraft {
  /** In the order they were banned. */
  bans: string[]
  /** In the order they were picked. */
  picks: string[]
}

export interface Draft {
  id: string
  userSide: Side
  format: DraftFormat
  /** Sample opponent team from lib/fixtures/teams.json, or null for no scouting. */
  opponentTeamId: string | null
  /** Game number in a fearless series (1 otherwise). */
  game: number
  /** Fearless only: champions picked in earlier games of the series. */
  locked: string[]
  blue: TeamDraft
  red: TeamDraft
  startedAt: string
  completedAt: string | null
}

export type DraftAction = { type: 'BAN' | 'PICK'; champion: string }
