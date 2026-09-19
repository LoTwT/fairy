import { deepStrictEqual } from "node:assert"
import { expect } from "vitest"
import type { IntegratedBangboo } from "../../src/integration/integrate-bangboo.ts"
import { expectJsonFidelity } from "./json-fidelity.ts"

/** 独立测试侧还原：按同一来源路径合并公共字段与各语言内容；不引用生产 schema 或拆分函数。 */
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function define(result: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(result, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

/** stats 登记拼写的还原：hpMax → hp_max 等，hpupgrade 无下划线保持原样。 */
const statsNames: Readonly<Record<string, string>> = {
  endurance: "endurance",
  hpMax: "hp_max",
  hpupgrade: "hpupgrade",
  attack: "attack",
  attackUpgrade: "attack_upgrade",
  breakStun: "break_stun",
  elementAbnormalPower: "element_abnormal_power",
  defence: "defence",
  defUpgrade: "def_upgrade",
  crit: "crit",
  penRatio: "pen_ratio",
  critDmg: "crit_dmg",
}

/** level 阶段登记公共成员的还原拼写。 */
const stageNames: Readonly<Record<string, string>> = {
  hpMax: "hp_max",
  attack: "attack",
  defence: "defence",
  levelMax: "level_max",
  levelMin: "level_min",
  materials: "materials",
}

/** 还原对象成员名：命中登记表则换回来源拼写，未登记成员按原 key 原样保留。 */
function restoreNames(
  value: Record<string, unknown>,
  names: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const restored: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value))
    // 只认登记表的自有 key：constructor、__proto__、toString 等原型链成员不得误判为命中。
    define(restored, Object.hasOwn(names, key) ? names[key] : key, item)
  return restored
}

/** skillProp 条目的还原：elementAccumulationValue → element_accumulation_value，数字属性 key 原样。 */
function restoreSkillPropEntry(value: Record<string, unknown>) {
  const restored: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value))
    define(
      restored,
      key === "elementAccumulationValue" ? "element_accumulation_value" : key,
      item,
    )
  return restored
}

/** 等级阶段的还原：合并 data 公共字段与 details 本语言内容，extra 按属性 key 逐条合并。 */
function restoreStage(
  dataStage: Record<string, unknown> | undefined,
  detailStage: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const stage: Record<string, unknown> = {}
  const dataRest = dataStage ? restoreNames(dataStage, stageNames) : {}
  const detailRest = detailStage ? restoreNames(detailStage, stageNames) : {}
  for (const source of [dataRest, detailRest])
    for (const [key, value] of Object.entries(source))
      if (key !== "extra" && !Object.hasOwn(stage, key))
        define(stage, key, value)
  const extra: Record<string, unknown> = {}
  const propKeys = new Set([
    ...Object.keys((dataStage?.extra as Record<string, unknown>) ?? {}),
    ...Object.keys((detailStage?.extra as Record<string, unknown>) ?? {}),
  ])
  for (const propKey of propKeys) {
    const merged: Record<string, unknown> = {}
    for (const source of [
      (detailStage?.extra as Record<string, unknown>)?.[propKey],
      (dataStage?.extra as Record<string, unknown>)?.[propKey],
    ])
      if (object(source))
        for (const [key, value] of Object.entries(source))
          define(merged, key, value)
    define(extra, propKey, merged)
  }
  define(stage, "extra", extra)
  return stage
}

export function expectBangbooRoundtrip(
  result: IntegratedBangboo,
  input: { sourceRecord: unknown; details: Record<string, unknown> },
): void {
  expectJsonFidelity(result.sourceRecord, input.sourceRecord)
  for (const [locale, source] of Object.entries(input.details)) {
    const details = structuredClone(
      result.details[locale as "zh" | "en"],
    ) as unknown as Record<string, unknown>
    const data = structuredClone(result.data) as unknown as Record<
      string,
      unknown
    >
    expect(details.locale).toBe(locale)
    expect(details.id).toBe(data.id)
    delete details.locale
    delete details.id
    const restored: Record<string, unknown> = {
      id: data.id,
      code_name: details.codeName,
      name: details.name,
      desc: details.desc,
      rarity: data.rarity,
      icon: data.icon,
      stats: restoreNames(data.stats as Record<string, unknown>, statsNames),
    }
    delete details.codeName
    delete details.name
    delete details.desc
    const skillProp: Record<string, unknown> = {}
    for (const [skillId, entry] of Object.entries(
      data.skillProp as Record<string, unknown>,
    ))
      define(
        skillProp,
        skillId,
        restoreSkillPropEntry(entry as Record<string, unknown>),
      )
    restored.skill_prop = skillProp
    restored.skill = details.skill
    delete details.skill
    const level: Record<string, unknown> = {}
    const stageKeys = new Set([
      ...Object.keys(data.level as Record<string, unknown>),
      ...Object.keys(details.level as Record<string, unknown>),
    ])
    for (const stageKey of stageKeys)
      define(
        level,
        stageKey,
        restoreStage(
          (data.level as Record<string, unknown>)[stageKey] as
            | Record<string, unknown>
            | undefined,
          (details.level as Record<string, unknown>)[stageKey] as
            | Record<string, unknown>
            | undefined,
        ),
      )
    restored.level = level
    delete details.level
    for (const [key, value] of Object.entries(details))
      define(restored, key, value)
    deepStrictEqual(restored, source)
  }
}
