/**
 * The one piece of mutable state in the app: which tiles have been taken off
 * the table. The reducer is exported on its own so it can be tested without
 * rendering anything.
 */

import { useMemo, useReducer } from 'react'
import {
  type BonusTile,
  type StandardTile,
  type Tile,
  type TileCounts,
  type TileId,
  ALL_TILES,
  HAND_SIZE,
  copiesOf,
  isBonus,
  sortTiles,
  tileId,
} from '../domain'

/** Where a selected tile lives: the hand proper, or the bonus tray beside it. */
export type Area = 'hand' | 'bonus'

export interface TableState {
  /** Up to fourteen scoring tiles, kept in canonical order. */
  hand: StandardTile[]
  /** Flowers and seasons, which sit outside the hand and do not count toward the fourteen. */
  bonus: BonusTile[]
}

export type TableAction =
  | { type: 'select'; tile: Tile }
  | { type: 'return'; area: Area; index: number }
  | { type: 'clear' }

export const initialTableState: TableState = { hand: [], bonus: [] }

function countInPlay(state: TableState, tile: Tile): number {
  const id = tileId(tile)
  const pool: Tile[] = isBonus(tile) ? state.bonus : state.hand
  return pool.filter((held) => tileId(held) === id).length
}

export function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'select': {
      const { tile } = action
      if (countInPlay(state, tile) >= copiesOf(tile)) return state

      if (isBonus(tile)) {
        return { ...state, bonus: sortTiles([...state.bonus, tile]) as BonusTile[] }
      }
      if (state.hand.length >= HAND_SIZE) return state
      return { ...state, hand: sortTiles([...state.hand, tile]) as StandardTile[] }
    }

    case 'return': {
      const pool = state[action.area]
      if (action.index < 0 || action.index >= pool.length) return state
      const next = [...pool]
      next.splice(action.index, 1)
      return { ...state, [action.area]: next }
    }

    case 'clear':
      return initialTableState
  }
}

/** How many copies of each tile are still on the table. */
export function remainingCounts(state: TableState): TileCounts {
  const remaining: TileCounts = {}
  for (const tile of ALL_TILES) remaining[tileId(tile)] = copiesOf(tile)
  for (const tile of [...state.hand, ...state.bonus]) {
    const id = tileId(tile)
    remaining[id] = Math.max(0, (remaining[id] ?? 0) - 1)
  }
  return remaining
}

export interface MahjongTable {
  state: TableState
  remaining: TileCounts
  isHandFull: boolean
  /** All selected tiles, hand and bonus tray together. */
  selectTile: (tile: Tile) => void
  returnTile: (area: Area, index: number) => void
  clear: () => void
  remainingFor: (tile: Tile) => number
}

export function useMahjongTable(initial: TableState = initialTableState): MahjongTable {
  const [state, dispatch] = useReducer(tableReducer, initial)
  const remaining = useMemo(() => remainingCounts(state), [state])

  return {
    state,
    remaining,
    isHandFull: state.hand.length >= HAND_SIZE,
    selectTile: (tile) => dispatch({ type: 'select', tile }),
    returnTile: (area, index) => dispatch({ type: 'return', area, index }),
    clear: () => dispatch({ type: 'clear' }),
    remainingFor: (tile) => remaining[tileId(tile) as TileId] ?? 0,
  }
}
