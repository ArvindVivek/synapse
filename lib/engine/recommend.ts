/**
 * Pick and ban advice for the side about to move. Pure: same draft in, same advice out.
 *
 * Picks: a weighted mix of synergy with your picks, edges over theirs, what your composition is
 * missing, champion strength and flex value, with weights that shift through the draft (flex
 * early, counter-picks late). Champions that can't fill a role you still need are held back.
 * Bans: how dangerous a champion is in the enemy's hands: their players' comfort picks (when a
 * sample opponent is chosen), strength, how hard it beats your picks, and how well it fits theirs.
 */

import type { Draft, Role, Side } from '@/lib/draft/types'
import { availableChampions, currentTurn, otherSide, turnInfo } from '@/lib/draft/draft'
import { getChampion, rolesOf } from './champions'
import { NEED_LABELS, needsFilled, teamNeeds } from './composition'
import { counterEdge, metaWinRate, pairSynergy } from './meta'
import { openRoles } from './roles'
import { getTeam, type Team } from './teams'

export interface ScoreBreakdown {
  synergy: number
  counter: number
  composition: number
  strength: number
  flex: number
}

export interface Recommendation {
  champion: string
  kind: 'pick' | 'ban'
  /** 0-1, higher is better advice. */
  totalScore: number
  scores: ScoreBreakdown
  /** Plain-English reasons, strongest first. */
  reasoning: string[]
}

export interface Weights {
  synergy: number
  counter: number
  composition: number
  strength: number
  flex: number
}

/** Early picks hide intent (flex), late picks answer the enemy (counter). Each set sums to 1. */
export const PICK_WEIGHTS: Record<'early' | 'mid' | 'late', Weights> = {
  early: { synergy: 0.15, counter: 0.1, composition: 0.2, strength: 0.25, flex: 0.3 },
  mid: { synergy: 0.25, counter: 0.2, composition: 0.2, strength: 0.25, flex: 0.1 },
  late: { synergy: 0.25, counter: 0.35, composition: 0.15, strength: 0.2, flex: 0.05 },
}

/** Turns 1-9 early, 10-16 mid, 17-20 late (the original split). */
export function draftStage(turn: number): 'early' | 'mid' | 'late' {
  if (turn <= 9) return 'early'
  if (turn <= 16) return 'mid'
  return 'late'
}

/** Squashes a sum of small edges (a few points) into 0-1, 0.5 when there's nothing to go on. */
const sigmoid = (x: number) => 1 / (1 + Math.exp(-8 * x))
/** 55% estimated wins maps to 0.75, 45% to 0.25. */
const strengthScore = (c: string) => Math.max(0, Math.min(1, 0.5 + (metaWinRate(c) - 0.5) * 5))
const pct = (v: number) => `${Math.round(v * 100)}%`
/** Held back (not hidden) when a champion can't fill any role the team still needs. */
const OFF_ROLE_FACTOR = 0.55

const ROLE_WORDS: Record<Role, string> = { top: 'top', jungle: 'jungle', mid: 'mid', adc: 'bot', support: 'support' }

function joinWords(words: string[]): string {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`
}

export function scorePick(champion: string, ours: readonly string[], theirs: readonly string[], turn: number): Recommendation {
  const w = PICK_WEIGHTS[draftStage(turn)]
  const reasons: [number, string][] = []

  let synergySum = 0
  for (const mate of ours) {
    const s = pairSynergy(champion, mate)
    synergySum += s
    if (s >= 0.04) reasons.push([s, `Works well with your ${mate}`])
  }

  let counterSum = 0
  for (const enemy of theirs) {
    const e = counterEdge(champion, enemy)
    counterSum += e
    if (e >= 0.04) reasons.push([e + 0.01, `Beats their ${enemy} head to head`])
    if (e <= -0.04) reasons.push([-1, `Careful: their ${enemy} beats it`])
  }

  const needs = teamNeeds(ours)
  const filled = needsFilled(champion, needs)
  for (const n of filled) reasons.push([0.045, `Adds ${NEED_LABELS[n]} your team is missing`])

  const open = openRoles(ours)
  const fitsOpen = rolesOf(champion).some((r) => open.includes(r))

  const flexInfo = getChampion(champion)?.flex
  if (flexInfo && draftStage(turn) === 'early') {
    reasons.push([0.035, `Flex pick: can go ${joinWords(flexInfo.roles.map((r) => ROLE_WORDS[r]))}, so they can't read your plan`])
  }
  const wr = metaWinRate(champion)
  if (wr >= 0.53) reasons.push([0.03, `Strong right now: about ${pct(wr)} wins`])

  const scores: ScoreBreakdown = {
    synergy: ours.length ? sigmoid(synergySum) : 0.5,
    counter: theirs.length ? sigmoid(counterSum) : 0.5,
    composition: Math.min(1, 0.5 + 0.1 * filled.length),
    strength: strengthScore(champion),
    flex: flexInfo ? 0.5 + flexInfo.score * 0.5 : 0.5,
  }
  let total =
    scores.synergy * w.synergy +
    scores.counter * w.counter +
    scores.composition * w.composition +
    scores.strength * w.strength +
    scores.flex * w.flex
  if (!fitsOpen) {
    total *= OFF_ROLE_FACTOR
    reasons.push([-2, `Your team already has its ${joinWords(rolesOf(champion).map((r) => ROLE_WORDS[r]))} player`])
  }

  return { champion, kind: 'pick', totalScore: total, scores, reasoning: sortReasons(reasons) }
}

