import type { GameState, PlayerId, TileInstance } from './types'

export interface PlayerProjection { id: PlayerId; name: string; seatWind: string; score: number; concealed: TileInstance[] | null; concealedCount: number; melds: GameState['players'][PlayerId]['melds']; bonus: TileInstance[]; discards: TileInstance[] }
export interface GameProjection extends Omit<GameState, 'players' | 'liveWall' | 'replacementWall' | 'seed' | 'events'> {
  players: Record<PlayerId, PlayerProjection>
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
  const { liveWall, replacementWall, seed: _seed, events, ...publicState } = state
  const safeEvents = events.map((entry) =>
    (entry.type === 'draw' || entry.type === 'replacement-draw') && entry.player !== viewer
      ? { ...entry, tileUid: undefined }
      : entry,
  )
  return { ...publicState, events: safeEvents, players, liveWallCount: liveWall.length, replacementWallCount: replacementWall.length }
}
