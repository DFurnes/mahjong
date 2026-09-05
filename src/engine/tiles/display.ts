/** Human-readable names and glyphs for tiles, used in prose and accessible labels. */

import type { Suit, Tile, Wind, Dragon, BonusKind } from './tiles'

const SUIT_NAMES: Record<Suit, string> = {
  bamboo: 'Bamboo',
  character: 'Characters',
  dot: 'Dots',
}

const WIND_NAMES: Record<Wind, string> = {
  east: 'East',
  south: 'South',
  west: 'West',
  north: 'North',
}

const DRAGON_NAMES: Record<Dragon, string> = {
  red: 'Red Dragon',
  green: 'Green Dragon',
  white: 'White Dragon',
}

const BONUS_NAMES: Record<BonusKind, readonly string[]> = {
  flower: ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo Flower'],
  season: ['Spring', 'Summer', 'Autumn', 'Winter'],
}

export function suitName(suit: Suit): string {
  return SUIT_NAMES[suit]
}

export function windName(wind: Wind): string {
  return WIND_NAMES[wind]
}

const WIND_HANZI: Record<Wind, string> = { east: '東', south: '南', west: '西', north: '北' }

export function windGlyph(wind: Wind): string {
  return WIND_HANZI[wind]
}

export function tileName(tile: Tile): string {
  switch (tile.kind) {
    case 'suit':
      return `${tile.rank} of ${SUIT_NAMES[tile.suit]}`
    case 'wind':
      return `${WIND_NAMES[tile.wind]} Wind`
    case 'dragon':
      return DRAGON_NAMES[tile.dragon]
    case 'bonus':
      return BONUS_NAMES[tile.bonus][tile.index - 1]
  }
}
