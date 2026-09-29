import { describe, expect, it } from 'vitest'
import { assignRoles, openRoles, roleFit } from './roles'

describe('assignRoles', () => {
  it('puts a standard lineup in its lanes whatever the pick order', () => {
    expect(assignRoles(['Lulu', 'Jinx', 'Orianna', 'Sejuani', 'Gnar'])).toEqual({
      Lulu: 'support', Jinx: 'adc', Orianna: 'mid', Sejuani: 'jungle', Gnar: 'top',
    })
  })

  it('moves a flex champion to the role that is left', () => {
    // Jayce is top first, but Gnar holds top, so Jayce goes mid.
    expect(assignRoles(['Gnar', 'Jayce'])).toMatchObject({ Gnar: 'top', Jayce: 'mid' })
    expect(openRoles(['Gnar', 'Jayce'])).toEqual(['jungle', 'adc', 'support'])
  })

  it('still places champions off-role when it must', () => {
    const roles = assignRoles(['Orianna', 'Syndra'])
    expect(new Set(Object.values(roles)).size).toBe(2)
    expect(roleFit('Syndra', 'support')).toBe(0)
  })
})
