import { describe, expect, it } from 'vitest'
import { tileId } from '../engine/tiles'
import { DEFAULT_RULE_SET } from '../engine/scoring'
import { createGame, legalActions, projectGame, reduceGame, seededShuffle, splitWall, faanToPoints } from '.'

function allLocations(state: ReturnType<typeof createGame>) {
  return [
    ...state.liveWall, ...state.replacementWall,
    ...([0, 1, 2, 3] as const).flatMap((id) => {
      const player = state.players[id]
      return [...player.concealed, ...player.bonus, ...player.discards, ...player.melds.flatMap(({ tiles }) => tiles)]
    }),
  ]
}

describe('Phase 2 game mechanics', () => {
  it('builds the same wall and deal for the same seed', () => {
    const first = createGame(DEFAULT_RULE_SET, { seed: 42 })
    const second = createGame(DEFAULT_RULE_SET, { seed: 42 })
    expect(allLocations(first).map(({ uid }) => uid)).toEqual(allLocations(second).map(({ uid }) => uid))
    expect(first.players[0].concealed).toHaveLength(14)
    for (const id of [1, 2, 3] as const) expect(first.players[id].concealed).toHaveLength(13)
  })

  it('keeps every physical tile in exactly one location after dealing', () => {
    const state = createGame(DEFAULT_RULE_SET, { seed: 9876 })
    const locations = allLocations(state)
    expect(locations).toHaveLength(144)
    expect(new Set(locations.map(({ uid }) => uid)).size).toBe(144)
  })

  it('moves through discard, three responses, and the next draw', () => {
    let state = createGame(DEFAULT_RULE_SET, { seed: 8 })
    const tileUid = state.players[0].concealed[0].uid
    state = reduceGame(state, { type: 'discard', player: 0, tileUid }).state
    expect(state.phase.type).toBe('awaiting-claims')
    for (const player of [1, 2, 3] as const) state = reduceGame(state, { type: 'pass', player }).state
    expect(state.phase).toEqual({ type: 'awaiting-discard', player: 1 })
    expect(state.players[1].concealed).toHaveLength(14)
    expect(new Set(allLocations(state).map(({ uid }) => uid)).size).toBe(144)
  })

  it('rejects out-of-turn commands without changing state', () => {
    const state = createGame(DEFAULT_RULE_SET, { seed: 2 })
    const result = reduceGame(state, { type: 'discard', player: 1, tileUid: state.players[1].concealed[0].uid })
    expect(result.ok).toBe(false)
    expect(result.state).toBe(state)
  })

  it('never projects concealed opponents or either wall', () => {
    const state = createGame(DEFAULT_RULE_SET, { seed: 4 })
    const view = projectGame(state, 0)
    expect(view.players[0].concealed).not.toBeNull()
    expect(view.players[1].concealed).toBeNull()
    expect(view).not.toHaveProperty('liveWall')
    expect(view).not.toHaveProperty('seed')
    expect(view.liveWallCount + view.replacementWallCount).toBe(state.liveWall.length + state.replacementWall.length)
  })

  it('redacts opponent draw identities from the event log', () => {
    let state = createGame(DEFAULT_RULE_SET, { seed: 8 })
    state = reduceGame(state, { type: 'discard', player: 0, tileUid: state.players[0].concealed[0].uid }).state
    for (const player of [1, 2, 3] as const) state = reduceGame(state, { type: 'pass', player }).state
    const drawEvent = projectGame(state, 0).events.findLast(({ type }) => type === 'draw')
    expect(drawEvent?.player).toBe(1)
    expect(drawEvent?.tileUid).toBeUndefined()
  })

  it('reveals winners after a hand while keeping other opponents concealed', () => {
    const state = createGame(DEFAULT_RULE_SET, { seed: 4 })
    state.phase = {
      type: 'hand-ended',
      result: { type: 'win', winners: [1], scores: {} as never, payments: [] },
    }
    const view = projectGame(state, 0)
    expect(view.players[1].concealed).not.toBeNull()
    expect(view.players[2].concealed).toBeNull()
    expect(view.players[3].concealed).toBeNull()
  })

  it('exposes only legal dealer actions after the deal', () => {
    const state = createGame(DEFAULT_RULE_SET, { seed: 13 })
    expect(legalActions(state, 1)).toEqual([])
    expect(legalActions(state, 0).filter(({ type }) => type === 'discard')).toHaveLength(14)
  })

  it('uses a stable shuffle and configured wall split', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 10)).toEqual(seededShuffle([1, 2, 3, 4, 5], 10))
    const wall = splitWall(1)
    expect(wall.replacementWall).toHaveLength(16)
    expect(wall.liveWall).toHaveLength(128)
    expect(new Set([...wall.liveWall, ...wall.replacementWall].map(({ uid }) => uid)).size).toBe(144)
  })

  it('uses the documented capped points schedule', () => {
    expect([2, 3, 4, 5, 7, 10, 13].map(faanToPoints)).toEqual([0, 8, 16, 64, 128, 256, 256])
  })

  it('uses four physical copies for each standard face', () => {
    const { liveWall, replacementWall } = splitWall(22)
    const counts = new Map<string, number>()
    for (const { tile } of [...liveWall, ...replacementWall]) counts.set(tileId(tile), (counts.get(tileId(tile)) ?? 0) + 1)
    expect([...counts.values()].filter((count) => count === 4)).toHaveLength(34)
  })
})
