import { chow, kong, pung, type Hand, type Set3 } from '../engine/hand'
import { scoreHand } from '../engine/scoring'
import { STANDARD_TILES, compareTiles, tileId, type Rank, type StandardTile } from '../engine/tiles'
import type { ControllerContext, PlayerController } from './controllers'
import type { GameProjection } from './projection'
import type { GameCommand, MeldState, TileInstance } from './types'

export interface HeuristicBotOptions {
  /** Enables reproducible variation only when every evaluated heuristic is tied. */
  tieBreakSeed?: number
}

interface Position {
  concealed: TileInstance[]
  melds: MeldState[]
}

interface Quality {
  shanten: number
  usefulTiles: number
  legalWinningTiles: number
  expectedFaan: number
  potential: number
}

interface Candidate {
  command: GameCommand
  quality: Quality
  safety: number
  position?: Position
}

const SHANTEN_CACHE = new Map<string, number>()

function handKey(hand: Hand): string {
  return [
    hand.concealed.map(tileId).sort().join(','),
    hand.melds.map((meld) => meld.type === 'chow' ? `c:${meld.suit}:${meld.start}` : `${meld.type}:${tileId(meld.tile)}`).sort().join(','),
  ].join('|')
}

function cachedShanten(hand: Hand): number {
  const key = handKey(hand)
  const cached = SHANTEN_CACHE.get(key)
  if (cached !== undefined) return cached
  const counts = STANDARD_TILES.map((tile) => hand.concealed.filter((held) => tileId(held) === tileId(tile)).length)
  let best = 8
  const visited = new Set<string>()
  const search = (start: number, melds: number, partials: number, pair: number) => {
    if (melds > 4 || partials > 4) return
    let index = start
    while (index < counts.length && counts[index] === 0) index += 1
    const visitKey = `${index}:${melds}:${partials}:${pair}:${counts.join('')}`
    if (visited.has(visitKey)) return
    visited.add(visitKey)
    if (index === counts.length) {
      best = Math.min(best, 8 - melds * 2 - Math.min(partials, 4 - melds) - pair)
      return
    }

    // Leaving this tile unused is necessary for complete search and quickly advances the cursor.
    const skipped = counts[index]
    counts[index] = 0
    search(index, melds, partials, pair)
    counts[index] = skipped

    if (counts[index] >= 3) {
      counts[index] -= 3
      search(index, melds + 1, partials, pair)
      counts[index] += 3
    }
    if (index < 27 && index % 9 <= 6 && counts[index + 1] > 0 && counts[index + 2] > 0) {
      counts[index] -= 1; counts[index + 1] -= 1; counts[index + 2] -= 1
      search(index, melds + 1, partials, pair)
      counts[index] += 1; counts[index + 1] += 1; counts[index + 2] += 1
    }
    if (counts[index] >= 2) {
      counts[index] -= 2
      if (pair === 0) search(index, melds, partials, 1)
      search(index, melds, partials + 1, pair)
      counts[index] += 2
    }
    if (index < 27 && index % 9 <= 7 && counts[index + 1] > 0) {
      counts[index] -= 1; counts[index + 1] -= 1
      search(index, melds, partials + 1, pair)
      counts[index] += 1; counts[index + 1] += 1
    }
    if (index < 27 && index % 9 <= 6 && counts[index + 2] > 0) {
      counts[index] -= 1; counts[index + 2] -= 1
      search(index, melds, partials + 1, pair)
      counts[index] += 1; counts[index + 2] += 1
    }
  }
  search(0, hand.melds.length, 0, 0)

  if (hand.melds.length === 0) {
    const orphanIndexes = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]
    const distinct = orphanIndexes.filter((index) => counts[index] > 0).length
    const pair = orphanIndexes.some((index) => counts[index] > 1) ? 1 : 0
    best = Math.min(best, 13 - distinct - pair)
  }
  const result = best
  if (SHANTEN_CACHE.size >= 100_000) SHANTEN_CACHE.clear()
  SHANTEN_CACHE.set(key, result)
  return result
}

function playerPosition(context: ControllerContext): Position {
  const player = context.game.players[context.player]
  if (player.concealed === null) throw new Error('A controller cannot see its own concealed hand')
  return { concealed: player.concealed, melds: player.melds }
}

function asHand(context: ControllerContext, position: Position, extra: StandardTile[] = []): Hand {
  const player = context.game.players[context.player]
  return {
    concealed: [...position.concealed.map(({ tile }) => tile as StandardTile), ...extra],
    melds: position.melds.map(({ meld }) => meld),
    bonus: player.bonus.map(({ tile }) => tile).filter((tile) => tile.kind === 'bonus'),
  }
}

