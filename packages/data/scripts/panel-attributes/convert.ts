import type { AgentData } from "../../src/integration/agent-types.ts"
import type {
  WEngineData,
  WEngineDetails,
} from "../../src/integration/w-engine-types.ts"
import type {
  AgentLevel60Attributes,
  PanelAttributeBonus,
  PanelAttributeValues,
  PanelCoreSkillLevel,
  WEngineLevel60Attributes,
} from "../../src/attributes/types.ts"

function integer(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`${path}: expected a non-negative safe integer`)
  return value
}

function scaled(numerator: number, denominator: number, path: string): number {
  return integer(numerator, path) / denominator
}

/** 属性编号的明确映射；不从名称、数量级或格式猜运算阶段。 */
const coreProperties: Record<string, (value: number) => PanelAttributeBonus> = {
  "11101": (value) => ({
    attribute: "health",
    operation: "base-add",
    unit: "health-points",
    value,
  }),
  "11102": (value) => ({
    attribute: "health",
    operation: "initial-percentage",
    unit: "ratio",
    value: value / 10000,
  }),
  "12101": (value) => ({
    attribute: "attack",
    operation: "base-add",
    unit: "attack-points",
    value,
  }),
  "12102": (value) => ({
    attribute: "attack",
    operation: "initial-percentage",
    unit: "ratio",
    value: value / 10000,
  }),
  "12201": (value) => ({
    attribute: "impact",
    operation: "base-add",
    unit: "impact-points",
    value,
  }),
  "20101": (value) => ({
    attribute: "criticalRate",
    operation: "ratio-add",
    unit: "ratio",
    value: value / 10000,
  }),
  "21101": (value) => ({
    attribute: "criticalDamage",
    operation: "ratio-add",
    unit: "ratio",
    value: value / 10000,
  }),
  "23101": (value) => ({
    attribute: "penetrationRatio",
    operation: "ratio-add",
    unit: "ratio",
    value: value / 10000,
  }),
  "30501": (value) => ({
    attribute: "energyRegen",
    operation: "base-add",
    unit: "energy-per-second",
    value: value / 100,
  }),
  "31201": (value) => ({
    attribute: "anomalyProficiency",
    operation: "base-add",
    unit: "anomaly-proficiency-points",
    value,
  }),
  "31401": (value) => ({
    attribute: "anomalyMastery",
    operation: "base-add",
    unit: "anomaly-mastery-points",
    value,
  }),
}

export function convertAgentAttributes(
  data: AgentData,
): AgentLevel60Attributes {
  const path = `agents/${data.id}`
  integer(data.id, `${path}/id`)
  const stages = Object.values(data.level).filter(
    (stage) => stage.levelMax === 60 && stage.levelMin < 60,
  )
  if (stages.length !== 1)
    throw new Error(`${path}/level: expected one level-60 ascension stage`)
  const stage = stages[0]!
  const stats = data.stats
  if (stats.penDelta !== 0)
    throw new Error(`${path}/stats/penDelta: nonzero growth is not verified`)
  const growth = (
    base: "hpMax" | "attack" | "defence",
    rate: "hpGrowth" | "attackGrowth" | "defenceGrowth",
  ) =>
    scaled(
      integer(stats[base], `${path}/stats/${base}`) * 10000 +
        59 * integer(stats[rate], `${path}/stats/${rate}`) +
        10000 * integer(stage[base], `${path}/level/${base}`),
      10000,
      `${path}/${base}`,
    )
  const stat = (field: keyof typeof stats) =>
    integer(stats[field], `${path}/stats/${field}`)
  const baseAttributes: PanelAttributeValues = {
    health: { unit: "health-points", value: growth("hpMax", "hpGrowth") },
    attack: { unit: "attack-points", value: growth("attack", "attackGrowth") },
    defense: {
      unit: "defense-points",
      value: growth("defence", "defenceGrowth"),
    },
    impact: { unit: "impact-points", value: stat("breakStun") },
    anomalyProficiency: {
      unit: "anomaly-proficiency-points",
      value: stat("elementMystery"),
    },
    anomalyMastery: {
      unit: "anomaly-mastery-points",
      value: stat("elementAbnormalPower"),
    },
    energyRegen: { unit: "energy-per-second", value: stat("spRecover") / 100 },
    criticalRate: { unit: "ratio", value: stat("crit") / 10000 },
    criticalDamage: { unit: "ratio", value: stat("critDamage") / 10000 },
    penetrationRatio: { unit: "ratio", value: stat("penRate") / 10000 },
  }
  if (Object.keys(data.extraLevel).toSorted().join(",") !== "1,2,3,4,5,6")
    throw new Error(
      `${path}/extraLevel: expected exactly six cumulative cultivation rows`,
    )
  const coreAttributeBonuses: Record<
    PanelCoreSkillLevel,
    PanelAttributeBonus[]
  > = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }
  for (let sourceRank = 1; sourceRank <= 6; sourceRank++) {
    const row = data.extraLevel[String(sourceRank)]!
    const entries = Object.entries(row.extra)
    if (!entries.length)
      throw new Error(`${path}/extraLevel/${sourceRank}: missing properties`)
    coreAttributeBonuses[(sourceRank + 1) as PanelCoreSkillLevel] = entries
      .toSorted(([a], [b]) => Number(a) - Number(b))
      .map(([key, property]) => {
        const location = `${path}/extraLevel/${sourceRank}/extra/${key}`
        const convert = Object.hasOwn(coreProperties, key)
          ? coreProperties[key]
          : undefined
        if (!convert || String(property.prop) !== key)
          throw new Error(`${location}: unknown or mismatched property`)
        return convert(integer(property.value, `${location}/value`))
      })
  }
  return {
    schemaVersion: 1,
    entityId: String(data.id),
    level: 60,
    baseAttributes,
    coreAttributeBonuses,
  }
}

