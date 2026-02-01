/**
 * POST /api/draft/:id/action
 * Execute a draft action (ban/pick) with validation
 *
 * Request body:
 * {
 *   type: "BAN" | "PICK",
 *   champion: string,
 *   role?: "top" | "jungle" | "mid" | "adc" | "support"
 * }
 *
 * Response on success:
 * {
 *   success: true,
 *   state: DraftState
 * }
 *
 * Response on validation failure:
 * {
 *   success: false,
 *   error: {
 *     code: ValidationErrorCode,
 *     message: string,
 *     details?: object
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDraftSession, storeDraftSession } from '../route'
import { validateAction } from '@/lib/draft/validation'
import { getTurnInfo, getNextTurn } from '@/lib/draft/sequence'
import type { DraftAction, DraftState, Role } from '@/lib/draft/types'

export const runtime = 'edge' // Use edge runtime for fast responses

interface ActionRequest {
  type: 'BAN' | 'PICK'
  champion: string
  role?: Role
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as ActionRequest

    // Validate request body
    if (!body.type || !body.champion) {
      return NextResponse.json(
        { success: false, error: 'Missing type or champion' },
        { status: 400 }
      )
    }

    if (body.type !== 'BAN' && body.type !== 'PICK') {
      return NextResponse.json(
        { success: false, error: 'type must be "BAN" or "PICK"' },
        { status: 400 }
      )
    }

    // Get current draft session
    const session = getDraftSession(id)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Draft session not found' },
        { status: 404 }
      )
    }

    // Convert session to DraftState format for validation
    const state: DraftState = {
      id: session.id,
      currentTurn: session.currentTurn,
      phase: session.phase,
      userSide: session.userSide,
      format: 'tournament', // Default format
      opponentTeam: null, // No opponent team data in session
      blue: {
        bans: session.blue.bans,
        picks: session.blue.picks.map(p => ({
          champion: p.champion,
          role: p.role as Role | null
        }))
      },
      red: {
        bans: session.red.bans,
        picks: session.red.picks.map(p => ({
          champion: p.champion,
          role: p.role as Role | null
        }))
      },
      availableChampions: new Set<string>(), // Will be computed below
      isComplete: session.isComplete,
      startedAt: new Date(session.startedAt),
      completedAt: session.completedAt ? new Date(session.completedAt) : null,
    }

    // Compute available champions
    const allBanned = [...session.blue.bans, ...session.red.bans]
    const allPicked = [
      ...session.blue.picks.map((p) => p.champion),
      ...session.red.picks.map((p) => p.champion),
    ]

    // In production, this would come from champion data
    // For now, assume all champions except banned/picked are available
    // This will be populated when we integrate with champion data API

    // Validate action
    const action: DraftAction =
      body.type === 'BAN'
        ? { type: 'BAN', champion: body.champion }
        : { type: 'PICK', champion: body.champion, role: body.role }

    const validationResult = validateAction(state, action)

    if (validationResult.valid === false) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
        },
        { status: 400 }
      )
    }

    // Execute action
    const currentTurn = getTurnInfo(session.currentTurn)
    if (!currentTurn) {
      return NextResponse.json(
        { success: false, error: 'Invalid turn state' },
        { status: 500 }
      )
    }

    const side = currentTurn.side

    // Apply action to session
    if (body.type === 'BAN') {
      session[side].bans.push(body.champion)
    } else {
      session[side].picks.push({
        champion: body.champion,
        role: body.role || null,
      })
    }

    // Advance turn
    const nextTurn = getNextTurn(session.currentTurn)
    if (nextTurn) {
      session.currentTurn = nextTurn.turnNumber
      session.phase = nextTurn.phase
    } else {
      session.isComplete = true
      session.completedAt = new Date().toISOString()
    }

    // Store updated session
    storeDraftSession(session)

    // Return updated state
    return NextResponse.json(
      {
        success: true,
        state: session,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('[POST /api/draft/:id/action] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute action' },
      { status: 500 }
    )
  }
}
