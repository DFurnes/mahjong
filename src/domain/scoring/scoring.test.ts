import { describe, expect, it } from 'vitest'
import { concealedHand, type Hand } from '../hand'
import { kong, pung } from '../melds'
import { hand } from '../testHands'
import { bonus, type Wind, wind } from '../tiles'
import { LIMIT_FAAN, scoreHand } from './index'

const idsOf = (notation: string, seatWind?: Wind) =>
  scoreHand(concealedHand(hand(notation)), seatWind).patterns.map((p) => p.id)
const faanOf = (notation: string, seatWind?: Wind) =>
  scoreHand(concealedHand(hand(notation)), seatWind).faan

describe('hands that cannot be scored', () => {
  it('rejects a hand that is not fourteen tiles', () => {
    expect(scoreHand(concealedHand(hand('b123 b456 c789 we we we dr')))).toMatchObject({
      isWinning: false,
      faan: 0,
      patterns: [],
    })
  })

  it('rejects fourteen tiles that do not make four sets and a pair', () => {
    expect(scoreHand(concealedHand(hand('b135 c246 d789 we ws ww wn dr'))).isWinning).toBe(false)
  })

  it('does not count bonus tiles toward the fourteen', () => {
    const withFlowers = concealedHand([
      ...hand('b123 b456 c789 we we we dr dr'),
      bonus('flower', 1),
    ])
    expect(scoreHand(withFlowers).isWinning).toBe(true)
  })
})

describe('faan patterns', () => {
  it('scores a hand with no pattern as a chicken hand', () => {
    expect(idsOf('b123 b456 c789 we we we dr dr')).toEqual(['chicken-hand'])
    expect(faanOf('b123 b456 c789 we we we dr dr')).toBe(0)
  })

  it('gives every matched pattern a plain-language description', () => {
    const patterns = scoreHand(concealedHand(hand('b123 b456 c789 we we we dr dr'))).patterns
    expect(patterns[0].description.length).toBeGreaterThan(0)
  })

  it('scores all sequences', () => {
    expect(idsOf('b123 b456 c123 d789 d11')).toEqual(['all-chows'])
    expect(faanOf('b123 b456 c123 d789 d11')).toBe(1)
  })

  it('does not call a hand with honours all sequences', () => {
    expect(idsOf('b123 b456 c123 d789 we we')).toEqual(['chicken-hand'])
  })

  it('scores all triplets', () => {
    expect(idsOf('b111 c222 d333 we we we dg dg')).toEqual(['all-pungs'])
    expect(faanOf('b111 c222 d333 we we we dg dg')).toBe(3)
  })

  it('scores a half flush', () => {
    expect(idsOf('b123 b456 b789 we we we b11')).toEqual(['half-flush'])
    expect(faanOf('b123 b456 b789 we we we b11')).toBe(3)
  })

  it('scores a full flush and drops the half flush it supersedes', () => {
    const patterns = idsOf('b123 b456 b789 b123 b11')
    expect(patterns).toContain('full-flush')
    expect(patterns).not.toContain('half-flush')
    // Full flush stacks with all sequences: 7 + 1.
    expect(faanOf('b123 b456 b789 b123 b11')).toBe(8)
  })

  it('scores small and great dragons', () => {
    expect(idsOf('dr dr dr dg dg dg b123 b456 dw dw')).toContain('small-dragons')
    expect(idsOf('dr dr dr dg dg dg dw dw dw b123 b44')).toContain('great-dragons')
    expect(idsOf('dr dr dr dg dg dg dw dw dw b123 b44')).not.toContain('small-dragons')
  })

  it('scores small and great winds', () => {
    expect(idsOf('we we we ws ws ws ww ww ww b123 wn wn')).toContain('small-winds')
    expect(idsOf('we we we ws ws ws ww ww ww wn wn wn b11')).toContain('great-winds')
  })

  it('scores all honours and supersedes the patterns it implies', () => {
    const patterns = idsOf('we we we ws ws ws dr dr dr dg dg dg dw dw')
    expect(patterns).toContain('all-honours')
    expect(patterns).not.toContain('all-pungs')
    expect(patterns).not.toContain('half-flush')
  })

  it('scores all terminals', () => {
    const patterns = idsOf('b111 b999 c111 c999 d11')
    expect(patterns).toContain('all-terminals')
    expect(patterns).not.toContain('all-pungs')
  })

  it('scores a seat wind pung when it matches the chosen seat', () => {
    expect(idsOf('we we we b123 b456 c789 dr dr', 'east')).toContain('seat-wind')
    expect(faanOf('we we we b123 b456 c789 dr dr', 'east')).toBe(1)
  })

  it('does not score a wind pung against a seat it does not match', () => {
    expect(idsOf('we we we b123 b456 c789 dr dr', 'south')).not.toContain('seat-wind')
    expect(idsOf('we we we b123 b456 c789 dr dr')).not.toContain('seat-wind')
  })

  it('stacks the seat wind faan with other patterns, up to the limit', () => {
    // Half flush (bamboo plus honours) plus a matching seat wind pung: 3 + 1.
    const ids = idsOf('we we we dr dr dr b789 b456 b11', 'east')
    expect(ids).toContain('half-flush')
    expect(ids).toContain('seat-wind')
    expect(faanOf('we we we dr dr dr b789 b456 b11', 'east')).toBe(4)
  })

  it('scores thirteen orphans', () => {
    const score = scoreHand(concealedHand(hand('b19 c19 d19 we ws ww wn dr dg dw dw')))
    expect(score.isWinning).toBe(true)
    expect(score.patterns.map((p) => p.id)).toEqual(['thirteen-orphans'])
    expect(score.faan).toBe(LIMIT_FAAN)
    expect(score.hand).toMatchObject({ kind: 'special', id: 'thirteen-orphans' })
  })
})