const engineProperties: Record<string, (value: number) => PanelAttributeBonus> =
  {
    攻击力百分比: (value) => ({
      attribute: "attack",
      operation: "initial-percentage",
      unit: "ratio",
      value,
    }),
    生命值百分比: (value) => ({
      attribute: "health",
      operation: "initial-percentage",
      unit: "ratio",
      value,
    }),
    防御力百分比: (value) => ({
      attribute: "defense",
      operation: "initial-percentage",
      unit: "ratio",
      value,
    }),
    冲击力: (value) => ({
      attribute: "impact",
      operation: "initial-percentage",
      unit: "ratio",
      value,
    }),
    异常掌控: (value) => ({
      attribute: "anomalyMastery",
      operation: "initial-percentage",
      unit: "ratio",
      value,
    }),
    能量自动回复: (value) => ({
      attribute: "energyRegen",
      operation: "initial-percentage",
      unit: "ratio",
      value,
    }),
    暴击率: (value) => ({
      attribute: "criticalRate",
      operation: "ratio-add",
      unit: "ratio",
      value,
    }),
    暴击伤害: (value) => ({
      attribute: "criticalDamage",
      operation: "ratio-add",
      unit: "ratio",
      value,
    }),
    穿透率: (value) => ({
      attribute: "penetrationRatio",
      operation: "ratio-add",
      unit: "ratio",
      value,
    }),
    异常精通: (value) => ({
      attribute: "anomalyProficiency",
      operation: "initial-fixed",
      unit: "anomaly-proficiency-points",
      value,
    }),
  }

export function convertWEngineAttributes(
  data: WEngineData,
  details: WEngineDetails,
): WEngineLevel60Attributes {
  const path = `w-engines/${data.id}`
  integer(data.id, `${path}/id`)
  if (data.id !== details.id || details.locale !== "zh")
    throw new Error(`${path}: property evidence identity/locale mismatch`)
  if (
    details.baseProperty.name !== "基础攻击力" ||
    details.baseProperty.name2 !== "基础攻击力" ||
    details.baseProperty.format !== "{0:0.#}"
  )
    throw new Error(`${path}/baseProperty: unverified base property`)
  const level = data.level["60"]
  const stars = data.stars["5"]
  if (!level || !stars)
    throw new Error(`${path}: missing level-60/max-ascension data`)
  const advancedName = details.randProperty.name2
  const convert = Object.hasOwn(engineProperties, advancedName)
    ? engineProperties[advancedName]
    : undefined
  const fixed = advancedName === "异常精通"
  if (
    !convert ||
    details.randProperty.format !== (fixed ? "{0:0}" : "{0:0.#%}")
  )
    throw new Error(`${path}/randProperty: unverified property name or format`)
  const baseValue = scaled(
    integer(data.baseProperty.value, `${path}/baseProperty/value`) *
      (10000 +
        integer(level.rate, `${path}/level/60/rate`) +
        integer(stars.starRate, `${path}/stars/5/starRate`)),
    10000,
    `${path}/baseAttribute`,
  )
  const advancedValue = scaled(
    integer(data.randProperty.value, `${path}/randProperty/value`) *
      (10000 + integer(stars.randRate, `${path}/stars/5/randRate`)),
    fixed ? 10000 : 100000000,
    `${path}/advancedAttribute`,
  )
  return {
    schemaVersion: 1,
    entityId: String(data.id),
    level: 60,
    baseAttribute: {
      attribute: "attack",
      operation: "base-add",
      unit: "attack-points",
      value: baseValue,
    },
    advancedAttribute: convert(advancedValue),
  }
}
