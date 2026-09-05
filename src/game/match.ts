import { WINDS, type Wind } from '../engine/tiles'
import type { GameState, PlayerId } from './types'

export const rotate = (player: PlayerId, amount = 1): PlayerId => ((player + amount) % 4) as PlayerId
export function seatWind(dealer: PlayerId, player: PlayerId): Wind { return WINDS[(player - dealer + 4) % 4] }

export function advanceHand(state: GameState): { dealer: PlayerId; roundWind: Wind; handNumber: number; matchEnded: boolean } {
  if (state.phase.type !== 'hand-ended') throw new Error('Hand has not ended')
  const dealerWon = state.phase.result.type === 'win' && state.phase.result.winners.includes(state.dealer)
  if (dealerWon) return { dealer: state.dealer, roundWind: state.roundWind, handNumber: state.handNumber, matchEnded: false }
  const dealer = rotate(state.dealer)
  const wrapped = dealer === 0
  const roundIndex = WINDS.indexOf(state.roundWind)
  const roundWind = wrapped ? WINDS[(roundIndex + 1) % 4] : state.roundWind
  return { dealer, roundWind, handNumber: wrapped ? 1 : state.handNumber + 1, matchEnded: wrapped && state.roundWind === 'south' }
}
