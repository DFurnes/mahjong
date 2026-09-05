/**
 * The faan (番) patterns a winning hand can match.
 *
 * Each pattern is a self-contained predicate over a scored hand, so adding the
 * rest of the rulebook later means adding entries to this list rather than
 * touching the scorer. Situational faan — self-draw, last tile, seat and
 * prevailing wind, flowers — is deliberately absent for now; it needs game
 * state this app does not have yet.
 */

import { type Decomposition, allSets } from '../decompose'
import type { WinSource } from '../hand'
import { type Set3, isChow, isPungLike } from '../melds'
import {
  type Dragon,
  type StandardTile,
  type Suit,
  type Wind,
  isHonour,
  isSuited,
  isTerminal,
} from '../tiles'

/** How a hand qualified as a win. */
export type WinningHand =
  | { kind: 'standard'; decomposition: Decomposition }
  | { kind: 'special'; id: 'thirteen-orphans' }

export interface ScoringContext {
  /** The fourteen tiles of the hand, bonus tiles excluded. Kongs' fourth copies included. */
  tiles: readonly StandardTile[]
  hand: WinningHand
  /** The player's own seat wind, if chosen. Undefined means no seat-wind bonus applies. */
  seatWind?: Wind
  /** How the hand was won, if the player has said. Undefined means no situational faan applies. */
  win?: WinSource
  /** Nothing in the hand was claimed from a discard. */
  concealed: boolean
}

export interface FaanPattern {
  id: string
  /** English name. */
  name: string
  /** The name as it is usually written and said at the table. */
  chineseName: string
  /** Plain-language explanation for a player who knows tiles but not scoring terms. */
  description: string
  faan: number
  /** Patterns this one absorbs, so an implied weaker pattern is not paid twice. */
  supersedes?: readonly string[]
  /** Only scored when no other pattern matched. */
  fallback?: boolean
  matches(context: ScoringContext): boolean
}

/** Hong Kong scoring is capped; a hand worth more than this pays this. */
export const LIMIT_FAAN = 13

function standardMelds(context: ScoringContext): Set3[] {
  return context.hand.kind === 'standard' ? allSets(context.hand.decomposition) : []
}

function suitsUsed(context: ScoringContext): Set<Suit> {
  const suits = new Set<Suit>()
  for (const tile of context.tiles) if (isSuited(tile)) suits.add(tile.suit)
  return suits
}

function hasHonours(context: ScoringContext): boolean {
  return context.tiles.some(isHonour)
}

function isStandardWin(context: ScoringContext): boolean {
  return context.hand.kind === 'standard'
}

function dragonPungs(context: ScoringContext): Dragon[] {
  return standardMelds(context)
    .filter(isPungLike)
    .map((meld) => meld.tile)
    .filter((tile): tile is Extract<StandardTile, { kind: 'dragon' }> => tile.kind === 'dragon')
    .map((tile) => tile.dragon)
}

function windPungs(context: ScoringContext): Wind[] {
  return standardMelds(context)
    .filter(isPungLike)
    .map((meld) => meld.tile)
    .filter((tile): tile is Extract<StandardTile, { kind: 'wind' }> => tile.kind === 'wind')
    .map((tile) => tile.wind)
}

function pairTile(context: ScoringContext): StandardTile | null {
  if (context.hand.kind !== 'standard') return null
  return context.hand.decomposition.pair?.tile ?? null
}

