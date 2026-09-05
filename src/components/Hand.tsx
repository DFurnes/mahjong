import { useEffect, useRef, useState } from 'react'
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
  /**
   * Strip the hand down to small tiles and slots with no headings for the
   * collapsed tray.
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

function MeldList({
  melds,
  onUndeclare,
  size,
}: {
  melds: readonly Set3[]
  onUndeclare: (index: number) => void
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
        </li>
      ))}
    </ul>
  )
}

function CompactHand({ tiles, melds, bonus, onReturn, onUndeclare }: Omit<HandProps, 'compact'>) {
  const concealedSlots = Math.max(0, HAND_SIZE - melds.length * 3)
  const emptySlots = Math.max(0, concealedSlots - tiles.length)

  // Tracks whether the strip has more tiles past either edge, so those edges
  // can fade in and out as it scrolls. Re-checks on scroll, on window resize,
  // and whenever the tile counts below change — added or returned tiles
  // change the strip's scroll width without the element itself resizing.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [tiles.length, melds.length, bonus.length])

  const scrollClass = [
    'hand__scroll',
    canScrollLeft && 'hand__scroll--can-scroll-left',
    canScrollRight && 'hand__scroll--can-scroll-right',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={scrollClass}>
      <div
        ref={scrollRef}
        className={`hand hand--compact${melds.length > 0 ? ' hand--has-melds' : ''}`}
      >
        <div className="hand__tiles" data-testid="hand-tiles-compact">
          {tiles.map((tile, index) => (
            <Tile
              key={tileKey(tile, index)}
              tile={tile}
              size="small"
              onSelect={() => onReturn('concealed', index)}
            />
          ))}
          {Array.from({ length: emptySlots }, (_, index) => (
            <TileSlot key={`slot-${index}`} size="small" />
          ))}
        </div>

        <div className="hand__melds-compact" data-testid="meld-tiles-compact">
          <MeldList melds={melds} onUndeclare={onUndeclare} size="small" />
        </div>

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
    </div>
  )
}

export function Hand({
  tiles,
  melds,
  bonus,
  onReturn,
  onUndeclare,
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
      />
    )
  }

  // Slots left for concealed tiles once declared melds have taken their three
  // each, so the row only reserves space for tiles still held in hand.
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
        </div>
      </section>

      <section className="hand__section">
        <h2 className="hand__label">Exposed</h2>
        <div data-testid="meld-tiles">
          {melds.length === 0 ? (
            <p className="hand__empty hand__empty--caption">None yet</p>
          ) : (
            <MeldList melds={melds} onUndeclare={onUndeclare} size="medium" />
          )}
        </div>
      </section>

      <section className="hand__section">
        <h2 className="hand__label">Flowers &amp; seasons</h2>
        <div className="hand__tiles" data-testid="bonus-tiles">
          {bonus.length === 0 ? (
            <p className="hand__empty hand__empty--caption">None yet</p>
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
