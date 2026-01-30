/**
 * GET /api/analytics/players/:playerId
 *
 * Returns player's champion pool computed from champion_picks data in Supabase.
 *
 * Response:
 * {
 *   playerId: string,
 *   playerName: string,
 *   championPool: Array<{
 *     champion: string,
 *     gamesPlayed: number,
 *     winRate: number,
 *     comfortLevel: 'signature' | 'comfort' | 'recent' | 'historical',
 *     roles: string[]
 *   }>,
 *   meta: { responseTime: number }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use Node.js runtime for full Supabase support
export const runtime = 'nodejs'

// Create Supabase client directly (not using cookies - read-only data)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(url, key)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const startTime = Date.now()
  const { playerId } = await params

  try {
    const supabase = getSupabaseClient()

    // Try to find player by ID first, then by name (case-insensitive)
    let player: { id: string; name: string } | null = null
    let playerDbId = playerId

    // First try by UUID (if playerId looks like a UUID)
    if (playerId.includes('-')) {
      const { data: playerById, error } = await supabase
        .schema('synapse')
        .from('players')
        .select('id, name')
        .eq('id', playerId)
        .maybeSingle() // Use maybeSingle to not throw on no match
      if (!error && playerById) {
        player = playerById
        playerDbId = playerById.id
      }
    }

    // If not found, try by name (case-insensitive)
    if (!player) {
      const { data: playerByName, error } = await supabase
        .schema('synapse')
        .from('players')
        .select('id, name')
        .ilike('name', playerId)
        .maybeSingle() // Use maybeSingle to not throw on no match
      if (!error && playerByName) {
        player = playerByName
        playerDbId = playerByName.id
      }
    }

    // If still not found, return empty result
    if (!player) {
      console.log(`[GET /api/analytics/players] Player not found: ${playerId}`)
      return NextResponse.json({
        playerId,
        playerName: playerId,
        championPool: [],
        meta: {
          responseTime: Date.now() - startTime,
          error: `Player "${playerId}" not found in database`
        }
      })
    }

    // Query champion picks from synapse schema, grouped by champion and role
    // Note: games.blue_team_won is boolean (true = blue won, false = red won)
    const { data: picks, error: picksError } = await supabase
      .schema('synapse')
      .from('champion_picks')
      .select(`
        champion_name,
        role,
        role_confidence,
        team_side,
        draft:drafts!inner(
          game:games!inner(
            blue_team_won
          )
        )
      `)
      .eq('player_id', playerDbId)

    if (picksError) {
      console.error('[GET /api/analytics/players] DB error:', picksError)
      return NextResponse.json({
        playerId,
        playerName: player?.name || playerId,
        championPool: [],
        meta: {
          responseTime: Date.now() - startTime,
          error: picksError.message
        }
      })
    }

    // Return empty if no picks found
    if (!picks || picks.length === 0) {
      return NextResponse.json({
        playerId,
        playerName: player?.name || playerId,
        championPool: [],
        meta: { responseTime: Date.now() - startTime }
      })
    }

    // Aggregate picks by champion
    const championMap = new Map<string, {
      champion: string
      gamesPlayed: number
      wins: number
      roles: Set<string>
    }>()

    for (const pick of picks) {
      const existing = championMap.get(pick.champion_name)
      const game = (pick.draft as any)?.game
      // Determine win: blue_team_won=true means blue won, false means red won
      const blueWon = game?.blue_team_won === true
      const isWin = (pick.team_side === 'blue' && blueWon) || (pick.team_side === 'red' && !blueWon)

      if (existing) {
        existing.gamesPlayed++
        if (isWin) existing.wins++
        if (pick.role) existing.roles.add(pick.role)
      } else {
        championMap.set(pick.champion_name, {
          champion: pick.champion_name,
          gamesPlayed: 1,
          wins: isWin ? 1 : 0,
          roles: new Set(pick.role ? [pick.role] : [])
        })
      }
    }

    // Transform to API response format with comfort levels
    const championPool = Array.from(championMap.values())
      .map(entry => {
        const winRate = entry.gamesPlayed > 0
          ? entry.wins / entry.gamesPlayed
          : 0.5
        return {
          champion: entry.champion,
          gamesPlayed: entry.gamesPlayed,
          winRate,
          comfortLevel: classifyComfortLevel(entry.gamesPlayed, winRate),
          roles: Array.from(entry.roles)
        }
      })
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, 15) // Limit to top 15 champions

    return NextResponse.json({
      playerId,
      playerName: player?.name || playerId,
      championPool,
      meta: { responseTime: Date.now() - startTime }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60' // Cache for 60s
      }
    })

  } catch (error) {
    console.error('[GET /api/analytics/players] Error:', error)
    return NextResponse.json({
      playerId,
      playerName: playerId,
      championPool: [],
      meta: {
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 })
  }
}

/**
 * Classify comfort level based on games played and win rate
 */
function classifyComfortLevel(
  gamesPlayed: number,
  winRate: number
): 'signature' | 'comfort' | 'recent' | 'historical' {
  if (gamesPlayed >= 10 && winRate >= 0.55) return 'signature'
  if (gamesPlayed >= 5 && winRate >= 0.50) return 'comfort'
  if (gamesPlayed >= 3) return 'recent'
  return 'historical'
}
