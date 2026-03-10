import type { AgentAttributeLabel } from "../terms.js"
import type {
  ElementMultiplierMap,
  ElementMultiplierSource,
  ElementMultiplierTuple,
  EnemyDamageContext,
  EnemyDamageContextSource,
} from "./types.js"
import { getElementMultIndex, toBaseResistanceAttribute } from "../terms.js"

function resolveElementMult(
  source: ElementMultiplierSource,
): ElementMultiplierTuple {
  return "elementMult" in source ? source.elementMult : source
}

export function toElementMultiplierMap(
  source: ElementMultiplierSource,
): ElementMultiplierMap {
  const elementMult = resolveElementMult(source)

  return {
    ice: elementMult[0],
    fire: elementMult[1],
    electric: elementMult[2],
    ether: elementMult[3],
    physical: elementMult[4],
  }
}

export function getEnemyElementMultiplier(
  source: ElementMultiplierSource,
  attribute: AgentAttributeLabel | undefined,
): number | undefined {
  const index = getElementMultIndex(attribute)
  if (index === undefined) return undefined

  return resolveElementMult(source)[index]
}

export function buildEnemyDamageContext(
  enemy: EnemyDamageContextSource,
  attribute: AgentAttributeLabel | undefined,
): EnemyDamageContext | undefined {
  const resistanceBucket = toBaseResistanceAttribute(attribute)
  if (!resistanceBucket) return undefined

  const multipliers = toElementMultiplierMap(enemy)

  return {
    enemyId: enemy.id,
    enemyName: enemy.name,
    baseDefense: enemy.def,
    dazeGauge: enemy.daze,
    dazeMultiplier: enemy.stunMult,
    dazeDuration: enemy.stunTime,
    resistanceBucket,
    elementMultiplier: multipliers[resistanceBucket],
    multipliers,
  }
}
