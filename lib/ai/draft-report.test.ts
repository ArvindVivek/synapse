import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { newDraft } from '@/lib/draft/draft'
import type { Draft } from '@/lib/draft/types'
import { resetReportState, writeReport } from './draft-report'

const done: Draft = {
  ...newDraft({ id: 'ai', userSide: 'red', now: new Date('2026-09-29T12:00:00Z') }),
  blue: { bans: ['Azir', 'Viego', 'Rell', 'Yuumi', 'Zeri'], picks: ['Gnar', 'Sejuani', 'Orianna', 'Jinx', 'Lulu'] },
  red: { bans: ['Kalista', 'Ahri', 'Corki', 'Vi', 'Braum'], picks: ['Aatrox', 'Lee Sin', 'Syndra', "Kai'Sa", 'Nautilus'] },
}

const aiText = {
  teamComp: 'A dive team.',
  keyStrengths: ['s1', 's2', 's3'],
  winConditions: ['w1', 'w2', 'w3'],
  powerSpikes: ['p1', 'p2'],
  laneTips: ['top', 'jungle', 'mid', 'adc', 'support'].map((role) => ({ role, tip: `${role} tip` })),
  earlyGame: ['e1', 'e2'],
  midGame: ['m1', 'm2'],
  lateGame: ['l1', 'l2'],
}

function okResponse() {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(aiText) }, finish_reason: 'stop' }], usage: { prompt_tokens: 240, completion_tokens: 380 } }),
    { status: 200 },
  )
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  resetReportState()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('OPENAI_API_KEY', 'test-key-not-real')
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('writeReport', () => {
  it('asks gpt-5.4-mini at low effort with a strict schema and a token cap', async () => {
    fetchMock.mockResolvedValueOnce(okResponse())
    const r = await writeReport(done, { visitor: 'v1' })
    expect(r.report.source).toBe('ai')
    expect(r.report.strategicAnalysis.teamComp).toBe('A dive team.')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.model).toBe('gpt-5.4-mini')
    expect(body.reasoning_effort).toBe('low')
    expect(body.max_completion_tokens).toBe(1600)
    expect(body.response_format.json_schema.strict).toBe(true)
    expect(body.messages[1].content.length).toBeLessThan(900)
  })

  it('serves the same finished draft from cache without a second call', async () => {
    fetchMock.mockResolvedValueOnce(okResponse())
    await writeReport(done, { visitor: 'v2' })
    const again = await writeReport({ ...done, id: 'another-id' }, { visitor: 'v2' })
    expect(again.report.source).toBe('ai')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back at once when the account is out of credit, and pauses AI (no retry loop)', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'insufficient_quota', message: 'You exceeded your current quota' } }), { status: 429 }),
    )
    const first = await writeReport(done, { visitor: 'v3', now: 1_000 })
    expect(first.report.source).toBe('fallback')
    expect(first.notice).toBe('ai_unavailable')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const second = await writeReport(done, { visitor: 'v3', now: 2_000 })
    expect(second.report.source).toBe('fallback')
    expect(fetchMock).toHaveBeenCalledTimes(1) // paused: nothing sent
  })

  it('never calls OpenAI without a key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const r = await writeReport(done, { visitor: 'v4' })
    expect(r.report.source).toBe('fallback')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('limits one visitor to four AI reports in ten minutes', async () => {
    fetchMock.mockImplementation(async () => okResponse())
    const drafts = Array.from({ length: 5 }, (_, i): Draft => ({ ...done, userSide: i % 2 ? 'red' : 'blue', blue: { ...done.blue, picks: [...done.blue.picks.slice(0, 4), ['Lulu', 'Janna', 'Karma', 'Thresh', 'Leona'][i]] } }))
    const results = []
    for (const d of drafts) results.push(await writeReport(d, { visitor: 'v5' }))
    expect(results.slice(0, 4).every((r) => r.report.source === 'ai')).toBe(true)
    expect(results[4]).toMatchObject({ notice: 'rate_limited', report: { source: 'fallback' } })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
