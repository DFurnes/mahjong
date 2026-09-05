import { copyRuleSet, type RuleSet } from '../engine/scoring'
import { WINDS } from '../engine/tiles'
import { advanceHand, seatWind } from './match'
import type { GameState, PlayerId, PlayerState, TileInstance } from './types'
import { splitWall } from './wall'

/** Minimal Phase 1 setup state; Phase 2 will place this snapshot in GameState. */
export interface MatchSetup {
  rules: RuleSet
}

export function createMatchSetup(rules: Readonly<RuleSet>): MatchSetup {
  return { rules: copyRuleSet(rules) }
}

const ids = [0, 1, 2, 3] as const

function takePlayable(liveWall: TileInstance[], replacementWall: TileInstance[], player: PlayerState): boolean {
  const tile = liveWall.shift()
  if (!tile) return false
  if (tile.tile.kind !== 'bonus') { player.concealed.push(tile); return true }
  player.bonus.push(tile)
  while (replacementWall.length) {
    const replacement = replacementWall.shift()!
    if (replacement.tile.kind === 'bonus') player.bonus.push(replacement)
    else { player.concealed.push(replacement); return true }
  }
  return false
}

export interface NewGameOptions { seed?: number; names?: readonly [string, string, string, string]; startingScore?: number }

/** Create and completely deal a deterministic hand, including chained flower replacements. */
export function createGame(rules: Readonly<RuleSet>, options: NewGameOptions = {}): GameState {
  return dealHand(copyRuleSet(rules), options.seed ?? 1, 0, 'east', 1, [], options.names, options.startingScore ?? rules.game.startingScore)
}

function dealHand(rules: RuleSet, seed: number, dealer: PlayerId, roundWind: typeof WINDS[number], handNumber: number, history: GameState['history'], names: NewGameOptions['names'], startingScore = 2000): GameState {
  const { liveWall, replacementWall } = splitWall(seed)
  const players = {} as GameState['players']
  for (const id of ids) players[id] = { id, name: names?.[id] ?? (id === 0 ? 'You' : `Computer ${id}`), seatWind: seatWind(dealer, id), concealed: [], melds: [], bonus: [], discards: [], score: startingScore }
  for (let pass = 0; pass < 13; pass += 1) for (const id of ids) if (!takePlayable(liveWall, replacementWall, players[id])) throw new Error('Wall exhausted during deal')
  if (!takePlayable(liveWall, replacementWall, players[dealer])) throw new Error('Wall exhausted during dealer draw')
  return { version: 1, seed, rules, players, liveWall, replacementWall, dealer, roundWind, handNumber, turn: dealer, phase: { type: 'awaiting-discard', player: dealer }, events: [{ index: 0, type: 'deal', player: dealer }], history, consecutiveDealerWins: 0 }
}

export function startNextHand(state: GameState): GameState {
  const next = advanceHand(state)
  if (next.matchEnded) return { ...state, phase: { type: 'match-ended', result: { standings: ids.map((player) => ({ player, score: state.players[player].score })).sort((a, b) => b.score - a.score) } } }
  const dealt = dealHand(state.rules, state.seed + state.history.length, next.dealer, next.roundWind, next.handNumber, state.history, ids.map((id) => state.players[id].name) as [string, string, string, string])
  for (const id of ids) dealt.players[id].score = state.players[id].score
  dealt.consecutiveDealerWins = next.dealer === state.dealer ? state.consecutiveDealerWins + 1 : 0
  return dealt
}
