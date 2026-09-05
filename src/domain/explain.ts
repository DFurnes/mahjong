/**
 * Turning a decomposition into something a player can read at a glance:
 * what the hand already holds, and how much further it has to go.
 */

import { type Decomposition, bestDecomposition, decompose } from './decompose'
import { type Meld, type PartialSet } from './melds'
import { tilesAway } from './shanten'
import { HAND_SIZE } from './scoring'
import { type StandardTile, type Tile, isBonus, isStandard } from './tiles'

export interface HandExplanation {
  /** Standard tiles in hand, bonus tiles excluded. */
  handSize: number
  bonusCount: number
  setCount: number
  hasPair: boolean
  partials: PartialSet[]
  /** Tiles that contribute to nothing in the best reading — spares to discard. */
  floaters: readonly StandardTile[]
  /** How many more tiles the hand needs; 0 means it is already a winner. */
  tilesAway: number
  isWinning: boolean
  /** "two complete sets and a pair" */
  headline: string
  /** "three tiles from a winning hand" */
  distance: string
  /** Compact status for a one-line bar: "2 sets · 1 pair · 6 away" */
  brief: string
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

function buildHeadline(decomposition: Decomposition | null, handSize: number): string {
  if (handSize === 0) return 'Your hand is empty.'
  if (!decomposition) return 'Nothing to work with yet.'

  const parts: string[] = []
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
function buildBrief(decomposition: Decomposition | null, handSize: number, away: number): string {
  if (handSize === 0) return 'No tiles yet'
  if (away === 0) return 'Winning hand'

  const parts: string[] = []
  if (decomposition) {
    if (decomposition.melds.length > 0) parts.push(plural(decomposition.melds.length, 'set'))
    if (decomposition.pair) parts.push('1 pair')
    if (decomposition.partials.length > 0) {
      parts.push(plural(decomposition.partials.length, 'part-set'))
    }
  }
  parts.push(`${away} away`)

  return parts.join(' · ')
}

function plural(n: number, singular: string): string {
  return `${n} ${n === 1 ? singular : `${singular}s`}`
}

export function explainHand(tiles: readonly Tile[]): HandExplanation {
  const standard = tiles.filter(isStandard)
  const bonusCount = tiles.filter(isBonus).length
  const decomposition = bestDecomposition(decompose(standard))
  const away = tilesAway(standard)

  return {
    handSize: standard.length,
    bonusCount,
    setCount: decomposition?.melds.length ?? 0,
    hasPair: decomposition?.pair != null,
    partials: decomposition?.partials ?? [],
    floaters: decomposition?.floaters ?? [],
    tilesAway: away,
    isWinning: away === 0 && standard.length === HAND_SIZE,
    headline: buildHeadline(decomposition, standard.length),
    distance: buildDistance(away, standard.length),
    brief: buildBrief(decomposition, standard.length, away),
    groups: decomposition
      ? [...decomposition.melds, ...(decomposition.pair ? [decomposition.pair] : [])]
      : [],
    decomposition,
  }
}
