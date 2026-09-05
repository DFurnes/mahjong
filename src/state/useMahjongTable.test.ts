import { describe, expect, it } from 'vitest'
import { bonus, dragon, suited, tileId, wind } from '../engine/tiles'
import { HAND_SIZE, kong, pung } from '../engine/hand'
import { hand } from '../engine/testing/testHands'
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

    expect(state.concealed.map(tileId)).toEqual(['b3', 'dr'])
  })

  it('puts bonus tiles in their own tray', () => {
    const state = tableReducer(initialTableState, { type: 'select', tile: bonus('flower', 1) })

    expect(state.concealed).toHaveLength(0)
    expect(state.bonus.map(tileId)).toEqual(['f1'])
  })

  it('allows four copies of a standard tile and no more', () => {
    const five = suited('dot', 5)
    const state = selectAll(
      initialTableState,
      Array.from({ length: 6 }, () => ({ type: 'select' as const, tile: five })),
    )

    expect(state.concealed).toHaveLength(4)
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

    expect(state.concealed).toHaveLength(HAND_SIZE)
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

    expect(withBonus.concealed).toHaveLength(HAND_SIZE)
    expect(withBonus.bonus).toHaveLength(1)
  })

  it('stops accepting concealed tiles once a declared meld fills the last slot', () => {
    // Eleven concealed tiles plus one declared meld is already the full fourteen.
    const full: TableState = {
      concealed: hand('b123 b456 c789 dr dr'),
      melds: [pung(wind('east'), true)],
      bonus: [],
    }
    const overfull = tableReducer(full, { type: 'select', tile: suited('dot', 9) })

    expect(overfull).toBe(full)
  })
})

describe('returning tiles', () => {
  it('takes a tile back out of the hand', () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: suited('bamboo', 1) },
      { type: 'select', tile: suited('bamboo', 2) },
    ])
    const after = tableReducer(state, { type: 'return', area: 'concealed', index: 0 })

    expect(after.concealed.map(tileId)).toEqual(['b2'])
  })

  it('ignores an index that is not there', () => {
    const state = tableReducer(initialTableState, { type: 'return', area: 'concealed', index: 3 })
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

describe('declaring melds', () => {
  it('moves a complete set out of the concealed hand', () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: wind('east') },
      { type: 'select', tile: wind('east') },
      { type: 'select', tile: wind('east') },
    ])
    const declared = tableReducer(state, { type: 'declare', meld: pung(wind('east'), true) })

    expect(declared.concealed).toHaveLength(0)
    expect(declared.melds).toEqual([pung(wind('east'), true)])
  })

  it('rejects a meld once four are already declared', () => {
    const fourMelds: TableState = {
      concealed: [suited('dot', 1), suited('dot', 1)],
      melds: [
        pung(wind('east'), true),
        pung(wind('south'), true),
        pung(wind('west'), true),
        pung(wind('north'), true),
      ],
      bonus: [],
    }
    const declared = tableReducer(fourMelds, { type: 'declare', meld: pung(dragon('red'), true) })
    expect(declared).toBe(fourMelds)
  })

  it('declares a concealed kong directly from a pung, drawing the fourth copy off the table', () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: wind('east') },
      { type: 'select', tile: wind('east') },
      { type: 'select', tile: wind('east') },
    ])
    const declared = tableReducer(state, { type: 'declare', meld: kong(wind('east'), false) })

    expect(declared.concealed).toHaveLength(0)
    expect(declared.melds).toEqual([kong(wind('east'), false)])
    expect(remainingCounts(declared)['we']).toBe(0)
  })

  it('rejects a kong when no fourth copy is free on the table', () => {
    // All four copies of East are already spoken for: three here, one elsewhere.
    const state: TableState = {
      concealed: [wind('east'), wind('east'), wind('east')],
      melds: [pung(wind('east'), true)],
      bonus: [],
    }
    const declared = tableReducer(state, { type: 'declare', meld: kong(wind('east'), false) })
    expect(declared).toBe(state)
  })

  it('leaves the slot count unchanged when a pung is promoted to a kong', () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: wind('east') },
      { type: 'select', tile: wind('east') },
      { type: 'select', tile: wind('east') },
    ])
    const declared = tableReducer(state, { type: 'declare', meld: pung(wind('east'), true) })
    const konged = tableReducer(declared, { type: 'kong', index: 0 })

    expect(konged.melds).toEqual([kong(wind('east'), true)])
    expect(konged.concealed).toHaveLength(0)
  })

  it('rejects promoting to a kong when no fourth copy is free', () => {
    // The last East is in the player's own concealed hand, not free on the table.
    const state: TableState = {
      concealed: [wind('east')],
      melds: [pung(wind('east'), true)],
      bonus: [],
    }
    const konged = tableReducer(state, { type: 'kong', index: 0 })
    expect(konged).toBe(state)
  })

  it("undeclares a meld, returning three tiles and dropping a kong's fourth", () => {
    const state = selectAll(initialTableState, [
      { type: 'select', tile: wind('east') },
      { type: 'select', tile: wind('east') },
      { type: 'select', tile: wind('east') },
    ])
    const konged = tableReducer(state, { type: 'declare', meld: kong(wind('east'), false) })
    const back = tableReducer(konged, { type: 'undeclare', index: 0 })

    expect(back.melds).toHaveLength(0)
    expect(back.concealed.map(tileId)).toEqual(['we', 'we', 'we'])
    expect(remainingCounts(back)['we']).toBe(1)
  })
})

describe('how the hand was won', () => {
  it('sets and clears the win source', () => {
    const won = tableReducer(initialTableState, { type: 'win', source: 'draw' })
    expect(won.win).toBe('draw')

    const cleared = tableReducer(won, { type: 'win', source: null })
    expect(cleared.win).toBeUndefined()
  })

  it('sets circumstances alongside the win source', () => {
    const won = tableReducer(initialTableState, {
      type: 'win',
      source: 'draw',
      circumstances: ['last-tile'],
    })
    expect(won.circumstances).toEqual(['last-tile'])
  })

  it('clears circumstances along with the win source', () => {
    const won = tableReducer(initialTableState, {
      type: 'win',
      source: 'draw',
      circumstances: ['last-tile'],
    })
    const cleared = tableReducer(won, { type: 'win', source: null })
    expect(cleared.circumstances).toBeUndefined()
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

  it('counts tiles inside a declared meld', () => {
    const state: TableState = {
      concealed: [],
      melds: [pung(wind('east'), true)],
      bonus: [],
    }
    expect(remainingCounts(state)['we']).toBe(1)
  })
})
