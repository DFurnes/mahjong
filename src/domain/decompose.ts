/**
 * Hand decomposition: the search that turns a loose pile of tiles into sets.
 *
 * The same fourteen tiles can often be read more than one way — 1-1-1-2-2-2-3-3-3
 * of a suit is three pungs *or* three chows — and the readings can score
 * differently, so the search returns every equally-good reading rather than
 * picking one. Everything downstream (shanten, scoring, the hand explanation)
 * is built on top of this.
 */

import {
  type PartialSet,
  type Pair,
  type Set3,
  chow,
  meldKey,
  pair,
  pung,
} from './melds'
import {
  STANDARD_TILES,
  type Rank,
  type StandardTile,
  type Suit,
  type Tile,
  isStandard,
  tileId,
} from './tiles'

export interface Decomposition {
  /** Completed sets of three. */
  melds: Set3[]
  /** The hand's pair, if the reading set one aside. */
  pair: Pair | null
  /** Two-tile fragments one tile short of a set. */
  partials: PartialSet[]
  /** Tiles that contribute to nothing. */
  floaters: StandardTile[]
  /** Four sets and a pair, with nothing left over. */
  isComplete: boolean
}

/** The 34 standard tiles as a fixed-index array: 0-8 bamboo, 9-17 characters, 18-26 dots, 27-30 winds, 31-33 dragons. */
const STANDARD_LIST = STANDARD_TILES as readonly StandardTile[]
const INDEX_BY_ID = new Map(STANDARD_LIST.map((tile, index) => [tileId(tile), index]))

const SUITED_COUNT = 27
const SUIT_BY_BLOCK: readonly Suit[] = ['bamboo', 'character', 'dot']

function indexOfTile(tile: StandardTile): number {
  const index = INDEX_BY_ID.get(tileId(tile))
  if (index === undefined) throw new Error(`Not a standard tile: ${tileId(tile)}`)
  return index
}

function isSuitedIndex(index: number): boolean {
  return index < SUITED_COUNT
}

function suitOfIndex(index: number): Suit {
  return SUIT_BY_BLOCK[Math.floor(index / 9)]
}

function rankOfIndex(index: number): Rank {
  return ((index % 9) + 1) as Rank
}

/** True when `index` and the two indices above it are the same suit (so a chow is possible). */
function canStartRun(index: number, span: number): boolean {
  return isSuitedIndex(index) && index % 9 <= 9 - 1 - span
}

type Counts = number[]

function toCounts(tiles: readonly StandardTile[]): Counts {
  const counts = new Array<number>(STANDARD_LIST.length).fill(0)
  for (const tile of tiles) counts[indexOfTile(tile)] += 1
  return counts
}

/** A decomposition-in-progress, built from the tail of the hand back to the front. */
interface Partial {
  melds: Set3[]
  pair: Pair | null
  partials: PartialSet[]
  floaters: StandardTile[]
}

const EMPTY: Partial = { melds: [], pair: null, partials: [], floaters: [] }

function withMeld(sub: Partial, meld: Set3): Partial {
  return { ...sub, melds: [meld, ...sub.melds] }
}

function withPair(sub: Partial, p: Pair): Partial {
  return { ...sub, pair: p }
}

function withPartial(sub: Partial, partial: PartialSet): Partial {
  return { ...sub, partials: [partial, ...sub.partials] }
}

function withFloater(sub: Partial, tile: StandardTile): Partial {
  return { ...sub, floaters: [tile, ...sub.floaters] }
}

/**
 * Drop readings that another reading beats outright — same pair status, no fewer
 * sets, no fewer partials. Ties survive, so genuinely different readings of the
 * same tiles are all kept.
 */
function prune(results: Partial[]): Partial[] {
  const kept: Partial[] = []
  for (const candidate of results) {
    const dominated = results.some((other) => strictlyDominates(other, candidate))
    if (!dominated) kept.push(candidate)
  }
  return dedupe(kept)
}

function strictlyDominates(a: Partial, b: Partial): boolean {
  if ((a.pair === null) !== (b.pair === null)) return false
  const better =
    a.melds.length > b.melds.length ||
    (a.melds.length === b.melds.length && a.partials.length > b.partials.length)
  return (
    better && a.melds.length >= b.melds.length && a.partials.length >= b.partials.length
  )
}

function partialKey(sub: Partial): string {
  return [
    sub.melds.map(meldKey).join(','),
    sub.pair ? meldKey(sub.pair) : '-',
    sub.partials.map(meldKey).join(','),
    sub.floaters.map(tileId).join(','),
  ].join('|')
}

function dedupe(results: Partial[]): Partial[] {
  const seen = new Set<string>()
  const unique: Partial[] = []
  for (const result of results) {
    const key = partialKey(result)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(result)
  }
  return unique
}

/**
 * Enumerate readings of `counts`, always consuming the lowest remaining tile so
 * that melds come out in canonical order and identical sub-problems collide in
 * the memo.
 *
 * `complete` mode only ever takes whole sets and a pair, and discards any branch
 * that cannot use every tile — that is a small search, and it finds every
 * winning reading exactly. `best` mode also takes part-sets and floaters, so it
 * always returns something; there it keeps one representative per distinct
 * shape, since readings with the same set/part-set/pair profile are worth the
 * same to both the explanation and the distance-to-win calculation.
 */
