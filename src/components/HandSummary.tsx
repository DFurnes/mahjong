import { useMemo, useState } from 'react'
import {
  type HandScore,
  type Meld,
  type PartialSet,
  type StandardTile,
  type Tile as TileModel,
  HAND_SIZE,
  LIMIT_FAAN,
  explainHand,
  meldKey,
  meldName,
  meldTiles,
  scoreHand,
  tileId,
  tileName,
} from '../domain'
import { Tile } from './Tile'
import './HandSummary.css'

export interface HandSummaryProps {
  /** The hand's scoring tiles, in order. Bonus tiles are counted but not scored. */
  tiles: readonly TileModel[]
  bonusCount: number
  onClear: () => void
}

function GroupList({
  groups,
  partial = false,
}: {
  groups: readonly (Meld | PartialSet)[]
  partial?: boolean
}) {
  if (groups.length === 0) return null

  return (
    <ul className="summary__groups">
      {groups.map((group, index) => (
        <li
          className={`summary__group${partial ? ' summary__group--partial' : ''}`}
          key={`${meldKey(group)}-${index}`}
        >
          <span className="summary__group-tiles">
            {meldTiles(group).map((tile, tileIndex) => (
              <Tile key={tileIndex} tile={tile} size="small" />
            ))}
          </span>
          <span className="summary__group-name">{meldName(group)}</span>
        </li>
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
 * and — once there are fourteen tiles — what it scores.
 */
export function HandSummary({ tiles, bonusCount, onClear }: HandSummaryProps) {
  const explanation = useMemo(() => explainHand(tiles), [tiles])
  const isFull = explanation.handSize === HAND_SIZE
  // A score is a snapshot of fourteen particular tiles, so it is kept with the
  // tiles it was taken from and ignored once the hand moves on.
  const [scored, setScored] = useState<{ tiles: readonly TileModel[]; score: HandScore } | null>(
    null,
  )
  const score = scored?.tiles === tiles ? scored.score : null

  return (
    <div className="summary">
      <p className="summary__headline">{explanation.headline}</p>
      <p className="summary__distance">{explanation.distance}</p>

      <GroupList groups={explanation.groups} />
      <GroupList groups={explanation.partials} partial />
      <FloaterList tiles={explanation.floaters} />

      <div className="summary__actions">
        <button
          type="button"
          className="summary__button"
          disabled={!isFull}
          onClick={() => setScored({ tiles, score: scoreHand(tiles) })}
        >
          Score hand
        </button>
        <button
          type="button"
          className="summary__button summary__button--ghost"
          disabled={explanation.handSize === 0 && bonusCount === 0}
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      {score && <ScorePanel score={score} />}
    </div>
  )
}
