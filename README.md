# Hong Kong Mahjong

A Hong Kong–style mahjong calculator at `/`, with shared rules settings and a
pre-game setup screen at `/game`. Tap tiles to build a hand and the calculator
tells you what it holds, how far it is from winning, and what it scores.

Eventually this will grow into a playable game, so the rules live in a pure
TypeScript layer that knows nothing about React.

## Running the game

```sh
pnpm install
pnpm serve         # http://localhost:3000
```

```
pnpm test          # Vitest
pnpm lint
```

## Architecture

```
src/
  engine/          reusable Mahjong rules — pure TypeScript, no React
    tiles/         tile types, ids, ordering, counts and display names
    hand/          hand types, melds, decomposition, shanten and explanations
    scoring/       faan patterns, rules and the scorer that applies them
    testing/       test-only hand builders (not part of the public engine API)
    index.ts       convenience facade; each responsibility also has its own barrel
  game/            UI-independent match setup; later phases add mechanics
  settings/        persisted rule preferences and React state
  pages/           route-level interfaces
  state/           calculator hand state
  components/      Tile, Table, Hand, HandSummary
```

The board shows the 34 standard tile faces with a badge counting the copies still
available (four of each), plus the eight bonus tiles (one of each). Selected
tiles move into a 14-tile hand; flowers and seasons go to a tray beside it and do
not count toward the fourteen. Tapping a tile in hand puts it back.

Tile artwork is the Hong Kong set from
[samoheen/mahjong-tiles](https://github.com/samoheen/mahjong-tiles) (public
domain), under `src/assets/tiles/`, named by the tile ids from `engine/tiles/tiles.ts`.

### A hand's shape

A hand (`engine/hand/types.ts`) is concealed tiles plus melds already declared on the
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
pattern in `engine/scoring/patterns.ts` is a self-contained predicate, so
extending the rulebook means adding entries to that list. Patterns stack, capped
at the configured limit, except where one `supersedes` a weaker pattern it
implies. Results distinguish a winning tile shape from a legal game win: the
default game requires 3 faan, while the calculator still explains a complete
hand below that minimum.

The Version 1 `hong-kong-default` preset uses a 3-faan minimum and 13-faan
limit. It covers old-style Hong Kong scoring plus the popular limit hands
(混么九, 九蓮寶燈, 十八羅漢, 坎坎和, 綠一色), the seat and round wind (so a
matching wind pung correctly doubles), one faan for each dragon pung, the rest
of the situational faan (last
tile, robbing a kong, the kong replacement tile, 天和/地和), and flowers and
seasons scored against the seat. Every pattern is explicitly core or belongs to
a stable house-rule ID. The Rules menu can independently disable Heavenly Hand,
Earthly Hand, Nine Gates, Four Kongs, Four Concealed Triplets, All Green, All
Flowers, and All Seasons. Preferences are saved locally; an active game setup
retains the rules snapshot with which it started.

Hong Kong old-style tables vary considerably. Version 1 intentionally excludes
the no-flowers bonus and seven pairs rather than silently selecting one of their
conflicting common definitions. Adding either requires a future preset version
or an explicit house rule and saved-data migration. Pattern and house-rule IDs
are persistent API values and must not be renamed without migration.

Wait-shape faan (邊張, 坎張, 單吊) stays out on purpose: it is a
Japanese/Taiwanese idea Hong Kong rules don't score, and scoring it would need
tracking which tile completed the hand, which nothing else here needs.

## Not modelled yet

Turning faan into money — the faan→points table, and who pays whom on a
self-draw versus a discard. Dealer rotation and multi-player game mechanics (the
`/game` route currently captures and displays a rules snapshot only). Game
persistence, bots, and the playable table arrive in later phases.
