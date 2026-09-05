import { describe, expect, it } from 'vitest'
import { DEFAULT_RULE_SET } from '../engine/scoring'
import { parseTileId, tileId } from '../engine/tiles'
import {
  HeuristicBot,
  createGame,
  legalActions,
  projectGame,
  reduceGame,
  runAutomatedGame,
  runControllerStep,
  type ControllerContext,
  type GameCommand,
  type GameState,
  type PlayerController,
  type PlayerControllers,
  type PlayerId,
  type TileInstance,
} from '.'

const ids = [0, 1, 2, 3] as const
const stress = import.meta.env.MAHJONG_STRESS === '1'
const handSeeds = stress ? 100 : 2
const matchSeeds = stress ? 20 : 1

function instance(id: string, index: number): TileInstance {
  return { uid: `test-${id}-${index}`, tile: parseTileId(id) }
}

function controllers(seed: number): PlayerControllers {
  return Object.fromEntries(ids.map((id) => [id, new HeuristicBot({ tieBreakSeed: seed * 4 + id })]))
}

function physicalTiles(state: GameState): TileInstance[] {
  const result = [
    ...state.liveWall,
    ...state.replacementWall,
    ...ids.flatMap((id) => {
      const player = state.players[id]
      return [...player.concealed, ...player.bonus, ...player.discards, ...player.melds.flatMap(({ tiles }) => tiles)]
    }),
  ]
  if (state.phase.type === 'awaiting-claims') {
    const discard = state.phase.discard
    if (!result.some(({ uid }) => uid === discard.uid)) result.push(discard)
  }
  return result
}

function assertInvariants(state: GameState) {
  const physical = physicalTiles(state)
  if (physical.length !== 144) throw new Error(`Expected 144 physical tiles, found ${physical.length}`)
  if (new Set(physical.map(({ uid }) => uid)).size !== 144) throw new Error('A physical tile occupies multiple locations')
  const faces = new Map<string, number>()
  for (const { tile } of physical) faces.set(tileId(tile), (faces.get(tileId(tile)) ?? 0) + 1)
  for (const [face, count] of faces) {
    const tile = parseTileId(face)
    const expected = tile.kind === 'bonus' ? 1 : 4
    if (count !== expected) throw new Error(`Expected ${expected} copies of ${face}, found ${count}`)
  }
  if (state.phase.type === 'awaiting-discard') {
    for (const id of ids) {
      const slotTiles = state.players[id].concealed.length + state.players[id].melds.length * 3
      const expected = id === state.phase.player ? 14 : 13
      if (slotTiles !== expected) throw new Error(`Player ${id} has ${slotTiles} slot tiles; expected ${expected}`)
    }
  }
}

async function playOneHand(seed: number) {
  let state = createGame(DEFAULT_RULE_SET, { seed })
  const bots = controllers(seed)
  let commandCount = 0
  assertInvariants(state)
  while (state.phase.type !== 'hand-ended') {
    const step = await runControllerStep(state, bots, {
      onTransition: (_previous, _command, next) => assertInvariants(next),
    })
    if (!step.progressed) throw new Error(`Hand stalled in ${state.phase.type}`)
    commandCount += step.commands.length
    if (commandCount >= 2_000) throw new Error('Hand exceeded the 2,000-command limit')
    state = step.state
  }
  return state
}

