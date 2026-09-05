/**
 * The faan (番) patterns a winning hand can match.
 *
 * Each pattern is a self-contained predicate over a scored hand, so extending
 * the rulebook means adding entries to this list rather than touching the
 * scorer. Wait-shape faan (邊張, 坎張, 單吊) stays out on purpose — it is a
 * Japanese/Taiwanese idea Hong Kong rules don't score, and it would need
 * tracking which tile completed the hand, which this app does not do.
 */

import { type Decomposition, allSets } from '../hand/decompose'
import type { WinCircumstance, WinSource } from '../hand/types'
import { type Set3, isChow, isPungLike } from '../hand/melds'
import {
  type BonusIndex,
  type BonusKind,
  type BonusTile,
  type Dragon,
  type StandardTile,
  type Suit,
  type Wind,
  SEAT_INDEX,
  isHonour,
  isSuited,
  isTerminal,
  isTerminalOrHonour,
} from '../tiles/tiles'
import { LIMIT_FAAN, type HouseRuleId } from './rules'

/** How a hand qualified as a win. */
export type WinningHand =
  | { kind: 'standard'; decomposition: Decomposition }
  | { kind: 'special'; id: 'thirteen-orphans' }

export interface ScoringContext {
  /** The fourteen tiles of the hand, bonus tiles excluded. Kongs' fourth copies included. */
  tiles: readonly StandardTile[]
  hand: WinningHand
  /** Flowers and seasons held. They sit outside the fourteen but score faan of their own. */
  bonus: readonly BonusTile[]
  /** The player's own seat wind, if chosen. Undefined means no seat-wind bonus applies. */
  seatWind?: Wind
  /** The prevailing wind of the round, if chosen. Undefined means no round-wind bonus applies. */
  roundWind?: Wind
  /** How the hand was won, if the player has said. Undefined means no situational faan applies. */
  win?: WinSource
  /** Extra circumstances of the win, alongside {@link win}. */
  circumstances: readonly WinCircumstance[]
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
  /** Core patterns are fixed; house patterns name the stable preference that controls them. */
  stability: { type: 'core' } | { type: 'house'; rule: HouseRuleId }
  matches(context: ScoringContext): boolean
}

/** Hong Kong scoring is capped; a hand worth more than this pays this. */
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

function bonusOf(context: ScoringContext, kind: BonusKind, index: BonusIndex): boolean {
  return context.bonus.some((tile) => tile.bonus === kind && tile.index === index)
}

function hasAllOf(context: ScoringContext, kind: BonusKind): boolean {
  return ([1, 2, 3, 4] as const).every((index) => bonusOf(context, kind, index))
}

/** Bamboo 2/3/4/6/8, or the green dragon — the only tiles 綠一色 allows. */
function isGreenTile(tile: StandardTile): boolean {
  if (tile.kind === 'dragon') return tile.dragon === 'green'
  return tile.kind === 'suit' && tile.suit === 'bamboo' && [2, 3, 4, 6, 8].includes(tile.rank)
}

/** Rank counts a suit must exactly hold for nine gates, before the one extra tile. */
const NINE_GATES_BASE = [3, 1, 1, 1, 1, 1, 1, 1, 3]

/**
 * 九蓮寶燈: one suit, no honours, nothing declared, and the tiles are
 * 1-1-1-2-3-4-5-6-7-8-9-9-9 plus exactly one more tile of that suit anywhere.
 */
function isNineGates(context: ScoringContext): boolean {
  if (context.hand.kind !== 'standard' || context.hand.decomposition.declared.length > 0) {
    return false
  }
  if (suitsUsed(context).size !== 1 || hasHonours(context)) return false

  const counts = new Array<number>(9).fill(0)
  for (const tile of context.tiles) {
    if (tile.kind === 'suit') counts[tile.rank - 1] += 1
  }
  let extra = 0
  for (let rank = 0; rank < 9; rank += 1) {
    const spare = counts[rank] - NINE_GATES_BASE[rank]
    if (spare < 0) return false
    extra += spare
  }
  return extra === 1
}

