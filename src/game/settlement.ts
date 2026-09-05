import type { HandScore } from '../engine/scoring'
import type { Payment, PlayerId } from './types'

/** Capped Hong Kong schedule: 3 faan=8 base points, doubling through the 13-faan limit. */
export function faanToPoints(faan: number): number {
  if (faan < 3) return 0
  if (faan <= 4) return 2 ** faan
  if (faan <= 6) return 64
  if (faan <= 9) return 128
  return 256
}

export function settleWin(winners: PlayerId[], loser: PlayerId | undefined, scores: Record<PlayerId, HandScore>, dealer: PlayerId): Payment[] {
  const payments: Payment[] = []
  for (const winner of winners) {
    const base = faanToPoints(scores[winner].faan)
    if (loser === undefined) {
      for (const payer of [0, 1, 2, 3] as PlayerId[]) if (payer !== winner) payments.push({ from: payer, to: winner, amount: base * (payer === dealer || winner === dealer ? 2 : 1) })
    } else payments.push({ from: loser, to: winner, amount: base * (loser === dealer || winner === dealer ? 2 : 1) })
  }
  return payments
}

export function applyPayments(players: GameStatePlayers, payments: Payment[]): GameStatePlayers {
  const next = structuredClone(players)
  for (const payment of payments) { next[payment.from].score -= payment.amount; next[payment.to].score += payment.amount }
  return next
}
type GameStatePlayers = import('./types').GameState['players']
