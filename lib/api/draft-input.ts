/**
 * Reads a draft sent to the API. Draft sessions live in the browser, so routes are stateless:
 * the caller sends the bans and picks so far, and the server replays them through the same
 * rules the app uses. An impossible draft (wrong counts, repeats, unknown champions) is refused.
 */

import { z } from 'zod'
import { applyAction, currentTurn, isComplete, newDraft, TOTAL_TURNS, turnInfo } from '@/lib/draft/draft'
import { DRAFT_SEQUENCE } from '@/lib/draft/sequence'
import type { Draft } from '@/lib/draft/types'
import { getTeam } from '@/lib/engine/teams'

const name = z.string().trim().min(1).max(40)
const team = z.object({ bans: z.array(name).max(5).default([]), picks: z.array(name).max(5).default([]) })

export const draftBody = z.object({
  userSide: z.enum(['blue', 'red']).default('blue'),
  format: z.enum(['tournament', 'fearless', 'scrim']).default('tournament'),
  opponentTeamId: z.string().max(60).nullish(),
  locked: z.array(name).max(100).default([]),
  // The old client sent picks as objects ({ champion, role }); accept both.
  blue: z.preprocess(normaliseTeam, team).default({ bans: [], picks: [] }),
  red: z.preprocess(normaliseTeam, team).default({ bans: [], picks: [] }),
})

function normaliseTeam(value: unknown) {
  if (!value || typeof value !== 'object') return value
  const v = value as { bans?: unknown; picks?: unknown }
  const picks = Array.isArray(v.picks)
    ? v.picks.map((p) => (p && typeof p === 'object' && 'champion' in p ? (p as { champion: unknown }).champion : p))
    : v.picks
  return { ...v, picks }
}

export type DraftInput = z.infer<typeof draftBody>

export type ParsedDraft = { ok: true; draft: Draft } | { ok: false; status: number; code: string; message: string }

/** Replays the input turn by turn; fails on the first move the rules don't allow. */
export function draftFromInput(id: string, input: DraftInput): ParsedDraft {
  if (input.opponentTeamId && !getTeam(input.opponentTeamId)) {
    return { ok: false, status: 400, code: 'unknown_team', message: 'That opponent team is not one of the sample teams.' }
  }
  let draft = newDraft({
    id,
    userSide: input.userSide,
    format: input.format,
    opponentTeamId: input.opponentTeamId ?? null,
    locked: input.locked,
  })
  const queues = {
    blue: { ban: [...input.blue.bans], pick: [...input.blue.picks] },
    red: { ban: [...input.red.bans], pick: [...input.red.picks] },
  }
  const total = input.blue.bans.length + input.blue.picks.length + input.red.bans.length + input.red.picks.length
  if (total > TOTAL_TURNS) return { ok: false, status: 400, code: 'too_many_moves', message: 'A draft has 20 moves at most.' }
  for (const turn of DRAFT_SEQUENCE.slice(0, total)) {
    const champion = queues[turn.side][turn.action].shift()
    if (!champion) {
      return { ok: false, status: 400, code: 'out_of_order', message: `Turn ${turn.turnNumber} should be a ${turn.side} ${turn.action}.` }
    }
    const r = applyAction(draft, { type: turn.action === 'ban' ? 'BAN' : 'PICK', champion }, turn.side)
    if (!r.ok) {
      return { ok: false, status: 400, code: r.error.toLowerCase(), message: `Turn ${turn.turnNumber} (${champion}): ${r.error.replaceAll('_', ' ').toLowerCase()}.` }
    }
    draft = r.draft
  }
  return { ok: true, draft }
}

/** Parses a JSON body into a draft, with a friendly 400 for anything malformed. */
export async function readDraft(req: Request, id: string): Promise<ParsedDraft> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return { ok: false, status: 400, code: 'bad_json', message: 'Send the draft as JSON.' }
  }
  const parsed = draftBody.safeParse(json)
  if (!parsed.success) return { ok: false, status: 400, code: 'bad_draft', message: 'That draft is not in the expected shape.' }
  return draftFromInput(id, parsed.data)
}

export function errorResponse(p: Extract<ParsedDraft, { ok: false }>): Response {
  return Response.json({ error: { code: p.code, message: p.message } }, { status: p.status, headers: { 'Cache-Control': 'no-store' } })
}

/** Draft ids are short random strings (nanoid). */
export const draftId = z.string().regex(/^[A-Za-z0-9_-]{4,40}$/)

/** Comma-separated champion list from a query string. */
export function listParam(url: URL, key: string): string[] {
  return (url.searchParams.get(key) ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10)
}

/** A draft plus the derived turn state, as every draft route returns it. */
export function describeDraft(draft: Draft) {
  const turn = turnInfo(draft)
  return {
    ...draft,
    currentTurn: currentTurn(draft),
    phase: turn?.phase ?? null,
    nextMove: turn ? { side: turn.side, action: turn.action } : null,
    isComplete: isComplete(draft),
    storedIn: 'browser' as const,
  }
}
