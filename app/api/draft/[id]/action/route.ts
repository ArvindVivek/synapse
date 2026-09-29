/**
 * POST /api/draft/:id/action: check and play one move.
 * Body: the draft so far ({ userSide, blue: { bans, picks }, red: { bans, picks }, ... }) plus
 * { type: "BAN" | "PICK", champion }. The move is played for whichever side's turn it is.
 * 200 { success: true, state } or 400 { success: false, error: { code, message } }.
 */

import { z } from 'zod'
import { actionErrorMessage, applyAction, turnInfo } from '@/lib/draft/draft'
import { describeDraft, draftBody, draftFromInput, draftId, errorResponse } from '@/lib/api/draft-input'

const move = z.object({ type: z.enum(['BAN', 'PICK']), champion: z.string().trim().min(1).max(40) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!draftId.safeParse(id).success) {
    return Response.json({ success: false, error: { code: 'bad_id', message: 'That is not a draft id.' } }, { status: 400 })
  }
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return Response.json({ success: false, error: { code: 'bad_json', message: 'Send the move as JSON.' } }, { status: 400 })
  }
  const m = move.safeParse(json)
  const d = draftBody.safeParse(json)
  if (!m.success || !d.success) {
    return Response.json(
      { success: false, error: { code: 'bad_request', message: 'Send { type: "BAN" or "PICK", champion } with the draft so far.' } },
      { status: 400 },
    )
  }
  const parsed = draftFromInput(id, d.data)
  if (!parsed.ok) return errorResponse(parsed)
  const turn = turnInfo(parsed.draft)
  if (!turn) {
    return Response.json({ success: false, error: { code: 'draft_complete', message: actionErrorMessage('DRAFT_COMPLETE') } }, { status: 400 })
  }
  const r = applyAction(parsed.draft, m.data, turn.side)
  if (!r.ok) {
    return Response.json({ success: false, error: { code: r.error, message: actionErrorMessage(r.error) } }, { status: 400 })
  }
  return Response.json({ success: true, state: describeDraft(r.draft) }, { headers: { 'Cache-Control': 'no-store' } })
}
