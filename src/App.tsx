import { useMemo, useState } from 'react'
import { explainHand } from './engine/hand'
import type { ScoringOptions } from './engine/scoring'
import { Hand } from './components/Hand'
import { HandSummary } from './components/HandSummary'
import { Table } from './components/Table'
import { Tray } from './components/Tray'
import { WindPicker } from './components/WindPicker'
import { useMahjongTable } from './state/useMahjongTable'
import './App.css'

export default function App() {
  const table = useMahjongTable()
  const [collapsed, setCollapsed] = useState(true)
  const [options, setOptions] = useState<ScoringOptions>({})

  const { concealed, melds, bonus } = table.hand
  const explanation = useMemo(() => explainHand(table.hand), [table.hand])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Hong Kong Mahjong</h1>
        <p className="app__subtitle">
          Pick your seat, then tap tiles to build a hand. Tap a tile in your hand to put it back.
        </p>
      </header>

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
              options={options}
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
