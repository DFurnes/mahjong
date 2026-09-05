# Hong Kong Mahjong

A tile board for Hong Kong–style mahjong: tap tiles to build a hand, and the app
tells you what the hand holds, how far it is from winning, and what it scores.

Eventually this will grow into a playable game, so the rules live in a pure
TypeScript layer that knows nothing about React.

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest
npm run build      # typecheck + production build
npm run lint
```

## Continuous integration and deployment

`.github/workflows/ci.yml` lints, tests and builds on every push and pull
request. On `main` it then builds again and publishes to GitHub Pages.

Assets are built with a relative base (`base: './'` in `vite.config.ts`), so the
same build works from a project page at `/mahjong/` and from a domain root.

The Pages deploy needs **Settings → Pages → Source** set to **GitHub Actions**
once, on the repository.

## How it is put together

```
src/
  domain/          game rules — pure TypeScript, no React
    tiles.ts       the 42 tile faces, their ids, ordering and counting
    melds.ts       pungs, chows, kongs, pairs and two-tile part-sets
    decompose.ts   the search that reads a pile of tiles as sets
    shanten.ts     how far a hand is from winning
    scoring/       faan patterns and the scorer that applies them
    explain.ts     decompositions turned into a sentence
    display.ts     English names for tiles and melds
  state/           useMahjongTable — the one piece of mutable state
  components/      Tile, Table, Hand, HandSummary
```

The board shows the 34 standard tile faces with a badge counting the copies still
available (four of each), plus the eight bonus tiles (one of each). Selected
tiles move into a 14-tile hand; flowers and seasons go to a tray beside it and do
not count toward the fourteen. Tapping a tile in hand puts it back.

### Decomposition

`decompose` reads a hand as sets, a pair, part-sets and loose tiles. A hand can
often be read more than one way — `1112223 33` is three pungs or three chows —
and the readings can be worth different amounts, so `completeDecompositions`
returns every winning reading and `scoreHand` takes the best-scoring one.

### Distance to a win

`tilesAway` is 14 minus the most tiles of the current hand that can survive into
a finished hand, so 0 means the hand has won and the number always makes sense
while a hand is only part-built. `shanten` is the conventional number, one lower.

### Scoring

`scoreHand` needs fourteen tiles that form four sets and a pair. Each faan
pattern in `domain/scoring/patterns.ts` is a self-contained predicate, so
extending the rulebook means adding entries to that list. Patterns stack, capped
at the 13-faan limit, except where one `supersedes` a weaker pattern it implies.

## Not modelled yet

Exposed melds, kongs, and the distinction between the winning tile and the rest
of the hand; situational faan (self-draw, last tile, seat and prevailing wind);
and faan for flowers and seasons, which needs a seat wind to decide which ones
count. The seams for all of these are already in the model — `Meld['kong']`, the
`WinningHand` union and `ScoringContext`.
