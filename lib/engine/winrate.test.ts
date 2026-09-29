import { describe, expect, it } from 'vitest'
import { forSide, projectWinRate } from './winrate'

describe('projectWinRate', () => {
  it('starts at 52% for blue: the first-pick side edge', () => {
    const p = projectWinRate([], [])
    expect(p.blueWinRate).toBe(0.52)
    expect(p.confidence).toBe('low')
  })

  // Bug (proven on the live site, 2026-09-29): /api/draft/x/winrate?bluePicks=Orianna,Sejuani&redPicks=Aatrox
  // returned synergies 0.05 / matchups 0.05, and bluePicks=Sejuani,Orianna returned 0.09 / 0.
  // The old projector added picks one at a time and some bonuses only counted for the later pick.
  it('gives the same answer whatever order the picks arrive in', () => {
    const a = projectWinRate(['Orianna', 'Sejuani'], ['Aatrox'])
    const b = projectWinRate(['Sejuani', 'Orianna'], ['Aatrox'])
    expect(b).toEqual(a)
    const full1 = projectWinRate(['Gnar', 'Sejuani', 'Orianna', 'Jinx', 'Lulu'], ['Aatrox', 'Viego', 'Syndra', "Kai'Sa", 'Nautilus'])
    const full2 = projectWinRate(['Lulu', 'Jinx', 'Orianna', 'Sejuani', 'Gnar'], ['Nautilus', "Kai'Sa", 'Syndra', 'Viego', 'Aatrox'])
    expect(full2).toEqual(full1)
  })

  it('is mirror-symmetric apart from the side edge', () => {
    const blue = ['Gnar', 'Sejuani', 'Orianna']
    const red = ['Aatrox', 'Viego', 'LeBlanc']
    const p = projectWinRate(blue, red)
    const q = projectWinRate(red, blue)
    expect(p.breakdown.synergies).toBeCloseTo(-q.breakdown.synergies, 6)
    expect(p.breakdown.matchups).toBeCloseTo(-q.breakdown.matchups, 6)
    expect(p.blueWinRate - 0.52).toBeCloseTo(-(q.blueWinRate - 0.52), 6)
  })

  it('rewards a known synergy and a known counter', () => {
    expect(projectWinRate(['Xayah', 'Rakan'], []).breakdown.synergies).toBeGreaterThan(0.1)
    expect(projectWinRate(['Fiora'], ['Jax']).breakdown.matchups).toBeGreaterThan(0)
    expect(projectWinRate(['Jax'], ['Fiora']).breakdown.matchups).toBeLessThan(0)
  })

  it('keeps full drafts in a believable range and adds up', () => {
    const p = projectWinRate(['Gnar', 'Sejuani', 'Orianna', 'Jinx', 'Lulu'], ['Kennen', 'Nidalee', 'Zoe', 'Kalista', 'Morgana'])
    expect(p.blueWinRate).toBeLessThan(0.8)
    expect(p.blueWinRate).toBeGreaterThan(0.5)
    const b = p.breakdown
    expect(p.blueWinRate).toBeCloseTo(0.5 + b.baseComposition + b.synergies + b.matchups + b.sideAdvantage, 3)
    expect(p.blueWinRate + p.redWinRate).toBeCloseTo(1, 6)
    expect(p.confidence).toBe('high')
  })
})

describe('forSide', () => {
  // Bug: the old useWinRate hook flipped only sideAdvantage for a red player, so red saw blue's
  // synergies and matchups as its own.
  it('signs every part of the breakdown for the red side', () => {
    const p = projectWinRate(['Xayah', 'Rakan'], ['Aatrox'])
    const red = forSide(p, 'red')
    expect(red.winRate).toBe(p.redWinRate)
    expect(red.breakdown.synergies).toBe(-p.breakdown.synergies)
    expect(red.breakdown.baseComposition).toBe(-p.breakdown.baseComposition)
    expect(red.breakdown.matchups).toBe(-p.breakdown.matchups || 0)
    expect(red.breakdown.sideAdvantage).toBe(-0.02)
    const r = red.breakdown
    expect(red.winRate).toBeCloseTo(0.5 + r.baseComposition + r.synergies + r.matchups + r.sideAdvantage, 3)
    expect(Object.is(forSide(projectWinRate([], []), 'red').breakdown.synergies, -0)).toBe(false)
  })
})
