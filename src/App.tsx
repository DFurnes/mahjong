import { useMemo, useState } from 'react'
import { HAND_SIZE, explainHand } from './domain'
import { Hand } from './components/Hand'
import { HandSummary } from './components/HandSummary'
import { Table } from './components/Table'
import { Tray } from './components/Tray'
import { useMahjongTable } from './state/useMahjongTable'
import './App.css'

export default function App() {
  const table = useMahjongTable()
  const [collapsed, setCollapsed] = useState(false)

  const { hand, bonus } = table.state
  const explanation = useMemo(() => explainHand(hand), [hand])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Hong Kong Mahjong</h1>
        <p className="app__subtitle">
          Tap tiles to build a hand. Tap a tile in your hand to put it back.
        </p>
      </header>

      <main className="app__board">
        <Table
          remaining={table.remaining}
          onSelect={table.selectTile}
          handFull={table.isHandFull}
        />
      </main>

      <footer className="app__tray">
        <Tray
          title="Your hand"
          count={`${hand.length} / ${HAND_SIZE}`}
          status={explanation.brief}
          collapsed={collapsed}
          onToggle={() => setCollapsed((wasCollapsed) => !wasCollapsed)}
          peek={<Hand compact tiles={hand} bonus={bonus} onReturn={table.returnTile} />}
        >
          <Hand tiles={hand} bonus={bonus} onReturn={table.returnTile} />
          <HandSummary tiles={hand} bonusCount={bonus.length} onClear={table.clear} />
        </Tray>
      </footer>
    </div>
  )
}
