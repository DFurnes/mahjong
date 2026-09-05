import { type Tile as TileModel, tileName } from '../domain'
import { tileFace } from './tileFace'
import './Tile.css'

export type TileSize = 'small' | 'medium' | 'large'

export interface TileProps {
  tile: TileModel
  /** Copies still on the table. Shown as a badge when given. */
  remaining?: number
  disabled?: boolean
  size?: TileSize
  onSelect?: (tile: TileModel) => void
}

const SIZE_CLASS: Record<TileSize, string> = {
  small: 'tile--small',
  medium: '',
  large: 'tile--large',
}

export function Tile({ tile, remaining, disabled = false, size = 'medium', onSelect }: TileProps) {
  const face = tileFace(tile)
  const label = tileName(tile)
  const classes = ['tile', `tile--${face.tone}`, SIZE_CLASS[size], onSelect ? '' : 'tile--static']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || !onSelect}
      aria-label={remaining === undefined ? label : `${label}, ${remaining} left`}
      title={label}
      onClick={onSelect ? () => onSelect(tile) : undefined}
    >
      <span className="tile__glyph" aria-hidden="true">
        {face.glyph}
      </span>
      {face.mark && (
        <span className="tile__mark" aria-hidden="true">
          {face.mark}
        </span>
      )}
      {remaining !== undefined && (
        <span className="tile__remaining" aria-hidden="true">
          {remaining}
        </span>
      )}
    </button>
  )
}

/** An empty space in the hand, showing how many tiles are still to come. */
export function TileSlot({ size = 'medium' }: { size?: TileSize }) {
  return <div className={['tile__slot', SIZE_CLASS[size]].filter(Boolean).join(' ')} aria-hidden="true" />
}
