import {
  BONUS_TILES,
  DRAGONS,
  RANKS,
  SUITS,
  WINDS,
  type Suit,
  type Tile as TileModel,
  type TileCounts,
  dragon,
  suitName,
  suited,
  tileId,
  wind,
} from '../domain'
import { Tile } from './Tile'
import './Table.css'

interface TileGroup {
  label: string
  tiles: readonly TileModel[]
}

const SUIT_GROUPS: readonly TileGroup[] = SUITS.map((suit: Suit) => ({
  label: suitName(suit),
  tiles: RANKS.map((rank) => suited(suit, rank)),
}))

/** The board, laid out the way a set is: three suits, then honours, then bonus tiles. */
const TILE_GROUPS: readonly TileGroup[] = [
  ...SUIT_GROUPS,
  { label: 'Honours', tiles: [...WINDS.map(wind), ...DRAGONS.map(dragon)] },
  { label: 'Flowers & Seasons', tiles: BONUS_TILES },
]

export interface TableProps {
  /** Copies of each tile still available, keyed by tile id. */
  remaining: TileCounts
  onSelect: (tile: TileModel) => void
  /** When the hand is full, only bonus tiles can still be taken. */
  handFull?: boolean
}

export function Table({ remaining, onSelect, handFull = false }: TableProps) {
  return (
    <div className="table">
      {TILE_GROUPS.map((group) => (
        <section className="table__group" key={group.label}>
          <h3 className="table__label">{group.label}</h3>
          <div className="table__tiles">
            {group.tiles.map((tile) => {
              const left = remaining[tileId(tile)] ?? 0
              const blocked = handFull && tile.kind !== 'bonus'
              return (
                <Tile
                  key={tileId(tile)}
                  tile={tile}
                  remaining={left}
                  disabled={left === 0 || blocked}
                  onSelect={onSelect}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
