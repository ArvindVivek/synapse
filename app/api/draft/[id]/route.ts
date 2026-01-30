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

    // Check URL params for userSide (passed during redirect)
    const url = new URL(request.url)
    const userSide = url.searchParams.get('userSide') === 'red' ? 'red' : 'blue'

    // In production, this would query Supabase
    // For now, check in-memory store or return initial state
    let session = draftSessions.get(id)

    if (!session) {
      // For MVP: Return initial draft state for any valid-looking ID
      // State will be managed client-side via Zustand
      session = {
        id,
        currentTurn: 0, // 0 means not started yet
        phase: 'ban1',
        userSide,
        blue: { bans: [], picks: [] },
        red: { bans: [], picks: [] },
        isComplete: false,
        startedAt: new Date().toISOString(),
        completedAt: null,
      }
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
