import type { HandScore, RuleSet } from '../engine/scoring'
import type { BonusTile, StandardTile, Tile, Wind } from '../engine/tiles'
import type { Set3 } from '../engine/hand'

export type PlayerId = 0 | 1 | 2 | 3
export type ClaimKind = 'chow' | 'pung' | 'kong' | 'win'

export interface TileInstance { uid: string; tile: Tile }
export interface MeldState { meld: Set3; tiles: TileInstance[]; claimedFrom?: PlayerId }
export interface PlayerState {
  id: PlayerId
  name: string
  seatWind: Wind
  concealed: TileInstance[]
  melds: MeldState[]
  bonus: TileInstance[]
  discards: TileInstance[]
  score: number
}
export interface Payment { from: PlayerId; to: PlayerId; amount: number }
export interface WinResult {
  type: 'win'; winners: PlayerId[]; loser?: PlayerId; scores: Record<PlayerId, HandScore>; payments: Payment[]
}
export interface DrawResult { type: 'exhaustive-draw'; payments: Payment[] }
export type HandResult = WinResult | DrawResult
export interface MatchResult { standings: { player: PlayerId; score: number }[] }
export type Phase =
  | { type: 'dealing' }
  | { type: 'awaiting-discard'; player: PlayerId }
  | { type: 'awaiting-claims'; discard: TileInstance; discarder: PlayerId; eligible: PlayerId[]; responses: Partial<Record<PlayerId, ClaimCommand | PassCommand>>; robbedKong?: { player: PlayerId; meldIndex: number } }
  | { type: 'awaiting-kong-replacement'; player: PlayerId }
  | { type: 'hand-ended'; result: HandResult }
  | { type: 'match-ended'; result: MatchResult }

export interface GameEvent { index: number; type: string; player?: PlayerId; tileUid?: string }
export interface HandHistory { roundWind: Wind; handNumber: number; dealer: PlayerId; result: HandResult }
export interface GameState {
  version: 1; seed: number; rules: RuleSet; players: Record<PlayerId, PlayerState>
  liveWall: TileInstance[]; replacementWall: TileInstance[]; dealer: PlayerId
  roundWind: Wind; handNumber: number; turn: PlayerId; phase: Phase
  events: GameEvent[]; history: HandHistory[]; consecutiveDealerWins: number
}

export type DiscardCommand = { type: 'discard'; player: PlayerId; tileUid: string }
export type PassCommand = { type: 'pass'; player: PlayerId }
export type ClaimCommand = { type: ClaimKind; player: PlayerId; tileUids?: string[]; meldIndex?: number }
export type GameCommand = DiscardCommand | PassCommand | ClaimCommand | { type: 'next-hand' }
export interface CommandResult { state: GameState; ok: boolean; error?: string }

export function asStandard(instance: TileInstance): StandardTile | null {
  return instance.tile.kind === 'bonus' ? null : instance.tile
}
export function asBonus(instance: TileInstance): BonusTile | null {
  return instance.tile.kind === 'bonus' ? instance.tile : null
}
