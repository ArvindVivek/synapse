/**
 * The post-draft report. Code computes every number (win chance, grade, lane edges, what each
 * team has and lacks); the AI only turns those facts into coaching sentences. When the AI isn't
 * available, `fallbackReport` writes the same report from the same facts, so a report never
 * depends on the model.
 */

import { ROLES, type Draft, type Role, type Side } from '@/lib/draft/types'
import { otherSide } from '@/lib/draft/draft'
import { hasTag } from './champions'
import { NEED_LABELS, damageMix, teamNeeds, type DamageMix, type Need } from './composition'
import { counterEdge, metaWinRate } from './meta'
import { assignRoles } from './roles'
import { forSide, projectWinRate } from './winrate'

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'
export type Advantage = 'favorable' | 'even' | 'unfavorable'

export const ROLE_LABELS: Record<Role, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  adc: 'Bot',
  support: 'Support',
}

export interface TeamProfile {
  picks: string[]
  roles: Record<Role, string | null>
  engage: number
  frontline: number
  peel: number
  damage: DamageMix
  needs: Need[]
}

export interface LaneFact {
  role: Role
  yours: string | null
  theirs: string | null
  /** Points of edge for you (counter edge plus the strength gap). */
  edge: number
  advantage: Advantage
}

export interface DraftFacts {
  side: Side
  winProbability: number
  grade: Grade
  you: TeamProfile
  enemy: TeamProfile
  lanes: LaneFact[]
}

export interface LaneInsight extends LaneFact {
  label: string
  tip: string
}

export interface DraftReport {
  /** "ai" when the model wrote the sentences, "fallback" when code did. */
  source: 'ai' | 'fallback'
  facts: DraftFacts
  summary: { winProbability: number; grade: Grade; keyStrengths: string[] }
  strategicAnalysis: { teamComp: string; winConditions: string[]; powerSpikes: string[] }
  matchupInsights: { lanes: LaneInsight[]; objectivePriorities: string[] }
  recommendations: { earlyGame: string[]; midGame: string[]; lateGame: string[] }
}

/** Synapse's original grade bands, on your win chance in percent. */
export function gradeFor(winPct: number): Grade {
  if (winPct >= 58) return 'S'
  if (winPct >= 54) return 'A'
  if (winPct >= 50) return 'B'
  if (winPct >= 46) return 'C'
  return 'D'
}

export const GRADE_LABELS: Record<Grade, string> = {
  S: 'Dominant draft',
  A: 'Strong draft',
  B: 'Solid, winnable draft',
  C: 'Uphill draft',
  D: 'Rough draft',
}

function profile(picks: string[]): TeamProfile {
  const assigned = assignRoles(picks)
  const roles = Object.fromEntries(ROLES.map((r) => [r, null])) as Record<Role, string | null>
  for (const [champion, role] of Object.entries(assigned)) roles[role] = champion
  return {
    picks,
    roles,
    engage: picks.filter((c) => hasTag(c, 'engage')).length,
    frontline: picks.filter((c) => hasTag(c, 'frontline')).length,
    peel: picks.filter((c) => hasTag(c, 'peel')).length,
    damage: damageMix(picks),
    needs: teamNeeds(picks),
  }
}

/** A lane is favorable or unfavorable past 2 points of edge; closer than that is even. */
const LANE_THRESHOLD = 0.02

export function laneEdge(yours: string, theirs: string): number {
  return counterEdge(yours, theirs) + (metaWinRate(yours) - metaWinRate(theirs)) * 0.5
}

export function draftFacts(draft: Draft): DraftFacts {
  const side = draft.userSide
  const you = profile(draft[side].picks)
  const enemy = profile(draft[otherSide(side)].picks)
  const projection = forSide(projectWinRate(draft.blue.picks, draft.red.picks), side)
  const winProbability = Math.round(projection.winRate * 100)
  const lanes = ROLES.map((role): LaneFact => {
    const yours = you.roles[role]
    const theirs = enemy.roles[role]
    const edge = yours && theirs ? Math.round(laneEdge(yours, theirs) * 1000) / 1000 : 0
    const advantage: Advantage = edge > LANE_THRESHOLD ? 'favorable' : edge < -LANE_THRESHOLD ? 'unfavorable' : 'even'
    return { role, yours, theirs, edge, advantage }
  })
  return { side, winProbability, grade: gradeFor(winProbability), you, enemy, lanes }
}

// ---------------------------------------------------------------------------------------------
// Code-written report (always available)

const listOf = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

function identity(t: TeamProfile): string {
  if (t.engage >= 2 && t.frontline >= 1) return 'an engage team built to start fights on its own terms'
  if (t.peel >= 1 && t.frontline >= 1 && t.engage <= 1) return 'a front-to-back team that protects its carries'
  if (t.frontline === 0) return 'a squishy team that wins through picks and poke rather than long fights'
  if (t.damage.ap >= 3) return 'a magic-heavy team that wins through area damage in fights'
  if (t.damage.ad >= 4) return 'a physical-damage team that wants early pressure'
  return 'a balanced team with answers in most phases'
}

