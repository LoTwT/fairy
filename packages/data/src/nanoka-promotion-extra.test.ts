import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  deriveNanokaPromotionExtraStats,
  type NanokaPromotionExtraSource,
} from "./index"

const repoRoot = join(import.meta.dirname, "../../..")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

describe("nanoka agent promotion extra source artifact gate", () => {
  it("derives live Nekomata promotion extra stats with deterministic unit mapping", () => {
    const nekomata = readJson<NanokaPromotionExtraSource>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1021.json")
    const artifact = deriveNanokaPromotionExtraStats(nekomata, {
      sourceVersion: "2.8",
      agentId: 1021,
    })

    expect(artifact.runtimeCutoverReady).toBe(false)
    expect(artifact.stats).toHaveLength(12)
    expect(artifact.stats.filter(stat => stat.canonicalField === "attack").map(stat => stat.normalizedValue)).toEqual([
      0,
      25,
      25,
      50,
      50,
      75,
    ])
    expect(artifact.stats.filter(stat => stat.canonicalField === "critRate").map(stat => stat.normalizedValue)).toEqual([
      0.048,
      0.048,
      0.096,
      0.096,
      0.144,
      0.144,
    ])
    expect(artifact.stats[0]).toMatchObject({
      phase: 1,
      maxLevel: 15,
      prop: 12101,
      sourcePath: "/extra_level/1/extra/12101",
    })
  })

  it("derives live Yixuan promotion extra stats without treating them as final panel cutover", () => {
    const yixuan = readJson<NanokaPromotionExtraSource>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1371.json")
    const artifact = deriveNanokaPromotionExtraStats(yixuan, {
      sourceVersion: "2.8",
      agentId: 1371,
    })

    expect(artifact.runtimeCutoverReady).toBe(false)
    expect(artifact.stats.filter(stat => stat.canonicalField === "maxHp").map(stat => stat.normalizedValue)).toEqual([
      0,
      140,
      140,
      280,
      280,
      420,
    ])
    expect(artifact.stats.filter(stat => stat.canonicalField === "critRate").map(stat => stat.normalizedValue)).toEqual([
      0.048,
      0.048,
      0.096,
      0.096,
      0.144,
      0.144,
    ])
  })

  it("fails loud when promotion extra raw fields are missing or unmapped", () => {
    const nekomata = readJson<NanokaPromotionExtraSource>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1021.json")
    const missingExtra = structuredClone(nekomata)
    const missingValue = structuredClone(nekomata)
    const unmappedProp = structuredClone(nekomata)
    const idMismatch = readJson<NanokaPromotionExtraSource>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1371.json")

    delete missingExtra.extra_level?.["1"]?.extra
    delete missingValue.extra_level?.["1"]?.extra?.["12101"]?.value
    unmappedProp.extra_level!["1"]!.extra!["99999"] = {
      prop: 99999,
      name: "未知属性",
      format: "{0:0}",
      value: 1,
    }

    expect(() => deriveNanokaPromotionExtraStats(missingExtra, { sourceVersion: "2.8", agentId: 1021 })).toThrow("extra_level.1.extra")
    expect(() => deriveNanokaPromotionExtraStats(missingValue, { sourceVersion: "2.8", agentId: 1021 })).toThrow("extra_level.1.extra.12101.value")
    expect(() => deriveNanokaPromotionExtraStats(unmappedProp, { sourceVersion: "2.8", agentId: 1021 })).toThrow("unmapped promotion extra prop 99999")
    expect(() => deriveNanokaPromotionExtraStats(idMismatch, { sourceVersion: "2.8", agentId: 1021 })).toThrow("agent id mismatch")
  })
})
