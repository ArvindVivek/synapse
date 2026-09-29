import { describe, expect, it } from 'vitest'
import {
  applyAction,
  availableChampions,
  checkAction,
  currentTurn,
  isComplete,
  isUsersTurn,
  newDraft,
  nextFearlessGame,
  turnInfo,
  undoUserMove,
} from './draft'
import { DRAFT_SEQUENCE } from './sequence'
import type { Draft, Side } from './types'
import { ALL_CHAMPIONS } from '@/lib/engine/champions'

const NOW = new Date('2026-09-29T12:00:00Z')

/** Plays the first `n` turns with the first available champion each time. */
function play(d: Draft, n: number): Draft {
  let draft = d
  for (let i = 0; i < n; i++) {
    const turn = turnInfo(draft)!
    const champion = availableChampions(draft)[0]
    const r = applyAction(draft, { type: turn.action === 'ban' ? 'BAN' : 'PICK', champion }, turn.side, NOW)
    if (!r.ok) throw new Error(r.error)
    draft = r.draft
  }
  return draft
}

describe('the draft sequence', () => {
  it('is 20 turns: 6 bans, 6 picks, 4 bans, 4 picks, 10 moves per side', () => {
    expect(DRAFT_SEQUENCE).toHaveLength(20)
    const count = (side: Side, action: string) => DRAFT_SEQUENCE.filter((t) => t.side === side && t.action === action).length
    expect([count('blue', 'ban'), count('blue', 'pick'), count('red', 'ban'), count('red', 'pick')]).toEqual([5, 5, 5, 5])
    expect(DRAFT_SEQUENCE.slice(6, 12).map((t) => t.side[0]).join('')).toBe('brrbbr')
  })
})

describe('applyAction', () => {
  const start = newDraft({ id: 'd1', userSide: 'blue', now: NOW })

  it('starts on turn 1 with blue to ban', () => {
    expect(currentTurn(start)).toBe(1)
    expect(turnInfo(start)).toMatchObject({ side: 'blue', action: 'ban' })
    expect(isUsersTurn(start)).toBe(true)
    expect(availableChampions(start)).toHaveLength(ALL_CHAMPIONS.length)
  })

  it('records a ban and moves to red', () => {
    const r = applyAction(start, { type: 'BAN', champion: 'Azir' }, 'blue', NOW)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.draft.blue.bans).toEqual(['Azir'])
    expect(turnInfo(r.draft)?.side).toBe('red')
    expect(availableChampions(r.draft)).not.toContain('Azir')
    expect(start.blue.bans).toEqual([]) // input untouched
  })

  it('refuses the wrong side, the wrong action, unknown and taken champions', () => {
    expect(checkAction(start, { type: 'BAN', champion: 'Azir' }, 'red')).toBe('NOT_YOUR_TURN')
    expect(checkAction(start, { type: 'PICK', champion: 'Azir' }, 'blue')).toBe('WRONG_PHASE')
    expect(checkAction(start, { type: 'BAN', champion: 'Clippy' }, 'blue')).toBe('UNKNOWN_CHAMPION')
    const after = applyAction(start, { type: 'BAN', champion: 'Azir' }, 'blue', NOW)
    if (!after.ok) throw new Error()
    expect(checkAction(after.draft, { type: 'BAN', champion: 'Azir' }, 'red')).toBe('CHAMPION_NOT_AVAILABLE')
  })

  it('completes after 20 moves, stamps the time, and refuses more', () => {
    const done = play(start, 20)
    expect(isComplete(done)).toBe(true)
    expect(turnInfo(done)).toBeNull()
    expect(done.completedAt).toBe(NOW.toISOString())
    expect(done.blue.picks).toHaveLength(5)
    expect(done.red.bans).toHaveLength(5)
    expect(checkAction(done, { type: 'PICK', champion: availableChampions(done)[0] }, 'blue')).toBe('DRAFT_COMPLETE')
  })
})

describe('undoUserMove (scrim)', () => {
  it('takes back the user move and the opponent answer after it', () => {
    // Blue user; after turn 13 (red ban) it is blue's turn 14.
    const d = play(newDraft({ id: 'u', userSide: 'blue', format: 'scrim', now: NOW }), 13)
    const back = undoUserMove(d)
    // Removes 13 (red) and 12 (red) and 11 (blue): blue to play turn 11 again.
    expect(currentTurn(back)).toBe(11)
    expect(turnInfo(back)?.side).toBe('blue')
  })

  it('does nothing before the user has moved', () => {
    const d = play(newDraft({ id: 'u2', userSide: 'red', format: 'scrim', now: NOW }), 1)
    expect(undoUserMove(d)).toBe(d)
  })

  it('reopens a finished draft', () => {
    const done = play(newDraft({ id: 'u3', userSide: 'red', format: 'scrim', now: NOW }), 20)
    const back = undoUserMove(done)
    expect(isComplete(back)).toBe(false)
    expect(back.completedAt).toBeNull()
    expect(currentTurn(back)).toBe(20)
  })
})

describe('fearless series', () => {
  it('locks every champion picked in earlier games', () => {
    const g1 = play(newDraft({ id: 'f1', userSide: 'blue', format: 'fearless', now: NOW }), 20)
    const g2 = nextFearlessGame(g1, 'f2', NOW)
    expect(g2.game).toBe(2)
    expect(g2.locked).toEqual([...g1.blue.picks, ...g1.red.picks])
    for (const c of g2.locked) expect(availableChampions(g2)).not.toContain(c)
    // Bans from game 1 are free again.
    expect(availableChampions(g2)).toContain(g1.blue.bans[0])
    const g2done = play(g2, 20)
    expect(nextFearlessGame(g2done, 'f3', NOW).locked).toHaveLength(20)
  })
})
