/**
 * How far a hand is from winning.
 *
 * `tilesAway` is the number the UI shows: how many more tiles the hand still
 * needs (counting a swap as one), where 0 means the hand is already a winner.
 * It works at any hand size, which matters here because the player builds a
 * hand up from nothing. `shanten` is the conventional mahjong number for the
 * same thing, one lower, and only meaningful once the hand is nearly full.
 */

import { type Decomposition, decompose } from './decompose'
import {
  type StandardTile,
  type Tile,
  isStandard,
  isTerminalOrHonour,
  tileId,
} from './tiles'

const SETS_PER_HAND = 4
const HAND_TILES = 14

/**
 * The most tiles of this reading that can survive into a finished hand.
 *
 * A winning hand is four set slots and a pair slot. A completed set fills a slot
 * with three tiles, a part-set with two, and any single spare tile can sit in an
 * empty slot as the start of a set — so it still counts as progress. Whatever
 * cannot be placed has to be discarded.
 */
function keepableTiles(decomposition: Decomposition): number {
  const { melds, pair, partials, floaters } = decomposition
  const setsFilled = Math.min(melds.length, SETS_PER_HAND)
  const pungPartials = partials.filter((p) => p.type === 'partial-pung').length

  const pairChoices: ('pair' | 'partial-pung' | 'none')[] = ['none']
  if (pair) pairChoices.push('pair')
  if (pungPartials > 0) pairChoices.push('partial-pung')

  let best = 0
  for (const choice of pairChoices) {
    const pairTiles = choice === 'none' ? 0 : 2
    const partialsAvailable = partials.length - (choice === 'partial-pung' ? 1 : 0)

    const setSlots = SETS_PER_HAND - setsFilled
    const partialsPlaced = Math.min(partialsAvailable, setSlots)
    const emptySlots = setSlots - partialsPlaced + (pairTiles > 0 ? 0 : 1)

    // Tiles left over once sets and the pair are placed, any one of which can
    // seed an empty slot.
    const spares =
      floaters.length +
      (partialsAvailable - partialsPlaced) * 2 +
      (pair && choice !== 'pair' ? 2 : 0)
    const seeds = Math.min(spares, emptySlots)

    best = Math.max(best, setsFilled * 3 + partialsPlaced * 2 + pairTiles + seeds)
  }
  return Math.min(best, HAND_TILES)
}

/** Tiles still needed for thirteen orphans: one of each terminal and honour, plus a pair. */
export function thirteenOrphansCost(tiles: readonly Tile[]): number {
  const orphans = tiles.filter(isStandard).filter(isTerminalOrHonour)
  const seen = new Map<string, number>()
  for (const tile of orphans) {
    const id = tileId(tile)
    seen.set(id, (seen.get(id) ?? 0) + 1)
  }
  const distinct = seen.size
  const hasPair = [...seen.values()].some((count) => count >= 2)
  return 13 - distinct + (hasPair ? 0 : 1)
}

/**
 * Minimum tiles the hand still needs to become a winning hand. 0 means it
 * already is one.
 */
export function tilesAway(tiles: readonly Tile[]): number {
  const standard = tiles.filter(isStandard) as StandardTile[]
  const keepable = decompose(standard).map(keepableTiles)
  const standardCost = HAND_TILES - (keepable.length > 0 ? Math.max(...keepable) : 0)
  return Math.min(standardCost, thirteenOrphansCost(standard))
}

/** Conventional shanten: 0 is tenpai (one tile from a win), -1 is a winning hand. */
export function shanten(tiles: readonly Tile[]): number {
  return tilesAway(tiles) - 1
}
