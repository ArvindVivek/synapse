/**
 * GET /api/draft/:id/winrate
 *
 * Returns current win-rate projection with breakdown.
 * Accepts picks via query params since client-side state isn't synced to server.
 *
 * Query params:
 * - userSide: 'blue' | 'red'
 * - bluePicks: comma-separated champion names
 * - redPicks: comma-separated champion names
 *
 * Response:
 * {
 *   projection: WinRateProjection,
 *   meta: { responseTime }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateWinRateForState } from '@/lib/recommendations/win-rate-projector'

export const runtime = 'nodejs' // Node runtime for full Supabase support

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params

  // Get picks from query params (client passes current state)
  const bluePicksParam = request.nextUrl.searchParams.get('bluePicks') || ''
  const redPicksParam = request.nextUrl.searchParams.get('redPicks') || ''

  const bluePicks = bluePicksParam ? bluePicksParam.split(',').filter(Boolean) : []
  const redPicks = redPicksParam ? redPicksParam.split(',').filter(Boolean) : []

  try {
    // If no picks yet, return initial projection with blue side advantage
    if (bluePicks.length === 0 && redPicks.length === 0) {
      return NextResponse.json({
        projection: {
          blueWinRate: 0.52,
          redWinRate: 0.48,
          breakdown: {
            baseComposition: 0,
            synergies: 0,
            matchups: 0,
            sideAdvantage: 0.02, // Blue side advantage
          },
          confidence: 'low' as const,
          turnNumber: 0,
        },
        meta: { responseTime: Date.now() - startTime }
      })
    }

    // Calculate win rate based on provided picks
    const blueRoles = bluePicks.map(() => null) // Roles not passed for simplicity
    const redRoles = redPicks.map(() => null)
    const patchVersion = '15.2'

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
        turnNumber: 0,
      },
      meta: {
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 }) // Return 200 so frontend doesn't break
  }
}