describe('Phase 3 controllers and bots', () => {
  it('redacts pending claim commands while retaining response progress', () => {
    let state = createGame(DEFAULT_RULE_SET, { seed: 8 })
    state = reduceGame(state, legalActions(state, 0).find(({ type }) => type === 'discard')!).state
    state = reduceGame(state, { type: 'pass', player: 1 }).state
    const phase = projectGame(state, 2).phase
    expect(phase.type).toBe('awaiting-claims')
    if (phase.type !== 'awaiting-claims') throw new Error('Expected claims')
    expect(phase.responded).toEqual([1])
    expect(phase).not.toHaveProperty('responses')
  })

  it('asks all claimants using the same response-free snapshot', async () => {
    let state = createGame(DEFAULT_RULE_SET, { seed: 8 })
    state = reduceGame(state, legalActions(state, 0).find(({ type }) => type === 'discard')!).state
    const observations: number[] = []
    const passing = (player: PlayerId): PlayerController => ({
      chooseCommand: (context) => {
        if (context.game.phase.type !== 'awaiting-claims') throw new Error('Expected claims')
        observations.push(context.game.phase.responded.length)
        return Promise.resolve({ type: 'pass', player })
      },
    })
    const step = await runControllerStep(state, { 1: passing(1), 2: passing(2), 3: passing(3) })
    expect(observations).toEqual([0, 0, 0])
    expect(step.commands).toHaveLength(3)
    expect(step.state.phase).toEqual({ type: 'awaiting-discard', player: 1 })
  })

  it('rejects illegal output from a controller', async () => {
    const state = createGame(DEFAULT_RULE_SET, { seed: 2 })
    const invalid: PlayerController = {
      chooseCommand: () => Promise.resolve({ type: 'discard', player: 1, tileUid: state.players[1].concealed[0].uid }),
    }
    await expect(runControllerStep(state, { 0: invalid })).rejects.toThrow('Controller 0 returned an illegal discard')
  })

  it('discards the isolated tile while preserving a legal concealed wait', async () => {
    const game = createGame(DEFAULT_RULE_SET, { seed: 1 })
    const tileIds = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'c1', 'c1', 'dr', 'dr', 'we']
    const concealed = tileIds.map(instance)
    game.players[0] = { ...game.players[0], concealed, melds: [], bonus: [], discards: [] }
    const actions: GameCommand[] = concealed.map(({ uid }) => ({ type: 'discard', player: 0, tileUid: uid }))
    const context: ControllerContext = { player: 0, game: projectGame(game, 0), legalActions: actions }
    const command = await new HeuristicBot().chooseCommand(context, new AbortController().signal)
    expect(command).toEqual({ type: 'discard', player: 0, tileUid: 'test-we-13' })
  })

  it('is deterministic for identical projected state and tie seed', async () => {
    const state = createGame(DEFAULT_RULE_SET, { seed: 44 })
    const context: ControllerContext = { player: 0, game: projectGame(state, 0), legalActions: legalActions(state, 0) }
    const bot = new HeuristicBot({ tieBreakSeed: 99 })
    const first = await bot.chooseCommand(structuredClone(context), new AbortController().signal)
    const second = await bot.chooseCommand(structuredClone(context), new AbortController().signal)
    expect(second).toEqual(first)
    expect(context.legalActions).toContainEqual(first)
  })

  it(`plays ${handSeeds} seeded hands without deadlocks or invariant violations`, async () => {
    for (let seed = 1; seed <= handSeeds; seed += 1) await playOneHand(seed)
  }, stress ? 600_000 : 120_000)

  it(`completes ${matchSeeds} seeded matches deterministically within command limits`, async () => {
    let firstTrace: string[] | undefined
    for (let seed = 1; seed <= matchSeeds; seed += 1) {
      const trace: string[] = []
      const state = await runAutomatedGame(createGame(DEFAULT_RULE_SET, { seed }), controllers(seed), {
        maxCommands: 20_000,
        onTransition: (_previous, command, next) => {
          trace.push(JSON.stringify(command))
          assertInvariants(next)
        },
      })
      expect(state.phase.type).toBe('match-ended')
      if (seed === 1) firstTrace = trace
    }
    if (stress) {
      const replayTrace: string[] = []
      await runAutomatedGame(createGame(DEFAULT_RULE_SET, { seed: 1 }), controllers(1), {
        maxCommands: 20_000,
        onTransition: (_previous, command) => replayTrace.push(JSON.stringify(command)),
      })
      expect(replayTrace).toEqual(firstTrace)
    } else expect(firstTrace).not.toHaveLength(0)
  }, stress ? 600_000 : 120_000)
})
