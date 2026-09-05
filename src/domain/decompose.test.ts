import { describe, expect, it } from 'vitest'
import { allSets, bestDecomposition, completeDecompositions, decompose } from './decompose'
import { kong, meldKey, pung } from './melds'
import { hand } from './testHands'
import { bonus, wind } from './tiles'

const keysOf = (melds: readonly { type: string }[]) => melds.map((m) => meldKey(m as never)).sort()

describe('decomposing a complete hand', () => {
  it('finds four sets and a pair', () => {
    const [reading, ...rest] = completeDecompositions(hand('b123 b456 c789 we we we dr dr'))

    expect(rest).toHaveLength(0)
    expect(reading.isComplete).toBe(true)
    expect(reading.melds).toHaveLength(4)
    expect(reading.pair?.tile).toEqual({ kind: 'dragon', dragon: 'red' })
    expect(keysOf(reading.melds)).toEqual([
      'chow:bamboo:1',
      'chow:bamboo:4',
      'chow:character:7',
      'pung:we',
    ])
  })

  it('returns both readings when tiles can be split more than one way', () => {
    // 111 222 333 is three pungs or three chows; both are complete hands.
    const readings = completeDecompositions(hand('b111 b222 b333 c456 d99'))

    expect(readings).toHaveLength(2)
    const shapes = readings.map((reading) => keysOf(reading.melds))
    expect(shapes).toContainEqual([
      'chow:bamboo:1',
      'chow:bamboo:1',
      'chow:bamboo:1',
      'chow:character:4',
    ])
    expect(shapes).toContainEqual(['chow:character:4', 'pung:b1', 'pung:b2', 'pung:b3'])
  })

  it('finds nothing for fourteen tiles that do not form a hand', () => {
    expect(completeDecompositions(hand('b135 c246 d789 we ws ww wn dr'))).toEqual([])
  })

  it('finds nothing for a hand that is not fourteen tiles', () => {
    expect(completeDecompositions(hand('b123 b456 c789 we we we dr'))).toEqual([])
  })
})

describe('decomposing a partial hand', () => {
  it('separates sets, a pair, part-sets and loose tiles', () => {
    const reading = bestDecomposition(decompose(hand('b111 b234 c55 d13 d9')))

    expect(reading).not.toBeNull()
    expect(reading!.melds).toHaveLength(2)
    expect(reading!.pair?.tile).toEqual({ kind: 'suit', suit: 'character', rank: 5 })
    expect(reading!.partials).toEqual([
      { type: 'partial-chow', suit: 'dot', ranks: [1, 3] },
    ])
    expect(reading!.floaters).toHaveLength(1)
    expect(reading!.isComplete).toBe(false)
  })

  it('ignores bonus tiles, which never form sets', () => {
    const withFlower = [...hand('b123 b456 c789 we we we dr dr'), bonus('flower', 2)]
    expect(completeDecompositions(withFlower)).toHaveLength(1)
  })

  it('returns a single empty reading for an empty hand', () => {
    const readings = decompose([])
    expect(readings).toHaveLength(1)
    expect(readings[0]).toMatchObject({ melds: [], pair: null, partials: [], floaters: [] })
  })

  it('prefers the reading with the most sets', () => {
    const reading = bestDecomposition(decompose(hand('b123 b456 b789')))
    expect(reading!.melds).toHaveLength(3)
    expect(reading!.floaters).toHaveLength(0)
  })
})

describe('declared melds', () => {
  const eastPung = pung(wind('east'), true)

  it('completes from eleven concealed tiles once a meld is declared', () => {
    const readings = completeDecompositions(hand('b123 b456 c789 dr dr'), [eastPung])

    expect(readings).toHaveLength(1)
    expect(readings[0].declared).toEqual([eastPung])
    expect(allSets(readings[0])).toHaveLength(4)
  })

  it('rejects fourteen concealed tiles once a meld is declared — that is one slot too many', () => {
    expect(completeDecompositions(hand('b123 b456 c789 we we we dr dr'), [eastPung])).toEqual([])
  })

  it('carries the declared meld onto a partial reading too', () => {
    const reading = bestDecomposition(decompose(hand('b123 b456'), [eastPung]))
    expect(reading!.declared).toEqual([eastPung])
    expect(allSets(reading!)).toHaveLength(3)
  })

  it('counts a declared kong as one set', () => {
    const readings = completeDecompositions(hand('b123 b456 c789 dr dr'), [kong(wind('east'))])
    expect(readings).toHaveLength(1)
    expect(allSets(readings[0])).toHaveLength(4)
  })
})
