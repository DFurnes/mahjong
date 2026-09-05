import { describe, expect, it } from 'vitest'
import {
  ALL_TILES,
  BONUS_TILES,
  STANDARD_TILES,
  bonus,
  compareTiles,
  copiesOf,
  countTiles,
  dragon,
  isBonus,
  isHonour,
  isTerminal,
  isTerminalOrHonour,
  parseTileId,
  sortTiles,
  suited,
  tileId,
  tilesFromCounts,
  totalTiles,
  wind,
} from './tiles'

describe('the tile set', () => {
  it('has 34 standard tiles and 8 bonus tiles', () => {
    expect(STANDARD_TILES).toHaveLength(34)
    expect(BONUS_TILES).toHaveLength(8)
    expect(ALL_TILES).toHaveLength(42)
  })

  it('gives every tile a distinct id that round-trips', () => {
    const ids = ALL_TILES.map(tileId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const tile of ALL_TILES) {
      expect(tileId(parseTileId(tileId(tile)))).toBe(tileId(tile))
    }
  })

  it('rejects an unknown id', () => {
    expect(() => parseTileId('z9')).toThrow(/Unknown tile/)
  })

  it('has four copies of each standard tile and one of each bonus tile', () => {
    expect(copiesOf(suited('bamboo', 5))).toBe(4)
    expect(copiesOf(dragon('red'))).toBe(4)
    expect(copiesOf(bonus('flower', 1))).toBe(1)

    const total = ALL_TILES.reduce((sum, tile) => sum + copiesOf(tile), 0)
    expect(total).toBe(144)
  })
})

describe('classifying tiles', () => {
  it('recognises honours, bonus tiles and terminals', () => {
    expect(isHonour(wind('east'))).toBe(true)
    expect(isHonour(dragon('white'))).toBe(true)
    expect(isHonour(suited('dot', 1))).toBe(false)

    expect(isBonus(bonus('season', 3))).toBe(true)
    expect(isBonus(wind('north'))).toBe(false)

    expect(isTerminal(suited('bamboo', 1))).toBe(true)
    expect(isTerminal(suited('bamboo', 9))).toBe(true)
    expect(isTerminal(suited('bamboo', 5))).toBe(false)
    expect(isTerminal(wind('east'))).toBe(false)

    expect(isTerminalOrHonour(wind('east'))).toBe(true)
    expect(isTerminalOrHonour(suited('dot', 5))).toBe(false)
  })
})

describe('ordering', () => {
  it('sorts bamboo, then characters, then dots, then honours', () => {
    const shuffled = [
      dragon('red'),
      suited('dot', 2),
      wind('east'),
      suited('bamboo', 9),
      suited('character', 1),
    ]
    expect(sortTiles(shuffled).map(tileId)).toEqual(['b9', 'c1', 'd2', 'we', 'dr'])
  })

  it('orders identical tiles equally', () => {
    expect(compareTiles(suited('dot', 4), suited('dot', 4))).toBe(0)
  })
})

describe('counting', () => {
  it('counts tiles by id and expands them back again', () => {
    const tiles = [suited('bamboo', 1), suited('bamboo', 1), wind('south')]
    const counts = countTiles(tiles)

    expect(counts).toEqual({ b1: 2, ws: 1 })
    expect(totalTiles(counts)).toBe(3)
    expect(tilesFromCounts(counts).map(tileId)).toEqual(['b1', 'b1', 'ws'])
  })
})
