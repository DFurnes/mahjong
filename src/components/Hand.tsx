import type { CSSProperties } from 'react'
import {
  type BonusTile,
  type Set3,
  type StandardTile,
  type Tile as TileModel,
  HAND_SIZE,
  meldKey,
  meldName,
  meldTiles,
  tileId,
} from '../domain'
import type { Area } from '../state/useMahjongTable'
import { Tile, TileSlot } from './Tile'
import { tileArt } from './tileArt'
import './Hand.css'

export interface HandProps {
  tiles: readonly StandardTile[]
  melds: readonly Set3[]
  bonus: readonly BonusTile[]
  /** Tapping a tile in hand puts it back on the table. */
  onReturn: (area: Area, index: number) => void
  /** Tapping a declared meld takes it apart and returns its tiles to hand. */
  onUndeclare: (index: number) => void
  /** Promotes an exposed pung to a kong by drawing its fourth copy off the table. */
  onKong: (index: number) => void
  /**
   * Strip the hand down to a single row of small tiles — no empty slots and no
   * headings — for the collapsed tray, where it has to fit on one line.
   */
  compact?: boolean
}

function tileKey(tile: TileModel, index: number): string {
  return `${tileId(tile)}-${index}`
}

const MELD_SIZE_CLASS = { small: 'tile--small', medium: '' } as const

/**
 * A tile drawn for reference inside the meld button below — plain markup, not
 * another `<Tile>` button, since a `<button>` cannot nest inside one.
 */
function MeldTileArt({ tile, size }: { tile: TileModel; size: 'small' | 'medium' }) {
  return (
    <span className={['tile', MELD_SIZE_CLASS[size], 'tile--static'].filter(Boolean).join(' ')}>
      <img className="tile__art" src={tileArt(tile)} alt="" draggable={false} />
    </span>
  )
}

const MELD_TYPE_LABEL: Record<Set3['type'], string> = { pung: 'Pung', chow: 'Chow', kong: 'Kong' }

function MeldList({
  melds,
  onUndeclare,
  onKong,
  size,
}: {
  melds: readonly Set3[]
  onUndeclare: (index: number) => void
  onKong: (index: number) => void
  size: 'small' | 'medium'
}) {
  if (melds.length === 0) return null

  return (
    <ul className="hand__melds">
      {melds.map((meld, index) => (
        <li className="hand__meld" key={`${meldKey(meld)}-${index}`}>
          <button
            type="button"
            className="hand__meld-tiles"
            onClick={() => onUndeclare(index)}
            aria-label={`${meldName(meld)}, tap to take back`}
          >
            {meldTiles(meld).map((tile, tileIndex) => (
              <MeldTileArt key={tileIndex} tile={tile} size={size} />
            ))}
          </button>
          {/* The compact peek has no room for a label — it stays a single line of tiles. */}
          {size === 'medium' && (
            <span className="hand__meld-label" aria-hidden="true">
              {MELD_TYPE_LABEL[meld.type]}
            </span>
          )}
          {meld.type === 'pung' && meld.exposed && (
            <button
              type="button"
              className="hand__meld-kong"
              onClick={() => onKong(index)}
              aria-label={`Promote ${meldName(meld)} to a kong`}
            >
              + Kong
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function CompactHand({ tiles, melds, bonus, onReturn, onUndeclare, onKong }: Omit<HandProps, 'compact'>) {
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
              onSelect={() => onReturn('concealed', index)}
            />
          ))
        )}
      </div>

      {melds.length > 0 && <span className="hand__divider" aria-hidden="true" />}

      <div data-testid="meld-tiles-compact">
        <MeldList melds={melds} onUndeclare={onUndeclare} onKong={onKong} size="small" />
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

export function Hand({
  tiles,
  melds,
  bonus,
  onReturn,
  onUndeclare,
  onKong,
  compact = false,
}: HandProps) {
  if (compact) {
    return (
      <CompactHand
        tiles={tiles}
        melds={melds}
        bonus={bonus}
        onReturn={onReturn}
        onUndeclare={onUndeclare}
        onKong={onKong}
      />
    )
  }

  // Slots left for concealed tiles once declared melds have taken their three
  // each — the grid should only ever reserve this many columns, or a declared
  // meld leaves a stretch of dead grid track sitting before the divider.
  const concealedSlots = Math.max(0, HAND_SIZE - melds.length * 3)
  const emptySlots = Math.max(0, concealedSlots - tiles.length)

  return (
    <div className="hand">
      <section className="hand__section">
        {/* The tray's bar already names this section and shows the count. */}
        <div className="hand__row">
          <div
            className="hand__tiles hand__tiles--main"
            role="group"
            aria-label="Your hand"
            data-testid="hand-tiles"
            style={{ '--concealed-slots': concealedSlots } as CSSProperties}
          >
            {tiles.map((tile, index) => (
              <Tile
                key={tileKey(tile, index)}
                tile={tile}
                onSelect={() => onReturn('concealed', index)}
              />
            ))}
            {Array.from({ length: emptySlots }, (_, index) => (
              <TileSlot key={`slot-${index}`} />
            ))}
          </div>

          {melds.length > 0 && <span className="hand__divider" aria-hidden="true" />}

          <div data-testid="meld-tiles">
            <MeldList melds={melds} onUndeclare={onUndeclare} onKong={onKong} size="medium" />
          </div>
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