describe('how the hand was won', () => {
  it('does not score self-draw or fully-concealed when the win is unstated', () => {
    const ids = idsOf('b123 b456 c789 we we we dr dr')
    expect(ids).not.toContain('self-draw')
    expect(ids).not.toContain('fully-concealed')
  })

  it('scores a self-drawn win claimed on nothing else as one faan', () => {
    const won: Hand = { ...concealedHand(hand('b123 b456 c789 we we we dr dr')), win: 'draw' }
    const score = scoreHand(won)
    expect(score.patterns.map((p) => p.id)).toEqual(['self-draw', 'fully-concealed'])
    expect(score.faan).toBe(2)
  })

  it('scores a fully concealed win claimed from a discard as one faan', () => {
    const won: Hand = { ...concealedHand(hand('b123 b456 c789 we we we dr dr')), win: 'discard' }
    const score = scoreHand(won)
    expect(score.patterns.map((p) => p.id)).toEqual(['fully-concealed'])
    expect(score.faan).toBe(1)
  })

  it('suppresses fully-concealed once a meld is exposed, but not for a concealed kong', () => {
    const exposedMeld: Hand = {
      concealed: hand('b123 b456 c789 dr dr'),
      melds: [pung(wind('east'), true)],
      bonus: [],
      win: 'draw',
    }
    const exposedScore = scoreHand(exposedMeld)
    expect(exposedScore.patterns.map((p) => p.id)).toContain('self-draw')
    expect(exposedScore.patterns.map((p) => p.id)).not.toContain('fully-concealed')

    const concealedKongHand: Hand = {
      concealed: hand('b123 b456 c789 dr dr'),
      melds: [kong(wind('east'))],
      bonus: [],
      win: 'draw',
    }
    const kongScore = scoreHand(concealedKongHand)
    expect(kongScore.patterns.map((p) => p.id)).toContain('self-draw')
    expect(kongScore.patterns.map((p) => p.id)).toContain('fully-concealed')
  })

  it('still counts a kong as a triplet for all-pungs', () => {
    const withKong: Hand = {
      concealed: hand('c222 d333 we we we dg dg'),
      melds: [kong(wind('south'))],
      bonus: [],
    }
    expect(scoreHand(withKong).patterns.map((p) => p.id)).toEqual(['all-pungs'])
  })

  it('is still a chicken hand won on a discard with an exposed meld', () => {
    const exposedNothing: Hand = {
      concealed: hand('b123 b456 c789 dr dr'),
      melds: [pung(wind('east'), true)],
      bonus: [],
      win: 'discard',
    }
    expect(scoreHand(exposedNothing).patterns.map((p) => p.id)).toEqual(['chicken-hand'])
  })
})

describe('choosing between readings', () => {
  it('takes the better-scoring reading of an ambiguous hand', () => {
    // b111 b222 b333 reads as three pungs or three chows. Read as chows the
    // whole hand is one suit with no honours, which is worth more.
    const score = scoreHand(concealedHand(hand('b111 b222 b333 b456 b99')))
    const ids = score.patterns.map((p) => p.id)
    expect(ids).toContain('full-flush')
    expect(ids).toContain('all-chows')
    expect(score.faan).toBe(8)
  })
})

describe('the limit', () => {
  it('caps a hand at the limit', () => {
    const score = scoreHand(
      concealedHand(hand('we we we ws ws ws ww ww ww wn wn wn dr dr')),
    )
    expect(score.faan).toBe(LIMIT_FAAN)
  })
})
