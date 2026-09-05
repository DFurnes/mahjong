import { kong, type Hand } from '../engine/hand'
import { scoreHand } from '../engine/scoring'
import { tileId } from '../engine/tiles'
import { claimOptions } from './claims'
import type { GameCommand, GameState, PlayerId } from './types'

function winning(state: GameState, player: PlayerId, source: 'draw' | 'discard'): boolean {
  const phase = state.phase
  const concealed = state.players[player].concealed.flatMap(({ tile }) => tile.kind === 'bonus' ? [] : [tile])
  if (source === 'discard' && phase.type === 'awaiting-claims' && phase.discard.tile.kind !== 'bonus') concealed.push(phase.discard.tile)
  const hand: Hand = { concealed, melds: state.players[player].melds.map(({ meld }) => meld), bonus: state.players[player].bonus.map(({ tile }) => tile).filter((tile) => tile.kind === 'bonus'), win: source }
  return scoreHand(hand, { rules: state.rules, seatWind: state.players[player].seatWind, roundWind: state.roundWind }).isLegalWin
}

export function legalActions(state: GameState, player: PlayerId): GameCommand[] {
  if (state.phase.type === 'awaiting-discard' && state.phase.player === player) {
    const held = state.players[player].concealed
    const actions: GameCommand[] = held.map(({ uid }) => ({ type: 'discard', player, tileUid: uid }))
    if (winning(state, player, 'draw')) actions.push({ type: 'win', player })
    const groups = new Map<string, string[]>()
    for (const instance of held) if (instance.tile.kind !== 'bonus') groups.set(tileId(instance.tile), [...(groups.get(tileId(instance.tile)) ?? []), instance.uid])
    for (const uids of groups.values()) if (uids.length === 4) actions.push({ type: 'kong', player, tileUids: uids })
    state.players[player].melds.forEach(({ meld }, meldIndex) => {
      if (meld.type !== 'pung') return
      const tile = held.find(({ tile }) => tileId(tile) === tileId(meld.tile))
      if (tile) actions.push({ type: 'kong', player, tileUids: [tile.uid], meldIndex })
    })
    return actions
  }
  if (state.phase.type === 'awaiting-claims' && state.phase.eligible.includes(player) && !state.phase.responses[player]) {
    const actions: GameCommand[] = [{ type: 'pass', player }]
    if (!state.phase.robbedKong) actions.push(...claimOptions(state, player).map(({ command }) => command))
    if (winning(state, player, 'discard')) actions.push({ type: 'win', player })
    return actions
  }
  if (state.phase.type === 'hand-ended') return [{ type: 'next-hand' }]
  return []
}

export function isLegalAction(state: GameState, command: GameCommand): boolean {
  if (command.type === 'next-hand') return state.phase.type === 'hand-ended'
  return legalActions(state, command.player).some((candidate) => candidate.type === command.type &&
    ('tileUid' in candidate ? candidate.tileUid === ('tileUid' in command ? command.tileUid : undefined) : true) &&
    ('meldIndex' in candidate ? candidate.meldIndex === ('meldIndex' in command ? command.meldIndex : undefined) : true) &&
    ('tileUids' in candidate ? JSON.stringify(candidate.tileUids) === JSON.stringify('tileUids' in command ? command.tileUids : undefined) : true))
}

export const concealedKong = kong
