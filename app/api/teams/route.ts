/**
 * GET /api/teams: the sample opponent teams and their players (fictional; the pro match
 * database the app used to read is gone). Pools are at /api/analytics/players/:playerId.
 */

import { TEAMS } from '@/lib/engine/teams'

export function GET() {
  return Response.json(
    {
      teams: TEAMS.map((t) => ({
        id: t.id,
        name: t.name,
        tag: t.tag,
        players: t.players.map((p) => ({ id: p.id, name: p.name, role: p.role })),
      })),
      meta: { count: TEAMS.length, sample: true },
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