export const FAAN_PATTERNS: readonly FaanPattern[] = [
  {
    id: 'all-chows',
    name: 'All sequences',
    chineseName: '平和',
    description: 'Every set is a run of three consecutive tiles, and there are no honour tiles.',
    faan: 1,
    matches: (context) =>
      isStandardWin(context) && standardMelds(context).every(isChow) && !hasHonours(context),
  },
  {
    id: 'all-pungs',
    name: 'All triplets',
    chineseName: '對對和',
    description: 'Every set is three of the same tile — no runs anywhere in the hand.',
    faan: 3,
    matches: (context) =>
      isStandardWin(context) &&
      standardMelds(context).length === 4 &&
      standardMelds(context).every(isPungLike),
  },
  {
    id: 'half-flush',
    name: 'Half flush',
    chineseName: '混一色',
    description: 'Only one suit appears, mixed freely with winds and dragons.',
    faan: 3,
    matches: (context) => suitsUsed(context).size === 1 && hasHonours(context),
  },
  {
    id: 'full-flush',
    name: 'Full flush',
    chineseName: '清一色',
    description: 'The entire hand is one suit, with no winds or dragons at all.',
    faan: 7,
    supersedes: ['half-flush'],
    matches: (context) => suitsUsed(context).size === 1 && !hasHonours(context),
  },
  {
    id: 'small-dragons',
    name: 'Small dragons',
    chineseName: '小三元',
    description: 'Two of the three dragons as triplets, plus the third dragon as the pair.',
    faan: 5,
    matches: (context) => {
      const pair = pairTile(context)
      return dragonPungs(context).length === 2 && pair !== null && pair.kind === 'dragon'
    },
  },
  {
    id: 'great-dragons',
    name: 'Great dragons',
    chineseName: '大三元',
    description: 'All three dragons — Red, Green, and White — as triplets.',
    faan: 8,
    supersedes: ['small-dragons'],
    matches: (context) => dragonPungs(context).length === 3,
  },
  {
    id: 'seat-wind',
    name: 'Seat wind',
    chineseName: '門風',
    description: 'A triplet of the wind matching the seat you chose.',
    faan: 1,
    matches: (context) =>
      context.seatWind !== undefined && windPungs(context).includes(context.seatWind),
  },
  {
    id: 'self-draw',
    name: 'Self-drawn',
    chineseName: '自摸',
    description: "The winning tile was drawn, not claimed from another player's discard.",
    faan: 1,
    matches: (context) => context.win === 'draw',
  },
  {
    id: 'fully-concealed',
    name: 'Fully concealed',
    chineseName: '門前清',
    description: 'No meld was claimed from a discard anywhere in the hand.',
    faan: 1,
    matches: (context) => context.win !== undefined && context.concealed,
  },
  {
    id: 'small-winds',
    name: 'Small winds',
    chineseName: '小四喜',
    description: 'Three of the four winds as triplets, plus the fourth wind as the pair.',
    faan: 13,
    matches: (context) => {
      const pair = pairTile(context)
      return windPungs(context).length === 3 && pair !== null && pair.kind === 'wind'
    },
  },
  {
    id: 'great-winds',
    name: 'Great winds',
    chineseName: '大四喜',
    description: 'All four winds — East, South, West, and North — as triplets.',
    faan: 13,
    supersedes: ['small-winds'],
    matches: (context) => windPungs(context).length === 4,
  },
  {
    id: 'all-honours',
    name: 'All honours',
    chineseName: '字一色',
    description: 'Every tile is a wind or a dragon — no numbered suits at all.',
    faan: 10,
    supersedes: ['all-pungs', 'half-flush'],
    matches: (context) => context.tiles.every(isHonour),
  },
  {
    id: 'all-terminals',
    name: 'All terminals',
    chineseName: '清么九',
    description: 'Every tile is a 1 or a 9 — no honours and nothing in the middle.',
    faan: 10,
    supersedes: ['all-pungs'],
    matches: (context) => context.tiles.every(isTerminal),
  },
  {
    id: 'thirteen-orphans',
    name: 'Thirteen orphans',
    chineseName: '十三么',
    description:
      'One of every terminal and honour tile, plus a matching second copy of one of them as the pair.',
    faan: LIMIT_FAAN,
    matches: (context) => context.hand.kind === 'special' && context.hand.id === 'thirteen-orphans',
  },
  {
    id: 'chicken-hand',
    name: 'Chicken hand',
    chineseName: '雞和',
    description: "A valid win that doesn't match any named pattern, so it scores nothing on its own.",
    faan: 0,
    fallback: true,
    matches: isStandardWin,
  },
]

export const PATTERNS_BY_ID: ReadonlyMap<string, FaanPattern> = new Map(
  FAAN_PATTERNS.map((pattern) => [pattern.id, pattern]),
)
