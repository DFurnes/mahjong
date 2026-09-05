import { useMemo, useState } from 'react'
import { HAND_SIZE, type ScoringOptions, explainHand } from './domain'
import { Hand } from './components/Hand'
import { HandSummary } from './components/HandSummary'
import { Table } from './components/Table'
import { Tray } from './components/Tray'
import { WindPicker } from './components/WindPicker'
import { useMahjongTable } from './state/useMahjongTable'
import './App.css'

export default function App() {
  const table = useMahjongTable()
  const [collapsed, setCollapsed] = useState(false)
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
        <WindPicker
          label="Your seat"
          ariaLabel="Your seat wind"
          wind={options.seatWind ?? null}
          onChange={(seatWind) => setOptions((prev) => ({ ...prev, seatWind: seatWind ?? undefined }))}
        />
        <WindPicker
          label="Round"
          ariaLabel="The round's prevailing wind"
          wind={options.roundWind ?? null}
          onChange={(roundWind) =>
            setOptions((prev) => ({ ...prev, roundWind: roundWind ?? undefined }))
          }
        />
        <Table
          remaining={table.remaining}
          onSelect={table.selectTile}
          handFull={table.isHandFull}
        />
      </main>

      <footer className="app__tray">
        <Tray
          title="Your hand"
          count={`${explanation.handSize} / ${HAND_SIZE}`}
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
              onKong={table.promoteKong}
            />
          }
        >
          <Hand
            tiles={concealed}
            melds={melds}
            bonus={bonus}
            onReturn={table.returnTile}
            onUndeclare={table.undeclareMeld}
            onKong={table.promoteKong}
          />
          <HandSummary
            hand={table.hand}
            options={options}
            remainingFor={table.remainingFor}
            onDeclare={table.declareMeld}
            onWinChange={table.setWin}
            onClear={table.clear}
          />
        </Tray>
      </footer>
    </div>
  )
}
