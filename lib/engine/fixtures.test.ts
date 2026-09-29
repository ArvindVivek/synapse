import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import metaJson from '@/lib/fixtures/meta.json'
import { ROLES } from '@/lib/draft/types'
import { ALL_CHAMPIONS, CHAMPIONS, isChampion, playsRole } from './champions'
import { TEAMS, comfortLevel, findPlayer, getTeam } from './teams'

const root = fileURLToPath(new URL('../../', import.meta.url))

describe('champion fixture', () => {
  it('has 70 unique champions with a bundled icon each', () => {
    expect(CHAMPIONS).toHaveLength(70)
    expect(new Set(ALL_CHAMPIONS).size).toBe(70)
    for (const c of CHAMPIONS) {
      expect(existsSync(`${root}public/champions/${c.img}.png`), c.name).toBe(true)
      expect(c.roles.length).toBeGreaterThan(0)
      for (const r of c.roles) expect(ROLES).toContain(r)
    }
  })

  it('covers every role with at least eight champions', () => {
    for (const role of ROLES) expect(CHAMPIONS.filter((c) => c.roles.includes(role)).length).toBeGreaterThanOrEqual(8)
  })

  it('only names pooled champions in the meta tables', () => {
    for (const name of Object.keys(metaJson.winRates)) expect(isChampion(name), name).toBe(true)
    for (const [a, b] of [...metaJson.synergies, ...metaJson.counters] as [string, string, number][]) {
      expect(isChampion(a), a).toBe(true)
      expect(isChampion(b), b).toBe(true)
    }
    for (const v of Object.values(metaJson.winRates)) expect(v).toBeGreaterThan(0.4)
  })
})

describe('sample teams fixture', () => {
  it('has 8 fictional teams with one player per role and legal pools', () => {
    expect(TEAMS).toHaveLength(8)
    for (const team of TEAMS) {
      expect(team.tag).toMatch(/^[A-Z]{3}$/)
      expect(team.players.map((p) => p.role)).toEqual([...ROLES])
      for (const p of team.players) {
        expect(p.pool.length).toBeGreaterThanOrEqual(5)
        for (const e of p.pool) {
          expect(playsRole(e.champion, p.role), `${p.name} ${e.champion}`).toBe(true)
          expect(e.wins).toBeLessThanOrEqual(e.games)
          expect(e.games).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('stays small enough to bundle', () => {
    for (const f of ['champions', 'meta', 'teams']) {
      expect(readFileSync(`${root}lib/fixtures/${f}.json`).length).toBeLessThan(12_000)
    }
  })

  it('finds players by id or by name', () => {
    const team = TEAMS[0]
    expect(findPlayer(team.players[2].id)?.player.name).toBe(team.players[2].name)
    expect(findPlayer(team.players[2].name.toUpperCase())?.team.id).toBe(team.id)
    expect(findPlayer('Faker')).toBeNull()
    expect(getTeam('nope')).toBeNull()
  })
})

describe('comfortLevel', () => {
  it('uses the original thresholds', () => {
    expect(comfortLevel(10, 0.55)).toBe('signature')
    expect(comfortLevel(10, 0.54)).toBe('comfort')
    expect(comfortLevel(5, 0.5)).toBe('comfort')
    expect(comfortLevel(4, 0.9)).toBe('occasional')
    expect(comfortLevel(2, 1)).toBe('rare')
  })
})
