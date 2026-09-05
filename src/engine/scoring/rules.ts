/** Stable identifiers stored in browser preferences. Never rename without a migration. */
export type HouseRuleId =
  | 'heavenly-hand'
  | 'earthly-hand'
  | 'nine-gates'
  | 'four-kongs'
  | 'four-concealed-pungs'
  | 'all-green'
  | 'all-flowers'
  | 'all-seasons'

export interface RuleSet {
  version: 1
  preset: 'hong-kong-default'
  minimumFaan: number
  limitFaan: number
  houseRules: Record<HouseRuleId, boolean>
}

export interface HouseRuleDefinition {
  id: HouseRuleId
  name: string
  chineseName: string
  faan: number
  description: string
}

export const HOUSE_RULE_IDS: readonly HouseRuleId[] = [
  'heavenly-hand', 'earthly-hand', 'nine-gates', 'four-kongs',
  'four-concealed-pungs', 'all-green', 'all-flowers', 'all-seasons',
]

export const HOUSE_RULE_DEFINITIONS: readonly HouseRuleDefinition[] = [
  { id: 'heavenly-hand', name: 'Heavenly hand', chineseName: '天和', faan: 13,
    description: 'The dealer wins with the hand as first dealt, before discarding anything.' },
  { id: 'earthly-hand', name: 'Earthly hand', chineseName: '地和', faan: 13,
    description: "A non-dealer wins by claiming the dealer's very first discard." },
  { id: 'nine-gates', name: 'Nine gates', chineseName: '九蓮寶燈', faan: 13,
    description: 'A concealed 1112345678999 base in one suit, completed by any tile of that suit.' },
  { id: 'four-kongs', name: 'Four kongs', chineseName: '十八羅漢', faan: 13,
    description: 'All four sets are kongs.' },
  { id: 'four-concealed-pungs', name: 'Four concealed triplets', chineseName: '坎坎和', faan: 13,
    description: 'All four sets are concealed triplets or kongs.' },
  { id: 'all-green', name: 'All green', chineseName: '綠一色', faan: 13,
    description: 'Every tile is green bamboo or a Green Dragon.' },
  { id: 'all-flowers', name: 'All flowers', chineseName: '一台花', faan: 2,
    description: 'All four flower tiles, regardless of seat.' },
  { id: 'all-seasons', name: 'All seasons', chineseName: '一台花', faan: 2,
    description: 'All four season tiles, regardless of seat.' },
]

const DEFAULT_HOUSE_RULES: Record<HouseRuleId, boolean> = {
  'heavenly-hand': true,
  'earthly-hand': true,
  'nine-gates': true,
  'four-kongs': true,
  'four-concealed-pungs': true,
  'all-green': true,
  'all-flowers': true,
  'all-seasons': true,
}

/** Version 1 is frozen: later preset changes require a new version and migration. */
export const DEFAULT_RULE_SET: Readonly<RuleSet> = Object.freeze({
  version: 1,
  preset: 'hong-kong-default',
  minimumFaan: 3,
  limitFaan: 13,
  houseRules: Object.freeze({ ...DEFAULT_HOUSE_RULES }),
})

export const LIMIT_FAAN = DEFAULT_RULE_SET.limitFaan

export function copyRuleSet(rules: Readonly<RuleSet>): RuleSet {
  return { ...rules, houseRules: { ...rules.houseRules } }
}

/** Resolve untrusted saved data onto fixed preset fields and current house-rule defaults. */
export function resolveRuleSet(value: unknown): RuleSet {
  const resolved = copyRuleSet(DEFAULT_RULE_SET)
  if (typeof value !== 'object' || value === null) return resolved
  const saved = value as Record<string, unknown>
  if (saved.version !== 1 || saved.preset !== 'hong-kong-default') return resolved
  if (typeof saved.houseRules !== 'object' || saved.houseRules === null) return resolved

  const houseRules = saved.houseRules as Record<string, unknown>
  for (const id of HOUSE_RULE_IDS) {
    if (typeof houseRules[id] === 'boolean') resolved.houseRules[id] = houseRules[id]
  }
  return resolved
}
