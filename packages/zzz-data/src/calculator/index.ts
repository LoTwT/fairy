// Calculator module — public re-exports

export {
  calcAnomalyDamage,
  calcAnomalyDamageCrit,
  calcAnomalyDamageNoCrit,
} from "./anomaly.js"

export {
  calcDisorderDamage,
  calcDisorderDamageCrit,
  calcDisorderDamageNoCrit,
} from "./disorder.js"

export {
  ATTACKER_LEVEL_BASE,
  calcAnomalyBonusMultiplier,
  calcAnomalyCritMultiplier,
  calcAnomalyProficiencyMultiplier,
  calcBonusMultiplier,
  calcCritMultiplier,
  calcDamageLevelMultiplier,
  calcDazeVulnerabilityMultiplier,
  calcDefenseMultiplier,
  calcDisorderDamageMultiplier,
  calcExpectedAnomalyCritMultiplier,
  calcExpectedCritMultiplier,
  calcResistanceMultiplier,
  calcSheerBonusMultiplier,
  calcVulnerabilityMultiplier,
  getAttackerLevelBase,
} from "./factors.js"

export {
  calcNormalDamage,
  calcNormalDamageCrit,
  calcNormalDamageNoCrit,
} from "./normal.js"

export {
  calcSheerDamage,
  calcSheerDamageCrit,
  calcSheerDamageNoCrit,
} from "./sheer.js"

export type {
  AnomalyBonusMultiplier,
  AnomalyCritMultiplier,
  AnomalyDamageParams,
  AnomalyProficiencyMultiplier,
  AnomalyType,
  AttackerLevel,
  AttackerLevelBase,
  BonusDamageMultiplier,
  CritMultiplier,
  CritParams,
  DamageLevelMultiplier,
  DamageResult,
  DazeVulnerabilityMultiplier,
  DazeVulnerabilityParams,
  DefenseMultiplier,
  DefenseParams,
  DisorderDamageMultiplier,
  DisorderDamageParams,
  DisorderRemainingTime,
  ExpectedAnomalyCritMultiplier,
  ExpectedCritMultiplier,
  NormalDamageParams,
  ResistanceMultiplier,
  ResistanceParams,
  SheerBonusMultiplier,
  SheerDamageParams,
  VulnerabilityMultiplier,
  VulnerabilityParams,
} from "./types.js"
