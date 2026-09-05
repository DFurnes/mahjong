import { useCallback, useEffect, useMemo, useState } from 'react'
import { explainHand } from './engine/hand'
import type { ScoringOptions } from './engine/scoring'
import { createGame, reduceGame, type GameCommand, type GameState } from './game'
import { AppHeader, type AppRoute } from './components/AppHeader'
import { Hand } from './components/Hand'
import { HandSummary } from './components/HandSummary'
import { RulesDialog } from './components/RulesDialog'
import { Table } from './components/Table'
import { Tray } from './components/Tray'
import { WindPicker } from './components/WindPicker'
import { useMahjongTable } from './state/useMahjongTable'
import { useRules } from './settings/useRules'
import { GamePage } from './pages/GamePage'
import './App.css'

function routeFromPath(): AppRoute {
  return /\/game\/?$/.test(window.location.pathname) ? 'game' : 'calculator'
}

function pathFor(route: AppRoute): string {
  const base = window.location.pathname.replace(/\/game\/?$/, '').replace(/\/$/, '')
  if (route === 'game') return base ? `${base}/game` : '/game'
  return base ? `${base}/` : '/'
}

function CalculatorPage({ rules }: { rules: ScoringOptions['rules'] }) {
  const table = useMahjongTable()
  const [collapsed, setCollapsed] = useState(true)
  const [options, setOptions] = useState<ScoringOptions>({})
  const scoringOptions = useMemo(() => ({ ...options, rules }), [options, rules])

  const { concealed, melds, bonus } = table.hand
  const explanation = useMemo(() => explainHand(table.hand), [table.hand])

  return (
    <div className="app">
      <main className="app__board">
        <div className="app__winds">
          <WindPicker
            label="Your seat"
            ariaLabel="Your seat wind"
            wind={options.seatWind ?? null}
            onChange={(seatWind) =>
              setOptions((prev) => ({ ...prev, seatWind: seatWind ?? undefined }))
            }
          />
          <WindPicker
            label="Round"
            ariaLabel="The round's prevailing wind"
            wind={options.roundWind ?? null}
            onChange={(roundWind) =>
              setOptions((prev) => ({ ...prev, roundWind: roundWind ?? undefined }))
            }
          />
        </div>
        <div className="app__content">
          <section className="app__tiles" aria-labelledby="tiles-heading">
            <h2 className="app__section-heading" id="tiles-heading">
              Tiles
            </h2>
            <Table
              remaining={table.remaining}
              onSelect={table.selectTile}
              handFull={table.isHandFull}
            />
          </section>
          <section className="app__summary" aria-label="Hand sets and score">
            <HandSummary
              hand={table.hand}
              options={scoringOptions}
              remainingFor={table.remainingFor}
              onDeclare={table.declareMeld}
              onWinChange={table.setWin}
            />
          </section>
        </div>
      </main>

      <footer className="app__tray">
        <Tray
          title="Hand"
          status={explanation.brief}
          collapsed={collapsed}
          onToggle={() => setCollapsed((wasCollapsed) => !wasCollapsed)}
          peek={
            <Hand
              compact
              tiles={concealed}
              melds={melds}
              bonus={bonus}
              onReturn={table.returnTile}
              onUndeclare={table.undeclareMeld}
            />
          }
        >
          <Hand
            tiles={concealed}
            melds={melds}
            bonus={bonus}
            onReturn={table.returnTile}
            onUndeclare={table.undeclareMeld}
          />
        </Tray>
      </footer>
    </div>
  )
}

export default function App() {
  const { rules, setHouseRule, restoreDefaults } = useRules()
  const [route, setRoute] = useState(routeFromPath)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [game, setGame] = useState<GameState | null>(null)

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((next: AppRoute) => {
    window.history.pushState(null, '', pathFor(next))
    setRoute(next)
  }, [])
  const closeRules = useCallback(() => setRulesOpen(false), [])
  const startGame = useCallback(() => {
    const values = new Uint32Array(1)
    const seed = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(values)[0]
      : Date.now() >>> 0
    setGame(createGame(rules, { seed }))
  }, [rules])
  const submitGameCommand = useCallback((command: GameCommand) => {
    setGame((current) => {
      if (current === null) return current
      const result = reduceGame(current, command)
      return result.ok ? result.state : current
    })
  }, [])

  return (
    <div className="app-shell">
      <AppHeader route={route} onNavigate={navigate} onOpenRules={() => setRulesOpen(true)} />
      {route === 'calculator' ? (
        <CalculatorPage rules={rules} />
      ) : (
        <GamePage
          rules={rules}
          game={game}
          onStart={startGame}
          onCommand={submitGameCommand}
          onReplaceGame={setGame}
        />
      )}
      <RulesDialog
        open={rulesOpen}
        rules={rules}
        showNextGameNotice={game !== null && game.phase.type !== 'match-ended'}
        onChange={setHouseRule}
        onRestore={restoreDefaults}
        onClose={closeRules}
      />
    </div>
  )
}
