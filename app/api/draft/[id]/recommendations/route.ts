/**
 * GET /api/draft/:id/recommendations
 *
 * Returns top 5 pick recommendations with scores and reasoning.
 *
 * Query params:
 * - role?: string - Filter to specific role
 *
 * Response:
 * {
 *   recommendations: PickRecommendation[],
 *   meta: {
 *     responseTime: number,
 *     turnNumber: number,
 *     weights: ScoringWeights
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { scoreAllChampions, getWeightsForTurn } from '@/lib/recommendations/pick-scorer'
import type { DraftContext } from '@/lib/recommendations/types'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'

// Import getDraftSession from the parent route (Phase 3 pattern)
// This accesses the in-memory draftSessions Map
import { getDraftSession } from '../route'

export const runtime = 'edge' // Edge runtime for <200ms

// All champions from champion-properties DAMAGE_TYPES
const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const role = request.nextUrl.searchParams.get('role')

  try {
    // Get current draft state using Phase 3 pattern
    // getDraftSession returns DraftState | undefined from in-memory Map
    const draftState = getDraftSession(id)

    if (!draftState) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Determine opponent side
    const opponentSide = draftState.userSide === 'blue' ? 'red' : 'blue'

    // Build draft context from state
    const context: DraftContext = {
      currentTurn: draftState.currentTurn,
      phase: draftState.phase,
      userSide: draftState.userSide,
      userPicks: draftState[draftState.userSide].picks.map(p => p.champion),
      userBans: draftState[draftState.userSide].bans,
      opponentPicks: draftState[opponentSide].picks.map(p => p.champion),
      opponentBans: draftState[opponentSide].bans,
      availableChampions: new Set() // Will populate below
    }

    // Compute available champions (all champions minus picked and banned)
    const unavailable = new Set([
      ...context.userPicks,
      ...context.userBans,
      ...context.opponentPicks,
      ...context.opponentBans
    ])

    const availableChampions = ALL_CHAMPIONS.filter(c => !unavailable.has(c))
    context.availableChampions = new Set(availableChampions)

    // Filter by role if specified
    // Note: Role filtering would require champion role data, skipping for MVP
    // TODO: Add role filtering using champion stats role_confidence
    let candidates = availableChampions

    if (candidates.length === 0) {
      return NextResponse.json({
        recommendations: [],
        meta: {
          responseTime: Date.now() - startTime,
          turnNumber: context.currentTurn,
          weights: getWeightsForTurn(context.currentTurn),
          candidatesScored: 0
        }
      })
    }

    // Score all candidates in parallel
    const patchVersion = '15.2' // TODO: Get from draft/tournament config
    const recommendations = await scoreAllChampions(
      candidates,
      context,
      patchVersion,
      5 // Top 5
    )

    const elapsed = Date.now() - startTime

    return NextResponse.json({
      recommendations,
      meta: {
        responseTime: elapsed,
        turnNumber: context.currentTurn,
        weights: getWeightsForTurn(context.currentTurn),
        candidatesScored: candidates.length
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=5' // Short cache
      }
    })

  } catch (error) {
    console.error('[GET /api/draft/:id/recommendations] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
