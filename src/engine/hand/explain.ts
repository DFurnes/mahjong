/**
 * Turning a decomposition into something a player can read at a glance:
 * what the hand already holds, and how much further it has to go.
 */

import { type Decomposition, bestDecomposition, decompose } from './decompose'
import { HAND_SIZE, type Hand, handSize as totalHandSize } from './types'
import { type Meld, type PartialSet, type Set3 } from './melds'
import { tilesAway } from './shanten'
import { type StandardTile } from '../tiles/tiles'

export interface HandExplanation {
  /** Tiles counted toward the fourteen: concealed tiles plus three per declared set. */
  handSize: number
  bonusCount: number
  setCount: number
  hasPair: boolean
  partials: PartialSet[]
  /** Tiles that contribute to nothing in the best reading — spares to discard. */
  floaters: readonly StandardTile[]
  /** Sets already on the table: claimed melds, and kongs declared face-down. */
  declared: Set3[]
  /** How many more tiles the hand needs; 0 means it is already a winner. */
  tilesAway: number
  isWinning: boolean
  /** "two complete sets and a pair" */
  headline: string
  /** "three tiles from a winning hand" */
  distance: string
  /** Compact status for a one-line bar: "2 sets · 1 pair · 6 away" */
  brief: string
  /** The concealed reading's sets and pair — what a player can still expose. */
  groups: Meld[]
  decomposition: Decomposition | null
}

const NUMBER_WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
]

function count(n: number, singular: string, plural = `${singular}s`): string {
  const word = NUMBER_WORDS[n] ?? String(n)
  return `${word} ${n === 1 ? singular : plural}`
}

function buildHeadline(
  decomposition: Decomposition | null,
  declaredCount: number,
  handSize: number,
): string {
  if (handSize === 0) return 'Your hand is empty.'
  if (!decomposition) return 'Nothing to work with yet.'

  const parts: string[] = []
  if (declaredCount > 0) parts.push(count(declaredCount, 'declared meld'))
  if (decomposition.melds.length > 0) {
    parts.push(count(decomposition.melds.length, 'complete set'))
  }
  if (decomposition.pair) parts.push('a pair')
  if (decomposition.partials.length > 0) {
    parts.push(count(decomposition.partials.length, 'part-set'))
  }

  if (parts.length === 0) return `You have ${count(handSize, 'loose tile')} and nothing grouped yet.`

  if (decomposition.floaters.length > 0) {
    parts.push(count(decomposition.floaters.length, 'loose tile'))
  }

  return `You have ${joinList(parts)}.`
}

function joinList(parts: readonly string[]): string {
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

function buildDistance(away: number, handSize: number): string {
  if (away === 0) return 'This is a winning hand.'
  if (handSize === 0) return 'A winning hand is fourteen tiles: four sets and a pair.'
  if (handSize < HAND_SIZE && away === HAND_SIZE - handSize) {
    return `You still need ${count(away, 'tile')}, and everything you hold fits.`
  }
  return `You are ${count(away, 'tile')} from a winning hand.`
}

/** The same reading as {@link buildHeadline}, squeezed onto one line. */
function buildBrief(
  decomposition: Decomposition | null,
  declaredCount: number,
  handSize: number,
  away: number,
): string {
  if (handSize === 0) return 'No tiles yet'
  if (away === 0) return 'Winning hand'

  const parts: string[] = []
  const setCount = declaredCount + (decomposition?.melds.length ?? 0)
  if (setCount > 0) parts.push(plural(setCount, 'set'))
  if (decomposition?.pair) parts.push('1 pair')
  if (decomposition && decomposition.partials.length > 0) {
    parts.push(plural(decomposition.partials.length, 'part-set'))
  }
  parts.push(`${away} away`)

  return parts.join(' · ')
}

function plural(n: number, singular: string): string {
  return `${n} ${n === 1 ? singular : `${singular}s`}`
}

export function explainHand(hand: Hand): HandExplanation {
  const { concealed, melds: declared, bonus } = hand
  const decomposition = bestDecomposition(decompose(concealed, declared))
  const away = tilesAway(hand)
  const size = totalHandSize(hand)

  return {
    handSize: size,
    bonusCount: bonus.length,
    setCount: declared.length + (decomposition?.melds.length ?? 0),
    hasPair: decomposition?.pair != null,
    partials: decomposition?.partials ?? [],
    floaters: decomposition?.floaters ?? [],
    declared,
    tilesAway: away,
    isWinning: away === 0 && size === HAND_SIZE,
    headline: buildHeadline(decomposition, declared.length, size),
    distance: buildDistance(away, size),
    brief: buildBrief(decomposition, declared.length, size, away),
    groups: decomposition
      ? [...decomposition.melds, ...(decomposition.pair ? [decomposition.pair] : [])]
      : [],
    decomposition,
  }
}
