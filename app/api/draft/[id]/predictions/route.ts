/**
 * GET /api/draft/:id/predictions
 *
 * Returns opponent pick predictions based on player champion pools.
 *
 * Query params:
 * - playerId: string - Opponent player to predict
 * - playerName?: string - Player display name
 * - role: string - Role being drafted
 * - userSide?: 'blue' | 'red' - User's side (default: blue)
 *
 * Response:
 * {
 *   predictions: PlayerPickPrediction[],
 *   player: { id, name, role },
 *   meta: { responseTime }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { predictOpponentPick, PredictionContext } from '@/lib/recommendations/player-predictor'
import { assessTeamNeeds } from '@/lib/recommendations/champion-properties'

// Import getDraftSession from the parent route (Phase 3 pattern)
import { getDraftSession } from '../route'

export const runtime = 'nodejs' // Node runtime for full Supabase support

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params
  const playerId = request.nextUrl.searchParams.get('playerId')
  const playerName = request.nextUrl.searchParams.get('playerName') || 'Unknown'
  const role = request.nextUrl.searchParams.get('role')
  const userSide = request.nextUrl.searchParams.get('userSide') === 'red' ? 'red' : 'blue'

  if (!playerId || !role) {
    return NextResponse.json(
      { error: 'playerId and role required' },
      { status: 400 }
    )
  }

  try {
    // Get draft state, or use default initial state
    let draftState = getDraftSession(id)

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

    // Build prediction context
    const opponentSide = draftState.userSide === 'blue' ? 'red' : 'blue'
    const teamPicks = draftState[opponentSide].picks.map(p => p.champion)
    const teamNeeds = assessTeamNeeds(teamPicks)

    const context: PredictionContext = {
      playerId,
      playerName,
      role,
      bannedChampions: [...draftState.blue.bans, ...draftState.red.bans],
      pickedChampions: [
        ...draftState.blue.picks.map(p => p.champion),
        ...draftState.red.picks.map(p => p.champion)
      ],
      teamNeeds
    }

    const predictions = await predictOpponentPick(context)

    return NextResponse.json({
      predictions,
      player: { id: playerId, name: playerName, role },
      meta: { responseTime: Date.now() - startTime }
    })

  } catch (error) {
    console.error('[GET /api/draft/:id/predictions] Error:', error)
    // Return empty predictions on error - let frontend show "no data" state
    return NextResponse.json({
      predictions: [],
      player: { id: playerId, name: playerName, role },
      meta: {
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 }) // Return 200 with empty array, not 500
  }
}
