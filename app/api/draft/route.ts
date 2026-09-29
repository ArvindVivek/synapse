/**
 * POST /api/draft: start a draft. Body: { userSide?, format?, opponentTeamId? }.
 * Returns the new draft (201). Drafts are saved in the browser that plays them, not here.
 */

import { nanoid } from 'nanoid'
import { z } from 'zod'
import { newDraft } from '@/lib/draft/draft'
import { describeDraft } from '@/lib/api/draft-input'
import { getTeam } from '@/lib/engine/teams'

const body = z.object({
  userSide: z.enum(['blue', 'red']).default('blue'),
  format: z.enum(['tournament', 'fearless', 'scrim']).default('tournament'),
  opponentTeamId: z.string().max(60).nullish(),
})

export async function POST(req: Request) {
  let json: unknown = {}
  try {
    json = await req.json()
  } catch {
    // An empty body starts a default draft.
  }
  const parsed = body.safeParse(json ?? {})
  if (!parsed.success) {
    return Response.json({ error: { code: 'bad_request', message: 'userSide must be "blue" or "red".' } }, { status: 400 })
  }
  if (parsed.data.opponentTeamId && !getTeam(parsed.data.opponentTeamId)) {
    return Response.json({ error: { code: 'unknown_team', message: 'That opponent team is not one of the sample teams.' } }, { status: 400 })
  }
  const draft = newDraft({ id: nanoid(12), ...parsed.data })
  return Response.json(describeDraft(draft), { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
