/**
 * GET /api/draft/:id: drafts are saved in the browser that plays them, so the server holds no
 * state. This returns a fresh draft with that id (the original route did the same) plus
 * `storedIn: "browser"`, so a caller knows to send the draft to the other routes.
 */

import { newDraft } from '@/lib/draft/draft'
import { describeDraft, draftId } from '@/lib/api/draft-input'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!draftId.safeParse(id).success) {
    return Response.json({ error: { code: 'bad_id', message: 'That is not a draft id.' } }, { status: 400 })
  }
  const userSide = new URL(req.url).searchParams.get('userSide') === 'red' ? 'red' : 'blue'
  return Response.json(describeDraft(newDraft({ id, userSide })), { headers: { 'Cache-Control': 'no-store' } })
}
