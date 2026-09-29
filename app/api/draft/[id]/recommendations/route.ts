/**
 * POST /api/draft/:id/recommendations: the top 5 bans or picks for whoever moves next.
 * Body: the draft so far. GET returns advice for an empty draft (userSide query, default blue).
 */

import { newDraft } from '@/lib/draft/draft'
import { draftId, errorResponse, readDraft } from '@/lib/api/draft-input'
import { draftStage, PICK_WEIGHTS, recommend } from '@/lib/engine/recommend'
import type { Draft } from '@/lib/draft/types'

function respond(draft: Draft) {
  const started = performance.now()
  const set = recommend(draft)
  return Response.json(
    {
      recommendations: set?.recommendations ?? [],
      meta: {
        turnNumber: set?.turn ?? null,
        side: set?.side ?? null,
        action: set?.action ?? null,
        weights: set?.action === 'pick' ? PICK_WEIGHTS[draftStage(set.turn)] : null,
        candidatesScored: set?.candidatesScored ?? 0,
        teamAware: !!draft.opponentTeamId,
        responseTime: Math.round(performance.now() - started),
        dataNote: 'Estimated stats and sample teams: the original pro match database is no longer available.',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!draftId.safeParse(id).success) return Response.json({ error: { code: 'bad_id', message: 'That is not a draft id.' } }, { status: 400 })
  const parsed = await readDraft(req, id)
  if (!parsed.ok) return errorResponse(parsed)
  return respond(parsed.draft)
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!draftId.safeParse(id).success) return Response.json({ error: { code: 'bad_id', message: 'That is not a draft id.' } }, { status: 400 })
  const userSide = new URL(req.url).searchParams.get('userSide') === 'red' ? 'red' : 'blue'
  return respond(newDraft({ id, userSide }))
}
