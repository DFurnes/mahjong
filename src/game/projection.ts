import type { GameState, Phase, PlayerId, TileInstance } from './types'

export interface PlayerProjection { id: PlayerId; name: string; seatWind: GameState['players'][PlayerId]['seatWind']; score: number; concealed: TileInstance[] | null; concealedCount: number; melds: GameState['players'][PlayerId]['melds']; bonus: TileInstance[]; discards: TileInstance[] }
type ClaimsPhase = Extract<Phase, { type: 'awaiting-claims' }>
export type ProjectedPhase = Exclude<Phase, ClaimsPhase> | Omit<ClaimsPhase, 'responses'> & { responded: PlayerId[] }

export interface GameProjection extends Omit<GameState, 'players' | 'liveWall' | 'replacementWall' | 'seed' | 'events' | 'phase'> {
  players: Record<PlayerId, PlayerProjection>
  phase: ProjectedPhase
  liveWallCount: number
  replacementWallCount: number
  events: GameState['events']
}

export function projectGame(state: GameState, viewer: PlayerId): GameProjection {
  const players = {} as Record<PlayerId, PlayerProjection>
  for (const id of [0, 1, 2, 3] as PlayerId[]) {
    const player = state.players[id]
    players[id] = { ...player, concealed: id === viewer ? player.concealed : null, concealedCount: player.concealed.length }
  }
  const { liveWall, replacementWall, seed: _seed, events, phase, ...publicState } = state
  let publicPhase: ProjectedPhase
  if (phase.type === 'awaiting-claims') {
    const { responses, ...claimPhase } = phase
    publicPhase = { ...claimPhase, responded: Object.keys(responses).map(Number) as PlayerId[] }
  } else publicPhase = phase
  const safeEvents = events.map((entry) =>
    (entry.type === 'draw' || entry.type === 'replacement-draw') && entry.player !== viewer
      ? { ...entry, tileUid: undefined }
      : entry,
  )
  return { ...publicState, phase: publicPhase, events: safeEvents, players, liveWallCount: liveWall.length, replacementWallCount: replacementWall.length }
}
