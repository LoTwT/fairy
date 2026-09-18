import { deepStrictEqual } from "node:assert"
import { expect } from "vitest"
import type { IntegratedMonster } from "../../src/integration/integrate-monster.ts"

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

/** data 顶层登记字段与 details 本语言字段的还原拼写。 */
const dataNames: Readonly<Record<string, string>> = {
  monsterId: "monster_id",
  imagePath: "image_path",
  rarity: "rarity",
  groupId: "group_id",
  monsterInfo: "monster_info",
  elementAbnormal: "element_abnormal",
}

const detailNames: Readonly<Record<string, string>> = {
  name: "name",
  desc: "desc",
  groupDesc: "group_desc",
  cardObtain: "card_obtain",
  cardQuote: "card_quote",
  cardSkillDesc: "card_skill_desc",
}

const unitNames: Readonly<Record<string, string>> = {
  id: "id",
  codeName: "code_name",
  icon: "icon",
  tag: "tag",
  type: "type",
  element: "element",
  stats: "stats",
  curves: "curves",
}

const curveNames: Readonly<Record<string, string>> = {
  curve: "curve",
  ratio: "ratio",
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

/** monsterInfo 内部单位的还原：codeName → code_name，单位 key 原样保留。 */
function restoreMonsterInfo(value: Record<string, unknown>) {
  const restored: Record<string, unknown> = {}
  for (const [unitKey, unit] of Object.entries(value)) {
    if (!object(unit)) {
      define(restored, unitKey, unit)
      continue
    }
    const unitRestored = restoreNames(unit, unitNames)
    if (object(unitRestored.curves)) {
      const curves: Record<string, unknown> = {}
      for (const [curveKey, curve] of Object.entries(unitRestored.curves))
        define(
          curves,
          curveKey,
          object(curve) ? restoreNames(curve, curveNames) : curve,
        )
      define(unitRestored, "curves", curves)
    }
    define(restored, unitKey, unitRestored)
  }
  return restored
}

export function expectMonsterRoundtrip(
  result: IntegratedMonster,
  input: { sourceRecord: unknown; details: Record<string, unknown> },
): void {
  expect(result.sourceRecord).toStrictEqual(input.sourceRecord)
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
      ...restoreNames(data, dataNames),
    }
    restored.monster_info = restoreMonsterInfo(
      data.monsterInfo as Record<string, unknown>,
    )
    for (const [key, value] of Object.entries(details)) {
      const sourceKey = Object.hasOwn(detailNames, key)
        ? detailNames[key]!
        : key
      define(restored, sourceKey, value)
    }
    deepStrictEqual(restored, source)
  }
}
