import { describe, expect, it } from 'vitest'
import { explainHand } from './explain'
import { concealedHand } from './hand'
import { pung } from './melds'
import { hand } from './testHands'
import { bonus, wind } from './tiles'

const explain = (notation: string) => explainHand(concealedHand(hand(notation)))

describe('explaining a hand', () => {
  it('says the hand is empty', () => {
    const explanation = explain('')
    expect(explanation.headline).toBe('Your hand is empty.')
    expect(explanation.distance).toBe('A winning hand is fourteen tiles: four sets and a pair.')
    expect(explanation.tilesAway).toBe(14)
    expect(explanation.isWinning).toBe(false)
  })

  it('counts sets and the pair', () => {
    const explanation = explain('b123 b456 c55')
    expect(explanation.setCount).toBe(2)
    expect(explanation.hasPair).toBe(true)
    expect(explanation.headline).toBe('You have two complete sets and a pair.')
    expect(explanation.groups).toHaveLength(3)
  })

  it('mentions part-sets', () => {
    const explanation = explain('b123 c78')
    expect(explanation.headline).toBe('You have one complete set and one part-set.')
    expect(explanation.partials).toHaveLength(1)
  })

  it('says when nothing is grouped yet', () => {
    const explanation = explain('b1 c5 d9')
    expect(explanation.headline).toBe('You have three loose tiles and nothing grouped yet.')
  })

  it('calls out spare tiles once something is grouped', () => {
    const explanation = explain('b123 c5')
    expect(explanation.headline).toBe('You have one complete set and one loose tile.')
    expect(explanation.floaters).toHaveLength(1)
  })

  it('recognises a winning hand', () => {
    const explanation = explain('b123 b456 c789 we we we dr dr')
    expect(explanation.isWinning).toBe(true)
    expect(explanation.tilesAway).toBe(0)
    expect(explanation.distance).toBe('This is a winning hand.')
    expect(explanation.headline).toBe('You have four complete sets and a pair.')
  })

  it('reports how far a partial hand has to go', () => {
    expect(explain('b123 b456 c55').distance).toBe(
      'You still need six tiles, and everything you hold fits.',
    )
    expect(explain('b123 b456 c789 d55 we ws').distance).toBe(
      'You are two tiles from a winning hand.',
    )
  })

  it('gives a compact one-line status for the collapsed tray', () => {
    expect(explain('').brief).toBe('No tiles yet')
    expect(explain('b123 b456 c55').brief).toBe('2 sets · 1 pair · 6 away')
    expect(explain('b123 c78').brief).toBe('1 set · 1 part-set · 9 away')
    expect(explain('b123 b456 c789 we we we dr dr').brief).toBe('Winning hand')
  })

  it('counts bonus tiles separately from the hand', () => {
    const explanation = explainHand(
      concealedHand([...hand('b123'), bonus('season', 1), bonus('flower', 2)]),
    )
    expect(explanation.handSize).toBe(3)
    expect(explanation.bonusCount).toBe(2)
  })

  it('folds a declared meld into the set count and the headline', () => {
    const declared = [pung(wind('east'), true)]
    const explanation = explainHand({ ...concealedHand(hand('b123 b456 c789 dr dr')), melds: declared })
    expect(explanation.setCount).toBe(4)
    expect(explanation.declared).toEqual(declared)
    expect(explanation.headline).toBe('You have one declared meld, three complete sets, and a pair.')
    expect(explanation.isWinning).toBe(true)
  })
})