function laneTip(l: LaneFact): string {
  if (!l.yours || !l.theirs) return 'Play for your team: this lane has no direct matchup.'
  if (l.advantage === 'favorable') return `${l.yours} has the edge over ${l.theirs}. Play forward early and turn lane pressure into objectives.`
  if (l.advantage === 'unfavorable') return `${l.theirs} has the edge. Give up a little farm rather than a kill, and ask your jungler for cover.`
  return `${l.yours} and ${l.theirs} are close. Whoever uses their jungler's timings better wins it.`
}

function objectives(f: DraftFacts): string[] {
  const out: string[] = []
  const strongEarly = f.lanes.filter((l) => l.advantage === 'favorable').map((l) => l.role)
  if (strongEarly.includes('adc') || strongEarly.includes('support')) out.push('First dragon: your bot lane can move first')
  else out.push('First dragon only with bot lane priority')
  if (strongEarly.includes('top') || strongEarly.includes('mid')) out.push('Rift Herald or Grubs to spread your lane lead')
  else out.push('Trade Grubs for dragon if the enemy commits top side')
  out.push(f.you.engage > f.enemy.engage ? 'Force fights on the third dragon for soul point' : 'Take the third dragon only with vision set up first')
  out.push('Baron after you win a fight, never before')
  return out
}

export function fallbackReport(f: DraftFacts): DraftReport {
  const { you, enemy } = f
  const strengths: string[] = []
  if (you.engage >= 1) strengths.push(`Fight starter${you.engage > 1 ? 's' : ''} on ${listOf(you.picks.filter((c) => hasTag(c, 'engage')))}`)
  if (you.frontline >= 1) strengths.push(`A frontline in ${listOf(you.picks.filter((c) => hasTag(c, 'frontline')))}`)
  if (you.damage.ap >= 1 && you.damage.ad >= 1) strengths.push('Both magic and physical damage, so armor alone won’t stop you')
  if (you.peel >= 1) strengths.push(`Protection for your carries from ${listOf(you.picks.filter((c) => hasTag(c, 'peel')))}`)
  const favorable = f.lanes.filter((l) => l.advantage === 'favorable')
  if (favorable.length) strengths.push(`Lane edges in ${listOf(favorable.map((l) => ROLE_LABELS[l.role].toLowerCase()))}`)
  if (strengths.length < 3) strengths.push(`${f.winProbability}% win chance from the draft alone`)

  const winConditions: string[] = []
  if (you.engage > enemy.engage) winConditions.push('Start the fights: you have more ways to engage than they do')
  if (enemy.needs.includes('frontline')) winConditions.push('Dive their backline: they have no one to stand in front')
  if (enemy.needs.includes('engage')) winConditions.push('Siege and poke towers: they struggle to start a fight on you')
  if (favorable.length) winConditions.push(`Snowball ${ROLE_LABELS[favorable[0].role].toLowerCase()} lane and move that lead to objectives`)
  winConditions.push('Keep vision around the next objective a minute before it spawns')
  winConditions.push('Group after two items, when your team fights best')

  const needsLine = you.needs.length
    ? ` It is missing ${listOf(you.needs.map((n) => NEED_LABELS[n]))}, so play around that gap.`
    : ''

  const carry = you.roles.adc ?? you.roles.mid ?? you.picks[0] ?? 'your carry'
  return {
    source: 'fallback',
    facts: f,
    summary: { winProbability: f.winProbability, grade: f.grade, keyStrengths: strengths.slice(0, 3) },
    strategicAnalysis: {
      teamComp: `This is ${identity(you)}.${needsLine}`,
      winConditions: winConditions.slice(0, 3),
      powerSpikes: [
        'Level 6: ultimates come online, so look for your first coordinated play',
        `Two items on ${carry}: your strongest window to force fights`,
      ],
    },
    matchupInsights: {
      lanes: f.lanes.map((l) => ({ ...l, label: ROLE_LABELS[l.role], tip: laneTip(l) })),
      objectivePriorities: objectives(f),
    },
    recommendations: {
      earlyGame: [
        favorable.length ? `Play through ${ROLE_LABELS[favorable[0].role].toLowerCase()}, your strongest lane` : 'Play safe lanes and let your jungler find the first opening',
        'Ward the enemy jungle entrance on the side your jungler starts',
      ],
      midGame: [
        you.engage >= 1 ? 'Group for objectives and start fights from vision, not face-checks' : 'Catch players out of position before objectives instead of fighting head on',
        'Send the side-laner with the best matchup to split while four hold mid',
      ],
      lateGame: ['Fight around Baron and Elder with vision set, never through a blind choke', `Keep ${carry} safe: one death here can lose the game`],
    },
  }
}

// ---------------------------------------------------------------------------------------------
// AI-written report: a compact prompt of computed facts in, short sentences out.

