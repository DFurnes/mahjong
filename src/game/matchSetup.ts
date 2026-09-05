import { copyRuleSet, type RuleSet } from '../engine/scoring'

/** Minimal Phase 1 setup state; Phase 2 will place this snapshot in GameState. */
export interface MatchSetup {
  rules: RuleSet
}

export function createMatchSetup(rules: Readonly<RuleSet>): MatchSetup {
  return { rules: copyRuleSet(rules) }
}
