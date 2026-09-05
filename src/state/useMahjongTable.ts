/**
 * The one piece of mutable state in the app: which tiles have been taken off
 * the table, and how they have been arranged into a hand. The reducer is
 * exported on its own so it can be tested without rendering anything.
 */

import { useMemo, useReducer } from 'react'
import {
  type BonusTile,
  type StandardTile,
  type Tile,
  type TileCounts,
  type TileId,
  ALL_TILES,
  copiesOf,
  isBonus,
  sortTiles,
  tileId,
} from '../engine/tiles'
import {
  type Hand,
  type Set3,
  type WinCircumstance,
  type WinSource,
  EMPTY_HAND,
  HAND_SIZE,
  handSize,
  handTiles,
  isFullHand,
  kong,
  meldTiles,
} from '../engine/hand'

/** Where a selected tile lives: still hidden in the hand, or the bonus tray beside it. */
export type Area = 'concealed' | 'bonus'

/** The table's state is exactly a hand in progress — see {@link Hand}. */
export type TableState = Hand

export type TableAction =
  | { type: 'select'; tile: Tile }
  | { type: 'return'; area: Area; index: number }
  | { type: 'declare'; meld: Set3 }
  | { type: 'undeclare'; index: number }
  | { type: 'kong'; index: number }
  | { type: 'win'; source: WinSource | null; circumstances?: readonly WinCircumstance[] }
  | { type: 'clear' }

export const initialTableState: TableState = EMPTY_HAND

function countInPlay(state: TableState, tile: Tile): number {
  const id = tileId(tile)
  if (isBonus(tile)) return state.bonus.filter((held) => tileId(held) === id).length
  return handTiles(state).filter((held) => tileId(held) === id).length
}

/** How many copies of `id` are free on the table — not concealed, not in a declared meld. */
function freeOnTable(state: TableState, id: TileId): number {
  return remainingCounts(state)[id] ?? 0
}

export function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'select': {
      const { tile } = action
      if (countInPlay(state, tile) >= copiesOf(tile)) return state

      if (isBonus(tile)) {
        return { ...state, bonus: sortTiles([...state.bonus, tile]) as BonusTile[] }
      }
      if (isFullHand(state)) return state
      return { ...state, concealed: sortTiles([...state.concealed, tile]) as StandardTile[] }
    }

    case 'return': {
      const pool = state[action.area]
      if (action.index < 0 || action.index >= pool.length) return state
      const next = [...pool]
      next.splice(action.index, 1)
      return { ...state, [action.area]: next }
    }

    case 'declare': {
      const { meld } = action
      if (state.melds.length >= 4) return state

      const needed = meldTiles(meld) as StandardTile[]
      // Each needed tile comes out of the concealed hand where possible; any
      // shortfall (a kong's fourth copy, or a meld claimed from a discard)
      // must still be free on the table.
      const remainingConcealed = [...state.concealed]
      const claimed: StandardTile[] = []
      for (const tile of needed) {
        const id = tileId(tile)
        const index = remainingConcealed.findIndex((held) => tileId(held) === id)
        if (index >= 0) {
          remainingConcealed.splice(index, 1)
        } else {
          claimed.push(tile)
        }
      }
      const claimedCounts = new Map<TileId, number>()
      for (const tile of claimed) {
        const id = tileId(tile)
        claimedCounts.set(id, (claimedCounts.get(id) ?? 0) + 1)
      }
      for (const [id, count] of claimedCounts) {
        if (count > freeOnTable(state, id)) return state
      }

      const next: TableState = {
        ...state,
        concealed: remainingConcealed,
        melds: [...state.melds, meld],
      }
      return handSize(next) > HAND_SIZE ? state : next
    }

    case 'undeclare': {
      const { index } = action
      if (index < 0 || index >= state.melds.length) return state
      // Always three tiles back, kong or not — a kong's fourth tile is a spare
      // drawn from the table, not the player's own, so it is not returned.
      const returned = meldTiles(state.melds[index]).slice(0, 3) as StandardTile[]
      const nextMelds = [...state.melds]
      nextMelds.splice(index, 1)
      return {
        ...state,
        concealed: sortTiles([...state.concealed, ...returned]) as StandardTile[],
        melds: nextMelds,
      }
    }

    case 'kong': {
      const { index } = action
      const meld = state.melds[index]
      if (!meld || meld.type !== 'pung') return state
      if (freeOnTable(state, tileId(meld.tile)) < 1) return state
      const nextMelds = [...state.melds]
      nextMelds[index] = kong(meld.tile, meld.exposed)
      return { ...state, melds: nextMelds }
    }

    case 'win':
      return {
        ...state,
        win: action.source ?? undefined,
        circumstances: action.source ? action.circumstances : undefined,
      }

    case 'clear':
      return initialTableState
  }
}

/** How many copies of each tile are still on the table. */
export function remainingCounts(state: TableState): TileCounts {
  const remaining: TileCounts = {}
  for (const tile of ALL_TILES) remaining[tileId(tile)] = copiesOf(tile)
  for (const tile of [...handTiles(state), ...state.bonus]) {
    const id = tileId(tile)
    remaining[id] = Math.max(0, (remaining[id] ?? 0) - 1)
  }
  return remaining
}

export interface MahjongTable {
  state: TableState
  /** Same object as `state`, named for what it is to a consumer that just wants a hand. */
  hand: Hand
  remaining: TileCounts
  isHandFull: boolean
  /** All selected tiles, hand and bonus tray together. */
  selectTile: (tile: Tile) => void
  returnTile: (area: Area, index: number) => void
  declareMeld: (meld: Set3) => void
  undeclareMeld: (index: number) => void
  /** Promote an already-declared pung to a kong by drawing its fourth copy off the table. */
  promoteKong: (index: number) => void
  setWin: (source: WinSource | null, circumstances?: readonly WinCircumstance[]) => void
  clear: () => void
  remainingFor: (tile: Tile) => number
}

export function useMahjongTable(initial: TableState = initialTableState): MahjongTable {
  const [state, dispatch] = useReducer(tableReducer, initial)
  const remaining = useMemo(() => remainingCounts(state), [state])

  return {
    state,
    hand: state,
    remaining,
    isHandFull: isFullHand(state),
    selectTile: (tile) => dispatch({ type: 'select', tile }),
    returnTile: (area, index) => dispatch({ type: 'return', area, index }),
    declareMeld: (meld) => dispatch({ type: 'declare', meld }),
    undeclareMeld: (index) => dispatch({ type: 'undeclare', index }),
    promoteKong: (index) => dispatch({ type: 'kong', index }),
    setWin: (source, circumstances) => dispatch({ type: 'win', source, circumstances }),
    clear: () => dispatch({ type: 'clear' }),
    remainingFor: (tile) => remaining[tileId(tile) as TileId] ?? 0,
  }
}
