/**
 * The groupings a hand decomposes into. A winning hand is four sets and a pair;
 * partial sets are the two-tile fragments that are one tile short of a set, and
 * matter for measuring how far a hand is from winning.
 */

import {
  type Rank,
  type StandardTile,
  type Suit,
  type Tile,
  suited,
  tileId,
} from './tiles'

/** Three of a kind. */
export type Pung = { type: 'pung'; tile: StandardTile }
/** Three consecutive tiles in one suit, starting at `start`. */
export type Chow = { type: 'chow'; suit: Suit; start: Rank }
/** Four of a kind. Not produced yet — a concealed kong needs a 15-tile hand. */
export type Kong = { type: 'kong'; tile: StandardTile }
/** The hand's single pair (the "eyes"). */
export type Pair = { type: 'pair'; tile: StandardTile }

/** A completed group of three (or four, once kongs exist). */
export type Set3 = Pung | Chow | Kong
export type Meld = Set3 | Pair

/** Two identical tiles waiting on a third. */
export type PartialPung = { type: 'partial-pung'; tile: StandardTile }
/** Two tiles of a suit that a third would complete — 3-4 or 3-5. */
export type PartialChow = { type: 'partial-chow'; suit: Suit; ranks: [Rank, Rank] }
export type PartialSet = PartialPung | PartialChow

export const pung = (tile: StandardTile): Pung => ({ type: 'pung', tile })
export const chow = (suit: Suit, start: Rank): Chow => ({ type: 'chow', suit, start })
export const kong = (tile: StandardTile): Kong => ({ type: 'kong', tile })
export const pair = (tile: StandardTile): Pair => ({ type: 'pair', tile })

export function isChow(meld: Meld): meld is Chow {
  return meld.type === 'chow'
}

export function isPungLike(meld: Meld): meld is Pung | Kong {
  return meld.type === 'pung' || meld.type === 'kong'
}

/** The tiles a meld is made of, in order. */
export function meldTiles(meld: Meld | PartialSet): Tile[] {
  switch (meld.type) {
    case 'chow':
      return [
        suited(meld.suit, meld.start),
        suited(meld.suit, (meld.start + 1) as Rank),
        suited(meld.suit, (meld.start + 2) as Rank),
      ]
    case 'pung':
      return [meld.tile, meld.tile, meld.tile]
    case 'kong':
      return [meld.tile, meld.tile, meld.tile, meld.tile]
    case 'pair':
    case 'partial-pung':
      return [meld.tile, meld.tile]
    case 'partial-chow':
      return meld.ranks.map((rank) => suited(meld.suit, rank))
  }
}

/** A stable key, so decompositions that differ only in ordering can be deduplicated. */
export function meldKey(meld: Meld | PartialSet): string {
  switch (meld.type) {
    case 'chow':
      return `chow:${meld.suit}:${meld.start}`
    case 'partial-chow':
      return `pchow:${meld.suit}:${meld.ranks.join('-')}`
    default:
      return `${meld.type}:${tileId(meld.tile)}`
  }
}
