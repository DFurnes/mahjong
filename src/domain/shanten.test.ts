import { describe, expect, it } from 'vitest'
import { shanten, thirteenOrphansCost, tilesAway } from './shanten'
import { hand } from './testHands'

describe('distance to a winning hand', () => {
  it('is 14 for an empty hand', () => {
    expect(tilesAway([])).toBe(14)
  })

  it('is 0 for a complete hand', () => {
    expect(tilesAway(hand('b123 b456 c789 we we we dr dr'))).toBe(0)
    expect(shanten(hand('b123 b456 c789 we we we dr dr'))).toBe(-1)
  })

  it('is 1 for a thirteen-tile hand waiting on its last tile', () => {
    // Four sets and a lone dragon: pair the dragon and the hand is complete.
    expect(tilesAway(hand('b123 b456 c789 we we we dr'))).toBe(1)
    expect(shanten(hand('b123 b456 c789 we we we dr'))).toBe(0)
  })

  it('is 1 for a fourteen-tile hand that is one swap from winning', () => {
    // Four sets and a part-set: swap one of the spare tiles for its pair.
    expect(tilesAway(hand('b123 b456 b789 b123 b45'))).toBe(1)
    expect(shanten(hand('b123 b456 b789 b123 b45'))).toBe(0)
  })

  it('counts a fourteen-tile hand with two dead tiles as two away', () => {
    // Three sets, a pair, and two loose honours — only one can seed the last set.
    expect(tilesAway(hand('b123 b456 c789 d55 we ws'))).toBe(2)
  })

  it('counts only the tiles still missing while a hand is being built', () => {
    // Two sets and a pair: eight of the fourteen tiles are already in place.
    expect(tilesAway(hand('b123 b456 d55'))).toBe(6)
  })

  it('credits a loose tile as the start of a set', () => {
    // Twelve tiles: three sets, a pair, and one honour that can grow into a set.
    expect(tilesAway(hand('b123 b456 c789 d55 we'))).toBe(2)
  })
})

describe('thirteen orphans', () => {
  const complete = 'b19 c19 d19 we ws ww wn dr dg dw dw'

  it('is complete with all thirteen terminals and honours plus a pair', () => {
    expect(thirteenOrphansCost(hand(complete))).toBe(0)
    expect(tilesAway(hand(complete))).toBe(0)
  })

  it('is one away when the pair is missing', () => {
    expect(thirteenOrphansCost(hand('b19 c19 d19 we ws ww wn dr dg dw'))).toBe(1)
  })

  it('is one away when a single orphan is missing', () => {
    expect(thirteenOrphansCost(hand('b19 c19 d1 we ws ww wn dr dg dw dw'))).toBe(1)
  })

  it('beats the standard reading for an orphan-heavy hand', () => {
    expect(tilesAway(hand('b19 c19 d19 we ws ww wn dr dg'))).toBe(2)
  })
})
