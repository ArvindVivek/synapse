import { describe, expect, it } from 'vitest'
import { applyAction, newDraft, turnInfo } from '@/lib/draft/draft'
import type { Draft } from '@/lib/draft/types'
import { draftStage, PICK_WEIGHTS, recommend, scorePick } from './recommend'
import { TEAMS } from './teams'

const NOW = new Date('2026-09-29T12:00:00Z')

function withMoves(d: Draft, champions: string[]): Draft {
  let draft = d
  for (const champion of champions) {
    const t = turnInfo(draft)!
    const r = applyAction(draft, { type: t.action === 'ban' ? 'BAN' : 'PICK', champion }, t.side, NOW)
    if (!r.ok) throw new Error(`${champion}: ${r.error}`)
    draft = r.draft
  }
  return draft
}

const BANS = ['Azir', 'Viego', 'Rell', 'Kalista', 'Yuumi', 'Zeri']

describe('weights', () => {
  it('sum to 1 in every stage', () => {
    for (const w of Object.values(PICK_WEIGHTS)) {
      expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
    }
    expect([draftStage(7), draftStage(12), draftStage(18)]).toEqual(['early', 'mid', 'late'])
  })
})

describe('recommend', () => {
  it('gives five legal, stable pick ideas with reasons', () => {
    const d = withMoves(newDraft({ id: 'r1', userSide: 'blue', now: NOW }), BANS)
    const a = recommend(d)!
    expect(a.action).toBe('pick')
    expect(a.recommendations).toHaveLength(5)
    for (const r of a.recommendations) expect(BANS).not.toContain(r.champion)
    expect(recommend(d)).toEqual(a)
    expect(a.recommendations.some((r) => r.reasoning.length > 0)).toBe(true)
    const scores = a.recommendations.map((r) => r.totalScore)
    expect([...scores].sort((x, y) => y - x)).toEqual(scores)
  })

  it('suggests a role the team still needs', () => {
    // Blue has top, jungle, mid and bot; the last pick should be a support.
    const d = withMoves(newDraft({ id: 'r2', userSide: 'blue', now: NOW }), [
      ...BANS, 'Gnar', 'Aatrox', 'Syndra', 'Sejuani', 'Jinx', 'Kennen', 'Ahri', 'Nidalee', 'Neeko', 'Nautilus', "Kai'Sa", 'Orianna',
    ])
    expect(turnInfo(d)).toMatchObject({ side: 'blue', action: 'pick' })
    const top = recommend(d)!.recommendations[0]
    expect(['Thresh', 'Leona', 'Lulu', 'Rakan', 'Janna', 'Braum', 'Alistar', 'Karma', 'Morgana', 'Renata Glasc', 'Tahm Kench', 'Zilean', 'Senna', 'Maokai', 'Taliyah']).toContain(top.champion)
  })

  it('points bans at the scouted players’ signature picks', () => {
    const team = TEAMS[1]
    const signature = team.players.flatMap((p) => p.pool.filter((e) => e.comfort === 'signature').map((e) => e.champion))
    expect(signature.length).toBeGreaterThan(0)
    const d = newDraft({ id: 'r3', userSide: 'blue', opponentTeamId: team.id, now: NOW })
    const bans = recommend(d)!
    expect(bans.action).toBe('ban')
    expect(signature).toContain(bans.recommendations[0].champion)
    expect(bans.recommendations[0].reasoning[0]).toMatch(/signature pick: \d+ games, \d+% wins/)
  })

  it('warns when a champion is countered', () => {
    const r = scorePick('Jax', [], ['Fiora'], 18)
    expect(r.reasoning.join(' ')).toMatch(/their Fiora beats it/)
  })

  it('returns null once the draft is over', () => {
    const d = newDraft({ id: 'r4', userSide: 'blue', now: NOW })
    const done = { ...d, blue: { bans: ['a', 'b', 'c', 'd', 'e'], picks: ['f', 'g', 'h', 'i', 'j'] }, red: { bans: ['k', 'l', 'm', 'n', 'o'], picks: ['p', 'q', 'r', 's', 't'] } }
    expect(recommend(done)).toBeNull()
  })
})
