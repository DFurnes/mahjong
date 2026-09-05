/** Human-readable names for tiles and melds, used in prose and accessible labels. */

import { type Meld, type PartialSet } from './melds'
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

/** "Exposed" or "Concealed", or nothing for a pair, which can never be claimed. */
function exposure(exposed: boolean): string {
  return exposed ? 'Exposed' : 'Concealed'
}

export function meldName(meld: Meld | PartialSet): string {
  switch (meld.type) {
    case 'chow':
      return `${exposure(meld.exposed)} chow ${meld.start}-${meld.start + 1}-${meld.start + 2} of ${SUIT_NAMES[meld.suit]}`
    case 'pung':
      return `${exposure(meld.exposed)} pung of ${tileName(meld.tile)}`
    case 'kong':
      return `${exposure(meld.exposed)} kong of ${tileName(meld.tile)}`
    case 'pair':
      return `Pair of ${tileName(meld.tile)}`
    case 'partial-pung':
      return `${tileName(meld.tile)} pair, needs a third`
    case 'partial-chow':
      return `${meld.ranks.join('-')} of ${SUIT_NAMES[meld.suit]}, needs one more`
  }
}
