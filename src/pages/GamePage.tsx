import type { RuleSet } from '../engine/scoring'
import type { MatchSetup } from '../game'
import './GamePage.css'

export function GamePage({
  rules,
  setup,
  onStart,
  onEnd,
}: {
  rules: Readonly<RuleSet>
  setup: MatchSetup | null
  onStart: () => void
  onEnd: () => void
}) {
  if (setup === null) {
    return (
      <main className="game-page">
        <section className="game-card" aria-labelledby="game-heading">
          <p className="game-card__eyebrow">Local game</p>
          <h2 id="game-heading">Play against three computer players</h2>
          <p>
            The four-player game engine is ready; the interactive table arrives with the UI phase.
            Starting now locks the rules that the match will use.
          </p>
          <dl className="game-card__rules">
            <div><dt>Minimum win</dt><dd>{rules.minimumFaan} faan</dd></div>
            <div><dt>Limit</dt><dd>{rules.limitFaan} faan</dd></div>
            <div><dt>House rules</dt><dd>{Object.values(rules.houseRules).filter(Boolean).length} enabled</dd></div>
          </dl>
          <button type="button" className="game-card__primary" onClick={onStart}>Start game setup</button>
        </section>
      </main>
    )
  }

  return (
    <main className="game-page">
      <section className="game-card" aria-labelledby="game-heading">
        <p className="game-card__eyebrow">Match setup active</p>
        <h2 id="game-heading">Rules locked for this game</h2>
        <p>
          Preference changes will apply to the next game. This setup keeps the snapshot captured
          when it started.
        </p>
        <dl className="game-card__rules" data-testid="snapshot-rules">
          <div><dt>Minimum win</dt><dd>{setup.rules.minimumFaan} faan</dd></div>
          <div><dt>Limit</dt><dd>{setup.rules.limitFaan} faan</dd></div>
          <div><dt>House rules</dt><dd>{Object.values(setup.rules.houseRules).filter(Boolean).length} enabled</dd></div>
        </dl>
        <p className="game-card__pending">Bots and the interactive table arrive in Phases 3 and 4.</p>
        <button type="button" className="game-card__secondary" onClick={onEnd}>End setup</button>
      </section>
    </main>
  )
}
