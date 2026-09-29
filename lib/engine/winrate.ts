/**
 * Win chance for a draft, with a breakdown a person can read.
 *
 * Everything is computed from the final teams, so the same draft always gives the same number
 * whatever order the picks came in. (The original projector added picks one at a time and some
 * bonuses only counted for the later champion of a pair, so Orianna then Sejuani and Sejuani then
 * Orianna scored differently: pinned by winrate.test.ts.)
 */

import type { Side } from '@/lib/draft/types'
import { damageOf, hasTag } from './champions'
import { counterEdge, metaWinRate, pairSynergy, SIDE_ADVANTAGE } from './meta'

/** Points of win chance, as fractions (0.03 = 3 points). Blue side's view. */
export interface WinRateBreakdown {
  /** Champion strength: each pick's estimated win rate against 50%. */
  baseComposition: number
  /** How well each team's champions work together. */
  synergies: number
  /** Head-to-head edges between the two teams. */
  matchups: number
  /** Blue side's first-pick edge. */
  sideAdvantage: number
}

export interface WinRateProjection {
  blueWinRate: number
  redWinRate: number
  breakdown: WinRateBreakdown
  confidence: 'low' | 'medium' | 'high'
  picksMade: number
}

/** Half weight: a 55% champion adds 2.5 points, so five strong picks can't run away with it. */
const STRENGTH_WEIGHT = 0.5
/** One champion's strength, synergy or matchup share can move the result 5 points at most. */
const PER_CHAMPION_CAP = 0.05
/** A whole team's synergy (or matchup) total is capped at 12 points. */
const TEAM_CAP = 0.12

const clamp = (v: number, cap: number) => Math.max(-cap, Math.min(cap, v))
const round = (v: number) => Math.round(v * 10_000) / 10_000

export function teamStrength(picks: readonly string[]): number {
  return picks.reduce((sum, c) => sum + clamp((metaWinRate(c) - 0.5) * STRENGTH_WEIGHT, PER_CHAMPION_CAP), 0)
}

/** Composition bonuses a champion earns from its teammates (the original rules). */
function teamworkBonus(champion: string, mates: readonly string[]): number {
  if (mates.length === 0) return 0
  let bonus = 0
  const damage = damageOf(champion)
  const frontline = hasTag(champion, 'frontline')
  const matesEngage = mates.some((m) => hasTag(m, 'engage'))
  const matesPeel = mates.some((m) => hasTag(m, 'peel'))
  const matesFrontline = mates.some((m) => hasTag(m, 'frontline'))
  if (matesEngage && damage === 'ap') bonus += 0.04 // follow-up magic damage after an engage
  if (matesEngage && damage === 'ad' && !frontline) bonus += 0.03
  if (matesPeel && !frontline) bonus += 0.03 // carries protected by peel
  if (matesFrontline && !frontline) bonus += 0.02
  if (!matesFrontline && frontline) bonus += 0.03 // fills the frontline
  return bonus
}

export function teamSynergy(picks: readonly string[]): number {
  let pairs = 0
  for (let i = 0; i < picks.length; i++) {
    for (let j = i + 1; j < picks.length; j++) pairs += pairSynergy(picks[i], picks[j])
  }
  // Each champion's teamwork is judged against all its teammates, then halved: the original
  // counted each relationship once, from whichever champion came second.
  let teamwork = 0
  for (const c of picks) {
    teamwork += clamp(teamworkBonus(c, picks.filter((m) => m !== c)), PER_CHAMPION_CAP) / 2
  }
  return clamp(pairs + teamwork, TEAM_CAP)
}

/** Composition edges one champion has over the enemy team (the original rules). */
function matchupBonus(champion: string, enemies: readonly string[]): number {
  if (enemies.length === 0) return 0
  let bonus = 0
  const enemyDamage = enemies.map(damageOf).filter(Boolean)
  if (hasTag(champion, 'frontline') && enemyDamage.length > 0 && enemyDamage.every((d) => d === 'ad')) bonus += 0.05
  if (damageOf(champion) === 'mixed' && enemies.some((e) => hasTag(e, 'frontline'))) bonus += 0.03
  if (hasTag(champion, 'engage') && !enemies.some((e) => hasTag(e, 'frontline'))) bonus += 0.03
  return bonus
}

/** Blue's matchup edge over red (negative when red has the edge). */
export function matchupEdge(blue: readonly string[], red: readonly string[]): number {
  let heads = 0
  for (const b of blue) for (const r of red) heads += counterEdge(b, r)
  const blueBonus = blue.reduce((s, c) => s + clamp(matchupBonus(c, red), PER_CHAMPION_CAP), 0)
  const redBonus = red.reduce((s, c) => s + clamp(matchupBonus(c, blue), PER_CHAMPION_CAP), 0)
  return clamp(heads + (blueBonus - redBonus) / 2, TEAM_CAP)
}

export function projectWinRate(bluePicks: readonly string[], redPicks: readonly string[]): WinRateProjection {
  const breakdown: WinRateBreakdown = {
    baseComposition: round(teamStrength(bluePicks) - teamStrength(redPicks)),
    synergies: round(teamSynergy(bluePicks) - teamSynergy(redPicks)),
    matchups: round(matchupEdge(bluePicks, redPicks)),
    sideAdvantage: SIDE_ADVANTAGE,
  }
  const total =
    0.5 + breakdown.baseComposition + breakdown.synergies + breakdown.matchups + breakdown.sideAdvantage
  // Never show a sure thing: a draft alone doesn't decide a game.
  const blueWinRate = round(Math.max(0.05, Math.min(0.95, total)))
  const picksMade = bluePicks.length + redPicks.length
  return {
    blueWinRate,
    redWinRate: round(1 - blueWinRate),
    breakdown,
    confidence: picksMade >= 6 ? 'high' : picksMade >= 1 ? 'medium' : 'low',
    picksMade,
  }
}

/**
 * The projection from one side's point of view: its win chance and every part of the breakdown
 * signed for that side. (The original only flipped the side advantage for red, so a red player
 * saw blue's synergy as their own.)
 */
export function forSide(p: WinRateProjection, side: Side) {
  // `|| 0` turns -0 into 0, so a red player never sees "-0".
  const signed = (v: number) => (side === 'blue' ? v : -v) || 0
  return {
    winRate: side === 'blue' ? p.blueWinRate : p.redWinRate,
    breakdown: {
      baseComposition: signed(p.breakdown.baseComposition),
      synergies: signed(p.breakdown.synergies),
      matchups: signed(p.breakdown.matchups),
      sideAdvantage: signed(p.breakdown.sideAdvantage),
    } satisfies WinRateBreakdown,
    confidence: p.confidence,
  }
}
