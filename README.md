# Hong Kong Mahjong

A tile board for Hong Kong–style mahjong: tap tiles to build a hand, and the app
tells you what the hand holds, how far it is from winning, and what it scores.

Eventually this will grow into a playable game, so the rules live in a pure
TypeScript layer that knows nothing about React.

## Running it

```sh
npm install
npm run serve      # http://localhost:3000
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
    hand.ts        a hand's shape — concealed tiles, declared melds, how it was won
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

Tile artwork is the Hong Kong set from
[samoheen/mahjong-tiles](https://github.com/samoheen/mahjong-tiles) (public
domain), under `src/assets/tiles/`, named by the tile ids from `tiles.ts`.

### A hand's shape

A hand (`domain/hand.ts`) is concealed tiles plus melds already declared on the
table — exposed pungs and chows, and kongs either claimed or declared
face-down. A kong fills one of the hand's four set slots but carries a spare
fourth tile, so a hand is always fourteen *slot-tiles* —
`concealed.length + melds.length * 3` — no matter how many kongs it holds, and
every "fourteen tiles" check in the rest of the model reads that instead of a
raw tile count. `decompose` and `completeDecompositions` take the declared
melds alongside the concealed tiles and carry them onto every reading; a kong
still just counts as a triplet for `對對和`, and it scores no faan of its own
in Hong Kong rules.

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

`scoreHand` needs a full hand — concealed tiles and declared melds together
worth fourteen slot-tiles — that reads as four sets and a pair. Each faan
pattern in `domain/scoring/patterns.ts` is a self-contained predicate, so
extending the rulebook means adding entries to that list. Patterns stack, capped
at the 13-faan limit, except where one `supersedes` a weaker pattern it implies.

## Not modelled yet

Which particular tile completed the hand, as opposed to how it arrived —
Hong Kong scoring only cares about self-draw versus a claimed discard (both
modelled, as `Hand['win']`), and the tile-level distinction only matters for
wait-shape faan (邊張, 坎張, 單吊), which is a Japanese/Taiwanese idea Hong Kong
rules don't score. Also missing: the rest of situational faan (last tile,
robbing a kong, the replacement tile drawn after a kong); the round/prevailing
wind (圈風) — only the seat wind (門風) is modelled so far, so a "double wind"
pung only scores once; and faan for flowers and seasons, which needs bonus
tiles threaded into `ScoringContext` (they are currently set aside entirely).
The seams for all of these are already in the model — `ScoringContext` and the
`WinningHand` union.