export const REPORT_SYSTEM = [
  'You are a League of Legends esports coach. Using only the facts given, write short, concrete',
  'post-draft advice for the player’s team. Plain English, no jargon a new player would not know,',
  'each item one sentence under 20 words. Do not invent numbers or champions.',
].join(' ')

/** The facts the model sees, one line each (about 150 tokens). */
export function reportPrompt(f: DraftFacts): string {
  const team = (t: TeamProfile) => ROLES.map((r) => `${ROLE_LABELS[r].toLowerCase()} ${t.roles[r] ?? '-'}`).join(', ')
  const comp = (t: TeamProfile) =>
    `engage ${t.engage}, frontline ${t.frontline}, peel ${t.peel}, damage magic ${t.damage.ap}/physical ${t.damage.ad}/mixed ${t.damage.mixed}; missing ${t.needs.length ? t.needs.map((n) => NEED_LABELS[n]).join(', ') : 'nothing'}`
  return [
    `Side: ${f.side}. Computed win chance ${f.winProbability}%, grade ${f.grade}.`,
    `Your team: ${team(f.you)}.`,
    `Enemy team: ${team(f.enemy)}.`,
    `Lanes: ${f.lanes.map((l) => `${ROLE_LABELS[l.role].toLowerCase()} ${l.advantage}`).join(', ')}.`,
    `Your comp: ${comp(f.you)}.`,
    `Enemy comp: ${comp(f.enemy)}.`,
  ].join('\n')
}

const stringList = { type: 'array', items: { type: 'string' } }

/** Strict-mode schema (pinned by report.test.ts). Lengths are enforced in code. */
export const REPORT_SCHEMA = {
  name: 'draft_report',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['teamComp', 'keyStrengths', 'winConditions', 'powerSpikes', 'laneTips', 'earlyGame', 'midGame', 'lateGame'],
    properties: {
      teamComp: { type: 'string', description: 'One or two sentences on what this team is and how it wins.' },
      keyStrengths: { ...stringList, description: 'Exactly 3.' },
      winConditions: { ...stringList, description: 'Exactly 3.' },
      powerSpikes: { ...stringList, description: 'Exactly 2.' },
      laneTips: {
        type: 'array',
        description: 'One per lane, all five.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['role', 'tip'],
          properties: { role: { type: 'string', enum: ROLES }, tip: { type: 'string' } },
        },
      },
      earlyGame: { ...stringList, description: 'Exactly 2.' },
      midGame: { ...stringList, description: 'Exactly 2.' },
      lateGame: { ...stringList, description: 'Exactly 2.' },
    },
  },
} as const

export interface AIReportText {
  teamComp: string
  keyStrengths: string[]
  winConditions: string[]
  powerSpikes: string[]
  laneTips: { role: Role; tip: string }[]
  earlyGame: string[]
  midGame: string[]
  lateGame: string[]
}

const clean = (list: unknown, n: number, fallback: string[]): string[] => {
  const items = Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : []
  return items.length >= Math.min(n, 1) ? items.slice(0, n) : fallback.slice(0, n)
}

/**
 * Puts the model's sentences into the report around the computed facts. Anything missing or
 * malformed falls back to the code-written line, so a partial answer still makes a full report.
 */
export function mergeAIReport(f: DraftFacts, ai: AIReportText): DraftReport {
  const base = fallbackReport(f)
  const tips = new Map((Array.isArray(ai.laneTips) ? ai.laneTips : []).map((t) => [t.role, t.tip]))
  return {
    source: 'ai',
    facts: f,
    summary: { ...base.summary, keyStrengths: clean(ai.keyStrengths, 3, base.summary.keyStrengths) },
    strategicAnalysis: {
      teamComp: typeof ai.teamComp === 'string' && ai.teamComp.trim() ? ai.teamComp.trim() : base.strategicAnalysis.teamComp,
      winConditions: clean(ai.winConditions, 3, base.strategicAnalysis.winConditions),
      powerSpikes: clean(ai.powerSpikes, 2, base.strategicAnalysis.powerSpikes),
    },
    matchupInsights: {
      lanes: base.matchupInsights.lanes.map((l) => {
        const tip = tips.get(l.role)
        return typeof tip === 'string' && tip.trim() ? { ...l, tip: tip.trim() } : l
      }),
      objectivePriorities: base.matchupInsights.objectivePriorities,
    },
    recommendations: {
      earlyGame: clean(ai.earlyGame, 2, base.recommendations.earlyGame),
      midGame: clean(ai.midGame, 2, base.recommendations.midGame),
      lateGame: clean(ai.lateGame, 2, base.recommendations.lateGame),
    },
  }
}

/** A stable key for a finished draft, so the same draft never pays for a second AI report. */
export function reportCacheKey(d: Draft): string {
  return [d.userSide, d.blue.picks.join(','), d.red.picks.join(',')].join('|')
}
