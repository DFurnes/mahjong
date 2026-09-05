# Full Mahjong Game Specification

## Summary

Add a complete Hong Kong Mahjong game at `/game` while keeping the existing hand
tracker and score calculator at `/`. The first playable version is a local human
player against three computer players. Reusable Mahjong primitives live in
`src/engine`, while deterministic, UI-independent play mechanics live in
`src/game` so they can later support replays and server-authoritative online
play.

Before game development begins, reorganize the current `domain` code as a public
`engine` API. Then define the default rule set and add a shared Rules settings
menu. House rules can be enabled individually and the selection is saved in
`localStorage`.

## Goals

- Preserve the existing calculator at `/`.
- Add a playable four-seat game at `/game`.
- Use one rules and scoring implementation in both pages.
- Make every game transition deterministic and independently testable.
- Support local play against three bots in the first release.
- Persist rule preferences and an in-progress local game.
- Keep the design suitable for a future server-authoritative multiplayer mode.

## Non-goals for the first playable release

- Network multiplayer, matchmaking, accounts, or chat.
- Gambling or real-money functionality.
- Multiple Mahjong variants beyond the configured Hong Kong rules.
- A general-purpose AI or machine-learning bot.

## Product routes

| Route | Purpose |
| --- | --- |
| `/` | Existing hand tracker and score calculator |
| `/game` | Four-seat game against three bots |

A lightweight pathname router is sufficient for these two routes. Adopt a
client-side routing dependency only when additional navigable pages make it
useful. Both pages must offer navigation to the other page and access to the
same Rules settings menu.

## Phase 0: reorganize `domain` as `engine`

Rename `src/domain/` to `src/engine/` and group its public API by responsibility.
This phase is a behavior-preserving refactor: existing tests and visible scoring
results must remain unchanged.

Target layout:

```text
src/engine/
  index.ts                 stable public exports
  tiles/
    index.ts
    tiles.ts               tile types, constructors, ids, counts, ordering
    display.ts             human-readable tile names and glyphs
  hand/
    index.ts
    types.ts               Hand, win source/circumstances, hand-size helpers
    melds.ts               chows, pungs, kongs, pairs, partial sets
    decompose.ts            complete and partial hand decomposition
    shanten.ts             distance and shanten calculations
    explain.ts             human-readable hand analysis
  scoring/
    index.ts
    score.ts               scoreHand and score result types
    patterns.ts            faan pattern definitions
    rules.ts               rule definitions, defaults, and validation
    settlement.ts          added when payments are implemented
  testing/
    testHands.ts           test-only hand builders and fixtures
```

Tests may remain beside the module they exercise. `testing/` must not be exported
from the main `engine` barrel.

Application code should import from the narrowest useful public barrel, for
example `engine/hand` or `engine/scoring`. `engine/index.ts` may provide a
convenience facade, but code outside the engine must not import private module
files. The engine must not import React, browser APIs, storage, or components.

### Boundary between `engine` and `game`

`src/engine` describes Mahjong concepts without knowing that a match is being
played. It owns tiles, melds, hand shapes, decomposition, shanten, scoring
patterns, and rules. Its APIs answer questions such as “is this a winning hand?”
and “how many faan is it worth?”

`src/game` describes the mechanics of playing. It owns the wall, seats, deal,
turns, draws, discards, claims, legal actions, settlements, round progression,
bots, and viewer-safe projections. It composes `src/engine`; `src/engine` must
never import `src/game`.

React pages and components sit outside both modules. They render game state and
submit commands but do not implement rules or mutate game state directly.

Phase 0 acceptance criteria:

- No `src/domain` directory or `domain` imports remain.
- The calculator behaves as it did before the move.
- Type checking, linting, and all existing tests pass.
- The README architecture and source references use `engine` terminology.
- Public barrels make module ownership clear and do not create import cycles.

## Phase 1: default rules and Rules settings

### Rule model

Rules are data, separate from player preferences and game state. Introduce a
versioned, serializable `RuleSet` in `engine/scoring/rules.ts`.

```ts
interface RuleSet {
  version: 1
  preset: 'hong-kong-default'
  minimumFaan: number
  limitFaan: number
  houseRules: Record<HouseRuleId, boolean>
}
```

Every scoring pattern must have an explicit stability category:

- `core`: always enabled by this ruleset and not user-toggleable.
- `house`: associated with a stable `HouseRuleId` and independently toggleable.

