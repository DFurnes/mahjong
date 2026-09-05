import './AppHeader.css'

export type AppRoute = 'calculator' | 'game'

export function AppHeader({
  route,
  onNavigate,
  onOpenRules,
}: {
  route: AppRoute
  onNavigate: (route: AppRoute) => void
  onOpenRules: () => void
}) {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-header__title">Hong Kong Mahjong</h1>
        <p className="app-header__subtitle">
          {route === 'calculator'
            ? 'Build a hand and see how it scores.'
            : 'Play a local game against three computer players.'}
        </p>
      </div>
      <nav className="app-header__actions" aria-label="Main navigation">
        <button
          type="button"
          aria-current={route === 'calculator' ? 'page' : undefined}
          onClick={() => onNavigate('calculator')}
        >
          Calculator
        </button>
        <button type="button" className="app-header__rules" onClick={onOpenRules}>
          Rules
        </button>
      </nav>
    </header>
  )
}
