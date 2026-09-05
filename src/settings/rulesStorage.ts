import { copyRuleSet, resolveRuleSet, type RuleSet } from '../engine/scoring'

export const RULES_STORAGE_KEY = 'mahjong.rules.v1'

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadRules(storage: Storage | null = browserStorage()): RuleSet {
  if (storage === null) return resolveRuleSet(null)
  try {
    const saved = storage.getItem(RULES_STORAGE_KEY)
    return saved === null ? resolveRuleSet(null) : resolveRuleSet(JSON.parse(saved))
  } catch {
    return resolveRuleSet(null)
  }
}

export function saveRules(rules: Readonly<RuleSet>, storage: Storage | null = browserStorage()): boolean {
  if (storage === null) return false
  try {
    storage.setItem(RULES_STORAGE_KEY, JSON.stringify(copyRuleSet(rules)))
    return true
  } catch {
    return false
  }
}
