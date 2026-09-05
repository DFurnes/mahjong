import {
  type BonusTile,
  type StandardTile,
  type Tile as TileModel,
  HAND_SIZE,
  tileId,
} from '../domain'
import type { Area } from '../state/useMahjongTable'
import { Tile, TileSlot } from './Tile'
import './Hand.css'

export interface HandProps {
  tiles: readonly StandardTile[]
  bonus: readonly BonusTile[]
  /** Tapping a tile in hand puts it back on the table. */
  onReturn: (area: Area, index: number) => void
}

function tileKey(tile: TileModel, index: number): string {
  return `${tileId(tile)}-${index}`
}

export function Hand({ tiles, bonus, onReturn }: HandProps) {
  const emptySlots = Math.max(0, HAND_SIZE - tiles.length)

  return (
    <div className="hand">
      <section className="hand__section">
        <h2 className="hand__label">
          Your hand
          <span className="hand__count">
            {tiles.length} / {HAND_SIZE}
          </span>
        </h2>
        <div className="hand__tiles hand__tiles--main" data-testid="hand-tiles">
          {tiles.map((tile, index) => (
            <Tile
              key={tileKey(tile, index)}
              tile={tile}
              onSelect={() => onReturn('hand', index)}
            />
          ))}
          {Array.from({ length: emptySlots }, (_, index) => (
            <TileSlot key={`slot-${index}`} />
          ))}
        </div>
      </section>

      <section className="hand__section">
        <h2 className="hand__label">Flowers &amp; seasons</h2>
        <div className="hand__tiles" data-testid="bonus-tiles">
          {bonus.length === 0 ? (
            <p className="hand__empty">None yet</p>
          ) : (
            bonus.map((tile, index) => (
              <Tile
                key={tileKey(tile, index)}
                tile={tile}
                size="small"
                onSelect={() => onReturn('bonus', index)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}
