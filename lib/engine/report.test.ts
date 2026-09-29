import { describe, expect, it, vi } from 'vitest'
import { strictSchemaProblems } from '@/lib/kl/ai'
import { newDraft } from '@/lib/draft/draft'
import type { Draft } from '@/lib/draft/types'
import { draftFacts, fallbackReport, gradeFor, mergeAIReport, REPORT_SCHEMA, reportCacheKey, reportPrompt } from './report'

vi.mock('server-only', () => ({}))

const done: Draft = {
  ...newDraft({ id: 'rep', userSide: 'blue', now: new Date('2026-09-29T12:00:00Z') }),
  blue: { bans: ['Azir', 'Viego', 'Rell', 'Yuumi', 'Zeri'], picks: ['Gnar', 'Sejuani', 'Orianna', 'Jinx', 'Lulu'] },
  red: { bans: ['Kalista', 'Ahri', 'Corki', 'Vi', 'Braum'], picks: ['Aatrox', 'Lee Sin', 'Syndra', "Kai'Sa", 'Nautilus'] },
  completedAt: '2026-09-29T12:10:00Z',
}

describe('grades', () => {
  it('keeps the original bands', () => {
    expect([58, 57, 54, 53, 50, 49, 46, 45].map(gradeFor)).toEqual(['S', 'A', 'A', 'B', 'B', 'C', 'C', 'D'])
  })
})

describe('draftFacts', () => {
  it('computes lanes, roles and needs for both teams', () => {
    const f = draftFacts(done)
    expect(f.lanes.map((l) => [l.yours, l.theirs])).toEqual([
      ['Gnar', 'Aatrox'], ['Sejuani', 'Lee Sin'], ['Orianna', 'Syndra'], ['Jinx', "Kai'Sa"], ['Lulu', 'Nautilus'],
    ])
    // Gnar is listed as beating Aatrox. Sejuani and Lee Sin are each listed as beating the
    // other, so that lane comes down to strength alone and stays even.
    expect(f.lanes[0].advantage).toBe('favorable')
    expect(f.lanes[1].advantage).toBe('even')
    expect(f.winProbability).toBeGreaterThan(40)
    expect(f.grade).toBe(gradeFor(f.winProbability))
  })
})

describe('fallbackReport', () => {
  it('fills every section from the numbers alone', () => {
    const r = fallbackReport(draftFacts(done))
    expect(r.source).toBe('fallback')
    expect(r.summary.keyStrengths).toHaveLength(3)
    expect(r.strategicAnalysis.winConditions.length).toBeGreaterThanOrEqual(2)
    expect(r.matchupInsights.lanes).toHaveLength(5)
    expect(r.matchupInsights.lanes[0].tip).toMatch(/Gnar has the edge over Aatrox/)
    for (const list of Object.values(r.recommendations)) expect(list).toHaveLength(2)
  })
})

describe('the AI contract', () => {
  it('keeps the strict-mode schema', () => {
    expect(strictSchemaProblems(REPORT_SCHEMA.schema)).toEqual([])
  })

  it('sends a short prompt of computed facts only', () => {
    const p = reportPrompt(draftFacts(done))
    expect(p.length).toBeLessThan(900) // about 200 tokens
    expect(p).toMatch(/Computed win chance \d+%/)
    expect(p).not.toMatch(/Azir/) // bans aren't needed for the report
  })

  it('merges the model’s sentences and patches anything missing', () => {
    const f = draftFacts(done)
    const r = mergeAIReport(f, {
      teamComp: 'A teamfight comp.',
      keyStrengths: ['a', 'b', 'c', 'd'],
      winConditions: [],
      powerSpikes: ['x', 'y'],
      laneTips: [{ role: 'mid', tip: 'Shove and roam.' }],
      earlyGame: ['e1', 'e2'],
      midGame: ['m1', 'm2'],
      lateGame: ['l1', 'l2'],
    })
    expect(r.source).toBe('ai')
    expect(r.summary.keyStrengths).toEqual(['a', 'b', 'c'])
    expect(r.strategicAnalysis.winConditions).toEqual(fallbackReport(f).strategicAnalysis.winConditions)
    expect(r.matchupInsights.lanes[2].tip).toBe('Shove and roam.')
    expect(r.matchupInsights.lanes[0].tip).toBe(fallbackReport(f).matchupInsights.lanes[0].tip)
    expect(r.summary.winProbability).toBe(f.winProbability) // numbers always come from code
  })

  it('keys the cache on side and picks', () => {
    expect(reportCacheKey(done)).toBe(reportCacheKey({ ...done, id: 'other' }))
    expect(reportCacheKey(done)).not.toBe(reportCacheKey({ ...done, userSide: 'red' }))
  })
})
