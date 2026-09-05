import { useEffect, useMemo, useRef, useState } from 'react'
import type { RuleSet } from '../engine/scoring'
import { compareTiles, tileName, type Wind } from '../engine/tiles'
import {
  HeuristicBot, legalActions, projectGame, runControllerStep,
  type GameCommand, type GameProjection, type GameState, type HandResult,
  type PlayerId, type TileInstance,
} from '../game'
import { Tile } from '../components/Tile'
import './GamePage.css'

const HUMAN: PlayerId = 0
const WINDS: Record<Wind, string> = { east: 'East', south: 'South', west: 'West', north: 'North' }
const ACTIONS = { chow: 'Chow', pung: 'Pung', kong: 'Kong', win: 'Win', pass: 'Pass' } as const

function visibleTile(game: GameProjection, uid?: string): TileInstance | undefined {
  if (!uid) return undefined
  if (game.phase.type === 'awaiting-claims' && game.phase.discard.uid === uid) return game.phase.discard
  for (const player of Object.values(game.players)) {
    const found = [...(player.concealed ?? []), ...player.bonus, ...player.discards,
      ...player.melds.flatMap(({ tiles }) => tiles)].find((tile) => tile.uid === uid)
    if (found) return found
  }
}

function latestAction(game: GameProjection): string {
  const event = game.events.at(-1)
  if (!event) return 'Waiting for the deal'
  const name = event.player === undefined ? undefined : game.players[event.player].name
  const tile = visibleTile(game, event.tileUid)
  const face = tile ? ` ${tileName(tile.tile)}` : ''
  switch (event.type) {
    case 'deal': return `${name} dealt the hand`
    case 'draw': case 'replacement-draw': return `${name} drew${face}`
    case 'discard': return `${name} discarded${face}`
    case 'bonus': return `${name} revealed${face}`
    case 'chow': return `${name} called Chow`
    case 'pung': return `${name} called Pung`
    case 'kong': case 'concealed-kong': case 'promote-kong': return `${name} declared a Kong`
    case 'pass': return `${name} passed`
    case 'win': return `${name} won the hand`
    case 'exhaustive-draw': return 'The wall was exhausted'
    default: return name ? `${name}: ${event.type}` : event.type
  }
}

function StaticTiles({ tiles, small = true }: { tiles: readonly TileInstance[]; small?: boolean }) {
  return <div className="game-tiles">{tiles.map(({ uid, tile }) => <Tile key={uid} tile={tile} size={small ? 'small' : 'medium'} />)}</div>
}

function Seat({ game, player }: { game: GameProjection; player: PlayerId }) {
  const seat = game.players[player]
  const active = game.phase.type === 'awaiting-discard' && game.phase.player === player
  return (
    <section className={`game-seat game-seat--${player}${active ? ' game-seat--active' : ''}`} aria-label={`${seat.name}, ${WINDS[seat.seatWind]} seat`}>
      <header className="game-seat__header">
        <span className="game-seat__name">{seat.name}</span>
        {game.dealer === player && <span className="game-seat__dealer">Dealer</span>}
        <span>{WINDS[seat.seatWind]}</span><strong>{seat.score.toLocaleString()}</strong>
      </header>
      {player !== HUMAN && <div className="game-seat__concealed" aria-label={`${seat.concealedCount} concealed tiles`}><span className="game-seat__tile-back" aria-hidden="true" /><span>{seat.concealedCount} tiles</span></div>}
      {(seat.melds.length > 0 || seat.bonus.length > 0) && <div className="game-seat__open">{seat.melds.map((meld, index) => <StaticTiles key={index} tiles={meld.tiles} />)}<StaticTiles tiles={seat.bonus} /></div>}
    </section>
  )
}

function DiscardPool({ game }: { game: GameProjection }) {
  const discarded = Object.values(game.players).flatMap((player) => player.discards)
  return <section className="game-discards" aria-label="Shared discard pile">
    <span className="game-discards__label">Discards · {discarded.length}</span>
    {discarded.length > 0 ? <StaticTiles tiles={discarded} /> : <span className="game-discards__empty">No discards yet</span>}
  </section>
}

