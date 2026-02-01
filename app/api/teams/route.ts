/**
 * GET /api/teams
 *
 * Returns all teams with their players from the database.
 *
 * Response:
 * {
 *   teams: Array<{
 *     id: string,
 *     name: string,
 *     players: Array<{
 *       id: string,
 *       name: string,
 *       role: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
 *     }>
 *   }>,
 *   meta: { responseTime: number, count: number }
 * }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(url, key)
}

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = getSupabaseClient()

    // Fetch all teams
    const { data: teamsData, error: teamsError } = await supabase
      .schema('synapse')
      .from('teams')
      .select('id, name')
      .order('name')

    if (teamsError) {
      console.error('[GET /api/teams] Teams error:', teamsError)
      return NextResponse.json({
        teams: [],
        meta: { responseTime: Date.now() - startTime, error: teamsError.message }
      })
    }

    // Fetch all players with team associations
    const { data: playersData, error: playersError } = await supabase
      .schema('synapse')
      .from('players')
      .select('id, name, team_id, primary_role')
      .order('name')

    if (playersError) {
      console.error('[GET /api/teams] Players error:', playersError)
      return NextResponse.json({
        teams: [],
        meta: { responseTime: Date.now() - startTime, error: playersError.message }
      })
    }

    // Group players by team
    const playersByTeam = new Map<string, Array<{ id: string; name: string; role: string }>>()
    for (const player of playersData || []) {
      if (!player.team_id) continue
      const existing = playersByTeam.get(player.team_id) || []
      existing.push({
        id: player.id,
        name: player.name,
        role: player.primary_role || 'mid'
      })
      playersByTeam.set(player.team_id, existing)
    }

    // Build teams with players
    const teams = (teamsData || [])
      .map(team => ({
        id: team.id,
        name: team.name,
        players: playersByTeam.get(team.id) || []
      }))
      // Only include teams with at least 1 player
      .filter(team => team.players.length > 0)
      // Sort players by role order within each team
      .map(team => ({
        ...team,
        players: team.players.sort((a, b) => {
          const roleOrder = ['top', 'jungle', 'mid', 'adc', 'support']
          return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
        })
      }))

    return NextResponse.json({
      teams,
      meta: {
        responseTime: Date.now() - startTime,
        count: teams.length
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    })

  } catch (error) {
    console.error('[GET /api/teams] Error:', error)
    return NextResponse.json({
      teams: [],
      meta: {
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 })
  }
}
