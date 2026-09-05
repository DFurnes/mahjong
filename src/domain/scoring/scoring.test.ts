import { describe, expect, it } from 'vitest'
import { hand } from '../testHands'
import { bonus } from '../tiles'
import { LIMIT_FAAN, scoreHand } from './index'

const idsOf = (notation: string) => scoreHand(hand(notation)).patterns.map((p) => p.id)
const faanOf = (notation: string) => scoreHand(hand(notation)).faan

describe('hands that cannot be scored', () => {
  it('rejects a hand that is not fourteen tiles', () => {
    expect(scoreHand(hand('b123 b456 c789 we we we dr'))).toMatchObject({
      isWinning: false,
      faan: 0,
      patterns: [],
    })
  })

  it('rejects fourteen tiles that do not make four sets and a pair', () => {
    expect(scoreHand(hand('b135 c246 d789 we ws ww wn dr')).isWinning).toBe(false)
  })

  it('does not count bonus tiles toward the fourteen', () => {
    const withFlowers = [...hand('b123 b456 c789 we we we dr dr'), bonus('flower', 1)]
    expect(scoreHand(withFlowers).isWinning).toBe(true)
  })
})

describe('faan patterns', () => {
  it('scores a hand with no pattern as a chicken hand', () => {
    expect(idsOf('b123 b456 c789 we we we dr dr')).toEqual(['chicken-hand'])
    expect(faanOf('b123 b456 c789 we we we dr dr')).toBe(0)
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

  it('scores thirteen orphans', () => {
    const score = scoreHand(hand('b19 c19 d19 we ws ww wn dr dg dw dw'))
    expect(score.isWinning).toBe(true)
    expect(score.patterns.map((p) => p.id)).toEqual(['thirteen-orphans'])
    expect(score.faan).toBe(LIMIT_FAAN)
    expect(score.hand).toMatchObject({ kind: 'special', id: 'thirteen-orphans' })
  })
})

describe('choosing between readings', () => {
  it('takes the better-scoring reading of an ambiguous hand', () => {
    // b111 b222 b333 reads as three pungs or three chows. Read as chows the
    // whole hand is one suit with no honours, which is worth more.
    const score = scoreHand(hand('b111 b222 b333 b456 b99'))
    const ids = score.patterns.map((p) => p.id)
    expect(ids).toContain('full-flush')
    expect(ids).toContain('all-chows')
    expect(score.faan).toBe(8)
  })
})

describe('the limit', () => {
  it('caps a hand at the limit', () => {
    const score = scoreHand(hand('we we we ws ws ws ww ww ww wn wn wn dr dr'))
    expect(score.faan).toBe(LIMIT_FAAN)
  })
})