Do not derive persistent rule identity from display text. IDs are part of the
saved-data contract and must not be renamed without a migration.

`scoreHand` must accept the resolved rules and filter disabled house patterns
before applying supersession and calculating the total. It must continue to
report whether the tile shape is a win separately from whether the hand meets
the minimum faan required to declare a legal win. The calculator may display a
structurally winning hand below the minimum; the game must reject its Win action.

Suggested result distinction:

```ts
interface HandScore {
  isWinningShape: boolean
  isLegalWin: boolean
  faan: number
  patterns: MatchedPattern[]
  hand: WinningHand | null
  minimumFaan: number
}
```

### Default Hong Kong preset

The default preset is versioned and immutable once released. Version 1 uses:

- Minimum win: 3 faan in game mode.
- Limit: 13 faan.
- Core rules always enabled.
- Existing patterns currently marked `house` enabled by default, preserving the
  calculator's current scoring behavior while making each one switchable.
- The calculator may score and explain a zero-faan chicken hand, but it must
  identify it as below the default game's minimum.

Before freezing Version 1, audit the pattern catalogue against the chosen Hong
Kong rules reference. At minimum, verify ordinary dragon pungs, flower/season
scoring, special hands, supersession, and whether seven pairs is supported. Each
intentional exclusion must be documented in `rules.ts` and the README.

The initial house-rule IDs correspond to the patterns currently tagged as
`house`:

- `heavenly-hand`
- `earthly-hand`
- `nine-gates`
- `four-kongs`
- `four-concealed-pungs`
- `all-green`
- `all-flowers`
- `all-seasons`

The scoring audit may reclassify these before the preset is frozen. A rule that
controls several patterns should have one semantic ID and list all patterns it
enables rather than exposing accidental implementation details.

### Rules settings menu

Add a Rules button to the shared page header. It opens an accessible modal or
drawer containing:

- The active preset name.
- The fixed minimum faan and limit for the preset.
- One switch per house rule, with English name, Chinese name, faan value, and a
  short explanation.
- A “Restore defaults” action.
- A clear indication that changes affect new and current calculator results.

In an active game, rules are snapshotted when the match starts. Changing global
preferences must not mutate or invalidate that match. The settings UI should say
that changes apply to the next game while a game is in progress.

### Persistence

Browser storage belongs in the application layer, not the engine. Use a small
adapter such as:

```text
src/settings/
  rulesStorage.ts
  useRules.ts
```

Persist under a namespaced key such as `mahjong.rules.v1`. Loading must validate
and merge saved values onto current defaults so newly introduced rules receive
their intended defaults. Unknown IDs are ignored. Malformed or unavailable
storage falls back safely to defaults without preventing the app from loading.
Storage failures should leave the in-memory selection usable.

Phase 1 acceptance criteria:

- Both routes consume the same resolved `RuleSet` API.
- Every house pattern is controlled by a rule and core patterns cannot be
  disabled.
- Settings survive a reload.
- Restore defaults updates both UI and storage.
- Invalid, partial, and older saved settings fall back or migrate safely.
- Changing a toggle immediately recalculates the calculator score.
- An active game retains the rule snapshot with which it began.
- Unit and component tests cover filtering, defaults, persistence, restoration,
  and storage failure.

## Phase 2: four-player game mechanics

Add `src/game/` as the authoritative model of a match:

```text
src/game/
  index.ts
  types.ts                GameState, PlayerState, phases, commands, results
  wall.ts                 build, seeded shuffle, deal, replacement draws
  reducer.ts              authoritative state transitions
  legalActions.ts         commands currently available to each player
  claims.ts               chow/pung/kong/win eligibility and priority
  settlement.ts           faan-to-points and four-player balance changes
  match.ts                dealer and round progression
  projection.ts           viewer-safe state for future multiplayer
```

Use physical tile instances such as `{ uid, tile }`; identical tile faces must
remain distinguishable in the wall and event log. State includes all four
players, the live and replacement walls, discards, declared melds, bonus tiles,
dealer, round, turn, pending claims, scores, rules snapshot, and hand history.

Model the turn lifecycle as explicit phases so illegal UI states are not
representable:

