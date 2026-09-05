import { ALL_TILES, copiesOf } from '../engine/tiles'
import type { TileInstance } from './types'

export function buildWall(): TileInstance[] {
  return ALL_TILES.flatMap((tile) => Array.from({ length: copiesOf(tile) }, (_, copy) => ({
    uid: `${tile.kind === 'bonus' ? `${tile.bonus[0]}${tile.index}` : tile.kind === 'suit' ? `${tile.suit[0]}${tile.rank}` : tile.kind === 'wind' ? `w${tile.wind[0]}` : `d${tile.dragon[0]}`}-${copy}`,
    tile,
  })))
}

/** Mulberry32: small, stable and deliberately independent of platform randomness. */
export function seededShuffle<T>(values: readonly T[], seed: number): T[] {
  const result = [...values]
  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let n = Math.imul(state ^ (state >>> 15), 1 | state)
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export function splitWall(seed: number, replacementSize = 16) {
  const wall = seededShuffle(buildWall(), seed)
  return { liveWall: wall.slice(0, -replacementSize), replacementWall: wall.slice(-replacementSize) }
}
