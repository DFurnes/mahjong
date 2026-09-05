import { describe, expect, it } from 'vitest'
import { FAAN_PATTERNS } from './patterns'
import {
  DEFAULT_RULE_SET,
  HOUSE_RULE_DEFINITIONS,
  HOUSE_RULE_IDS,
  copyRuleSet,
  resolveRuleSet,
} from './rules'

describe('the Version 1 rule set', () => {
  it('has fixed preset values and enables every house rule by default', () => {
    expect(DEFAULT_RULE_SET).toMatchObject({
      version: 1,
      preset: 'hong-kong-default',
      minimumFaan: 3,
      limitFaan: 13,
    })
    expect(HOUSE_RULE_IDS.every((id) => DEFAULT_RULE_SET.houseRules[id])).toBe(true)
    for (const definition of HOUSE_RULE_DEFINITIONS) {
      expect(FAAN_PATTERNS.find(({ id }) => id === definition.id)).toMatchObject({
        name: definition.name,
        chineseName: definition.chineseName,
        faan: definition.faan,
        stability: { type: 'house', rule: definition.id },
      })
    }
  })

  it('merges known booleans while ignoring unknown and fixed saved fields', () => {
    expect(resolveRuleSet({
      version: 1,
      preset: 'hong-kong-default',
      minimumFaan: 99,
      limitFaan: 1,
      houseRules: { 'nine-gates': false, invented: false, 'four-kongs': 'no' },
    })).toMatchObject({
      minimumFaan: 3,
      limitFaan: 13,
      houseRules: { 'nine-gates': false, 'four-kongs': true },
    })
  })

  it('falls back for malformed and unsupported versions', () => {
    expect(resolveRuleSet(null)).toEqual(copyRuleSet(DEFAULT_RULE_SET))
    expect(resolveRuleSet({ version: 0, houseRules: { 'nine-gates': false } })).toEqual(
      copyRuleSet(DEFAULT_RULE_SET),
    )
  })
})
