import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'

/** The board button for a tile, identified by its accessible name. */
function boardTile(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name}, \\d+ left$`) })
}

function handTiles() {
  return within(screen.getByTestId('hand-tiles')).queryAllByRole('button')
}

function bonusTiles() {
  return within(screen.getByTestId('bonus-tiles')).queryAllByRole('button')
}

describe('building a hand', () => {
  it('moves a tapped tile from the table into the hand', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(handTiles()).toHaveLength(0)
    await user.click(boardTile('1 of Bamboo'))

    expect(handTiles()).toHaveLength(1)
    expect(handTiles()[0]).toHaveAccessibleName('1 of Bamboo')
    expect(boardTile('1 of Bamboo')).toHaveAccessibleName('1 of Bamboo, 3 left')
  })

  it('puts a tile back on the table when tapped in hand', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(boardTile('East Wind'))
    expect(handTiles()).toHaveLength(1)

    await user.click(handTiles()[0])

    expect(handTiles()).toHaveLength(0)
    expect(boardTile('East Wind')).toHaveAccessibleName('East Wind, 4 left')
  })

  it('disables a tile once all four copies are taken', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (let i = 0; i < 4; i += 1) await user.click(boardTile('Red Dragon'))

    expect(boardTile('Red Dragon')).toBeDisabled()
    expect(handTiles()).toHaveLength(4)
  })

  it('keeps flowers and seasons out of the hand', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(boardTile('Spring'))

    expect(handTiles()).toHaveLength(0)
    expect(bonusTiles()).toHaveLength(1)
    expect(boardTile('Spring')).toBeDisabled()
  })

  it('clears the hand and the tray', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(boardTile('1 of Bamboo'))
    await user.click(boardTile('Spring'))
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(handTiles()).toHaveLength(0)
    expect(bonusTiles()).toHaveLength(0)
  })
})

describe('explaining and scoring a hand', () => {
  const WINNING = [
    '1 of Bamboo',
    '2 of Bamboo',
    '3 of Bamboo',
    '4 of Bamboo',
    '5 of Bamboo',
    '6 of Bamboo',
    '7 of Bamboo',
    '8 of Bamboo',
    '9 of Bamboo',
    '1 of Bamboo',
    '2 of Bamboo',
    '3 of Bamboo',
    '5 of Bamboo',
    '5 of Bamboo',
  ]

  it('describes the hand as it is built', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Your hand is empty.')).toBeInTheDocument()

    for (const name of ['1 of Bamboo', '2 of Bamboo', '3 of Bamboo']) {
      await user.click(boardTile(name))
    }

    expect(screen.getByText('You have one complete set.')).toBeInTheDocument()
    expect(
      screen.getByText('You still need eleven tiles, and everything you hold fits.'),
    ).toBeInTheDocument()
  })

  it('only offers scoring once the hand is full', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('button', { name: 'Score hand' })).toBeDisabled()

    for (const name of WINNING) await user.click(boardTile(name))

    expect(screen.getByRole('button', { name: 'Score hand' })).toBeEnabled()
    expect(screen.getByText('This is a winning hand.')).toBeInTheDocument()
  })

  it('scores a full flush', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (const name of WINNING) await user.click(boardTile(name))
    await user.click(screen.getByRole('button', { name: 'Score hand' }))

    expect(screen.getByText('8 faan')).toBeInTheDocument()
    expect(screen.getByText(/Full flush/)).toBeInTheDocument()
    expect(screen.getByText(/All sequences/)).toBeInTheDocument()
  })

  it('says so when fourteen tiles do not make a hand', async () => {
    const user = userEvent.setup()
    render(<App />)

    const junk = [
      '1 of Bamboo',
      '3 of Bamboo',
      '5 of Bamboo',
      '7 of Bamboo',
      '9 of Bamboo',
      '2 of Characters',
      '4 of Characters',
      '6 of Characters',
      '8 of Characters',
      '1 of Dots',
      '3 of Dots',
      '5 of Dots',
      '7 of Dots',
      '9 of Dots',
    ]
    for (const name of junk) await user.click(boardTile(name))
    await user.click(screen.getByRole('button', { name: 'Score hand' }))

    expect(screen.getByText(/do not make four sets and a pair/)).toBeInTheDocument()
  })

  it('drops a stale score when the hand changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (const name of WINNING) await user.click(boardTile(name))
    await user.click(screen.getByRole('button', { name: 'Score hand' }))
    expect(screen.getByText('8 faan')).toBeInTheDocument()

    await user.click(handTiles()[0])

    expect(screen.queryByText('8 faan')).not.toBeInTheDocument()
  })
})

describe('declaring melds', () => {
  const WINNING = [
    '1 of Bamboo',
    '2 of Bamboo',
    '3 of Bamboo',
    '4 of Bamboo',
    '5 of Bamboo',
    '6 of Bamboo',
    '7 of Bamboo',
    '8 of Bamboo',
    '9 of Bamboo',
    '1 of Bamboo',
    '2 of Bamboo',
    '3 of Bamboo',
    '5 of Bamboo',
    '5 of Bamboo',
  ]

  it('exposes a set from the reading, and takes it back on tap', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (const name of WINNING) await user.click(boardTile(name))

    await user.click(screen.getAllByRole('button', { name: 'Expose' })[0])
    expect(within(screen.getByTestId('meld-tiles')).getAllByRole('button')).toHaveLength(1)

    await user.click(within(screen.getByTestId('meld-tiles')).getAllByRole('button')[0])
    expect(within(screen.getByTestId('meld-tiles')).queryAllByRole('button')).toHaveLength(0)
  })

  it('promotes an exposed pung to a kong, drawing the fourth copy off the table', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (let i = 0; i < 3; i += 1) await user.click(boardTile('Red Dragon'))
    expect(boardTile('Red Dragon')).toHaveAccessibleName('Red Dragon, 1 left')

    await user.click(screen.getByRole('button', { name: 'Expose' }))
    await user.click(screen.getByRole('button', { name: /Promote .* to a kong/ }))

    const meldButton = within(screen.getByTestId('meld-tiles')).getAllByRole('button')[0]
    expect(meldButton).toHaveAccessibleName(/Exposed kong of Red Dragon/)
    expect(boardTile('Red Dragon')).toBeDisabled()
  })

  it('raises the faan for a self-drawn win', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (const name of WINNING) await user.click(boardTile(name))
    await user.click(screen.getByRole('button', { name: 'Self-drawn' }))
    await user.click(screen.getByRole('button', { name: 'Score hand' }))

    // Full flush (7) + all sequences (1), plus self-drawn (1) and fully concealed (1).
    expect(screen.getByText('10 faan')).toBeInTheDocument()
  })
})

describe('collapsing the tray', () => {
  const toggle = () => screen.getByRole('button', { name: /Your hand/ })

  const compactTiles = () =>
    within(screen.getByTestId('hand-tiles-compact')).queryAllByRole('button')
  const compactBonus = () =>
    within(screen.getByTestId('bonus-tiles-compact')).queryAllByRole('button')

  it('starts expanded, with the full summary showing', () => {
    render(<App />)

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Score hand' })).toBeVisible()
    expect(screen.getByText('Your hand is empty.')).toBeVisible()
  })

  it('takes the summary out of the page when collapsed, and brings it back', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(toggle())

    // The body is `hidden`, so it leaves the accessibility tree entirely.
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Score hand' })).not.toBeInTheDocument()
    expect(screen.getByText('Your hand is empty.')).not.toBeVisible()

    await user.click(toggle())

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Score hand' })).toBeVisible()
  })

  it('shows a running count and status on the bar', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(toggle()).toHaveTextContent('No tiles yet')

    for (const name of ['1 of Bamboo', '2 of Bamboo', '3 of Bamboo']) {
      await user.click(boardTile(name))
    }

    expect(toggle()).toHaveTextContent('3 / 14')
    expect(toggle()).toHaveTextContent('1 set · 11 away')
  })

  it('still returns a tile to the board from the collapsed strip', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(boardTile('East Wind'))
    await user.click(toggle())

    expect(compactTiles()).toHaveLength(1)
    await user.click(compactTiles()[0])

    expect(compactTiles()).toHaveLength(0)
    expect(boardTile('East Wind')).toHaveAccessibleName('East Wind, 4 left')
  })

  it('keeps bonus tiles visible in the collapsed strip', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(boardTile('Spring'))
    await user.click(toggle())

    expect(compactBonus()).toHaveLength(1)
    expect(compactBonus()[0]).toHaveAccessibleName('Spring')
  })
})
