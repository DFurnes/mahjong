import { useMemo } from 'react'
import {
  type Hand,
  type HandScore,
  type Meld,
  type PartialSet,
  type ScoringOptions,
  type Set3,
  type StandardTile,
  type WinCircumstance,
  type WinSource,
  LIMIT_FAAN,
  explainHand,
  kong,
  meldKey,
  meldName,
  meldTiles,
  scoreHand,
  tileId,
  tileName,
  windName,
} from '../domain'
import { Tile } from './Tile'
import { WinPicker } from './WinPicker'
import './HandSummary.css'

export interface HandSummaryProps {
  hand: Hand
  /** The seat and round winds, if chosen. Unlocks the wind-pung and flower faan. */
  options: ScoringOptions
  /** Copies of a tile still free on the table — gates the Kong action below. */
  remainingFor: (tile: StandardTile) => number
  /** Promotes a set the reading found to a meld on the table. */
  onDeclare: (meld: Set3) => void
  onWinChange: (source: WinSource | null, circumstances: readonly WinCircumstance[]) => void
}

function GroupRow({
  group,
  partial,
  declared,
  onExpose,
  onKong,
  remainingFor,
}: {
  group: Meld | PartialSet
  partial: boolean
  declared: boolean
  onExpose?: (meld: Set3) => void
  onKong?: (meld: Set3) => void
  remainingFor?: (tile: StandardTile) => number
}) {
  // Only a complete set (not the pair, not a part-set) can ever be declared.
  const declarable = !partial && group.type !== 'pair'
  const canKong =
    declarable &&
    group.type === 'pung' &&
    onKong !== undefined &&
    remainingFor !== undefined &&
    remainingFor(group.tile) > 0

  return (
    <li
      className={`summary__group${partial ? ' summary__group--partial' : ''}${declared ? ' summary__group--declared' : ''}`}
    >
      <span className="summary__group-tiles">
        {meldTiles(group).map((tile, tileIndex) => (
          <Tile key={tileIndex} tile={tile} size="small" />
        ))}
      </span>
      <span className="summary__group-name">{meldName(group)}</span>
      {declarable && (onExpose || canKong) && (
        <span className="summary__group-actions">
          {onExpose && (
            <button
              type="button"
              className="summary__group-action"
              onClick={() => onExpose(group as Set3)}
            >
              Expose
            </button>
          )}
          {canKong && (
            <button
              type="button"
              className="summary__group-action"
              onClick={() => onKong(group as Set3)}
            >
              Kong
            </button>
          )}
        </span>
      )}
    </li>
  )
}

function GroupList({
  groups,
  partial = false,
  declared = false,
  onExpose,
  onKong,
  remainingFor,
}: {
  groups: readonly (Meld | PartialSet)[]
  partial?: boolean
  declared?: boolean
  onExpose?: (meld: Set3) => void
  onKong?: (meld: Set3) => void
  remainingFor?: (tile: StandardTile) => number
}) {
  if (groups.length === 0) return null

  return (
    <ul className="summary__groups">
      {groups.map((group, index) => (
        <GroupRow
          key={`${meldKey(group)}-${index}`}
          group={group}
          partial={partial}
          declared={declared}
          onExpose={onExpose}
          onKong={onKong}
          remainingFor={remainingFor}
        />
      ))}
    </ul>
  )
}

/** The tiles that fit nowhere in the best reading — spares worth discarding. */
function FloaterList({ tiles }: { tiles: readonly StandardTile[] }) {
  if (tiles.length === 0) return null

  return (
    <ul className="summary__groups">
      {tiles.map((tile, index) => (
        <li className="summary__group summary__group--floater" key={`${tileId(tile)}-${index}`}>
          <span className="summary__group-tiles">
            <Tile tile={tile} size="small" />
          </span>
          <span className="summary__group-name">Spare {tileName(tile)}</span>
        </li>
      ))}
    </ul>
  )
}

function ScorePanel({ score }: { score: HandScore }) {
  if (!score.isWinning) {
    return (
      <div className="summary__score">
        <p className="summary__no-win">
          Your tiles do not make four sets and a pair yet, so there is nothing to score.
        </p>
      </div>
    )
  }

  return (
    <div className="summary__score">
      <p className="summary__faan">
        {score.faan} faan{score.faan === LIMIT_FAAN ? ' (limit)' : ''}
      </p>
      <ul className="summary__patterns">
        {score.patterns.map((pattern) => (
          <li className="summary__pattern" key={pattern.id}>
            <div className="summary__pattern-row">
              <span className="summary__pattern-faan">+{pattern.faan}</span>
              <span>
                {pattern.name} <span aria-hidden="true">{pattern.chineseName}</span>
              </span>
            </div>
            <p className="summary__pattern-description">{pattern.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Reads the hand back to the player: what it holds now, how far it has to go,
 * and — once there are fourteen tiles — what it scores. Only sets in the
 * concealed reading can be declared here; sets already on the table are also
 * included in the reading, but their controls remain in the hand drawer.
 */
export function HandSummary({
  hand,
  options,
  remainingFor,
  onDeclare,
  onWinChange,
}: HandSummaryProps) {
  const explanation = useMemo(() => explainHand(hand), [hand])
  const score = useMemo(() => scoreHand(hand, options), [hand, options])

  const handleExpose = (meld: Set3) => onDeclare({ ...meld, exposed: true })
  // A pung in the reading with a copy still free on the table can go straight
  // to a concealed kong — nothing was claimed, so it stays hidden.
  const handleKongFromReading = (meld: Set3) => {
    if (meld.type === 'pung') onDeclare(kong(meld.tile, false))
  }

  return (
    <div className="summary">
      <p className="summary__headline">{explanation.headline}</p>
      <p className="summary__distance">{explanation.distance}</p>

      <GroupList groups={explanation.declared} declared />
      <GroupList
        groups={explanation.groups}
        onExpose={handleExpose}
        onKong={handleKongFromReading}
        remainingFor={remainingFor}
      />
      <GroupList groups={explanation.partials} partial />
      <FloaterList tiles={explanation.floaters} />

      {(options.seatWind || options.roundWind) && (
        <p className="summary__seat-note">
          Scoring as {options.seatWind ? `${windName(options.seatWind)} seat` : 'no seat chosen'}
          {options.roundWind ? `, ${windName(options.roundWind)} round` : ''}.
        </p>
      )}

      <section className="summary__score-section">
        <h2 className="summary__section-label">Score</h2>
        <WinPicker
          win={hand.win ?? null}
          circumstances={hand.circumstances ?? []}
          onChange={onWinChange}
        />
        <ScorePanel score={score} />
      </section>
    </div>
  )
}
