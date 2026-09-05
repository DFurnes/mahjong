import { isLegalAction, legalActions } from './legalActions'
import { projectGame, type GameProjection } from './projection'
import { reduceGame } from './reducer'
import type { GameCommand, GameState, PlayerId } from './types'

export interface ControllerContext {
  player: PlayerId
  game: GameProjection
  legalActions: readonly GameCommand[]
}

export interface PlayerController {
  chooseCommand(context: ControllerContext, signal: AbortSignal): Promise<GameCommand>
}

export type PlayerControllers = Partial<Record<PlayerId, PlayerController>>

export interface ControllerStepResult {
  state: GameState
  commands: GameCommand[]
  progressed: boolean
}

export interface AutomatedGameOptions {
  signal?: AbortSignal
  maxCommands?: number
  onTransition?: (previous: GameState, command: GameCommand, next: GameState) => void
}

function abortSignal(signal?: AbortSignal): AbortSignal {
  return signal ?? new AbortController().signal
}

async function requestCommand(
  state: GameState,
  player: PlayerId,
  controller: PlayerController,
  signal: AbortSignal,
): Promise<GameCommand> {
  signal.throwIfAborted()
  const actions = legalActions(state, player)
  if (actions.length === 0) throw new Error(`Controller ${player} was requested with no legal actions`)
  const context: ControllerContext = structuredClone({
    player,
    game: projectGame(state, player),
    legalActions: actions,
  })
  const command = await controller.chooseCommand(context, signal)
  signal.throwIfAborted()
  if (!isLegalAction(state, command) || ('player' in command && command.player !== player)) {
    throw new Error(`Controller ${player} returned an illegal ${command.type} command`)
  }
  return command
}

function applyCommand(
  state: GameState,
  command: GameCommand,
  onTransition?: AutomatedGameOptions['onTransition'],
): GameState {
  const result = reduceGame(state, command)
  if (!result.ok) throw new Error(result.error ?? `Failed to apply ${command.type}`)
  onTransition?.(state, command, result.state)
  return result.state
}

/** Advance one turn or one batch of claim responses. Missing controllers leave that player pending. */
export async function runControllerStep(
  state: GameState,
  controllers: PlayerControllers,
  options: Pick<AutomatedGameOptions, 'signal' | 'onTransition'> = {},
): Promise<ControllerStepResult> {
  const signal = abortSignal(options.signal)
  signal.throwIfAborted()

  if (state.phase.type === 'match-ended') return { state, commands: [], progressed: false }
  if (state.phase.type === 'hand-ended') {
    const command = { type: 'next-hand' } as const
    return { state: applyCommand(state, command, options.onTransition), commands: [command], progressed: true }
  }

  if (state.phase.type === 'awaiting-discard') {
    const player = state.phase.player
    const controller = controllers[player]
    if (!controller) return { state, commands: [], progressed: false }
    const command = await requestCommand(state, player, controller, signal)
    return { state: applyCommand(state, command, options.onTransition), commands: [command], progressed: true }
  }

  if (state.phase.type === 'awaiting-claims') {
    const phase = state.phase
    const players = phase.eligible.filter((player) => !phase.responses[player] && controllers[player])
    if (players.length === 0) return { state, commands: [], progressed: false }
    // All controllers see the same pre-response snapshot, so no claimant can react to another's choice.
    const commands = await Promise.all(players.map((player) => requestCommand(state, player, controllers[player]!, signal)))
    let next = state
    for (const command of commands) next = applyCommand(next, command, options.onTransition)
    return { state: next, commands, progressed: true }
  }

  return { state, commands: [], progressed: false }
}

/** Drive a fully controlled game through match completion. */
export async function runAutomatedGame(
  initialState: GameState,
  controllers: PlayerControllers,
  options: AutomatedGameOptions = {},
): Promise<GameState> {
  const limit = options.maxCommands ?? 20_000
  let commands = 0
  let state = initialState
  while (state.phase.type !== 'match-ended') {
    const step = await runControllerStep(state, controllers, options)
    if (!step.progressed) throw new Error(`Automated game stalled in ${state.phase.type}`)
    commands += step.commands.length
    if (commands > limit) throw new Error(`Automated game exceeded the ${limit}-command limit`)
    state = step.state
  }
  return state
}
