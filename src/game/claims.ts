import { chow, kong, pung, type Set3 } from '../engine/hand'
import { tileId, type Rank, type StandardTile } from '../engine/tiles'
import type { ClaimCommand, GameState, PlayerId, TileInstance } from './types'

const distance = (from: PlayerId, to: PlayerId) => (to - from + 4) % 4
export const nextPlayer = (player: PlayerId): PlayerId => ((player + 1) % 4) as PlayerId

export interface ClaimOption { command: ClaimCommand; meld: Set3; handTiles: TileInstance[] }

export function claimOptions(state: GameState, player: PlayerId): ClaimOption[] {
  if (state.phase.type !== 'awaiting-claims' || player === state.phase.discarder) return []
  const discarded = state.phase.discard.tile
  if (discarded.kind === 'bonus') return []
  const held = state.players[player].concealed
  const matching = held.filter(({ tile }) => tileId(tile) === tileId(discarded))
  const options: ClaimOption[] = []
  if (matching.length >= 2) options.push({ command: { type: 'pung', player, tileUids: matching.slice(0, 2).map(({ uid }) => uid) }, meld: pung(discarded, true), handTiles: matching.slice(0, 2) })
  if (matching.length >= 3) options.push({ command: { type: 'kong', player, tileUids: matching.slice(0, 3).map(({ uid }) => uid) }, meld: kong(discarded, true), handTiles: matching.slice(0, 3) })
  if (player === nextPlayer(state.phase.discarder) && discarded.kind === 'suit') {
    for (let start = Math.max(1, discarded.rank - 2); start <= Math.min(7, discarded.rank); start += 1) {
      const needed = [start, start + 1, start + 2].filter((rank) => rank !== discarded.rank)
      const picked = needed.map((rank) => held.find(({ tile }) => tile.kind === 'suit' && tile.suit === discarded.suit && tile.rank === rank))
      if (picked.every((tile): tile is TileInstance => tile !== undefined)) options.push({
        command: { type: 'chow', player, tileUids: picked.map(({ uid }) => uid) },
        meld: chow(discarded.suit, start as Rank, true), handTiles: picked,
      })
    }
  }
  return options
}

export function claimPriority(type: ClaimCommand['type']): number { return type === 'win' ? 3 : type === 'pung' || type === 'kong' ? 2 : 1 }
export function orderClaims(claims: ClaimCommand[], discarder: PlayerId): ClaimCommand[] {
  return [...claims].sort((a, b) => claimPriority(b.type) - claimPriority(a.type) || distance(discarder, a.player) - distance(discarder, b.player))
}

export function standardTile(instance: TileInstance): StandardTile {
  if (instance.tile.kind === 'bonus') throw new Error('Bonus tile cannot form a meld')
  return instance.tile
}
