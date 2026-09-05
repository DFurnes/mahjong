/**
 * How a tile is drawn. Each face is a public-domain illustration keyed by the
 * tile's id, so a tile is a styled image the app can size, disable and animate
 * like any other element.
 *
 * Artwork: https://github.com/samoheen/mahjong-tiles (public domain).
 */

import { tileId, type Tile } from '../domain'

const ART_MODULES = import.meta.glob('../assets/tiles/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const TILE_ART: ReadonlyMap<string, string> = new Map(
  Object.entries(ART_MODULES).map(([path, url]) => {
    const id = path.slice(path.lastIndexOf('/') + 1, -'.svg'.length)
    return [id, url]
  }),
)

export function tileArt(tile: Tile): string {
  const id = tileId(tile)
  const url = TILE_ART.get(id)
  if (!url) throw new Error(`No artwork for tile: ${id}`)
  return url
}
