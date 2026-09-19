import { deepStrictEqual } from "node:assert"
import { expect } from "vitest"
import type { IntegratedDriveDisc } from "../../src/integration/integrate-drive-disc.ts"
import { expectJsonFidelity } from "./json-fidelity.ts"

/** 独立测试侧还原：共享资源与语言字段按同一来源路径合并；不引用生产 schema 或拆分函数。 */
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function combine(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): Record<string, unknown> {
  const result = structuredClone(left)
  for (const [key, value] of Object.entries(right)) {
    if (Object.hasOwn(result, key)) {
      if (!object(result[key]) || !object(value))
        throw new Error(`还原载荷重叠：${key}`)
      result[key] = combine(result[key], value)
    } else
      Object.defineProperty(result, key, {
        value: structuredClone(value),
        enumerable: true,
        configurable: true,
        writable: true,
      })
  }
  return result
}

export function expectDriveDiscRoundtrip(
  result: IntegratedDriveDisc,
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
    deepStrictEqual(combine(data, details), source)
  }
}
