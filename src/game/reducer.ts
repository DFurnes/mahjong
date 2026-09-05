import { kong, type Hand } from '../engine/hand'
import { scoreHand, type HandScore } from '../engine/scoring'
import type { BonusTile, StandardTile } from '../engine/tiles'
import { claimOptions, nextPlayer, orderClaims } from './claims'
import { isLegalAction } from './legalActions'
import { startNextHand } from './matchSetup'
import { applyPayments, settleWin } from './settlement'
import type { ClaimCommand, CommandResult, GameCommand, GameState, PlayerId, TileInstance } from './types'

const ids = [0, 1, 2, 3] as const
const event = (state: GameState, type: string, player?: PlayerId, tileUid?: string) => state.events.push({ index: state.events.length, type, player, tileUid })
const removeTiles = (hand: TileInstance[], uids: readonly string[]) => hand.filter(({ uid }) => !uids.includes(uid))

function circumstances(state: GameState, player: PlayerId, source: 'draw' | 'discard') {
  const result: ('last-tile' | 'after-kong' | 'robbing-kong' | 'first-turn')[] = []
  if (state.liveWall.length === 0) result.push('last-tile')
  if (state.events.at(-1)?.type === 'replacement-draw') result.push('after-kong')
  if (state.phase.type === 'awaiting-claims' && state.phase.robbedKong) result.push('robbing-kong')
  const discards = ids.reduce<number>((sum, id) => sum + state.players[id].discards.length, 0)
  if ((source === 'draw' && player === state.dealer && discards === 0) || (source === 'discard' && player !== state.dealer && discards === 1)) result.push('first-turn')
  return result
}

function handScore(state: GameState, player: PlayerId, source: 'draw' | 'discard'): HandScore {
  const p = state.players[player]
  const concealed: StandardTile[] = p.concealed.flatMap(({ tile }) => tile.kind === 'bonus' ? [] : [tile])
  if (source === 'discard' && state.phase.type === 'awaiting-claims' && state.phase.discard.tile.kind !== 'bonus') concealed.push(state.phase.discard.tile)
  const hand: Hand = { concealed, melds: p.melds.map(({ meld }) => meld), bonus: p.bonus.map(({ tile }) => tile as BonusTile), win: source, circumstances: circumstances(state, player, source) }
  return scoreHand(hand, { rules: state.rules, seatWind: p.seatWind, roundWind: state.roundWind })
}

function draw(state: GameState, player: PlayerId, replacement: boolean): boolean {
  const wall = replacement ? state.replacementWall : state.liveWall
  const tile = wall.shift()
  if (!tile) return false
  if (tile.tile.kind === 'bonus') {
    state.players[player].bonus.push(tile); event(state, 'bonus', player, tile.uid)
    return draw(state, player, true)
  }
  state.players[player].concealed.push(tile); event(state, replacement ? 'replacement-draw' : 'draw', player, tile.uid)
  state.turn = player; state.phase = { type: 'awaiting-discard', player }
  return true
}

function finishDraw(state: GameState) {
  const result = { type: 'exhaustive-draw' as const, payments: [] }
  state.phase = { type: 'hand-ended', result }; state.history.push({ roundWind: state.roundWind, handNumber: state.handNumber, dealer: state.dealer, result }); event(state, 'exhaustive-draw')
}

function finishWin(state: GameState, winners: PlayerId[], loser?: PlayerId) {
  const scores = {} as Record<PlayerId, HandScore>
  for (const winner of winners) scores[winner] = handScore(state, winner, loser === undefined ? 'draw' : 'discard')
  const payments = settleWin(winners, loser, scores, state.dealer)
  state.players = applyPayments(state.players, payments)
  const result = { type: 'win' as const, winners, loser, scores, payments }
  state.phase = { type: 'hand-ended', result }; state.history.push({ roundWind: state.roundWind, handNumber: state.handNumber, dealer: state.dealer, result }); event(state, 'win', winners[0])
}

