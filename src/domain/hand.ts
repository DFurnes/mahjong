/**
 * The shape of a hand in progress: tiles still hidden, sets already declared on
 * the table, and — once it has won — how it got there.
 *
 * A kong fills one of the hand's four set slots but carries a spare fourth
 * tile, so a hand is always fourteen *slot-tiles* — `concealed.length +
 * melds.length * 3` — no matter how many kongs it holds. That is what keeps
 * every existing "fourteen tiles" check correct without having to know about
 * kongs at all.
 */

import { type BonusTile, type StandardTile, type Tile, isStandard } from './tiles'
import { type Set3, meldTiles } from './melds'

/** How the winning tile arrived. Undefined (on {@link Hand.win}) means the player hasn't said. */
export type WinSource = 'draw' | 'discard'

/**
 * Extra circumstances of the win that carry faan of their own, on top of
 * {@link WinSource}. Which named pattern a circumstance scores depends on the
 * source it pairs with — `last-tile` is 海底撈月 on a draw and 河底撈魚 on a
 * discard, and `first-turn` is 天和 for the East seat and 地和 for anyone else.
 */
export type WinCircumstance =
  | 'last-tile'
  | 'after-kong'
  | 'robbing-kong'
  | 'first-turn'

export interface Hand {
  /** Tiles still hidden in front of the player. */
  concealed: StandardTile[]
  /** Sets already on the table: claimed melds, and kongs declared face-down. */
  melds: Set3[]
  /** Flowers and seasons, which sit outside the hand and never count toward the fourteen. */
  bonus: BonusTile[]
  /** How the hand was won, if the player has said. Undefined means no situational faan applies. */
  win?: WinSource
  /** Extra circumstances of the win. Empty or absent means an ordinary win. */
  circumstances?: readonly WinCircumstance[]
}

export const HAND_SIZE = 14

export const EMPTY_HAND: Hand = { concealed: [], melds: [], bonus: [] }

/** Tiles counted toward the fourteen: concealed tiles plus three per declared set. */
export function handSize(hand: Hand): number {
  return hand.concealed.length + hand.melds.length * 3
}

export function isFullHand(hand: Hand): boolean {
  return handSize(hand) >= HAND_SIZE
}

/** Every standard tile held, kongs' fourth copies included — what tile-level faan reads. */
export function handTiles(hand: Hand): StandardTile[] {
  return [...hand.concealed, ...hand.melds.flatMap(meldTiles)] as StandardTile[]
}

/** True when nothing was claimed from a discard. A concealed kong does not break it. */
export function isConcealedHand(hand: Hand): boolean {
  return hand.melds.every((meld) => !meld.exposed)
}

/** A hand with nothing declared — the common case while building, and in tests. */
export function concealedHand(tiles: readonly Tile[], win?: WinSource): Hand {
  return {
    concealed: tiles.filter(isStandard) as StandardTile[],
    melds: [],
    bonus: tiles.filter((tile): tile is BonusTile => !isStandard(tile)),
    win,
  }
}
