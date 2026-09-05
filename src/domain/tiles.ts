/**
 * The vocabulary of a Hong Kong mahjong set.
 *
 * A full set is 144 physical tiles: 34 distinct standard tiles with four copies
 * each (136), plus eight unique bonus tiles (four flowers, four seasons).
 */

export type Suit = 'bamboo' | 'character' | 'dot'
export type Wind = 'east' | 'south' | 'west' | 'north'
export type Dragon = 'red' | 'green' | 'white'
export type BonusKind = 'flower' | 'season'

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type BonusIndex = 1 | 2 | 3 | 4

export type SuitTile = { kind: 'suit'; suit: Suit; rank: Rank }
export type WindTile = { kind: 'wind'; wind: Wind }
export type DragonTile = { kind: 'dragon'; dragon: Dragon }
export type BonusTile = { kind: 'bonus'; bonus: BonusKind; index: BonusIndex }

/** An honour tile is a wind or a dragon. */
export type HonourTile = WindTile | DragonTile
/** A standard tile is anything that can be part of a scored hand. */
export type StandardTile = SuitTile | HonourTile

export type Tile = StandardTile | BonusTile

/**
 * A short, stable string key for a tile — `b1`, `c9`, `d5`, `we`, `dr`, `f1`, `s3`.
 * The discriminated union above is the canonical shape, but counting and set
 * search want a cheap primitive key, so every tile has one of these too.
 */
export type TileId = string

export const SUITS: readonly Suit[] = ['bamboo', 'character', 'dot']
export const WINDS: readonly Wind[] = ['east', 'south', 'west', 'north']
export const DRAGONS: readonly Dragon[] = ['red', 'green', 'white']
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export const BONUS_INDICES: readonly BonusIndex[] = [1, 2, 3, 4]

const SUIT_PREFIX: Record<Suit, string> = { bamboo: 'b', character: 'c', dot: 'd' }
const WIND_SUFFIX: Record<Wind, string> = { east: 'e', south: 's', west: 'w', north: 'n' }
const DRAGON_SUFFIX: Record<Dragon, string> = { red: 'r', green: 'g', white: 'w' }
const BONUS_PREFIX: Record<BonusKind, string> = { flower: 'f', season: 's' }

export function tileId(tile: Tile): TileId {
  switch (tile.kind) {
    case 'suit':
      return `${SUIT_PREFIX[tile.suit]}${tile.rank}`
    case 'wind':
      return `w${WIND_SUFFIX[tile.wind]}`
    case 'dragon':
      return `d${DRAGON_SUFFIX[tile.dragon]}`
    case 'bonus':
      return `${BONUS_PREFIX[tile.bonus]}${tile.index}`
  }
}

/** Constructors, so callers never have to spell out the union by hand. */
export const suited = (suit: Suit, rank: Rank): SuitTile => ({ kind: 'suit', suit, rank })
export const wind = (w: Wind): WindTile => ({ kind: 'wind', wind: w })
export const dragon = (d: Dragon): DragonTile => ({ kind: 'dragon', dragon: d })
export const bonus = (kind: BonusKind, index: BonusIndex): BonusTile => ({
  kind: 'bonus',
  bonus: kind,
  index,
})

/** All 34 standard tiles, in canonical display order. */
export const STANDARD_TILES: readonly StandardTile[] = [
  ...SUITS.flatMap((suit) => RANKS.map((rank) => suited(suit, rank))),
  ...WINDS.map(wind),
  ...DRAGONS.map(dragon),
]

/** The eight bonus tiles: four flowers and four seasons. */
export const BONUS_TILES: readonly BonusTile[] = [
  ...BONUS_INDICES.map((index) => bonus('flower', index)),
  ...BONUS_INDICES.map((index) => bonus('season', index)),
]

/** Every distinct tile face in the game — 42 of them. */
export const ALL_TILES: readonly Tile[] = [...STANDARD_TILES, ...BONUS_TILES]

export const TILES_BY_ID: ReadonlyMap<TileId, Tile> = new Map(
  ALL_TILES.map((tile) => [tileId(tile), tile]),
)

/** Position of each tile in canonical order, used for sorting and search order. */
const TILE_ORDER: ReadonlyMap<TileId, number> = new Map(
  ALL_TILES.map((tile, index) => [tileId(tile), index]),
)

export function parseTileId(id: TileId): Tile {
  const tile = TILES_BY_ID.get(id)
  if (!tile) throw new Error(`Unknown tile id: ${id}`)
  return tile
}

/**
 * Standard tiles come four to a set; each flower and season is unique.
 */
export function copiesOf(tile: Tile): number {
  return tile.kind === 'bonus' ? 1 : 4
}

export function isSuited(tile: Tile): tile is SuitTile {
  return tile.kind === 'suit'
}

export function isHonour(tile: Tile): tile is HonourTile {
  return tile.kind === 'wind' || tile.kind === 'dragon'
}

export function isBonus(tile: Tile): tile is BonusTile {
  return tile.kind === 'bonus'
}

export function isStandard(tile: Tile): tile is StandardTile {
  return tile.kind !== 'bonus'
}

/** A terminal is a 1 or a 9 of any suit. */
export function isTerminal(tile: Tile): boolean {
  return isSuited(tile) && (tile.rank === 1 || tile.rank === 9)
}

export function isTerminalOrHonour(tile: Tile): boolean {
  return isTerminal(tile) || isHonour(tile)
}

/** `null` for honours and bonus tiles, which belong to no suit. */
export function suitOf(tile: Tile): Suit | null {
  return isSuited(tile) ? tile.suit : null
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return tileId(a) === tileId(b)
}

/** Canonical ordering: bamboo, characters, dots (by rank), winds, dragons, bonus. */
export function compareTiles(a: Tile, b: Tile): number {
  return (TILE_ORDER.get(tileId(a)) ?? 0) - (TILE_ORDER.get(tileId(b)) ?? 0)
}

export function sortTiles(tiles: readonly Tile[]): Tile[] {
  return [...tiles].sort(compareTiles)
}

/** How many tiles of each face are present, keyed by tile id. */
export type TileCounts = Record<TileId, number>

export function countTiles(tiles: readonly Tile[]): TileCounts {
  const counts: TileCounts = {}
  for (const tile of tiles) {
    const id = tileId(tile)
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

export function totalTiles(counts: TileCounts): number {
  let total = 0
  for (const id in counts) total += counts[id]
  return total
}

export function countOf(counts: TileCounts, tile: Tile): number {
  return counts[tileId(tile)] ?? 0
}

/** Expand a count map back into a sorted list of tiles. */
export function tilesFromCounts(counts: TileCounts): Tile[] {
  const tiles: Tile[] = []
  for (const id in counts) {
    for (let i = 0; i < counts[id]; i += 1) tiles.push(parseTileId(id))
  }
  return sortTiles(tiles)
}
