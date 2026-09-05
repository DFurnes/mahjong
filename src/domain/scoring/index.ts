/**
 * Scoring a finished hand.
 *
 * A hand can decompose more than one way and the readings can be worth
 * different amounts, so every complete reading is scored and the best one wins
 * — the player gets the most generous honest reading of their tiles.
 */

import { completeDecompositions } from '../decompose'
import { HAND_SIZE, type Hand, handSize, handTiles, isConcealedHand } from '../hand'
import { type Wind } from '../tiles'
import { thirteenOrphansCost } from '../shanten'
import {
  FAAN_PATTERNS,
  LIMIT_FAAN,
  type ScoringContext,
  type WinningHand,
} from './patterns'

export * from './patterns'

export interface MatchedPattern {
  id: string
  name: string
  chineseName: string
  description: string
  faan: number
}

export interface HandScore {
  isWinning: boolean
  /** Total faan, capped at {@link LIMIT_FAAN}. */
  faan: number
  patterns: MatchedPattern[]
  /** The reading that produced this score. */
  hand: WinningHand | null
}

const NO_SCORE: HandScore = { isWinning: false, faan: 0, patterns: [], hand: null }

function scoreWinningHand(context: ScoringContext): HandScore {
  const matched = FAAN_PATTERNS.filter(
    (pattern) => !pattern.fallback && pattern.matches(context),
  )

  const superseded = new Set(matched.flatMap((pattern) => pattern.supersedes ?? []))
  const kept = matched.filter((pattern) => !superseded.has(pattern.id))

  const scored =
    kept.length > 0
      ? kept
      : FAAN_PATTERNS.filter((pattern) => pattern.fallback && pattern.matches(context))

  const patterns = scored.map(({ id, name, chineseName, description, faan }) => ({
    id,
    name,
    chineseName,
    description,
    faan,
  }))

  const total = patterns.reduce((sum, pattern) => sum + pattern.faan, 0)

  return {
    isWinning: true,
    faan: Math.min(total, LIMIT_FAAN),
    patterns,
    hand: context.hand,
  }
}

/**
 * Score a hand. Bonus tiles are set aside — under full rules each is worth a
 * faan, but that needs bonus tiles threaded into {@link ScoringContext}, which
 * does not happen yet, so they score nothing here. `seatWind` enables the
 * seat-wind pattern; the round wind is not modeled yet. `hand.win` enables
 * self-draw and fully-concealed; leaving it unset scores neither.
 */
export function scoreHand(hand: Hand, seatWind?: Wind): HandScore {
  if (handSize(hand) !== HAND_SIZE) return NO_SCORE

  const declared = hand.melds
  const candidates: WinningHand[] = completeDecompositions(hand.concealed, declared).map(
    (decomposition) => ({ kind: 'standard' as const, decomposition }),
  )

  if (declared.length === 0 && thirteenOrphansCost(hand.concealed) === 0) {
    candidates.push({ kind: 'special', id: 'thirteen-orphans' })
  }

  if (candidates.length === 0) return NO_SCORE

  const tiles = handTiles(hand)
  const concealed = isConcealedHand(hand)

  return candidates
    .map((winningHand) =>
      scoreWinningHand({ tiles, hand: winningHand, seatWind, win: hand.win, concealed }),
    )
    .reduce((best, score) => (score.faan > best.faan ? score : best))
}
