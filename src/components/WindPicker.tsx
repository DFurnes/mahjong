import { WINDS, type Wind, windGlyph, windName } from '../domain'
import './WindPicker.css'

export interface WindPickerProps {
  /** What this picker sets — the player's own seat, or the round. */
  label: string
  ariaLabel: string
  wind: Wind | null
  onChange: (wind: Wind | null) => void
}

/** A four-wind toggle. Used for both the seat wind and the round wind. */
export function WindPicker({ label, ariaLabel, wind: chosen, onChange }: WindPickerProps) {
  return (
    <div className="wind-picker" role="group" aria-label={ariaLabel}>
      <span className="wind-picker__label">{label}</span>
      <div className="wind-picker__options">
        {WINDS.map((w) => (
          <button
            key={w}
            type="button"
            className={`wind-picker__button${w === chosen ? ' wind-picker__button--active' : ''}`}
            aria-pressed={w === chosen}
            onClick={() => onChange(w === chosen ? null : w)}
          >
            {windName(w)} <span aria-hidden="true">{windGlyph(w)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
