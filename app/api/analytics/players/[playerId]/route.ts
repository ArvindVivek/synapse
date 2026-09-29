/**
 * GET /api/analytics/players/:playerId: a sample player's champion pool (by id or name), most
 * played first, with games, win rate and comfort level.
 */

import { rolesOf } from '@/lib/engine/champions'
import { findPlayer } from '@/lib/engine/teams'

export async function GET(_req: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const found = findPlayer(decodeURIComponent(playerId).slice(0, 60))
  if (!found) {
    return Response.json({ error: { code: 'not_found', message: 'No sample player has that id or name.' } }, { status: 404 })
  }
  const { player, team } = found
  return Response.json(
    {
      playerId: player.id,
      playerName: player.name,
      role: player.role,
      team: { id: team.id, name: team.name, tag: team.tag },
      championPool: player.pool.map((e) => ({
        champion: e.champion,
        gamesPlayed: e.games,
        wins: e.wins,
        winRate: Math.round(e.winRate * 1000) / 1000,
        comfortLevel: e.comfort,
        daysSincePlayed: e.daysAgo,
        roles: rolesOf(e.champion),
      })),
      meta: { sample: true },
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
