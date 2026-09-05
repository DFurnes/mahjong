import type { ReactNode } from 'react'
import './Tray.css'

export interface TrayProps {
  /** Bar heading, e.g. "Your hand". */
  title: string
  /** One-line status, e.g. "2 sets · 1 pair · 6 away". */
  status: string
  collapsed: boolean
  onToggle: () => void
  /** Shown in place of the body while collapsed. */
  peek: ReactNode
  /** The full contents, shown while expanded. */
  children: ReactNode
}

const BODY_ID = 'tray-body'

/**
 * The panel at the bottom of the screen. It sticks over the board, so it can be
 * collapsed down to its bar plus a glance at what's in hand — enough to keep
 * playing without losing the board underneath.
 */
export function Tray({ title, status, collapsed, onToggle, peek, children }: TrayProps) {
  return (
    <div className={`tray${collapsed ? ' tray--collapsed' : ''}`}>
      <button
        type="button"
        className="tray__handle"
        aria-expanded={!collapsed}
        aria-controls={BODY_ID}
        onClick={onToggle}
      >
        <span className="tray__heading">
          {title}
        </span>
        <span className="tray__status">{status}</span>
        <span className="tray__chevron" aria-hidden="true" />
      </button>

      {collapsed && <div className="tray__peek">{peek}</div>}

      <div className="tray__body" id={BODY_ID} hidden={collapsed}>
        {children}
      </div>
    </div>
  )
}
