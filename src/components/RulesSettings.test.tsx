import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { RULES_STORAGE_KEY } from '../settings/rulesStorage'

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('rules settings', () => {
  it('opens accessibly, toggles and restores a persisted house rule', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    const trigger = screen.getByRole('button', { name: 'Rules' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Rules' })
    expect(within(dialog).queryByText(/changes apply/i)).not.toBeInTheDocument()
    expect(within(dialog).getByText('3 faan')).toBeInTheDocument()
    const nineGates = within(dialog).getByRole('switch', { name: 'Nine gates' })
    expect(nineGates).toHaveAttribute('aria-checked', 'true')
    await user.click(nineGates)
    expect(nineGates).toHaveAttribute('aria-checked', 'false')
    expect(JSON.parse(localStorage.getItem(RULES_STORAGE_KEY)!).houseRules['nine-gates']).toBe(false)

    await user.click(within(dialog).getByRole('button', { name: 'Restore defaults' }))
    expect(nineGates).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    view.unmount()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Rules' }))
    expect(screen.getByRole('switch', { name: 'Nine gates' })).toHaveAttribute('aria-checked', 'true')
  })

  it('loads a saved preference after remount', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Rules' }))
    await user.click(screen.getByRole('switch', { name: 'All green' }))
    first.unmount()

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Rules' }))
    expect(screen.getByRole('switch', { name: 'All green' })).toHaveAttribute('aria-checked', 'false')
  })

  it('recalculates the calculator as soon as a house rule changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const tiles = [1, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 9, 9]
    for (const rank of tiles) {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${rank} of Bamboo, \\d+ left$`) }))
    }
    expect(screen.getByText('13 faan (limit)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rules' }))
    await user.click(screen.getByRole('switch', { name: 'Nine gates' }))
    expect(screen.getByText('7 faan')).toBeInTheDocument()
  })
})

describe('game setup routing', () => {
  it('loads /game directly and keeps an active rule snapshot isolated', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/game')
    render(<App />)
    expect(window.location.pathname).toBe('/game')
    await user.click(screen.getByRole('button', { name: 'Start game setup' }))
    const snapshot = screen.getByTestId('snapshot-rules')
    expect(within(snapshot).getByText('8 enabled')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rules' }))
    expect(screen.getByText('Changes apply when the next game starts.')).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Nine gates' }))
    expect(within(snapshot).getByText('8 enabled')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'End setup' }))
    expect(screen.getByText('7 enabled')).toBeInTheDocument()
  })
})