function commandTiles(command: GameCommand, game: GameProjection): TileInstance[] {
  if (!('tileUids' in command) || !command.tileUids) return []
  const result = command.tileUids.flatMap((uid) => { const tile = visibleTile(game, uid); return tile ? [tile] : [] })
  if (game.phase.type === 'awaiting-claims') result.push(game.phase.discard)
  return result.sort((a, b) => compareTiles(a.tile, b.tile))
}

function ChoiceDialog({ type, commands, game, onChoose, onClose }: {
  type: 'chow' | 'kong'; commands: GameCommand[]; game: GameProjection
  onChoose: (command: GameCommand) => void; onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const items = [...dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]
      if (!items.length) return
      const first = items[0]; const last = items.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [onClose])
  return <div className="game-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div ref={dialogRef} className="game-choice" role="dialog" aria-modal="true" aria-labelledby="game-choice-title">
      <header><h2 id="game-choice-title">Choose a {ACTIONS[type]}</h2><button ref={closeRef} type="button" aria-label="Close choice" onClick={onClose}>×</button></header>
      <div className="game-choice__options">{commands.map((command, index) => <button key={index} type="button" onClick={() => onChoose(command)} aria-label={`${ACTIONS[type]} option ${index + 1}`}><StaticTiles tiles={commandTiles(command, game)} small={false} /></button>)}</div>
    </div>
  </div>
}

function History({ game, open = false }: { game: GameProjection; open?: boolean }) {
  return <details className="game-history" open={open}><summary>Hand history ({game.history.length})</summary>
    {game.history.length === 0 ? <p>No completed hands yet.</p> : <ol>{game.history.map((entry, index) => <li key={index}><strong>{WINDS[entry.roundWind]} {entry.handNumber}</strong>{' · '}{entry.result.type === 'win' ? `${entry.result.winners.map((id) => game.players[id].name).join(', ')} won` : 'Exhaustive draw'}</li>)}</ol>}
  </details>
}

function ResultBreakdown({ result, game }: { result: HandResult; game: GameProjection }) {
  if (result.type === 'exhaustive-draw') return <p className="game-result__lead">The wall was exhausted. No payments were made.</p>
  return <>{result.winners.map((winner) => {
    const player = game.players[winner]; const score = result.scores[winner]
    const winningDiscard = result.loser === undefined ? [] : game.players[result.loser].discards.slice(-1)
    return <section className="game-result__winner" key={winner}><h3>{player.name} wins · {score.faan} faan</h3>
      <StaticTiles tiles={[...(player.concealed ?? []), ...winningDiscard]} small={false} />
      {player.melds.map((meld, index) => <StaticTiles key={index} tiles={meld.tiles} />)}
      <ul>{score.patterns.map((pattern) => <li key={pattern.id}><span>{pattern.name} <span lang="zh-Hant">{pattern.chineseName}</span></span><strong>{pattern.faan}</strong></li>)}</ul>
    </section>
  })}<h3>Payments</h3><ul className="game-result__payments">{result.payments.map((payment, index) => <li key={index}>{game.players[payment.from].name} → {game.players[payment.to].name}: <strong>{payment.amount}</strong></li>)}</ul></>
}

function MatchResultView({ game, onNewMatch }: { game: GameProjection; onNewMatch: () => void }) {
  if (game.phase.type !== 'match-ended') return null
  return <main className="game-page game-page--result"><section className="game-result game-result--match" aria-labelledby="match-result-title">
    <p className="game-card__eyebrow">Match complete</p><h2 id="match-result-title">Final standings</h2>
    <ol className="game-standings">{game.phase.result.standings.map((standing, index) => <li key={standing.player}><span><b>{index + 1}</b> {game.players[standing.player].name}</span><strong>{standing.score.toLocaleString()}</strong></li>)}</ol>
    <History game={game} open /><button className="game-action game-action--primary" type="button" onClick={onNewMatch}>New match</button>
  </section></main>
}

