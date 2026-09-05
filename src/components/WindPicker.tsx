import { WINDS, type Wind, windGlyph, windName } from '../engine/tiles'
import { ChoiceButton, ChoiceGroup } from './ChoiceGroup'
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
    <div className="wind-picker">
      <ChoiceGroup label={label} ariaLabel={ariaLabel}>
        {WINDS.map((w) => (
          <ChoiceButton key={w} active={w === chosen} onClick={() => onChange(w === chosen ? null : w)}>
            {windName(w)} <span aria-hidden="true">{windGlyph(w)}</span>
          </ChoiceButton>
        ))}
      </ChoiceGroup>
    </div>
  )
}
