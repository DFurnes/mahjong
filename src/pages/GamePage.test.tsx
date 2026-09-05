import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_RULE_SET } from '../engine/scoring'
import { parseTileId } from '../engine/tiles'
import { createGame, type GameCommand, type GameState, type TileInstance } from '../game'
import { GamePage } from './GamePage'

const noop = () => undefined

function renderGame(game: GameState, onCommand = vi.fn<(command: GameCommand) => void>()) {
  render(<GamePage rules={DEFAULT_RULE_SET} game={game} onStart={noop} onCommand={onCommand} onReplaceGame={noop} />)
  return onCommand
}

describe('Phase 4 game page', () => {
  it('renders four seats, public counts, status, and a separated dealer draw', () => {
    renderGame(createGame(DEFAULT_RULE_SET, { seed: 13 }))
    expect(screen.getByRole('region', { name: 'Computer 2, West seat' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Computer 3, North seat' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Computer 1, South seat' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('13 concealed tiles')).toHaveLength(3)
    expect(screen.getByText('Drawn')).toBeInTheDocument()
    expect(screen.getByText('Choose a tile to discard')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Match status' })).toHaveTextContent('East round')
  })

  it('dispatches the physical tile selected by the human', async () => {
    const game = createGame(DEFAULT_RULE_SET, { seed: 13 })
    const onCommand = renderGame(game)
    const hand = screen.getByRole('group', { name: 'Your concealed hand' })
    await userEvent.setup().click(within(hand).getAllByRole('button')[0])
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'discard', player: 0, tileUid: expect.any(String) }))
  })

  it('combines every player discard into one shared center pile', () => {
    const game = createGame(DEFAULT_RULE_SET, { seed: 13 })
    for (const player of [0, 1, 2, 3] as const) game.players[player].discards.push(game.liveWall.shift()!)
    renderGame(game)
    const pool = screen.getByRole('region', { name: 'Shared discard pile' })
    expect(within(pool).getAllByRole('button')).toHaveLength(4)
    expect(within(pool).getByText('Discards · 4')).toBeInTheDocument()
    expect(within(pool).queryByText('Computer 1')).not.toBeInTheDocument()
  })

  it('offers a keyboard-accessible choice when several chows are legal', async () => {
    const game = createGame(DEFAULT_RULE_SET, { seed: 2 })
    const held = ['b1', 'b2', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'd1', 'd2', 'd3']
      .map((id, index): TileInstance => ({ uid: `choice-${index}`, tile: parseTileId(id) }))
    game.players[0].concealed = held
    game.phase = {
      type: 'awaiting-claims', discarder: 3,
      discard: { uid: 'choice-discard', tile: parseTileId('b3') },
      eligible: [0], responses: {},
    }
    const onCommand = renderGame(game)
    const user = userEvent.setup()
    const calls = screen.getByRole('group', { name: 'Available calls' })
    expect(within(screen.getByRole('group', { name: 'Hand controls' })).queryByRole('button', { name: 'Chow' })).not.toBeInTheDocument()
    await user.click(within(calls).getByRole('button', { name: 'Chow' }))
    const dialog = screen.getByRole('dialog', { name: 'Choose a Chow' })
    expect(within(dialog).getAllByRole('button', { name: /Chow option/ })).toHaveLength(3)
    await user.click(within(dialog).getByRole('button', { name: 'Chow option 2' }))
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'chow', player: 0 }))
  })

  it('holds on a hand result until Next hand is chosen', async () => {
    const game = createGame(DEFAULT_RULE_SET, { seed: 3 })
    const result = { type: 'exhaustive-draw' as const, payments: [] }
    game.phase = { type: 'hand-ended', result }
    game.history.push({ roundWind: game.roundWind, handNumber: game.handNumber, dealer: game.dealer, result })
    const onCommand = renderGame(game)
    expect(screen.getByRole('dialog', { name: 'Exhaustive draw' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Next hand' }))
    expect(onCommand).toHaveBeenCalledWith({ type: 'next-hand' })
  })
})
