/**
 * GET /api/draft/:id/recommendations
 *
 * Returns top 5 pick recommendations with scores and reasoning.
 *
 * Query params:
 * - role?: string - Filter to specific role
 * - userSide?: 'blue' | 'red' - User's side (default: blue)
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

export const runtime = 'nodejs' // Node runtime for full Supabase support

// All champions from champion-properties DAMAGE_TYPES
const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const role = request.nextUrl.searchParams.get('role')
  const userSide = request.nextUrl.searchParams.get('userSide') === 'red' ? 'red' : 'blue'

  try {
    // Get current draft state, or use initial state for new drafts
    let draftState = getDraftSession(id)

    // If no session exists, use default initial state
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
    // Return empty recommendations on error
    return NextResponse.json({
      recommendations: [],
      meta: {
        responseTime: Date.now() - startTime,
        turnNumber: 1,
        weights: getWeightsForTurn(1),
        candidatesScored: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 }) // Return 200 with empty array, not 500
  }
}
