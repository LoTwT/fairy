import { deepStrictEqual } from "node:assert"
import { expect } from "vitest"
import type { IntegratedWEngine } from "../../src/integration/integrate-w-engine.ts"

/** 独立测试侧还原：按同一来源路径合并共享字段、属性数值与派生分类；不引用生产 schema 或拆分函数。 */
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/** 阶段字典的登记拼写还原：逐阶段还原成员名，未登记成员按原 key 原样保留。 */
function restoreStars(value: unknown): unknown {
  if (!object(value)) return value
  const result: Record<string, unknown> = {}
  for (const [stage, entry] of Object.entries(value)) {
    if (!object(entry)) {
      Object.defineProperty(result, stage, {
        value: entry,
        enumerable: true,
        configurable: true,
        writable: true,
      })
      continue
    }
    const restored: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(entry))
      Object.defineProperty(
        restored,
        key === "starRate"
          ? "star_rate"
          : key === "randRate"
            ? "rand_rate"
            : key,
        {
          value: item,
          enumerable: true,
          configurable: true,
          writable: true,
        },
      )
    Object.defineProperty(result, stage, {
      value: restored,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return result
}

export function expectWEngineRoundtrip(
  result: IntegratedWEngine,
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
      code_name: data.codeName,
      rarity: data.rarity,
      icon: data.icon,
      level: data.level,
      stars: restoreStars(data.stars),
      materials: data.materials,
      base_property: {
        ...(details.baseProperty as Record<string, unknown>),
        value: (data.baseProperty as Record<string, unknown>).value,
      },
      rand_property: {
        ...(details.randProperty as Record<string, unknown>),
        value: (data.randProperty as Record<string, unknown>).value,
      },
    }
    delete details.baseProperty
    delete details.randProperty
    restored.weapon_type = details.weaponType
    delete details.weaponType
    for (const [key, value] of Object.entries(details))
      Object.defineProperty(restored, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      })
    deepStrictEqual(restored, source)
  }
}
