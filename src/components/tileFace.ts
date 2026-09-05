/**
 * How a tile is drawn. Faces are built from type rather than images, so a tile
 * is a styled element the app can size, disable and animate like any other.
 */

import type { Dragon, Suit, Tile, Wind } from '../domain'

/** Ink colour of the face, matching how the suit is painted on a real tile. */
export type FaceTone = 'green' | 'red' | 'blue' | 'ink'

export interface TileFace {
  /** The large glyph in the middle of the tile. */
  glyph: string
  /** The suit mark under it, for numbered tiles. */
  mark?: string
  tone: FaceTone
}

const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

const SUIT_MARK: Record<Suit, string> = { bamboo: '索', character: '萬', dot: '筒' }
const SUIT_TONE: Record<Suit, FaceTone> = { bamboo: 'green', character: 'ink', dot: 'blue' }

const WIND_GLYPH: Record<Wind, string> = { east: '東', south: '南', west: '西', north: '北' }
const DRAGON_GLYPH: Record<Dragon, string> = { red: '中', green: '發', white: '白' }
const DRAGON_TONE: Record<Dragon, FaceTone> = { red: 'red', green: 'green', white: 'blue' }

const FLOWER_GLYPHS = ['梅', '蘭', '菊', '竹']
const SEASON_GLYPHS = ['春', '夏', '秋', '冬']

export function tileFace(tile: Tile): TileFace {
  switch (tile.kind) {
    case 'suit':
      return {
        glyph: NUMERALS[tile.rank - 1],
        mark: SUIT_MARK[tile.suit],
        tone: SUIT_TONE[tile.suit],
      }
    case 'wind':
      return { glyph: WIND_GLYPH[tile.wind], tone: 'ink' }
    case 'dragon':
      return { glyph: DRAGON_GLYPH[tile.dragon], tone: DRAGON_TONE[tile.dragon] }
    case 'bonus':
      return tile.bonus === 'flower'
        ? { glyph: FLOWER_GLYPHS[tile.index - 1], tone: 'red' }
        : { glyph: SEASON_GLYPHS[tile.index - 1], tone: 'green' }
  }
}
