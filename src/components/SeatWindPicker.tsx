import { WINDS, type Wind, windGlyph, windName } from '../domain'
import './SeatWindPicker.css'

export interface SeatWindPickerProps {
  /** The player's own seat, if chosen. */
  seatWind: Wind | null
  onChange: (wind: Wind | null) => void
}

/** Lets the player declare their seat before building a hand, so seat-wind faan can apply. */
export function SeatWindPicker({ seatWind, onChange }: SeatWindPickerProps) {
  return (
    <div className="seat-picker" role="group" aria-label="Your seat wind">
      <span className="seat-picker__label">Your seat</span>
      <div className="seat-picker__options">
        {WINDS.map((w) => (
          <button
            key={w}
            type="button"
            className={`seat-picker__button${w === seatWind ? ' seat-picker__button--active' : ''}`}
            aria-pressed={w === seatWind}
            onClick={() => onChange(w === seatWind ? null : w)}
          >
            {windName(w)} <span aria-hidden="true">{windGlyph(w)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
