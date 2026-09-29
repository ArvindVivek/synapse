import { describe, expect, it } from 'vitest'
import { newDraft } from '@/lib/draft/draft'
import { capAndNormalise, predictPicks } from './predict'
import { TEAMS } from './teams'

describe('capAndNormalise', () => {
  it('adds to 1 with nothing above 50%', () => {
    const p = capAndNormalise([10, 1, 1])
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
    expect(Math.max(...p)).toBeCloseTo(0.5, 9)
    expect(p[1]).toBeCloseTo(0.25, 9)
  })
  it('handles all zeros', () => {
    expect(capAndNormalise([0, 0])).toEqual([0, 0])
  })
})

describe('predictPicks', () => {
  const player = TEAMS[0].players[2]

  it('ranks the player’s pool and adds up to 100%', () => {
    const d = newDraft({ id: 'p', userSide: 'blue', opponentTeamId: TEAMS[0].id })
    const all = predictPicks(d, player, 99)
    expect(all).toHaveLength(player.pool.length)
    expect(all.reduce((s, p) => s + p.probability, 0)).toBeCloseTo(1, 6)
    for (const p of all) expect(p.probability).toBeLessThanOrEqual(0.5 + 1e-9)
  })

  it('drops champions that are banned or picked', () => {
    const top = player.pool[0].champion
    const d = { ...newDraft({ id: 'p2', userSide: 'blue' }), blue: { bans: [top], picks: [] } }
    expect(predictPicks(d, player).map((p) => p.champion)).not.toContain(top)
  })
})
