/**
 * Shorthand for writing hands in tests and fixtures: `hand('b123 c456 d789 we we we dr dr')`.
 */

import {
  type Dragon,
  type Rank,
  type StandardTile,
  type Suit,
  type Wind,
  dragon,
  suited,
  wind,
} from '../tiles/tiles'

const SUIT_BY_LETTER: Record<string, Suit> = { b: 'bamboo', c: 'character', d: 'dot' }
const WIND_BY_LETTER: Record<string, Wind> = { e: 'east', s: 'south', w: 'west', n: 'north' }
const DRAGON_BY_LETTER: Record<string, Dragon> = { r: 'red', g: 'green', w: 'white' }

/**
 * Parse a whitespace-separated hand. A token is a suit letter followed by ranks
 * (`b123`), or an honour: `we`/`ws`/`ww`/`wn` for winds, `dr`/`dg`/`dw` for dragons.
 */
export function hand(notation: string): StandardTile[] {
  const tiles: StandardTile[] = []

  for (const token of notation.trim().split(/\s+/).filter(Boolean)) {
    const [head, ...rest] = token
    const body = rest.join('')

    if (head === 'w' && WIND_BY_LETTER[body]) {
      tiles.push(wind(WIND_BY_LETTER[body]))
      continue
    }
    if (head === 'd' && DRAGON_BY_LETTER[body] && !/^\d+$/.test(body)) {
      tiles.push(dragon(DRAGON_BY_LETTER[body]))
      continue
    }

    const suit = SUIT_BY_LETTER[head]
    if (!suit || !/^\d+$/.test(body)) throw new Error(`Unparseable tile group: ${token}`)
    for (const digit of body) tiles.push(suited(suit, Number(digit) as Rank))
  }

  return tiles
}
