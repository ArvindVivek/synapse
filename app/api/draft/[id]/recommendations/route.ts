/**
 * GET/POST /api/draft/:id/recommendations
 *
 * Returns top 5 pick/ban recommendations with scores and reasoning.
 *
 * POST body (preferred - ensures accurate state):
 * {
 *   currentTurn: number,
 *   phase: 'ban1' | 'pick1' | 'ban2' | 'pick2',
 *   userSide: 'blue' | 'red',
 *   blue: { bans: string[], picks: string[] },
 *   red: { bans: string[], picks: string[] }
 * }
 *
 * Response:
 * {
 *   recommendations: PickRecommendation[],
 *   meta: {
 *     responseTime: number,
 *     turnNumber: number,
 *     weights: ScoringWeights,
 *     candidatesScored: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { scoreAllChampions, getWeightsForTurn } from '@/lib/recommendations/pick-scorer'
import type { DraftContext } from '@/lib/recommendations/types'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'
import {
  applyTeamAwareAdjustments,
  type OpponentPlayer,
  type TeamAwareContext
} from '@/lib/recommendations/team-aware-scorer'

export const runtime = 'nodejs' // Node runtime for full Supabase support

// All champions from champion-properties DAMAGE_TYPES
const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

interface DraftStateBody {
  currentTurn: number
  phase: 'ban1' | 'pick1' | 'ban2' | 'pick2'
  userSide: 'blue' | 'red'
  blue: { bans: string[]; picks: string[] }
  red: { bans: string[]; picks: string[] }
  opponentTeam?: {
    id: string
    name: string
    players: OpponentPlayer[]
  } | null
}

async function computeRecommendations(
  id: string,
  state: DraftStateBody
): Promise<Response> {
  const startTime = Date.now()

  try {
    // Determine opponent side
    const opponentSide = state.userSide === 'blue' ? 'red' : 'blue'

    // Build draft context from state
    const context: DraftContext = {
      currentTurn: state.currentTurn,
      phase: state.phase,
      userSide: state.userSide,
      userPicks: state[state.userSide].picks,
      userBans: state[state.userSide].bans,
      opponentPicks: state[opponentSide].picks,
      opponentBans: state[opponentSide].bans,
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

    const candidates = availableChampions

    if (candidates.length === 0) {
      return NextResponse.json({
        recommendations: [],
        meta: {
          responseTime: Date.now() - startTime,
          turnNumber: context.currentTurn,
          phase: context.phase,
          weights: getWeightsForTurn(context.currentTurn),
          candidatesScored: 0
        }
      })
    }

    // Score all candidates in parallel
    const patchVersion = '15.2' // TODO: Get from draft/tournament config
    let recommendations = await scoreAllChampions(
      candidates,
      context,
      patchVersion,
      5 // Top 5
    )

    // Apply team-aware adjustments if opponent team data is provided
    if (state.opponentTeam?.players && state.opponentTeam.players.length > 0) {
      const teamAwareContext: TeamAwareContext = {
        opponentPlayers: state.opponentTeam.players,
        phase: state.phase,
        isUserTurn: state.userSide === (context.currentTurn % 2 === 1 ? 'blue' : 'red')
      }

      // Apply team-aware scoring adjustments
      recommendations = await applyTeamAwareAdjustments(recommendations, teamAwareContext)

      // Take top 5 after re-sorting
      recommendations = recommendations.slice(0, 5)
    }

    const elapsed = Date.now() - startTime

    return NextResponse.json({
      recommendations,
      meta: {
        responseTime: elapsed,
        turnNumber: context.currentTurn,
        phase: context.phase,
        weights: getWeightsForTurn(context.currentTurn),
        candidatesScored: candidates.length,
        teamAwareEnabled: !!state.opponentTeam?.players
      }
    }, {
      headers: {
        'Cache-Control': 'no-store' // Don't cache since state changes frequently
      }
    })

  } catch (error) {
    console.error('[/api/draft/:id/recommendations] Error:', error)
    return NextResponse.json({
      recommendations: [],
      meta: {
        responseTime: Date.now() - startTime,
        turnNumber: state.currentTurn,
        phase: state.phase,
        weights: getWeightsForTurn(state.currentTurn),
        candidatesScored: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 })
  }
}

/**
 * POST handler - receives current state from client for accurate recommendations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body: DraftStateBody = await request.json()
    return computeRecommendations(id, body)
  } catch (error) {
    console.error('[POST /api/draft/:id/recommendations] Parse error:', error)
    return NextResponse.json({
      recommendations: [],
      meta: {
        responseTime: 0,
        turnNumber: 1,
        phase: 'ban1',
        weights: getWeightsForTurn(1),
        candidatesScored: 0,
        error: 'Invalid request body'
      }
    }, { status: 400 })
  }
}

/**
 * GET handler - fallback for simple requests (less accurate without state)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userSide = request.nextUrl.searchParams.get('userSide') === 'red' ? 'red' : 'blue'

  // Use default initial state for GET requests
  const defaultState: DraftStateBody = {
    currentTurn: 1,
    phase: 'ban1',
    userSide,
    blue: { bans: [], picks: [] },
    red: { bans: [], picks: [] }
  }

  return computeRecommendations(id, defaultState)
}
