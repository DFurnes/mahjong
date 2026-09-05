import { useEffect, useRef } from 'react'
import {
  HOUSE_RULE_DEFINITIONS,
  type HouseRuleId,
  type RuleSet,
} from '../engine/scoring'
import './RulesDialog.css'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function RulesDialog({
  open,
  rules,
  showNextGameNotice,
  onChange,
  onRestore,
  onClose,
}: {
  open: boolean
  rules: Readonly<RuleSet>
  showNextGameNotice: boolean
  onChange: (id: HouseRuleId, enabled: boolean) => void
  onRestore: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || dialogRef.current === null) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="rules-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <div className="rules-dialog__heading">
          <div>
            <h2 id="rules-title">Rules</h2>
            <p>Hong Kong default · Version {rules.version}</p>
          </div>
          <button ref={closeRef} type="button" aria-label="Close rules" onClick={onClose}>×</button>
        </div>
        <dl className="rules-dialog__fixed">
          <div><dt>Minimum win</dt><dd>{rules.minimumFaan} faan</dd></div>
          <div><dt>Limit</dt><dd>{rules.limitFaan} faan</dd></div>
        </dl>
        {showNextGameNotice && (
          <p className="rules-dialog__note">Changes apply when the next game starts.</p>
        )}
        <ul className="rules-dialog__list">
          {HOUSE_RULE_DEFINITIONS.map((definition) => {
            const enabled = rules.houseRules[definition.id]
            return (
              <li key={definition.id}>
                <div className="rules-dialog__rule-copy">
                  <strong>{definition.name} <span lang="zh-Hant">{definition.chineseName}</span></strong>
                  <span>{definition.faan} faan</span>
                  <p>{definition.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={definition.name}
                  className="rules-dialog__switch"
                  onClick={() => onChange(definition.id, !enabled)}
                >
                  <span aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" className="rules-dialog__restore" onClick={onRestore}>Restore defaults</button>
      </div>
    </div>
  )
}
