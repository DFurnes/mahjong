import type { ReactNode } from 'react'
import './Tray.css'

export interface TrayProps {
  /** Bar heading, e.g. "Your hand". */
  title: string
  /** Extra context alongside the heading, e.g. seat wind or points. */
  meta?: ReactNode
  /**
   * One-line status, e.g. "2 sets · 1 pair · 6 away". Shown at the foot of
   * the panel — below the peek while collapsed, below the body while
   * expanded — so it always has the full width to itself and never has to
   * truncate.
   */
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
export function Tray({ title, meta, status, collapsed, onToggle, peek, children }: TrayProps) {
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
        {meta !== undefined && <span className="tray__meta">{meta}</span>}
        <span className="tray__chevron" aria-hidden="true" />
      </button>

      {collapsed && <div className="tray__peek">{peek}</div>}

      <div className="tray__body" id={BODY_ID} hidden={collapsed}>
        {children}
      </div>

      <p className="tray__status">{status}</p>
    </div>
  )
}
