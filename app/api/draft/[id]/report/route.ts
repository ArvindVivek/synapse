/**
 * POST /api/draft/:id/report: the post-draft report for a finished draft (body: the draft).
 * The app calls this only when someone asks for the report. Returns { report, notice }:
 * report.source is "ai" or "fallback" (written from the computed numbers).
 */

import { isComplete } from '@/lib/draft/draft'
import { draftId, errorResponse, readDraft } from '@/lib/api/draft-input'
import { writeReport } from '@/lib/ai/draft-report'
import { rateLimitKey } from '@/lib/kl/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!draftId.safeParse(id).success) return Response.json({ error: { code: 'bad_id', message: 'That is not a draft id.' } }, { status: 400 })
  const parsed = await readDraft(req, id)
  if (!parsed.ok) return errorResponse(parsed)
  if (!isComplete(parsed.draft)) {
    return Response.json({ error: { code: 'not_finished', message: 'Finish the draft first: the report needs all ten picks.' } }, { status: 400 })
  }
  const result = await writeReport(parsed.draft, { visitor: rateLimitKey(req), signal: req.signal })
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
