import type { WinCircumstance, WinSource } from '../domain'
import './WinPicker.css'

export interface WinPickerProps {
  /** How the hand was won, if the player has said. */
  win: WinSource | null
  /** Extra circumstances of the win, alongside {@link win}. */
  circumstances: readonly WinCircumstance[]
  onChange: (source: WinSource | null, circumstances: readonly WinCircumstance[]) => void
}

interface CircumstanceOption {
  id: WinCircumstance
  label: string
  /** Which win source(s) this circumstance can apply alongside. */
  appliesTo: readonly WinSource[]
  /** The name as said at the table, which differs by win source. */
  glyph: (source: WinSource) => string
}

const CIRCUMSTANCES: readonly CircumstanceOption[] = [
  {
    id: 'first-turn',
    label: 'Before any discard',
    appliesTo: ['draw', 'discard'],
    glyph: (source) => (source === 'draw' ? '天和' : '地和'),
  },
  {
    id: 'last-tile',
    label: 'The last tile',
    appliesTo: ['draw', 'discard'],
    glyph: (source) => (source === 'draw' ? '海底撈月' : '河底撈魚'),
  },
  {
    id: 'after-kong',
    label: "The kong's replacement",
    appliesTo: ['draw'],
    glyph: () => '槓上開花',
  },
  {
    id: 'robbing-kong',
    label: 'Robbing a kong',
    appliesTo: ['discard'],
    glyph: () => '搶槓',
  },
]

/** Lets the player say how they won, so self-draw, fully-concealed and situational faan can apply. */
export function WinPicker({ win, circumstances, onChange }: WinPickerProps) {
  const selectSource = (source: WinSource) =>
    onChange(win === source ? null : source, win === source ? [] : circumstances)

  const toggleCircumstance = (id: WinCircumstance) => {
    if (win === null) return
    const next = circumstances.includes(id)
      ? circumstances.filter((c) => c !== id)
      : [...circumstances, id]
    onChange(win, next)
  }

  return (
    <div className="win-picker">
      <div className="win-picker__group" role="group" aria-label="How you won">
        <span className="win-picker__label">How you won</span>
        <div className="win-picker__options">
          <button
            type="button"
            className={`win-picker__button${win === 'draw' ? ' win-picker__button--active' : ''}`}
            aria-pressed={win === 'draw'}
            onClick={() => selectSource('draw')}
          >
            Self-drawn <span aria-hidden="true">自摸</span>
          </button>
          <button
            type="button"
            className={`win-picker__button${win === 'discard' ? ' win-picker__button--active' : ''}`}
            aria-pressed={win === 'discard'}
            onClick={() => selectSource('discard')}
          >
            On a discard
          </button>
        </div>
      </div>

      <div className="win-picker__group" role="group" aria-label="Circumstances of the win">
        <span className="win-picker__label">Anything special</span>
        <div className="win-picker__options">
          {CIRCUMSTANCES.map(({ id, label, appliesTo, glyph }) => {
            const enabled = win !== null && appliesTo.includes(win)
            const active = enabled && circumstances.includes(id)
            return (
              <button
                key={id}
                type="button"
                className={`win-picker__button${active ? ' win-picker__button--active' : ''}`}
                aria-pressed={active}
                disabled={!enabled}
                onClick={() => toggleCircumstance(id)}
              >
                {label} {win && <span aria-hidden="true">{glyph(win)}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
