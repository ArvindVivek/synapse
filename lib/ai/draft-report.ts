import 'server-only'

/**
 * Writes the post-draft report. Only runs when a person taps "Write the coach's report"; nothing
 * calls it on a schedule (owner rule: no recurring AI cost).
 *
 * Cost controls, in order:
 * 1. Same finished draft, same report: answers are cached by side and picks (no second call).
 * 2. A per-visitor speed bump: 4 AI reports per 10 minutes, then the code-written report.
 * 3. If OpenAI says the account is out of credit (429 insufficient_quota) or the key is refused,
 *    AI pauses for 15 minutes. No retries: a failed call gets the code-written report at once.
 * The code-written report (fallbackReport) uses the same computed facts, so people always get one.
 */

import { AIError, generateJSON, toAIError } from '@/lib/kl/ai'
import { createRateLimiter } from '@/lib/kl/rate-limit'
import type { Draft } from '@/lib/draft/types'
import {
  draftFacts,
  fallbackReport,
  mergeAIReport,
  REPORT_SCHEMA,
  REPORT_SYSTEM,
  reportCacheKey,
  reportPrompt,
  type AIReportText,
  type DraftReport,
} from '@/lib/engine/report'

/** Four reports in ten minutes is plenty for a person finishing drafts by hand. */
const limiter = createRateLimiter({ limit: 4, windowMs: 10 * 60_000 })
/** Enough to stop a billing or key problem from being retried on every tap. */
const PAUSE_MS = 15 * 60_000
/** Visible answer is ~350 tokens; low reasoning needs headroom inside the same cap. */
const MAX_OUTPUT_TOKENS = 1_600
const CACHE_LIMIT = 200

const cache = new Map<string, DraftReport>()
let pausedUntil = 0

export type ReportNotice = 'ai_unavailable' | 'rate_limited' | null

export interface ReportResult {
  report: DraftReport
  notice: ReportNotice
}

/** Test hook: forget cached reports and the pause. */
export function resetReportState() {
  cache.clear()
  pausedUntil = 0
}

function outOfCredit(err: AIError): boolean {
  const detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail ?? '')
  return err.code === 'not_configured' || /insufficient_quota|billing|credit/i.test(detail)
}

export async function writeReport(draft: Draft, opts: { visitor: string; signal?: AbortSignal; now?: number }): Promise<ReportResult> {
  const now = opts.now ?? Date.now()
  const facts = draftFacts(draft)
  const key = reportCacheKey(draft)
  const cached = cache.get(key)
  if (cached) return { report: { ...cached, facts }, notice: null }

  if (!process.env.OPENAI_API_KEY || now < pausedUntil) {
    return { report: fallbackReport(facts), notice: 'ai_unavailable' }
  }
  if (!limiter.check(opts.visitor).ok) {
    return { report: fallbackReport(facts), notice: 'rate_limited' }
  }

  try {
    const text = await generateJSON<AIReportText>({
      system: REPORT_SYSTEM,
      user: reportPrompt(facts),
      schema: REPORT_SCHEMA,
      reasoningEffort: 'low',
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      label: 'draft-report',
      signal: opts.signal,
    })
    const report = mergeAIReport(facts, text)
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
    cache.set(key, report)
    return { report, notice: null }
  } catch (err) {
    const e = toAIError(err)
    if (outOfCredit(e)) {
      pausedUntil = now + PAUSE_MS
      console.error('[ai] draft-report: OpenAI refused the key or the account is out of credit; AI paused for 15 minutes', e.code)
    } else {
      console.error(`[ai] draft-report failed (${e.code}); sent the code-written report`, e.detail)
    }
    console.info('[ai] provider: fallback label=draft-report')
    return { report: fallbackReport(facts), notice: 'ai_unavailable' }
  }
}
