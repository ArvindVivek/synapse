import { describe, expect, it } from 'vitest'
import { applyAction, checkAction, isComplete, newDraft, turnInfo } from '@/lib/draft/draft'
import type { Draft } from '@/lib/draft/types'
import { opponentMove } from './opponent'
import { recommend } from './recommend'
import { TEAMS } from './teams'

const NOW = new Date('2026-09-29T12:00:00Z')

/** Plays a whole draft: the user follows the top suggestion, the opponent plays itself. */
function playOut(d: Draft): Draft {
  let draft = d
  for (let i = 0; i < 20; i++) {
    const t = turnInfo(draft)!
    const move = t.side === draft.userSide
      ? { type: t.action === 'ban' ? ('BAN' as const) : ('PICK' as const), champion: recommend(draft)!.recommendations[0].champion }
      : opponentMove(draft)!
    expect(checkAction(draft, move, t.side)).toBeNull()
    const r = applyAction(draft, move, t.side, NOW)
    if (!r.ok) throw new Error(r.error)
    draft = r.draft
  }
  return draft
}

describe('opponentMove', () => {
  it('only moves on the opponent’s turn', () => {
    expect(opponentMove(newDraft({ id: 'o', userSide: 'blue' }))).toBeNull()
    expect(opponentMove(newDraft({ id: 'o', userSide: 'red' }))).toMatchObject({ type: 'BAN' })
  })

  it('plays full legal drafts, with and without scouting, on both sides', () => {
    for (const userSide of ['blue', 'red'] as const) {
      for (const team of [null, TEAMS[3].id]) {
        const done = playOut(newDraft({ id: `full-${userSide}-${team}`, userSide, opponentTeamId: team, now: NOW }))
        expect(isComplete(done)).toBe(true)
        expect(new Set([...done.blue.picks, ...done.red.picks, ...done.blue.bans, ...done.red.bans]).size).toBe(20)
      }
    }
  })

  it('replays the same way for the same draft id', () => {
    const a = playOut(newDraft({ id: 'same', userSide: 'blue', opponentTeamId: TEAMS[0].id, now: NOW }))
    const b = playOut(newDraft({ id: 'same', userSide: 'blue', opponentTeamId: TEAMS[0].id, now: NOW }))
    expect(b).toEqual(a)
  })

  it('picks from the scouted team’s pools', () => {
    const team = TEAMS[5]
    const pooled = new Set(team.players.flatMap((p) => p.pool.map((e) => e.champion)))
    const done = playOut(newDraft({ id: 'pools', userSide: 'blue', opponentTeamId: team.id, now: NOW }))
    const fromPools = done.red.picks.filter((c) => pooled.has(c)).length
    expect(fromPools).toBeGreaterThanOrEqual(4)
  })
})
