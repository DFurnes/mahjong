import { useCallback, useState } from 'react'
import {
  copyRuleSet,
  DEFAULT_RULE_SET,
  type HouseRuleId,
  type RuleSet,
} from '../engine/scoring'
import { loadRules, saveRules } from './rulesStorage'

export interface RulesController {
  rules: RuleSet
  setHouseRule: (id: HouseRuleId, enabled: boolean) => void
  restoreDefaults: () => void
}

export function useRules(): RulesController {
  const [rules, setRules] = useState(loadRules)

  const setHouseRule = useCallback((id: HouseRuleId, enabled: boolean) => {
    setRules((current) => {
      const next = { ...current, houseRules: { ...current.houseRules, [id]: enabled } }
      saveRules(next)
      return next
    })
  }, [])

  const restoreDefaults = useCallback(() => {
    const next = copyRuleSet(DEFAULT_RULE_SET)
    saveRules(next)
    setRules(next)
  }, [])

  return { rules, setHouseRule, restoreDefaults }
}
