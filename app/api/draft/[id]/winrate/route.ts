/**
 * GET /api/draft/:id/winrate?bluePicks=A,B&redPicks=C&userSide=blue
 * Win chance for the picks so far, with the breakdown (blue side's view) and the same numbers
 * from `userSide`'s view.
 */

import { draftId, listParam } from '@/lib/api/draft-input'
import { isChampion } from '@/lib/engine/champions'
import { forSide, projectWinRate } from '@/lib/engine/winrate'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!draftId.safeParse(id).success) return Response.json({ error: { code: 'bad_id', message: 'That is not a draft id.' } }, { status: 400 })
  const url = new URL(req.url)
  const bluePicks = listParam(url, 'bluePicks').slice(0, 5)
  const redPicks = listParam(url, 'redPicks').slice(0, 5)
  const unknown = [...bluePicks, ...redPicks].filter((c) => !isChampion(c))
  if (unknown.length || new Set([...bluePicks, ...redPicks]).size !== bluePicks.length + redPicks.length) {
    return Response.json(
      { error: { code: 'bad_picks', message: unknown.length ? `Unknown champion: ${unknown[0]}.` : 'A champion can only be picked once.' } },
      { status: 400 },
    )
  }
  const userSide = url.searchParams.get('userSide') === 'red' ? 'red' : 'blue'
  const projection = projectWinRate(bluePicks, redPicks)
  return Response.json({ projection, user: { side: userSide, ...forSide(projection, userSide) } }, { headers: { 'Cache-Control': 'no-store' } })
}