export const FAAN_PATTERNS: readonly FaanPattern[] = [
  {
    id: 'all-chows',
    name: 'All sequences',
    chineseName: '平和',
    description: 'Every set is a run of three consecutive tiles, and there are no honour tiles.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) =>
      isStandardWin(context) && standardMelds(context).every(isChow) && !hasHonours(context),
  },
  {
    id: 'all-pungs',
    name: 'All triplets',
    chineseName: '對對和',
    description: 'Every set is three of the same tile — no runs anywhere in the hand.',
    faan: 3,
    stability: { type: 'core' },
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
    stability: { type: 'core' },
    matches: (context) => suitsUsed(context).size === 1 && hasHonours(context),
  },
  {
    id: 'full-flush',
    name: 'Full flush',
    chineseName: '清一色',
    description: 'The entire hand is one suit, with no winds or dragons at all.',
    faan: 7,
    supersedes: ['half-flush'],
    stability: { type: 'core' },
    matches: (context) => suitsUsed(context).size === 1 && !hasHonours(context),
  },
  {
    id: 'red-dragon-pung',
    name: 'Red dragon',
    chineseName: '紅中',
    description: 'A triplet or kong of Red Dragons.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) => dragonPungs(context).includes('red'),
  },
  {
    id: 'green-dragon-pung',
    name: 'Green dragon',
    chineseName: '發財',
    description: 'A triplet or kong of Green Dragons.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) => dragonPungs(context).includes('green'),
  },
  {
    id: 'white-dragon-pung',
    name: 'White dragon',
    chineseName: '白板',
    description: 'A triplet or kong of White Dragons.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) => dragonPungs(context).includes('white'),
  },
  {
    id: 'small-dragons',
    name: 'Small dragons',
    chineseName: '小三元',
    description: 'Two of the three dragons as triplets, plus the third dragon as the pair.',
    faan: 5,
    supersedes: ['red-dragon-pung', 'green-dragon-pung', 'white-dragon-pung'],
    stability: { type: 'core' },
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
    supersedes: [
      'small-dragons',
      'red-dragon-pung',
      'green-dragon-pung',
      'white-dragon-pung',
    ],
    stability: { type: 'core' },
    matches: (context) => dragonPungs(context).length === 3,
  },
  {
    id: 'seat-wind',
    name: 'Seat wind',
    chineseName: '門風',
    description: 'A triplet of the wind matching the seat you chose.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) =>
      context.seatWind !== undefined && windPungs(context).includes(context.seatWind),
  },
  {
    id: 'round-wind',
    name: 'Round wind',
    chineseName: '圈風',
    description: 'A triplet of the wind matching the current round. Stacks with the seat wind.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) =>
      context.roundWind !== undefined && windPungs(context).includes(context.roundWind),
  },
  {
    id: 'self-draw',
    name: 'Self-drawn',
    chineseName: '自摸',
    description: "The winning tile was drawn, not claimed from another player's discard.",
    faan: 1,
    stability: { type: 'core' },
    matches: (context) => context.win === 'draw',
  },
  {
    id: 'fully-concealed',
    name: 'Fully concealed',
    chineseName: '門前清',
    description: 'No meld was claimed from a discard anywhere in the hand.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) => context.win !== undefined && context.concealed,
  },
  {
    id: 'last-tile-draw',
    name: 'Last catch',
    chineseName: '海底撈月',
    description: 'Won by drawing the very last tile in the wall.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) => context.win === 'draw' && context.circumstances.includes('last-tile'),
  },
  {
    id: 'last-tile-discard',
    name: "Scavenging the river",
    chineseName: '河底撈魚',
    description: 'Won by claiming the very last discard of the hand.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) => context.win === 'discard' && context.circumstances.includes('last-tile'),
  },
  {
    id: 'after-kong',
    name: 'Kong replacement',
    chineseName: '槓上開花',
    description: 'Won on the replacement tile drawn immediately after declaring a kong.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) => context.win === 'draw' && context.circumstances.includes('after-kong'),
  },
  {
    id: 'robbing-kong',
    name: 'Robbing the kong',
    chineseName: '搶槓',
    description: "Won by claiming a tile another player was adding to an already-declared pung.",
    faan: 1,
    stability: { type: 'core' },
    matches: (context) =>
      context.win === 'discard' && context.circumstances.includes('robbing-kong'),
  },
  {
    id: 'heavenly-hand',
    name: 'Heavenly hand',
    chineseName: '天和',
    description: 'The dealer wins with the hand as first dealt, before discarding anything.',
    faan: LIMIT_FAAN,
    supersedes: ['self-draw', 'fully-concealed'],
    stability: { type: 'house', rule: 'heavenly-hand' },
    matches: (context) =>
      context.seatWind === 'east' &&
      context.win === 'draw' &&
      context.circumstances.includes('first-turn'),
  },
  {
    id: 'earthly-hand',
    name: 'Earthly hand',
    chineseName: '地和',
    description: "A non-dealer wins by claiming the dealer's very first discard.",
    faan: LIMIT_FAAN,
    supersedes: ['fully-concealed'],
    stability: { type: 'house', rule: 'earthly-hand' },
    matches: (context) =>
      context.seatWind !== undefined &&
      context.seatWind !== 'east' &&
      context.win === 'discard' &&
      context.circumstances.includes('first-turn'),
  },
  {
    id: 'small-winds',
    name: 'Small winds',
    chineseName: '小四喜',
    description: 'Three of the four winds as triplets, plus the fourth wind as the pair.',
    faan: 13,
    stability: { type: 'core' },
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
    stability: { type: 'core' },
    matches: (context) => windPungs(context).length === 4,
  },
  {
    id: 'all-honours',
    name: 'All honours',
    chineseName: '字一色',
    description: 'Every tile is a wind or a dragon — no numbered suits at all.',
    faan: 10,
    supersedes: ['all-pungs', 'half-flush', 'mixed-terminals'],
    stability: { type: 'core' },
    matches: (context) => context.tiles.every(isHonour),
  },
  {
    id: 'all-terminals',
    name: 'All terminals',
    chineseName: '清么九',
    description: 'Every tile is a 1 or a 9 — no honours and nothing in the middle.',
    faan: 10,
    supersedes: ['all-pungs', 'mixed-terminals'],
    stability: { type: 'core' },
    matches: (context) => context.tiles.every(isTerminal),
  },
  {
    id: 'mixed-terminals',
    name: 'Mixed terminals',
    chineseName: '混么九',
    description:
      'Every set is a triplet of a terminal, a wind, or a dragon, and both terminals and honours appear.',
    faan: 10,
    supersedes: ['all-pungs'],
    stability: { type: 'core' },
    matches: (context) =>
      isStandardWin(context) &&
      standardMelds(context).every(isPungLike) &&
      context.tiles.every(isTerminalOrHonour) &&
      hasHonours(context) &&
      context.tiles.some(isTerminal),
  },
  {
    id: 'nine-gates',
    name: 'Nine gates',
    chineseName: '九蓮寶燈',
    description:
      'Fully concealed, one suit only: 1-1-1-2-3-4-5-6-7-8-9-9-9 plus one more tile of that suit.',
    faan: LIMIT_FAAN,
    supersedes: ['full-flush', 'all-chows'],
    stability: { type: 'house', rule: 'nine-gates' },
    matches: isNineGates,
  },
  {
    id: 'four-kongs',
    name: 'Four kongs',
    chineseName: '十八羅漢',
    description: 'All four sets are kongs.',
    faan: LIMIT_FAAN,
    supersedes: ['all-pungs'],
    stability: { type: 'house', rule: 'four-kongs' },
    matches: (context) =>
      isStandardWin(context) &&
      standardMelds(context).length === 4 &&
      standardMelds(context).every((meld) => meld.type === 'kong'),
  },
  {
    id: 'four-concealed-pungs',
    name: 'Four concealed triplets',
    chineseName: '坎坎和',
    description: 'All four sets are triplets, and none of them were claimed from a discard.',
    faan: LIMIT_FAAN,
    supersedes: ['all-pungs', 'fully-concealed'],
    stability: { type: 'house', rule: 'four-concealed-pungs' },
    // Like fully-concealed, this is about how the win happened, so it only
    // applies once the player has said how they won.
    matches: (context) =>
      context.win !== undefined &&
      isStandardWin(context) &&
      standardMelds(context).length === 4 &&
      standardMelds(context).every((meld) => isPungLike(meld) && !meld.exposed),
  },
  {
    id: 'all-green',
    name: 'All green',
    chineseName: '綠一色',
    description: 'Every tile is bamboo 2, 3, 4, 6, or 8, or the Green Dragon.',
    faan: LIMIT_FAAN,
    supersedes: ['half-flush', 'full-flush'],
    stability: { type: 'house', rule: 'all-green' },
    matches: (context) => context.tiles.every(isGreenTile),
  },
  {
    id: 'seat-flower',
    name: 'Seat flower',
    chineseName: '門花',
    description: 'The flower matching the seat you chose.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) =>
      context.seatWind !== undefined && bonusOf(context, 'flower', SEAT_INDEX[context.seatWind]),
  },
  {
    id: 'seat-season',
    name: 'Seat season',
    chineseName: '門季',
    description: 'The season matching the seat you chose.',
    faan: 1,
    stability: { type: 'core' },
    matches: (context) =>
      context.seatWind !== undefined && bonusOf(context, 'season', SEAT_INDEX[context.seatWind]),
  },
  {
    id: 'all-flowers',
    name: 'All flowers',
    chineseName: '一台花',
    description: 'All four flowers, regardless of seat.',
    faan: 2,
    supersedes: ['seat-flower'],
    stability: { type: 'house', rule: 'all-flowers' },
    matches: (context) => hasAllOf(context, 'flower'),
  },
  {
    id: 'all-seasons',
    name: 'All seasons',
    chineseName: '一台花',
    description: 'All four seasons, regardless of seat.',
    faan: 2,
    supersedes: ['seat-season'],
    stability: { type: 'house', rule: 'all-seasons' },
    matches: (context) => hasAllOf(context, 'season'),
  },
  {
    id: 'thirteen-orphans',
    name: 'Thirteen orphans',
    chineseName: '十三么',
    description:
      'One of every terminal and honour tile, plus a matching second copy of one of them as the pair.',
    faan: LIMIT_FAAN,
    stability: { type: 'core' },
    matches: (context) => context.hand.kind === 'special' && context.hand.id === 'thirteen-orphans',
  },
  {
    id: 'chicken-hand',
    name: 'Chicken hand',
    chineseName: '雞和',
    description: "A valid win that doesn't match any named pattern, so it scores nothing on its own.",
    faan: 0,
    fallback: true,
    stability: { type: 'core' },
    matches: isStandardWin,
  },
]

export const PATTERNS_BY_ID: ReadonlyMap<string, FaanPattern> = new Map(
  FAAN_PATTERNS.map((pattern) => [pattern.id, pattern]),
)