```ts
type Phase =
  | { type: 'dealing' }
  | { type: 'awaiting-discard'; player: PlayerId }
  | { type: 'awaiting-claims'; discard: TileInstance; eligible: PlayerId[] }
  | { type: 'awaiting-kong-replacement'; player: PlayerId }
  | { type: 'hand-ended'; result: HandResult }
  | { type: 'match-ended'; result: MatchResult }
```

The game module validates commands including discard, chow, pung, kong, win,
and pass. It must implement flower replacement, all supported kong types,
robbing a kong, claim priority, exhaustive draws, settlement, and dealer/round
rotation. Situational scoring circumstances are derived from game history
rather than selected by the player.

`src/game` may depend on public `src/engine` APIs, but it remains independent of
React and browser storage. This lets tests, bot simulations, replays, and a
future server run the same mechanics. Game-specific UI should live under a
separate path such as `src/pages/game/` or `src/components/game/`.

Before Phase 2 settlement is complete, the default faan-to-points schedule,
self-draw/discard payments, dealer continuation, multiple-win policy, exhaustive
draw behavior, and match length must be written into the preset and covered by
examples.

## Phase 3: bots

Provide a `PlayerController` interface shared by human input, bots, replays, and
future network clients. Initial bots are deterministic heuristics with optional
seeded tie-breaking.

- Prefer discards that minimize shanten and maximize useful remaining tiles.
- Consider likely hand value and exposed information for ties.
- Evaluate calls against passing and the minimum-faan requirement.
- Never receive hidden opponent tiles or wall order through their public input.
- Always produce a legal command or an explicit pass.

Run large seeded simulations to detect deadlocks, illegal tile counts, and
non-terminating hands.

## Phase 4: `/game` interface

The game page presents:

- Four seats with names, winds, scores, melds, flowers, discards, and dealer.
- Hidden opponent hands represented only by tile counts.
- The human hand along the bottom, with the drawn tile separated.
- Wall count, prevailing wind, hand number, current turn, and latest action.
- Contextual Chow, Pung, Kong, Win, and Pass controls.
- A choice dialog when several chows or kongs are possible.
- A hand-result view with winner, tiles, pattern breakdown, payments, and next
  hand action.
- A match result and hand history view.

Reuse tile artwork and low-level tile/hand components where their APIs fit, but
do not reuse the calculator's tile picker as the game table. Controls must work
with touch, keyboard, focus navigation, reduced motion, and narrow screens.

## Phase 5: persistence and replay

- Save a versioned local game snapshot and rules snapshot.
- Restore an interrupted match.
- Maintain an append-only command/event log with the initial seed.
- Support deterministic replay for debugging and future spectators.
- Confirm before abandoning or replacing an in-progress match.
- Migrate compatible snapshots and reject incompatible ones with a recoverable
  message rather than crashing.

## Future online multiplayer

Online play requires a server-authoritative room service, WebSocket command and
event transport, authentication or reconnect tokens, timers, disconnect/rejoin
handling, and durable match storage. The server must send a viewer-specific
projection; concealed hands and wall order must never be delivered to other
clients. Client-authoritative or peer-to-peer state is not acceptable because it
reveals hidden information.

## Game invariants and testing

The central invariant is that every physical tile exists in exactly one valid
location at all times. Tests must also cover:

- Deterministic deals and games from a fixed seed.
- Legal turn order and correct hand sizes.
- Chained flower and kong replacement draws.
- Every claim-priority combination and the configured multiple-win policy.
- Concealed, exposed, and promoted kongs, including robbing a kong.
- Last-tile, after-kong, first-turn, and self-drawn circumstances.
- Minimum-faan validation and settlement balance totals.
- Dealer and round progression.
- Viewer projections that reveal no concealed information.
- A browser-level complete hand and complete match.

## Delivery sequence

1. Phase 0: reorganize the engine without behavior changes.
2. Phase 1: audit and freeze default rules; add persisted Rules settings.
3. Phase 2: implement and test the four-player game mechanics.
4. Phase 3: add deterministic bots and simulation tests.
5. Phase 4: build the `/game` interface.
6. Phase 5: add local persistence and replay.
7. Design online multiplayer only after the local game mechanics and projection
   model are stable.

## Definition of done for the first playable release

A player can open `/game`, start a match using a snapshotted rule set, play legal
hands against three bots through match completion, inspect scoring and payments,
reload and resume, and start a new match. The calculator remains available at
`/`, reflects the user's saved house-rule preferences, and produces scores from
the same scoring primitives used by the game.
