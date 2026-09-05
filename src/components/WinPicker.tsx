import type { WinSource } from '../domain'
import './WinPicker.css'

export interface WinPickerProps {
  /** How the hand was won, if the player has said. */
  win: WinSource | null
  onChange: (source: WinSource | null) => void
}

/** Lets the player say how they won, so self-draw and fully-concealed faan can apply. */
export function WinPicker({ win, onChange }: WinPickerProps) {
  const select = (source: WinSource) => onChange(win === source ? null : source)

  return (
    <div className="win-picker" role="group" aria-label="How you won">
      <span className="win-picker__label">How you won</span>
      <div className="win-picker__options">
        <button
          type="button"
          className={`win-picker__button${win === 'draw' ? ' win-picker__button--active' : ''}`}
          aria-pressed={win === 'draw'}
          onClick={() => select('draw')}
        >
          Self-drawn <span aria-hidden="true">自摸</span>
        </button>
        <button
          type="button"
          className={`win-picker__button${win === 'discard' ? ' win-picker__button--active' : ''}`}
          aria-pressed={win === 'discard'}
          onClick={() => select('discard')}
        >
          On a discard
        </button>
      </div>
    </div>
  )
}