export function GamePage({ rules, game: state, onStart, onCommand, onReplaceGame }: {
  rules: Readonly<RuleSet>; game: GameState | null; onStart: () => void
  onCommand: (command: GameCommand) => void; onReplaceGame: (game: GameState) => void
}) {
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const [choice, setChoice] = useState<'chow' | 'kong' | null>(null)
  const botSeed = state?.seed
  const bots = useMemo(() => botSeed === undefined ? {} : ({
    1: new HeuristicBot({ tieBreakSeed: botSeed * 4 + 1 }), 2: new HeuristicBot({ tieBreakSeed: botSeed * 4 + 2 }), 3: new HeuristicBot({ tieBreakSeed: botSeed * 4 + 3 }),
  }), [botSeed])

  useEffect(() => {
    if (!state || state.phase.type === 'hand-ended' || state.phase.type === 'match-ended' || legalActions(state, HUMAN).length > 0) return
    const abort = new AbortController()
    queueMicrotask(() => { if (!abort.signal.aborted) { setThinking(true); setError('') } })
    void (async () => {
      try {
        let next = state
        while (!abort.signal.aborted && next.phase.type !== 'hand-ended' && next.phase.type !== 'match-ended' && legalActions(next, HUMAN).length === 0) {
          const step = await runControllerStep(next, bots, { signal: abort.signal })
          if (!step.progressed) break
          next = step.state
        }
        if (!abort.signal.aborted && next !== state) onReplaceGame(next)
      } catch (reason) { if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : 'The computer players could not continue.') }
      finally { if (!abort.signal.aborted) setThinking(false) }
    })()
    return () => abort.abort()
  }, [bots, onReplaceGame, state])

  if (state === null) return <main className="game-page game-page--welcome"><section className="game-card" aria-labelledby="game-heading">
    <p className="game-card__eyebrow">Local game</p><h2 id="game-heading">Play against three computer players</h2>
    <p>Play a full East and South match. Starting locks the rules for every hand in this match.</p>
    <dl className="game-card__rules"><div><dt>Minimum win</dt><dd>{rules.minimumFaan} faan</dd></div><div><dt>Limit</dt><dd>{rules.limitFaan} faan</dd></div><div><dt>Starting score</dt><dd>{rules.game.startingScore.toLocaleString()}</dd></div></dl>
    <button type="button" className="game-action game-action--primary" onClick={onStart}>Start match</button>
  </section></main>

  const game = projectGame(state, HUMAN)
  if (game.phase.type === 'match-ended') return <MatchResultView game={game} onNewMatch={onStart} />
  const actions = legalActions(state, HUMAN)
  const discardUids = new Set(actions.flatMap((action) => action.type === 'discard' ? [action.tileUid] : []))
  const groups = new Map<string, GameCommand[]>()
  for (const action of actions) {
    if (action.type === 'discard' || action.type === 'next-hand') continue
    groups.set(action.type, [...(groups.get(action.type) ?? []), action])
  }
  const human = game.players[HUMAN]
  const latestDraw = game.events.findLast((event) => (event.type === 'draw' || event.type === 'replacement-draw') && event.player === HUMAN)?.tileUid
  const drawnUid = game.phase.type === 'awaiting-discard' && game.phase.player === HUMAN ? latestDraw ?? (game.events.length === 1 ? human.concealed?.at(-1)?.uid : undefined) : undefined
  const held = [...(human.concealed ?? [])].sort((a, b) => compareTiles(a.tile, b.tile))
  const drawn = held.find(({ uid }) => uid === drawnUid); const mainHand = held.filter(({ uid }) => uid !== drawnUid)
  const result = game.phase.type === 'hand-ended' ? game.phase.result : null
  const grouped = (type: keyof typeof ACTIONS) => groups.get(type) ?? []
  const chooseAction = (type: keyof typeof ACTIONS) => {
    const commands = grouped(type)
    if ((type === 'chow' || type === 'kong') && commands.length > 1) setChoice(type)
    else if (commands[0]) onCommand(commands[0])
  }

  return <main className="game-page game-page--table">
    <section className="game-status" aria-label="Match status" data-testid="snapshot-rules"><span><b>{WINDS[game.roundWind]} round</b> · Hand {game.handNumber}</span><span>Wall: <b>{game.liveWallCount}</b> · Replacements: <b>{game.replacementWallCount}</b></span><span>Turn: <b>{game.players[game.turn].name}</b></span><span>Rules: <b>{Object.values(game.rules.houseRules).filter(Boolean).length} house rules</b></span></section>
    <div className="game-board"><Seat game={game} player={2} /><Seat game={game} player={3} />
      <div className="game-board__center"><DiscardPool game={game} /></div><Seat game={game} player={1} />
      <div className="game-board__action"><span aria-live="polite">{thinking ? 'Computer players are thinking…' : latestAction(game)}</span><div className="game-board__claims" role="group" aria-label="Available calls">{(['chow', 'pung', 'kong', 'win'] as const).filter((type) => grouped(type).length).map((type) => <button key={type} type="button" className={`game-action${type === 'win' ? ' game-action--primary' : ''}`} disabled={thinking} onClick={() => chooseAction(type)}>{ACTIONS[type]}</button>)}</div></div>
      <section className="game-human" aria-labelledby="your-hand-title"><div className="game-human__heading"><h2 id="your-hand-title">Your hand</h2><span>{WINDS[human.seatWind]} · {human.score.toLocaleString()}</span></div>
        {(human.melds.length > 0 || human.bonus.length > 0) && <div className="game-human__open">{human.melds.map((meld, index) => <StaticTiles key={index} tiles={meld.tiles} />)}<StaticTiles tiles={human.bonus} /></div>}
        <div className="game-human__hand" role="group" aria-label="Your concealed hand"><div className="game-tiles">{mainHand.map(({ uid, tile }) => <Tile key={uid} tile={tile} size="large" disabled={thinking || !discardUids.has(uid)} onSelect={discardUids.has(uid) ? () => onCommand({ type: 'discard', player: HUMAN, tileUid: uid }) : undefined} />)}</div>
          {drawn && <div className="game-human__drawn"><span>Drawn</span><Tile tile={drawn.tile} size="large" disabled={thinking || !discardUids.has(drawn.uid)} onSelect={discardUids.has(drawn.uid) ? () => onCommand({ type: 'discard', player: HUMAN, tileUid: drawn.uid }) : undefined} /></div>}
        </div>
        <div className="game-controls" role="group" aria-label="Hand controls">{grouped('pass').length > 0 && <button type="button" className="game-action" disabled={thinking} onClick={() => chooseAction('pass')}>{ACTIONS.pass}</button>}
          {!thinking && actions.some((action) => action.type === 'discard') && <span className="game-controls__hint">Choose a tile to discard</span>}
        </div>
      </section>
    </div>
    <p className="game-error" role="alert">{error}</p><History game={game} />
    {result && <div className="game-modal"><section className="game-result" role="dialog" aria-modal="true" aria-labelledby="hand-result-title"><p className="game-card__eyebrow">Hand complete</p><h2 id="hand-result-title">{result.type === 'win' ? 'Winning hand' : 'Exhaustive draw'}</h2><ResultBreakdown result={result} game={game} /><button type="button" autoFocus className="game-action game-action--primary" onClick={() => onCommand({ type: 'next-hand' })}>Next hand</button></section></div>}
    {choice && <ChoiceDialog type={choice} commands={grouped(choice)} game={game} onChoose={(command) => { setChoice(null); onCommand(command) }} onClose={() => setChoice(null)} />}
  </main>
}