type Mode = 'complete' | 'best'

function shapeKey(sub: Partial): string {
  const pairShaped = sub.partials.filter((p) => p.type === 'partial-pung').length
  return [sub.melds.length, sub.pair ? 1 : 0, sub.partials.length, pairShaped].join(':')
}

function keepRepresentatives(results: Partial[]): Partial[] {
  const seen = new Set<string>()
  const kept: Partial[] = []
  for (const result of results) {
    const key = shapeKey(result)
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(result)
  }
  return kept
}

function search(
  counts: Counts,
  pairTaken: boolean,
  mode: Mode,
  memo: Map<string, Partial[]>,
): Partial[] {
  const key = `${counts.join(',')}|${pairTaken ? 1 : 0}`
  const cached = memo.get(key)
  if (cached) return cached

  let index = 0
  while (index < counts.length && counts[index] === 0) index += 1
  if (index === counts.length) return [EMPTY]

  const tile = STANDARD_LIST[index]
  const results: Partial[] = []

  const recurse = (
    mutate: (c: Counts) => void,
    wrap: (sub: Partial) => Partial,
    tookPair = false,
  ) => {
    const next = [...counts]
    mutate(next)
    for (const sub of search(next, pairTaken || tookPair, mode, memo)) results.push(wrap(sub))
  }

  if (counts[index] >= 3) {
    recurse(
      (c) => {
        c[index] -= 3
      },
      (sub) => withMeld(sub, pung(tile)),
    )
  }

  if (canStartRun(index, 2) && counts[index + 1] > 0 && counts[index + 2] > 0) {
    recurse(
      (c) => {
        c[index] -= 1
        c[index + 1] -= 1
        c[index + 2] -= 1
      },
      (sub) => withMeld(sub, chow(suitOfIndex(index), rankOfIndex(index))),
    )
  }

  if (!pairTaken && counts[index] >= 2) {
    recurse(
      (c) => {
        c[index] -= 2
      },
      (sub) => withPair(sub, pair(tile)),
      true,
    )
  }

  if (mode === 'best') {
    if (counts[index] >= 2) {
      recurse(
        (c) => {
          c[index] -= 2
        },
        (sub) => withPartial(sub, { type: 'partial-pung', tile }),
      )
    }

    for (const span of [1, 2] as const) {
      if (canStartRun(index, span) && counts[index + span] > 0) {
        recurse(
          (c) => {
            c[index] -= 1
            c[index + span] -= 1
          },
          (sub) =>
            withPartial(sub, {
              type: 'partial-chow',
              suit: suitOfIndex(index),
              ranks: [rankOfIndex(index), rankOfIndex(index + span)],
            }),
        )
      }
    }

    recurse(
      (c) => {
        c[index] -= 1
      },
      (sub) => withFloater(sub, tile),
    )
  }

  const reduced = mode === 'best' ? keepRepresentatives(prune(results)) : dedupe(results)
  memo.set(key, reduced)
  return reduced
}

function toDecomposition(sub: Partial, handSize: number): Decomposition {
  return {
    melds: sub.melds,
    pair: sub.pair,
    partials: sub.partials,
    floaters: sub.floaters,
    isComplete:
      handSize === 14 &&
      sub.melds.length === 4 &&
      sub.pair !== null &&
      sub.partials.length === 0 &&
      sub.floaters.length === 0,
  }
}

/**
 * The best readings of a hand — most sets, then most part-sets — with one
 * representative per distinct shape. Bonus tiles are ignored; they sit outside
 * the hand proper and never form sets.
 */
export function decompose(tiles: readonly Tile[]): Decomposition[] {
  const standard = tiles.filter(isStandard)
  const results = search(toCounts(standard), false, 'best', new Map())
  return keepRepresentatives(prune(results)).map((sub) => toDecomposition(sub, standard.length))
}

/**
 * Every reading that is a complete winning shape: four sets and a pair, with
 * nothing left over. Empty for a hand that cannot win as it stands.
 */
export function completeDecompositions(tiles: readonly Tile[]): Decomposition[] {
  const standard = tiles.filter(isStandard)
  if (standard.length !== 14) return []
  const results = search(toCounts(standard), false, 'complete', new Map())
  return results
    .map((sub) => toDecomposition(sub, standard.length))
    .filter((decomposition) => decomposition.isComplete)
}

/** The reading to show the player: most sets, then most part-sets, then fewest loose tiles. */
export function bestDecomposition(decompositions: readonly Decomposition[]): Decomposition | null {
  if (decompositions.length === 0) return null
  return [...decompositions].sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1
    if (a.melds.length !== b.melds.length) return b.melds.length - a.melds.length
    const aPair = a.pair ? 1 : 0
    const bPair = b.pair ? 1 : 0
    if (aPair !== bPair) return bPair - aPair
    if (a.partials.length !== b.partials.length) return b.partials.length - a.partials.length
    return a.floaters.length - b.floaters.length
  })[0]
}
