/**
 * GET /api/analytics/players/:playerId
 *
 * Returns player's champion pool with stats.
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
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const startTime = Date.now()
  const { playerId } = await params

  try {
    const supabase = await createClient()

    // Query player_champion_pools from Phase 2
    // Note: This table stores player-specific champion statistics
    const { data, error } = await supabase
      .from('player_champion_pools')
      .select('*')
      .eq('player_id', playerId)
      .order('games_played', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[GET /api/analytics/players] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch player pool' },
        { status: 500 }
      )
    }

    // Aggregate roles for each champion (a player might play same champ in multiple roles)
    const championMap = new Map<string, {
      champion: string
      gamesPlayed: number
      winRate: number
      wins: number
      roles: string[]
    }>()

    for (const row of data || []) {
      const existing = championMap.get(row.champion_name)
      if (existing) {
        // Combine stats across roles
        existing.gamesPlayed += row.games_played
        existing.wins += row.wins
        existing.roles.push(row.role)
      } else {
        championMap.set(row.champion_name, {
          champion: row.champion_name,
          gamesPlayed: row.games_played,
          winRate: row.smoothed_win_rate,
          wins: row.wins,
          roles: [row.role]
        })
      }
    }

    // Transform to API response format with comfort levels
    const championPool = Array.from(championMap.values())
      .map(entry => ({
        champion: entry.champion,
        gamesPlayed: entry.gamesPlayed,
        winRate: entry.gamesPlayed > 0
          ? entry.wins / entry.gamesPlayed
          : entry.winRate,
        comfortLevel: classifyComfortLevel(
          entry.gamesPlayed,
          entry.gamesPlayed > 0 ? entry.wins / entry.gamesPlayed : entry.winRate
        ),
        roles: entry.roles
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, 15) // Limit to top 15 champions

    // Get player name from first row if available
    const playerName = (data && data.length > 0)
      ? (data[0] as any).player_name || 'Unknown'
      : 'Unknown'

    return NextResponse.json({
      playerId,
      playerName,
      championPool,
      meta: { responseTime: Date.now() - startTime }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60' // Cache for 60s
      }
    })

  } catch (error) {
    console.error('[GET /api/analytics/players] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Classify comfort level based on games played and win rate
 *
 * - signature: 10+ games with 55%+ WR (ban targets)
 * - comfort: 5+ games with 50%+ WR (reliable picks)
 * - recent: 3+ games (in their pool but less proven)
 * - historical: <3 games (rarely played)
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
