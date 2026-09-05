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
  /**
   * Strip the hand down to a single row of small tiles — no empty slots and no
   * headings — for the collapsed tray, where it has to fit on one line.
   */
  compact?: boolean
}

function tileKey(tile: TileModel, index: number): string {
  return `${tileId(tile)}-${index}`
}

function CompactHand({ tiles, bonus, onReturn }: Omit<HandProps, 'compact'>) {
  return (
    <div className="hand hand--compact">
      <div className="hand__tiles" data-testid="hand-tiles-compact">
        {tiles.length === 0 ? (
          <p className="hand__empty">No tiles yet</p>
        ) : (
          tiles.map((tile, index) => (
            <Tile
              key={tileKey(tile, index)}
              tile={tile}
              size="small"
              onSelect={() => onReturn('hand', index)}
            />
          ))
        )}
      </div>

      {bonus.length > 0 && <span className="hand__divider" aria-hidden="true" />}

      <div className="hand__tiles" data-testid="bonus-tiles-compact">
        {bonus.map((tile, index) => (
          <Tile
            key={tileKey(tile, index)}
            tile={tile}
            size="small"
            onSelect={() => onReturn('bonus', index)}
          />
        ))}
      </div>
    </div>
  )
}

export function Hand({ tiles, bonus, onReturn, compact = false }: HandProps) {
  if (compact) return <CompactHand tiles={tiles} bonus={bonus} onReturn={onReturn} />

  const emptySlots = Math.max(0, HAND_SIZE - tiles.length)

  return (
    <div className="hand">
      <section className="hand__section">
        {/* The tray's bar already names this section and shows the count. */}
        <div
          className="hand__tiles hand__tiles--main"
          role="group"
          aria-label="Your hand"
          data-testid="hand-tiles"
        >
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