function sortReasons(reasons: [number, string][]): string[] {
  const positive = reasons.filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0])
  const warnings = reasons.filter(([s]) => s < 0).sort((a, b) => a[0] - b[0])
  return [...positive, ...warnings].map(([, text]) => text).slice(0, 4)
}

/** How much the enemy's players like a champion, for the roles they still have to fill. */
function enemyComfort(champion: string, team: Team | null, enemyPicks: readonly string[]) {
  if (!team) return null
  const open = openRoles(enemyPicks)
  let best: { score: number; reason: string } | null = null
  for (const player of team.players) {
    if (!open.includes(player.role)) continue
    const entry = player.pool.find((p) => p.champion === champion)
    if (!entry) continue
    const score = { signature: 1, comfort: 0.75, occasional: 0.45, rare: 0.2 }[entry.comfort]
    if (!best || score > best.score) {
      const label = { signature: 'signature pick', comfort: 'comfort pick', occasional: 'pocket pick', rare: 'rare pick' }[entry.comfort]
      best = { score, reason: `${player.name}'s ${label}: ${entry.games} games, ${pct(entry.winRate)} wins` }
    }
  }
  return best
}

export function scoreBan(champion: string, ours: readonly string[], theirs: readonly string[], team: Team | null): Recommendation {
  const reasons: [number, string][] = []
  const comfort = enemyComfort(champion, team, theirs)
  if (comfort) reasons.push([0.1 * comfort.score, comfort.reason])

  let beatsUs = 0
  for (const mine of ours) {
    const e = counterEdge(champion, mine)
    beatsUs += e
    if (e >= 0.04) reasons.push([e + 0.01, `Beats your ${mine}`])
  }
  let fitsThem = 0
  for (const enemy of theirs) {
    const s = pairSynergy(champion, enemy)
    fitsThem += s
    if (s >= 0.04) reasons.push([s, `Works well with their ${enemy}`])
  }
  const wr = metaWinRate(champion)
  if (wr >= 0.53) reasons.push([0.03, `Strong right now: about ${pct(wr)} wins`])
  const flexInfo = getChampion(champion)?.flex

  const scores: ScoreBreakdown = {
    synergy: theirs.length ? sigmoid(fitsThem) : 0.5,
    counter: ours.length ? sigmoid(beatsUs) : 0.5,
    composition: comfort?.score ?? 0,
    strength: strengthScore(champion),
    flex: flexInfo ? 0.5 + flexInfo.score * 0.5 : 0.5,
  }
  // With a scouted opponent their comfort picks lead; without one, strength and counters do.
  const w = team
    ? { synergy: 0.1, counter: 0.2, composition: 0.35, strength: 0.25, flex: 0.1 }
    : { synergy: 0.15, counter: 0.3, composition: 0, strength: 0.45, flex: 0.1 }
  const total =
    scores.synergy * w.synergy +
    scores.counter * w.counter +
    scores.composition * w.composition +
    scores.strength * w.strength +
    scores.flex * w.flex

  return { champion, kind: 'ban', totalScore: total, scores, reasoning: sortReasons(reasons) }
}

export interface RecommendationSet {
  side: Side
  action: 'ban' | 'pick'
  turn: number
  recommendations: Recommendation[]
  candidatesScored: number
}

/**
 * Advice for whoever moves next in `draft` (the user, in the app). Returns null once the draft
 * is over. `limit` recommendations, best first; ties break alphabetically so the list is stable.
 */
export function recommend(draft: Draft, limit = 5): RecommendationSet | null {
  const turn = turnInfo(draft)
  if (!turn) return null
  const side = turn.side
  const ours = draft[side].picks
  const theirs = draft[otherSide(side)].picks
  // Scouting describes the opponent team, so it only applies when the user is the one moving.
  const team = side === draft.userSide ? getTeam(draft.opponentTeamId) : null
  const candidates = availableChampions(draft)
  const scored = candidates.map((c) =>
    turn.action === 'ban' ? scoreBan(c, ours, theirs, team) : scorePick(c, ours, theirs, currentTurn(draft)),
  )
  scored.sort((a, b) => b.totalScore - a.totalScore || a.champion.localeCompare(b.champion))
  return { side, action: turn.action, turn: turn.turnNumber, recommendations: scored.slice(0, limit), candidatesScored: candidates.length }
}