function resolveClaims(state: GameState) {
  if (state.phase.type !== 'awaiting-claims') return
  const phase = state.phase
  if (!phase.eligible.every((id) => phase.responses[id])) return
  const claims = Object.values(phase.responses).filter((response): response is ClaimCommand => response?.type !== 'pass')
  const wins = claims.filter((claim) => claim.type === 'win')
  if (wins.length) { finishWin(state, orderClaims(wins, phase.discarder).map(({ player }) => player), phase.discarder); return }
  if (phase.robbedKong) {
    const owner = state.players[phase.robbedKong.player]
    const old = owner.melds[phase.robbedKong.meldIndex]
    old.meld = kong((old.meld as { tile: StandardTile }).tile, true); old.tiles.push(phase.discard)
    if (!draw(state, phase.robbedKong.player, true)) finishDraw(state)
    return
  }
  const selected = orderClaims(claims, phase.discarder)[0]
  if (!selected) { const player = nextPlayer(phase.discarder); if (!draw(state, player, false)) finishDraw(state); return }
  const option = claimOptions(state, selected.player).find(({ command }) => command.type === selected.type && JSON.stringify(command.tileUids) === JSON.stringify(selected.tileUids))
  if (!option) throw new Error('Claim disappeared during resolution')
  const player = state.players[selected.player]
  player.concealed = removeTiles(player.concealed, option.handTiles.map(({ uid }) => uid))
  state.players[phase.discarder].discards = removeTiles(state.players[phase.discarder].discards, [phase.discard.uid])
  player.melds.push({ meld: option.meld, tiles: [...option.handTiles, phase.discard], claimedFrom: phase.discarder })
  event(state, selected.type, selected.player, phase.discard.uid)
  if (selected.type === 'kong') { if (!draw(state, selected.player, true)) finishDraw(state) } else { state.turn = selected.player; state.phase = { type: 'awaiting-discard', player: selected.player } }
}

export function reduceGame(previous: GameState, command: GameCommand): CommandResult {
  if (!isLegalAction(previous, command)) return { state: previous, ok: false, error: 'Illegal action for the current phase' }
  const state = structuredClone(previous)
  if (command.type === 'next-hand') return { state: startNextHand(state), ok: true }
  if (command.type === 'discard') {
    const player = state.players[command.player]
    const tile = player.concealed.find(({ uid }) => uid === command.tileUid)!
    player.concealed = removeTiles(player.concealed, [tile.uid]); player.discards.push(tile); event(state, 'discard', command.player, tile.uid)
    const eligible = ids.filter((id) => id !== command.player)
    state.phase = { type: 'awaiting-claims', discard: tile, discarder: command.player, eligible, responses: {} }
  } else if (state.phase.type === 'awaiting-claims') {
    if (state.phase.type !== 'awaiting-claims') throw new Error('Invalid claim phase')
    state.phase.responses[command.player] = command; event(state, command.type, command.player)
    resolveClaims(state)
  } else if (command.type === 'win') finishWin(state, [command.player])
  else if (command.type === 'kong') {
    const player = state.players[command.player]
    if (command.meldIndex !== undefined) {
      const tile = player.concealed.find(({ uid }) => uid === command.tileUids![0])!
      player.concealed = removeTiles(player.concealed, [tile.uid])
      state.phase = { type: 'awaiting-claims', discard: tile, discarder: command.player, eligible: ids.filter((id) => id !== command.player), responses: {}, robbedKong: { player: command.player, meldIndex: command.meldIndex } }
      event(state, 'promote-kong', command.player, tile.uid)
    } else {
      const tiles = player.concealed.filter(({ uid }) => command.tileUids!.includes(uid))
      player.concealed = removeTiles(player.concealed, command.tileUids!); player.melds.push({ meld: kong(tiles[0].tile as StandardTile), tiles }); event(state, 'concealed-kong', command.player)
      if (!draw(state, command.player, true)) finishDraw(state)
    }
  }
  return { state, ok: true }
}
