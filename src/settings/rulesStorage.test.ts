import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyRuleSet, DEFAULT_RULE_SET } from '../engine/scoring'
import { loadRules, RULES_STORAGE_KEY, saveRules } from './rulesStorage'

describe('rules storage', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips preferences', () => {
    const rules = copyRuleSet(DEFAULT_RULE_SET)
    rules.houseRules['nine-gates'] = false
    expect(saveRules(rules)).toBe(true)
    expect(loadRules().houseRules['nine-gates']).toBe(false)
  })

  it('merges partial saved settings onto defaults', () => {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify({
      version: 1,
      preset: 'hong-kong-default',
      houseRules: { 'all-green': false, unknown: false },
    }))
    const rules = loadRules()
    expect(rules.houseRules['all-green']).toBe(false)
    expect(rules.houseRules['nine-gates']).toBe(true)
  })

  it('falls back when JSON or storage reads fail', () => {
    localStorage.setItem(RULES_STORAGE_KEY, '{broken')
    expect(loadRules()).toEqual(copyRuleSet(DEFAULT_RULE_SET))

    const failed = { getItem: vi.fn(() => { throw new Error('blocked') }) } as unknown as Storage
    expect(loadRules(failed)).toEqual(copyRuleSet(DEFAULT_RULE_SET))
  })

  it('leaves callers usable when writes fail', () => {
    const failed = { setItem: vi.fn(() => { throw new Error('quota') }) } as unknown as Storage
    expect(saveRules(DEFAULT_RULE_SET, failed)).toBe(false)
    expect(saveRules(DEFAULT_RULE_SET, null)).toBe(false)
  })
})
