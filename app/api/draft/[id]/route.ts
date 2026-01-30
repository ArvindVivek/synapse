/**
 * GET /api/draft/:id
 * Get current draft state by ID
 *
 * Response:
 * {
 *   id: string,
 *   currentTurn: number,
 *   phase: DraftPhase,
 *   userSide: "blue" | "red",
 *   blue: { bans: [], picks: [] },
 *   red: { bans: [], picks: [] },
 *   isComplete: boolean,
 *   startedAt: ISO timestamp,
 *   completedAt: ISO timestamp | null
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // Use edge runtime for fast responses

interface DraftState {
  id: string
  currentTurn: number
  phase: 'ban1' | 'pick1' | 'ban2' | 'pick2'
  userSide: 'blue' | 'red'
  blue: {
    bans: string[]
    picks: Array<{ champion: string; role: string | null }>
  }
  red: {
    bans: string[]
    picks: Array<{ champion: string; role: string | null }>
  }
  isComplete: boolean
  startedAt: string
  completedAt: string | null
}

// In-memory draft sessions (temporary - will use Supabase in production)
// This simulates what would be stored in Supabase Realtime Broadcast
const draftSessions = new Map<string, DraftState>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // In production, this would query Supabase
    // For now, check in-memory store or return mock data
    const session = draftSessions.get(id)

    if (!session) {
      // Return 404 for non-existent drafts
      // In production, query Supabase to check if draft exists
      return NextResponse.json(
        { error: 'Draft session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(session, {
      headers: {
        'Cache-Control': 'no-store', // Draft state changes frequently
      },
    })
  } catch (error) {
    console.error('[GET /api/draft/:id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch draft state' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to store draft session (used by other routes)
 * In production, this would write to Supabase
 */
export function storeDraftSession(session: DraftState): void {
  draftSessions.set(session.id, session)
}

/**
 * Helper function to get draft session (used by other routes)
 * In production, this would read from Supabase
 */
export function getDraftSession(id: string): DraftState | undefined {
  return draftSessions.get(id)
}
