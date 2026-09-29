/**
 * GET /api/draft/:id/predictions?playerId=…&blueBans=…&redBans=…&bluePicks=…&redPicks=…&userSide=blue
 * What a sample opponent player is likely to pick next, given the draft so far.
 * (`playerName` and `role` from the original API are accepted and ignored: the player's role
 * comes from the sample team.)
 */

import { draftId, listParam } from '@/lib/api/draft-input'
import { newDraft } from '@/lib/draft/draft'
import { predictPicks } from '@/lib/engine/predict'
import { findPlayer } from '@/lib/engine/teams'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!draftId.safeParse(id).success) return Response.json({ error: { code: 'bad_id', message: 'That is not a draft id.' } }, { status: 400 })
  const url = new URL(req.url)
  const playerId = url.searchParams.get('playerId')
  if (!playerId) return Response.json({ error: { code: 'bad_request', message: 'playerId is required.' } }, { status: 400 })
  const found = findPlayer(playerId)
  if (!found) return Response.json({ error: { code: 'not_found', message: 'No sample player has that id or name.' } }, { status: 404 })
  const userSide = url.searchParams.get('userSide') === 'red' ? 'red' : 'blue'
  const draft = {
    ...newDraft({ id, userSide, opponentTeamId: found.team.id }),
    blue: { bans: listParam(url, 'blueBans'), picks: listParam(url, 'bluePicks') },
    red: { bans: listParam(url, 'redBans'), picks: listParam(url, 'redPicks') },
  }
  const { player, team } = found
  return Response.json(
    { predictions: predictPicks(draft, player), player: { id: player.id, name: player.name, role: player.role, team: team.name } },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
