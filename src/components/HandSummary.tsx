import { useMemo, useState } from 'react'
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
  HAND_SIZE,
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
  onClear: () => void
}

function GroupRow({
  group,
  partial,
  onExpose,
  onKong,
  remainingFor,
}: {
  group: Meld | PartialSet
  partial: boolean
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
    <li className={`summary__group${partial ? ' summary__group--partial' : ''}`}>
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
  onExpose,
  onKong,
  remainingFor,
}: {
  groups: readonly (Meld | PartialSet)[]
  partial?: boolean
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
      <p className="summary__no-win">
        These fourteen tiles do not make four sets and a pair, so there is nothing to score yet.
      </p>
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
              <span>
                {pattern.name} <span aria-hidden="true">{pattern.chineseName}</span>
              </span>
              <span className="summary__pattern-faan">{pattern.faan}</span>
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
 * concealed reading can be declared here; a set already on the table lives in
 * the Hand component instead.
 */
export function HandSummary({
  hand,
  options,
  remainingFor,
  onDeclare,
  onWinChange,
  onClear,
}: HandSummaryProps) {
  const explanation = useMemo(() => explainHand(hand), [hand])
  const isFull = explanation.handSize === HAND_SIZE
  // A score is a snapshot of a particular hand and a set of scoring options, so
  // it is kept with the inputs it was taken from and ignored once either moves on.
  const [scored, setScored] = useState<{
    hand: Hand
    options: ScoringOptions
    score: HandScore
  } | null>(null)
  const score = scored?.hand === hand && scored.options === options ? scored.score : null

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

      <WinPicker
        win={hand.win ?? null}
        circumstances={hand.circumstances ?? []}
        onChange={onWinChange}
      />

      <div className="summary__actions">
        <button
          type="button"
          className="summary__button"
          disabled={!isFull}
          onClick={() => setScored({ hand, options, score: scoreHand(hand, options) })}
        >
          Score hand
        </button>
        <button
          type="button"
          className="summary__button summary__button--ghost"
          disabled={explanation.handSize === 0 && hand.bonus.length === 0}
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      {score && <ScorePanel score={score} />}
    </div>
  )
}
