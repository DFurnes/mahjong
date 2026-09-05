import { describe, expect, it } from 'vitest'
import { concealedHand } from './types'
import { pung } from './melds'
import { shanten, thirteenOrphansCost, tilesAway } from './shanten'
import { hand } from '../testing/testHands'
import { wind } from '../tiles/tiles'

const away = (notation: string) => tilesAway(concealedHand(hand(notation)))

describe('distance to a winning hand', () => {
  it('is 14 for an empty hand', () => {
    expect(away('')).toBe(14)
  })

  it('is 0 for a complete hand', () => {
    expect(away('b123 b456 c789 we we we dr dr')).toBe(0)
    expect(shanten(concealedHand(hand('b123 b456 c789 we we we dr dr')))).toBe(-1)
  })

  it('is 1 for a thirteen-tile hand waiting on its last tile', () => {
    // Four sets and a lone dragon: pair the dragon and the hand is complete.
    expect(away('b123 b456 c789 we we we dr')).toBe(1)
    expect(shanten(concealedHand(hand('b123 b456 c789 we we we dr')))).toBe(0)
  })

  it('is 1 for a fourteen-tile hand that is one swap from winning', () => {
    // Four sets and a part-set: swap one of the spare tiles for its pair.
    expect(away('b123 b456 b789 b123 b45')).toBe(1)
    expect(shanten(concealedHand(hand('b123 b456 b789 b123 b45')))).toBe(0)
  })

  it('counts a fourteen-tile hand with two dead tiles as two away', () => {
    // Three sets, a pair, and two loose honours — only one can seed the last set.
    expect(away('b123 b456 c789 d55 we ws')).toBe(2)
  })

  it('counts only the tiles still missing while a hand is being built', () => {
    // Two sets and a pair: eight of the fourteen tiles are already in place.
    expect(away('b123 b456 d55')).toBe(6)
  })

  it('credits a loose tile as the start of a set', () => {
    // Twelve tiles: three sets, a pair, and one honour that can grow into a set.
    expect(away('b123 b456 c789 d55 we')).toBe(2)
  })

  it('counts a declared meld as a filled slot', () => {
    // A declared pung plus three sets and a pair from eleven concealed tiles: complete.
    const declared = [pung(wind('east'), true)]
    const complete = { ...concealedHand(hand('b123 b456 c789 dr dr')), melds: declared }
    expect(tilesAway(complete)).toBe(0)
  })
})

describe('thirteen orphans', () => {
  const complete = 'b19 c19 d19 we ws ww wn dr dg dw dw'

  it('is complete with all thirteen terminals and honours plus a pair', () => {
    expect(thirteenOrphansCost(hand(complete))).toBe(0)
    expect(away(complete)).toBe(0)
  })

  it('is one away when the pair is missing', () => {
    expect(thirteenOrphansCost(hand('b19 c19 d19 we ws ww wn dr dg dw'))).toBe(1)
  })

  it('is one away when a single orphan is missing', () => {
    expect(thirteenOrphansCost(hand('b19 c19 d1 we ws ww wn dr dg dw dw'))).toBe(1)
  })

  it('beats the standard reading for an orphan-heavy hand', () => {
    expect(away('b19 c19 d19 we ws ww wn dr dg')).toBe(2)
  })

  it('is unreachable once anything is declared', () => {
    // A concealed thirteen-orphans win, but no such thing exists with a declared meld.
    const declared = [pung(wind('east'), true)]
    const withDeclared = { ...concealedHand(hand(complete)), melds: declared }
    expect(thirteenOrphansCost(hand(complete))).toBe(0)
    expect(tilesAway(withDeclared)).toBeGreaterThan(0)
  })
})
