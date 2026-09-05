import type { ReactNode } from 'react'
import './ChoiceGroup.css'

export function ChoiceGroup({
  label,
  ariaLabel,
  children,
}: {
  label: string
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <div className="choice-group" role="group" aria-label={ariaLabel}>
      <span className="choice-group__label">{label}</span>
      <div className="choice-group__options">{children}</div>
    </div>
  )
}

export function ChoiceButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`choice-group__button${active ? ' choice-group__button--active' : ''}`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
