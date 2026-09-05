import type { WinCircumstance, WinSource } from '../domain'
import { ChoiceButton, ChoiceGroup } from './ChoiceGroup'
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
      <ChoiceGroup label="How you won" ariaLabel="How you won">
        <ChoiceButton active={win === 'draw'} onClick={() => selectSource('draw')}>
          Self-drawn
        </ChoiceButton>
        <ChoiceButton active={win === 'discard'} onClick={() => selectSource('discard')}>
          On a discard
        </ChoiceButton>
      </ChoiceGroup>

      <ChoiceGroup label="Anything special?" ariaLabel="Circumstances of the win">
        {CIRCUMSTANCES.map(({ id, label, appliesTo, glyph }) => {
          const enabled = win !== null && appliesTo.includes(win)
          const active = enabled && circumstances.includes(id)
          return (
            <ChoiceButton
              key={id}
              active={active}
              disabled={!enabled}
              onClick={() => toggleCircumstance(id)}
            >
              {label} {win && <span aria-hidden="true">{glyph(win)}</span>}
            </ChoiceButton>
          )
        })}
      </ChoiceGroup>
    </div>
  )
}
