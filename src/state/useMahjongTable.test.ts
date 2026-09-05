import { describe, expect, it } from 'vitest'
import { HAND_SIZE, bonus, dragon, suited, tileId } from '../domain'
import {
  type TableState,
  initialTableState,
  remainingCounts,
  tableReducer,
} from './useMahjongTable'

function selectAll(state: TableState, tiles: Parameters<typeof tableReducer>[1][]): TableState {
  return tiles.reduce(tableReducer, state)
}

describe('selecting tiles', () => {
  it('moves a tile into the hand, in canonical order', () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: dragon('red') },
      { type: 'select', tile: suited('bamboo', 3) },
    ])

    expect(state.hand.map(tileId)).toEqual(['b3', 'dr'])
  })

  it('puts bonus tiles in their own tray', () => {
    const state = tableReducer(initialTableState, { type: 'select', tile: bonus('flower', 1) })

    expect(state.hand).toHaveLength(0)
    expect(state.bonus.map(tileId)).toEqual(['f1'])
  })

  it('allows four copies of a standard tile and no more', () => {
    const five = suited('dot', 5)
    const state = selectAll(
      initialTableState,
      Array.from({ length: 6 }, () => ({ type: 'select' as const, tile: five })),
    )

    expect(state.hand).toHaveLength(4)
  })

  it('allows only one copy of a bonus tile', () => {
    const spring = bonus('season', 1)
    const state = selectAll(initialTableState, [
      { type: 'select', tile: spring },
      { type: 'select', tile: spring },
    ])

    expect(state.bonus).toHaveLength(1)
  })

  it('stops at fourteen tiles', () => {
    const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((rank) =>
      Array.from({ length: 4 }, () => suited('bamboo', rank as 1)),
    )
    const state = selectAll(
      initialTableState,
      tiles.map((tile) => ({ type: 'select' as const, tile })),
    )

    expect(state.hand).toHaveLength(HAND_SIZE)
  })

  it('still accepts bonus tiles once the hand is full', () => {
    const full = selectAll(
      initialTableState,
      Array.from({ length: 20 }, (_, index) => ({
        type: 'select' as const,
        tile: suited('bamboo', ((index % 9) + 1) as 1),
      })),
    )
    const withBonus = tableReducer(full, { type: 'select', tile: bonus('flower', 3) })

    expect(withBonus.hand).toHaveLength(HAND_SIZE)
    expect(withBonus.bonus).toHaveLength(1)
  })
})

describe('returning tiles', () => {
  it('takes a tile back out of the hand', () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: suited('bamboo', 1) },
      { type: 'select', tile: suited('bamboo', 2) },
    ])
    const after = tableReducer(state, { type: 'return', area: 'hand', index: 0 })

    expect(after.hand.map(tileId)).toEqual(['b2'])
  })

  it('ignores an index that is not there', () => {
    const state = tableReducer(initialTableState, { type: 'return', area: 'hand', index: 3 })
    expect(state).toBe(initialTableState)
  })

  it('clears both the hand and the tray', () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: suited('bamboo', 1) },
      { type: 'select', tile: bonus('flower', 1) },
    ])

    expect(tableReducer(state, { type: 'clear' })).toEqual(initialTableState)
  })
})

describe('what is left on the table', () => {
  it('starts with four of every standard tile and one of every bonus tile', () => {
    const remaining = remainingCounts(initialTableState)

    expect(remaining['b1']).toBe(4)
    expect(remaining['dr']).toBe(4)
    expect(remaining['f1']).toBe(1)
  })

  it('counts down as tiles are taken', () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: suited('bamboo', 1) },
      { type: 'select', tile: suited('bamboo', 1) },
      { type: 'select', tile: bonus('flower', 1) },
    ])
    const remaining = remainingCounts(state)

    expect(remaining['b1']).toBe(2)
    expect(remaining['f1']).toBe(0)
  })
})
