/**
 * GET /api/draft/:id/predictions
 *
 * Returns opponent pick predictions based on player champion pools.
 *
 * Query params:
 * - playerId: string - Opponent player to predict
 * - playerName?: string - Player display name
 * - role: string - Role being drafted
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

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const { id } = params
  const playerId = request.nextUrl.searchParams.get('playerId')
  const playerName = request.nextUrl.searchParams.get('playerName') || 'Unknown'
  const role = request.nextUrl.searchParams.get('role')

  if (!playerId || !role) {
    return NextResponse.json(
      { error: 'playerId and role required' },
      { status: 400 }
    )
  }

  try {
    // Get draft state using Phase 3 pattern
    const draftState = getDraftSession(id)
    if (!draftState) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
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
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}
