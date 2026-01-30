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

export const runtime = 'nodejs' // Node runtime for full Supabase support

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const userSide = request.nextUrl.searchParams.get('userSide') === 'red' ? 'red' : 'blue'

  try {
    // Get draft state using Phase 3 pattern
    let draftState = getDraftSession(id)

    // If no session found, use default initial state
    // Return 50-50 projection (mathematically correct for empty draft)
    if (!draftState) {
      draftState = {
        id,
        currentTurn: 1,
        phase: 'ban1' as const,
        userSide,
        blue: { bans: [], picks: [] },
        red: { bans: [], picks: [] },
        isComplete: false,
        startedAt: new Date().toISOString(),
        completedAt: null
      }
    }

    // If no picks yet, return initial 50-50 projection
    if (draftState.blue.picks.length === 0 && draftState.red.picks.length === 0) {
      return NextResponse.json({
        projection: {
          blueWinRate: 0.50,
          redWinRate: 0.50,
          breakdown: {
            baseComposition: 0,
            synergies: 0,
            matchups: 0,
            sideAdvantage: 0.02, // Blue side advantage
          },
          confidence: 'low' as const,
          turnsAnalyzed: 0,
        },
        meta: { responseTime: Date.now() - startTime }
      })
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
    // Return 50-50 on error - graceful degradation
    return NextResponse.json({
      projection: {
        blueWinRate: 0.50,
        redWinRate: 0.50,
        breakdown: {
          baseComposition: 0,
          synergies: 0,
          matchups: 0,
          sideAdvantage: 0.02,
        },
        confidence: 'low' as const,
        turnsAnalyzed: 0,
      },
      meta: {
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 }) // Return 200 so frontend doesn't break
  }
}
