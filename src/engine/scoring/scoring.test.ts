import { describe, expect, it } from 'vitest'
import { concealedHand, type Hand } from '../hand/types'
import { kong, pung } from '../hand/melds'
import { hand } from '../testing/testHands'
import { bonus, dragon, suited, wind } from '../tiles/tiles'
import {
  copyRuleSet,
  DEFAULT_RULE_SET,
  FAAN_PATTERNS,
  LIMIT_FAAN,
  type ScoringOptions,
  scoreHand,
} from './index'

const idsOf = (notation: string, options?: ScoringOptions) =>
  scoreHand(concealedHand(hand(notation)), options).patterns.map((p) => p.id)
const faanOf = (notation: string, options?: ScoringOptions) =>
  scoreHand(concealedHand(hand(notation)), options).faan

describe('hands that cannot be scored', () => {
  it('rejects a hand that is not fourteen tiles', () => {
    expect(scoreHand(concealedHand(hand('b123 b456 c789 we we we dr')))).toMatchObject({
      isWinningShape: false,
      faan: 0,
      patterns: [],
    })
  })

  it('rejects fourteen tiles that do not make four sets and a pair', () => {
    expect(scoreHand(concealedHand(hand('b135 c246 d789 we ws ww wn dr'))).isWinningShape).toBe(false)
  })

  it('does not count bonus tiles toward the fourteen', () => {
    const withFlowers = concealedHand([
      ...hand('b123 b456 c789 we we we dr dr'),
      bonus('flower', 1),
    ])
    expect(scoreHand(withFlowers).isWinningShape).toBe(true)
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

  it('scores each ordinary dragon pung and lets the special dragon hands absorb them', () => {
    expect(idsOf('dr dr dr b123 b456 c789 d11')).toContain('red-dragon-pung')
    expect(idsOf('dg dg dg b123 b456 c789 d11')).toContain('green-dragon-pung')
    expect(idsOf('dw dw dw b123 b456 c789 d11')).toContain('white-dragon-pung')

    const small = idsOf('dr dr dr dg dg dg b123 b456 dw dw')
    expect(small).toContain('small-dragons')
    expect(small).not.toContain('red-dragon-pung')
    expect(small).not.toContain('green-dragon-pung')
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
    expect(idsOf('we we we b123 b456 c789 dr dr', { seatWind: 'east' })).toContain('seat-wind')
    expect(faanOf('we we we b123 b456 c789 dr dr', { seatWind: 'east' })).toBe(1)
  })

  it('does not score a wind pung against a seat it does not match', () => {
    expect(idsOf('we we we b123 b456 c789 dr dr', { seatWind: 'south' })).not.toContain(
      'seat-wind',
    )
    expect(idsOf('we we we b123 b456 c789 dr dr')).not.toContain('seat-wind')
  })

  it('stacks the seat wind faan with other patterns, up to the limit', () => {
    // Half flush (bamboo plus honours) plus a matching seat wind pung: 3 + 1.
    const ids = idsOf('we we we dr dr dr b789 b456 b11', { seatWind: 'east' })
    expect(ids).toContain('half-flush')
    expect(ids).toContain('seat-wind')
    expect(faanOf('we we we dr dr dr b789 b456 b11', { seatWind: 'east' })).toBe(5)
  })

  it('scores the round wind pung when it matches the chosen round', () => {
    expect(idsOf('we we we b123 b456 c789 dr dr', { roundWind: 'east' })).toContain('round-wind')
    expect(faanOf('we we we b123 b456 c789 dr dr', { roundWind: 'east' })).toBe(1)
  })

  it('stacks seat and round wind into a double wind when both match', () => {
    const ids = idsOf('we we we b123 b456 c789 dr dr', { seatWind: 'east', roundWind: 'east' })
    expect(ids).toContain('seat-wind')
    expect(ids).toContain('round-wind')
    expect(faanOf('we we we b123 b456 c789 dr dr', { seatWind: 'east', roundWind: 'east' })).toBe(
      2,
    )
  })

  it('scores mixed terminals and drops all triplets, but not against all-honours or all-terminals', () => {
    const ids = idsOf('b111 b999 we we we dg dg dg c11')
    expect(ids).toContain('mixed-terminals')
    expect(ids).not.toContain('all-pungs')
    expect(faanOf('b111 b999 we we we dg dg dg c11')).toBe(11)

    const allHonours = idsOf('we we we ws ws ws dr dr dr dg dg dg dw dw')
    expect(allHonours).not.toContain('mixed-terminals')
    const allTerminals = idsOf('b111 b999 c111 c999 d11')
    expect(allTerminals).not.toContain('mixed-terminals')
  })

  it('scores nine gates and drops full flush and all sequences', () => {
    // 1-1-1-2-3-4-5-5-6-7-8-9-9-9: nine gates' base shape plus one extra 5.
    const ids = idsOf('b11123455678999')
    expect(ids).toContain('nine-gates')
    expect(ids).not.toContain('full-flush')
    expect(ids).not.toContain('all-chows')
    expect(faanOf('b11123455678999')).toBe(LIMIT_FAAN)
  })

  it('does not score nine gates once a set is declared', () => {
    const declared: Hand = {
      concealed: hand('b11123455678'),
      melds: [pung(suited('bamboo', 9), true)],
      bonus: [],
    }
    expect(scoreHand(declared).patterns.map((p) => p.id)).not.toContain('nine-gates')
  })

  it('scores four kongs and drops all triplets', () => {
    const withKongs: Hand = {
      concealed: [],
      melds: [
        kong(wind('east')),
        kong(wind('south')),
        kong(dragon('red')),
        kong(dragon('green')),
      ],
      bonus: [],
    }
    // Four kong slots plus a concealed pair fills the fourteen.
    const full: Hand = { ...withKongs, concealed: hand('b11') }
    const ids = scoreHand(full).patterns.map((p) => p.id)
    expect(ids).toContain('four-kongs')
    expect(ids).not.toContain('all-pungs')
    expect(scoreHand(full).faan).toBe(LIMIT_FAAN)
  })

  it('scores four concealed pungs and drops all triplets and fully concealed', () => {
    const won: Hand = { ...concealedHand(hand('b111 c222 d333 we we we dg dg')), win: 'draw' }
    const ids = scoreHand(won).patterns.map((p) => p.id)
    expect(ids).toContain('four-concealed-pungs')
    expect(ids).not.toContain('all-pungs')
    expect(ids).not.toContain('fully-concealed')
    expect(scoreHand(won).faan).toBe(LIMIT_FAAN)
  })

  it('does not score four concealed pungs when one triplet was claimed', () => {
    const exposed: Hand = {
      concealed: hand('c222 d333 we we we dg dg'),
      melds: [pung(suited('bamboo', 1), true)],
      bonus: [],
    }
    expect(scoreHand(exposed).patterns.map((p) => p.id)).not.toContain('four-concealed-pungs')
  })

  it('scores all green and drops half and full flush', () => {
    const ids = idsOf('b234 b234 b666 b88 dg dg dg')
    expect(ids).toContain('all-green')
    expect(ids).not.toContain('half-flush')
    expect(ids).not.toContain('full-flush')
    expect(faanOf('b234 b234 b666 b88 dg dg dg')).toBe(LIMIT_FAAN)
  })

  it('scores thirteen orphans', () => {
    const score = scoreHand(concealedHand(hand('b19 c19 d19 we ws ww wn dr dg dw dw')))
    expect(score.isWinningShape).toBe(true)
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

describe('the rest of situational faan', () => {
  // No wind tiles at all, so seat/round wind never gets a chance to add faan
  // of its own here — only the circumstance under test should move the score.
  const BASE = 'b123 b456 c789 d123 we we'

  it('scores the last tile drawn, on top of self-draw and fully concealed', () => {
    const won: Hand = { ...concealedHand(hand(BASE)), win: 'draw', circumstances: ['last-tile'] }
    const score = scoreHand(won)
    expect(score.patterns.map((p) => p.id)).toEqual([
      'self-draw',
      'fully-concealed',
      'last-tile-draw',
    ])
    expect(score.faan).toBe(3)
  })

  it('scores the last discard claimed, distinct from a self-drawn last tile', () => {
    const won: Hand = {
      ...concealedHand(hand(BASE)),
      win: 'discard',
      circumstances: ['last-tile'],
    }
    const score = scoreHand(won)
    expect(score.patterns.map((p) => p.id)).toEqual(['fully-concealed', 'last-tile-discard'])
    expect(score.faan).toBe(2)
  })

  it('scores a kong replacement tile only on a self-draw', () => {
    const won: Hand = { ...concealedHand(hand(BASE)), win: 'draw', circumstances: ['after-kong'] }
    const score = scoreHand(won)
    expect(score.patterns.map((p) => p.id)).toEqual(['self-draw', 'fully-concealed', 'after-kong'])
    expect(score.faan).toBe(3)
  })

  it('scores robbing a kong only on a claimed discard', () => {
    const won: Hand = {
      ...concealedHand(hand(BASE)),
      win: 'discard',
      circumstances: ['robbing-kong'],
    }
    const score = scoreHand(won)
    expect(score.patterns.map((p) => p.id)).toEqual(['fully-concealed', 'robbing-kong'])
    expect(score.faan).toBe(2)
  })

  it('scores a heavenly hand for the dealer, and drops self-draw and fully-concealed', () => {
    const won: Hand = {
      ...concealedHand(hand(BASE)),
      win: 'draw',
      circumstances: ['first-turn'],
    }
    const score = scoreHand(won, { seatWind: 'east' })
    expect(score.patterns.map((p) => p.id)).toEqual(['heavenly-hand'])
    expect(score.faan).toBe(LIMIT_FAAN)
  })

  it('scores an earthly hand for a non-dealer, and drops fully-concealed', () => {
    const won: Hand = {
      ...concealedHand(hand(BASE)),
      win: 'discard',
      circumstances: ['first-turn'],
    }
    const score = scoreHand(won, { seatWind: 'south' })
    expect(score.patterns.map((p) => p.id)).toEqual(['earthly-hand'])
    expect(score.faan).toBe(LIMIT_FAAN)
  })

  it('does not score heavenly or earthly hand when the seat and source do not match', () => {
    const won: Hand = {
      ...concealedHand(hand(BASE)),
      win: 'draw',
      circumstances: ['first-turn'],
    }
    const ids = scoreHand(won, { seatWind: 'south' }).patterns.map((p) => p.id)
    expect(ids).not.toContain('heavenly-hand')
    expect(ids).not.toContain('earthly-hand')
    expect(ids).toEqual(['self-draw', 'fully-concealed'])
  })
})

describe('flowers and seasons', () => {
  const BASE = 'b123 b456 c789 d123 we we'

  it('scores a flower matching the chosen seat', () => {
    const won = concealedHand([...hand(BASE), bonus('flower', 1)])
    const score = scoreHand(won, { seatWind: 'east' })
    expect(score.patterns.map((p) => p.id)).toContain('seat-flower')
    expect(score.faan).toBe(1)
  })

  it('does not score a flower against a seat it does not match', () => {
    const won = concealedHand([...hand(BASE), bonus('flower', 1)])
    const score = scoreHand(won, { seatWind: 'south' })
    expect(score.patterns.map((p) => p.id)).not.toContain('seat-flower')
    expect(score.faan).toBe(0)
  })

  it('scores a full set of flowers as two faan, not three', () => {
    const won = concealedHand([
      ...hand(BASE),
      bonus('flower', 1),
      bonus('flower', 2),
      bonus('flower', 3),
      bonus('flower', 4),
    ])
    const score = scoreHand(won, { seatWind: 'east' })
    expect(score.patterns.map((p) => p.id)).toContain('all-flowers')
    expect(score.patterns.map((p) => p.id)).not.toContain('seat-flower')
    expect(score.faan).toBe(2)
  })

  it('stacks a matching flower and season into two faan', () => {
    const won = concealedHand([...hand(BASE), bonus('flower', 1), bonus('season', 1)])
    const score = scoreHand(won, { seatWind: 'east' })
    const ids = score.patterns.map((p) => p.id)
    expect(ids).toContain('seat-flower')
    expect(ids).toContain('seat-season')
    expect(score.faan).toBe(2)
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

describe('resolved rules', () => {
  it('gives every pattern an explicit stability category', () => {
    expect(FAAN_PATTERNS.every((pattern) => pattern.stability.type === 'core' || pattern.stability.rule.length > 0)).toBe(true)
  })

  it('filters a disabled house pattern before supersession', () => {
    const rules = copyRuleSet(DEFAULT_RULE_SET)
    rules.houseRules['nine-gates'] = false
    const score = scoreHand(concealedHand(hand('b11123455678999')), { rules })
    expect(score.patterns.map((pattern) => pattern.id)).not.toContain('nine-gates')
    expect(score.patterns.map((pattern) => pattern.id)).toContain('full-flush')
  })

  it('reports a winning shape separately from the minimum needed in a game', () => {
    const score = scoreHand(concealedHand(hand('b123 b456 c789 we we we dr dr')))
    expect(score).toMatchObject({
      isWinningShape: true,
      isLegalWin: false,
      faan: 0,
      minimumFaan: 3,
    })
  })

  it('uses the resolved limit and minimum', () => {
    const rules = copyRuleSet(DEFAULT_RULE_SET)
    rules.limitFaan = 7
    rules.minimumFaan = 8
    const score = scoreHand(concealedHand(hand('b123 b456 b789 b123 b11')), { rules })
    expect(score.faan).toBe(7)
    expect(score.isLegalWin).toBe(false)
  })
})
