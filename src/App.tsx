import { Hand } from './components/Hand'
import { HandSummary } from './components/HandSummary'
import { Table } from './components/Table'
import { useMahjongTable } from './state/useMahjongTable'
import './App.css'

export default function App() {
  const table = useMahjongTable()

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
        <Hand
          tiles={table.state.hand}
          bonus={table.state.bonus}
          onReturn={table.returnTile}
        />
        <HandSummary
          tiles={table.state.hand}
          bonusCount={table.state.bonus.length}
          onClear={table.clear}
        />
      </footer>
    </div>
  )
}
