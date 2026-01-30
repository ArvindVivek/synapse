/**
 * POST /api/draft
 * Create a new draft session
 *
 * Request body:
 * {
 *   userSide: "blue" | "red"
 * }
 *
 * Response:
 * {
 *   id: string,
 *   userSide: "blue" | "red",
 *   currentTurn: 1,
 *   phase: "ban1",
 *   blue: { bans: [], picks: [] },
 *   red: { bans: [], picks: [] },
 *   startedAt: ISO timestamp
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export const runtime = 'edge' // Use edge runtime for fast responses

interface CreateDraftRequest {
  userSide: 'blue' | 'red'
}

interface DraftSession {
  id: string
  userSide: 'blue' | 'red'
  currentTurn: number
  phase: 'ban1' | 'pick1' | 'ban2' | 'pick2'
  blue: {
    bans: string[]
    picks: Array<{ champion: string; role: string | null }>
  }
  red: {
    bans: string[]
    picks: Array<{ champion: string; role: string | null }>
  }
  startedAt: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateDraftRequest

    // Validate input
    if (!body.userSide || (body.userSide !== 'blue' && body.userSide !== 'red')) {
      return NextResponse.json(
        { error: 'userSide must be "blue" or "red"' },
        { status: 400 }
      )
    }

    // Create new draft session
    const session: DraftSession = {
      id: nanoid(12), // Short ID for draft sessions
      userSide: body.userSide,
      currentTurn: 1,
      phase: 'ban1',
      blue: { bans: [], picks: [] },
      red: { bans: [], picks: [] },
      startedAt: new Date().toISOString(),
    }

    // In production, this would be stored in Supabase
    // For now, return session (will be stored in Zustand on client)
    return NextResponse.json(session, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store', // Draft sessions are not cacheable
      },
    })
  } catch (error) {
    console.error('[POST /api/draft] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create draft session' },
      { status: 500 }
    )
  }
}
