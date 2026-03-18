export {
  ATTACKER_LEVEL_BASE,
  calcBaseDamage,
  calcBonusMultiplier,
  calcCritMultiplier,
  calcDazeVulnerabilityMultiplier,
  calcDefenseMultiplier,
  calcExpectedCritMultiplier,
  calcResistanceMultiplier,
  calcSheerBonusMultiplier,
  calcVulnerabilityMultiplier,
  getAttackerLevelBase,
} from "./factors.js"

export {
  calcResolvedNormalDamage,
  calcResolvedSheerDamage,
} from "./resolved.js"

export { ceilDisplayDamage, sumDisplayedSegments } from "./display.js"

export type {
  CritParams,
  DamageBreakdown,
  DamageResult,
  DazeVulnerabilityParams,
  DefenseParams,
  ResistanceParams,
  ResolvedNormalDamageInput,
  ResolvedSheerDamageInput,
  VulnerabilityParams,
} from "./types.js"