/** Counts only information visible at the table, never concealed opponents or either wall. */
function visibleCounts(game: GameProjection): Map<string, number> {
  const seenUids = new Set<string>()
  const counts = new Map<string, number>()
  const add = (instance: TileInstance) => {
    if (seenUids.has(instance.uid) || instance.tile.kind === 'bonus') return
    seenUids.add(instance.uid)
    const id = tileId(instance.tile)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  for (const player of Object.values(game.players)) {
    player.concealed?.forEach(add)
    player.melds.flatMap(({ tiles }) => tiles).forEach(add)
    player.discards.forEach(add)
  }
  if (game.phase.type === 'awaiting-claims') add(game.phase.discard)
  return counts
}

function handPotential(hand: Hand, expectedFaan: number): number {
  const counts = new Map<string, number>()
  const suitCounts = new Map<string, number>()
  let honours = 0
  for (const tile of hand.concealed) {
    counts.set(tileId(tile), (counts.get(tileId(tile)) ?? 0) + 1)
    if (tile.kind === 'suit') suitCounts.set(tile.suit, (suitCounts.get(tile.suit) ?? 0) + 1)
    else honours += 1
  }
  const grouped = [...counts.values()].reduce((sum, count) => sum + (count >= 3 ? 5 : count === 2 ? 2 : 0), 0)
  const suited = [...suitCounts.values()].reduce((sum, count) => sum + count, 0)
  const mainSuit = Math.max(0, ...suitCounts.values())
  const flushShape = mainSuit * 2 - (suited - mainSuit) * 3 + honours
  const allPungsShape = hand.melds.some(({ type }) => type === 'chow') ? 0 : 5
  const declaredValue = hand.melds.reduce((sum, meld) => {
    if (meld.type === 'chow') return sum
    if (meld.tile.kind === 'dragon') return sum + 4
    return sum + (meld.tile.kind === 'wind' ? 2 : 1)
  }, 0)
  return expectedFaan * 10 + grouped + flushShape + allPungsShape + declaredValue
}

function qualityComparator(a: Quality, b: Quality): number {
  return b.shanten - a.shanten ||
    a.usefulTiles - b.usefulTiles ||
    a.legalWinningTiles - b.legalWinningTiles ||
    a.expectedFaan - b.expectedFaan ||
    a.potential - b.potential
}

function commandKey(command: GameCommand): string {
  if (command.type === 'next-hand') return command.type
  return [command.type, command.player, 'tileUid' in command ? command.tileUid : '',
    'tileUids' in command ? [...(command.tileUids ?? [])].sort().join(',') : '',
    'meldIndex' in command ? command.meldIndex ?? '' : ''].join(':')
}

function seededHash(value: string, seed: number): number {
  let hash = (2166136261 ^ seed) >>> 0
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function selectCandidate(candidates: Candidate[], seed?: number): Candidate {
  const sorted = [...candidates].sort((a, b) => {
    const quality = qualityComparator(b.quality, a.quality)
    if (quality !== 0) return quality
    if (a.safety !== b.safety) return b.safety - a.safety
    const aKey = commandKey(a.command)
    const bKey = commandKey(b.command)
    return seed === undefined ? aKey.localeCompare(bKey) : seededHash(aKey, seed) - seededHash(bKey, seed)
  })
  return sorted[0]
}

function evaluator(context: ControllerContext) {
  const visible = visibleCounts(context.game)
  const cache = new Map<string, Quality>()
  return (position: Position, detailed = false): Quality => {
    const hand = asHand(context, position)
    const key = handKey(hand)
    const cached = cache.get(key)
    if (cached || !detailed) {
      if (cached) return cached
      const result = { shanten: cachedShanten(hand), usefulTiles: 0, legalWinningTiles: 0, expectedFaan: 0, potential: handPotential(hand, 0) }
      return result
    }

    const current = cachedShanten(hand)
    let usefulTiles = 0
    let legalWinningTiles = 0
    let faanTotal = 0
    for (const tile of STANDARD_TILES) {
      const remaining = Math.max(0, 4 - (visible.get(tileId(tile)) ?? 0))
      if (remaining === 0) continue
      const nextHand = { ...hand, concealed: [...hand.concealed, tile] }
      const nextShanten = cachedShanten(nextHand)
      if (nextShanten < current) usefulTiles += remaining
      if (nextShanten === -1) {
        const score = scoreHand({ ...nextHand, win: 'draw' }, {
          rules: context.game.rules,
          seatWind: context.game.players[context.player].seatWind,
          roundWind: context.game.roundWind,
        })
        if (score.isLegalWin) {
          legalWinningTiles += remaining
          faanTotal += score.faan * remaining
        }
      }
    }
    const expectedFaan = legalWinningTiles === 0 ? 0 : faanTotal / legalWinningTiles
    const result = { shanten: current, usefulTiles, legalWinningTiles, expectedFaan, potential: handPotential(hand, expectedFaan) }
    cache.set(key, result)
    return result
  }
}

function discardCandidates(
  context: ControllerContext,
  position: Position,
  evaluate: (position: Position, detailed?: boolean) => Quality,
): Candidate[] {
  const visible = visibleCounts(context.game)
  const candidates = position.concealed.map((instance): Candidate => {
    const next = { ...position, concealed: position.concealed.filter(({ uid }) => uid !== instance.uid) }
    return {
      command: { type: 'discard', player: context.player, tileUid: instance.uid },
      quality: evaluate(next),
      safety: visible.get(tileId(instance.tile)) ?? 0,
      position: next,
    }
  })
  const bestShanten = Math.min(...candidates.map(({ quality }) => quality.shanten))
  return candidates.filter(({ quality }) => quality.shanten === bestShanten).map((candidate) => ({
    ...candidate,
    quality: evaluate(candidate.position!, true),
  }))
}

function claimPosition(context: ControllerContext, command: GameCommand, position: Position): Position | null {
  if (context.game.phase.type !== 'awaiting-claims' || !('tileUids' in command) || !command.tileUids) return null
  const discard = context.game.phase.discard
  if (discard.tile.kind === 'bonus') return null
  const used = position.concealed.filter(({ uid }) => command.tileUids!.includes(uid))
  let meld: Set3
  if (command.type === 'chow') {
    const tiles = [...used.map(({ tile }) => tile), discard.tile].filter((tile): tile is Extract<StandardTile, { kind: 'suit' }> => tile.kind === 'suit').sort(compareTiles)
    meld = chow(tiles[0].suit, tiles[0].rank as Rank, true)
  } else if (command.type === 'pung') meld = pung(discard.tile, true)
  else if (command.type === 'kong') meld = kong(discard.tile, true)
  else return null
  return {
    concealed: position.concealed.filter(({ uid }) => !command.tileUids!.includes(uid)),
    melds: [...position.melds, { meld, tiles: [...used, discard], claimedFrom: context.game.phase.discarder }],
  }
}

function ownKongPosition(command: GameCommand, position: Position): Position | null {
  if (command.type !== 'kong' || !command.tileUids) return null
  const used = position.concealed.filter(({ uid }) => command.tileUids!.includes(uid))
  if (command.meldIndex !== undefined) {
    const old = position.melds[command.meldIndex]
    if (!old || old.meld.type !== 'pung') return null
    const melds = [...position.melds]
    melds[command.meldIndex] = { ...old, meld: kong(old.meld.tile, old.meld.exposed), tiles: [...old.tiles, ...used] }
    return { concealed: position.concealed.filter(({ uid }) => !command.tileUids!.includes(uid)), melds }
  }
  const tile = used[0]?.tile
  if (!tile || tile.kind === 'bonus') return null
  return {
    concealed: position.concealed.filter(({ uid }) => !command.tileUids!.includes(uid)),
    melds: [...position.melds, { meld: kong(tile), tiles: used }],
  }
}

export class HeuristicBot implements PlayerController {
  readonly options: Readonly<HeuristicBotOptions>

  constructor(options: HeuristicBotOptions = {}) {
    this.options = options
  }

  chooseCommand(context: ControllerContext, signal: AbortSignal): Promise<GameCommand> {
    signal.throwIfAborted()
    const win = context.legalActions.find(({ type }) => type === 'win')
    if (win) return Promise.resolve(win)

    const position = playerPosition(context)
    const evaluate = evaluator(context)
    const seed = this.options.tieBreakSeed

    if (context.game.phase.type === 'awaiting-discard') {
      const candidates = discardCandidates(context, position, evaluate)
      for (const command of context.legalActions.filter(({ type }) => type === 'kong')) {
        const next = ownKongPosition(command, position)
        if (next) candidates.push({ command, quality: evaluate(next, true), safety: 0 })
      }
      return Promise.resolve(selectCandidate(candidates, seed).command)
    }

    const pass = context.legalActions.find(({ type }) => type === 'pass')
    if (!pass) throw new Error(`Bot ${context.player} has no legal command or pass`)
    const baseline = evaluate(position, true)
    const calls: Candidate[] = []
    for (const command of context.legalActions.filter(({ type }) => type === 'chow' || type === 'pung' || type === 'kong')) {
      const claimed = claimPosition(context, command, position)
      if (!claimed) continue
      const candidate = command.type === 'kong'
        ? { command, quality: evaluate(claimed, true), safety: 0 }
        : selectCandidate(discardCandidates(context, claimed, evaluate), seed)
      // A tenpai call with no legal winning tile cannot satisfy the configured minimum faan.
      if (candidate.quality.shanten === 0 && candidate.quality.legalWinningTiles === 0) continue
      calls.push({ ...candidate, command })
    }
    if (calls.length === 0) return Promise.resolve(pass)
    const best = selectCandidate(calls, seed)
    return Promise.resolve(qualityComparator(best.quality, baseline) > 0 ? best.command : pass)
  }
}

export function createHeuristicBot(options: HeuristicBotOptions = {}): PlayerController {
  return new HeuristicBot(options)
}
