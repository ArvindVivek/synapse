/**
 * GET /api/draft/:id/winrate
 *
 * Returns current win-rate projection with breakdown.
 *
 * Response:
 * {
 *   projection: WinRateProjection,
 *   meta: { responseTime }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateWinRateForState } from '@/lib/recommendations/win-rate-projector'

// Import getDraftSession from the parent route (Phase 3 pattern)
import { getDraftSession } from '../route'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const { id } = params

  try {
    // Get draft state using Phase 3 pattern
    const draftState = getDraftSession(id)
    if (!draftState) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const bluePicks = draftState.blue.picks.map(p => p.champion)
    const blueRoles = draftState.blue.picks.map(p => p.role)
    const redPicks = draftState.red.picks.map(p => p.champion)
    const redRoles = draftState.red.picks.map(p => p.role)
    const patchVersion = '15.2' // TODO: Get from draft/tournament config

    const projection = await calculateWinRateForState(
      bluePicks,
      blueRoles,
      redPicks,
      redRoles,
      patchVersion
    )

    return NextResponse.json({
      projection,
      meta: { responseTime: Date.now() - startTime }
    })

  } catch (error) {
    console.error('[GET /api/draft/:id/winrate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate win rate' },
      { status: 500 }
    )
  }
}
