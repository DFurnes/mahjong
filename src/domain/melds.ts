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
export type Pung = { type: 'pung'; tile: StandardTile; exposed: boolean }
/** Three consecutive tiles in one suit, starting at `start`. A chow can only ever be claimed. */
export type Chow = { type: 'chow'; suit: Suit; start: Rank; exposed: boolean }
/** Four of a kind: three claimed and exposed, or declared face-down (a "concealed kong"). */
export type Kong = { type: 'kong'; tile: StandardTile; exposed: boolean }
/** The hand's single pair (the "eyes"). A pair can never be claimed, so it has no `exposed`. */
export type Pair = { type: 'pair'; tile: StandardTile }

/** A completed group of three (or four, for a kong). */
export type Set3 = Pung | Chow | Kong
export type Meld = Set3 | Pair

/** Two identical tiles waiting on a third. */
export type PartialPung = { type: 'partial-pung'; tile: StandardTile }
/** Two tiles of a suit that a third would complete — 3-4 or 3-5. */
export type PartialChow = { type: 'partial-chow'; suit: Suit; ranks: [Rank, Rank] }
export type PartialSet = PartialPung | PartialChow

export const pung = (tile: StandardTile, exposed = false): Pung => ({
  type: 'pung',
  tile,
  exposed,
})
export const chow = (suit: Suit, start: Rank, exposed = false): Chow => ({
  type: 'chow',
  suit,
  start,
  exposed,
})
export const kong = (tile: StandardTile, exposed = false): Kong => ({
  type: 'kong',
  tile,
  exposed,
})
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

/**
 * A stable key, so decompositions that differ only in ordering can be deduplicated.
 * Deliberately ignores `exposed` — it dedupes readings of the concealed tiles, where
 * every set is concealed by construction, so exposure is never part of a set's identity
 * here.
 */
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
