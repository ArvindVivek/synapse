/**
 * The draft state machine as pure functions. The browser store (lib/draft/store.ts) and the
 * /api/draft routes both use these, so the rules live in one place.
 */

import { ALL_CHAMPIONS, isChampion } from '@/lib/engine/champions'
import { getTurnInfo } from './sequence'
import type { Draft, DraftAction, DraftFormat, DraftPhase, DraftTurn, Side } from './types'

export const TOTAL_TURNS = 20

export function otherSide(side: Side): Side {
  return side === 'blue' ? 'red' : 'blue'
}

export function newDraft(params: {
  id: string
  userSide: Side
  format?: DraftFormat
  opponentTeamId?: string | null
  game?: number
  locked?: string[]
  now?: Date
}): Draft {
  return {
    id: params.id,
    userSide: params.userSide,
    format: params.format ?? 'tournament',
    opponentTeamId: params.opponentTeamId ?? null,
    game: params.game ?? 1,
    locked: params.locked ?? [],
    blue: { bans: [], picks: [] },
    red: { bans: [], picks: [] },
    startedAt: (params.now ?? new Date()).toISOString(),
    completedAt: null,
  }
}

/** How many bans and picks have happened. */
export function actionsTaken(d: Pick<Draft, 'blue' | 'red'>): number {
  return d.blue.bans.length + d.blue.picks.length + d.red.bans.length + d.red.picks.length
}

/** 1-20 while the draft runs, 21 once it's complete. */
export function currentTurn(d: Pick<Draft, 'blue' | 'red'>): number {
  return actionsTaken(d) + 1
}

export function isComplete(d: Pick<Draft, 'blue' | 'red'>): boolean {
  return actionsTaken(d) >= TOTAL_TURNS
}

/** The turn being played, or null once the draft is complete. */
export function turnInfo(d: Pick<Draft, 'blue' | 'red'>): DraftTurn | null {
  return getTurnInfo(currentTurn(d))
}

export function phaseOf(d: Pick<Draft, 'blue' | 'red'>): DraftPhase | null {
  return turnInfo(d)?.phase ?? null
}

export function isUsersTurn(d: Draft): boolean {
  return turnInfo(d)?.side === d.userSide
}

/** Every champion already banned or picked in this game, plus fearless locks. */
export function unavailable(d: Pick<Draft, 'blue' | 'red' | 'locked'>): Set<string> {
  return new Set([...d.blue.bans, ...d.red.bans, ...d.blue.picks, ...d.red.picks, ...d.locked])
}

export function availableChampions(d: Pick<Draft, 'blue' | 'red' | 'locked'>): string[] {
  const taken = unavailable(d)
  return ALL_CHAMPIONS.filter((c) => !taken.has(c))
}

export type ActionError =
  | 'DRAFT_COMPLETE'
  | 'NOT_YOUR_TURN'
  | 'WRONG_PHASE'
  | 'UNKNOWN_CHAMPION'
  | 'CHAMPION_NOT_AVAILABLE'

const ERROR_MESSAGES: Record<ActionError, string> = {
  DRAFT_COMPLETE: 'The draft is already over.',
  NOT_YOUR_TURN: "It isn't this side's turn.",
  WRONG_PHASE: 'That move belongs to a different phase.',
  UNKNOWN_CHAMPION: "That champion isn't in Synapse's pool.",
  CHAMPION_NOT_AVAILABLE: 'That champion is already banned or picked.',
}

export function actionErrorMessage(code: ActionError): string {
  return ERROR_MESSAGES[code]
}

/**
 * Checks a move for `side` (the side making it). Returns null when it's legal.
 * The opponent AI and the user go through the same check.
 */
export function checkAction(d: Draft, action: DraftAction, side: Side): ActionError | null {
  const turn = turnInfo(d)
  if (!turn) return 'DRAFT_COMPLETE'
  if (turn.side !== side) return 'NOT_YOUR_TURN'
  if ((turn.action === 'ban') !== (action.type === 'BAN')) return 'WRONG_PHASE'
  if (!isChampion(action.champion)) return 'UNKNOWN_CHAMPION'
  if (unavailable(d).has(action.champion)) return 'CHAMPION_NOT_AVAILABLE'
  return null
}

export type ApplyResult = { ok: true; draft: Draft } | { ok: false; error: ActionError }

/** Applies a legal move and returns the new draft (the input is never changed). */
export function applyAction(d: Draft, action: DraftAction, side: Side, now = new Date()): ApplyResult {
  const error = checkAction(d, action, side)
  if (error) return { ok: false, error }
  const team = d[side]
  const next: Draft = {
    ...d,
    [side]: action.type === 'BAN'
      ? { bans: [...team.bans, action.champion], picks: team.picks }
      : { bans: team.bans, picks: [...team.picks, action.champion] },
  }
  if (isComplete(next)) next.completedAt = now.toISOString()
  return { ok: true, draft: next }
}

/** The side and kind of the last move, or null before the first one. */
export function lastMove(d: Draft): DraftTurn | null {
  const n = actionsTaken(d)
  return n === 0 ? null : getTurnInfo(n)
}

/**
 * Scrim only: take back moves until it's the user's turn again, so the opponent's automatic
 * answer is taken back with the user's move. Returns the draft unchanged when there is nothing
 * of the user's to undo.
 */
export function undoUserMove(d: Draft): Draft {
  let next = d
  let removedUserMove = false
  while (true) {
    const last = lastMove(next)
    if (!last) break
    if (removedUserMove && last.side !== next.userSide) break
    const team = next[last.side]
    next = {
      ...next,
      completedAt: null,
      [last.side]: last.action === 'ban'
        ? { bans: team.bans.slice(0, -1), picks: team.picks }
        : { bans: team.bans, picks: team.picks.slice(0, -1) },
    }
    if (last.side === next.userSide) {
      removedUserMove = true
      // Stop once the turn to play is the user's again.
      if (turnInfo(next)?.side === next.userSide) break
    }
  }
  return removedUserMove ? next : d
}

/** Fearless: the next game of the series locks every champion picked so far. */
export function nextFearlessGame(d: Draft, id: string, now = new Date()): Draft {
  return newDraft({
    id,
    userSide: d.userSide,
    format: 'fearless',
    opponentTeamId: d.opponentTeamId,
    game: d.game + 1,
    locked: [...d.locked, ...d.blue.picks, ...d.red.picks],
    now,
  })
}
