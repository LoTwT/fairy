import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import type { AgentData } from "../src/integration/agent-types.ts"
import type {
  WEngineData,
  WEngineDetails,
} from "../src/integration/w-engine-types.ts"
import {
  convertAgentAttributes,
  convertWEngineAttributes,
} from "../scripts/panel-attributes/convert.ts"
import { sDriveDiscMaxLevelAffixes } from "../scripts/panel-attributes/drive-discs.ts"
import engineEvidence from "./fixtures/panel-attributes-evidence.json" with { type: "json" }

// prepare:consumer 已经持锁验证并复制；测试只读稳定副本。
async function source<T>(path: string): Promise<T> {
  return JSON.parse(
    await readFile(
      new URL(`../.generated/integrated/${path}`, import.meta.url),
      "utf8",
    ),
  )
}
const agent = (id: number) => source<AgentData>(`agents/${id}/data.json`)

describe("normalized panel attributes", () => {
  it("retains Astra's calculated decimals, distinguishes mastery/proficiency and keeps core cultivation independent", async () => {
    const result = convertAgentAttributes(await agent(1311))
    // 独立人工核对的 Rl 公式结果；不调用转换器计算期望值。
    expect(result.baseAttributes).toEqual({
      health: { unit: "health-points", value: 8609.2122 },
      attack: { unit: "attack-points", value: 640.7699 },
      defense: { unit: "defense-points", value: 600.5916 },
      impact: { unit: "impact-points", value: 83 },
      anomalyProficiency: { unit: "anomaly-proficiency-points", value: 92 },
      anomalyMastery: { unit: "anomaly-mastery-points", value: 93 },
      energyRegen: { unit: "energy-per-second", value: 1.2 },
      criticalRate: { unit: "ratio", value: 0.05 },
      criticalDamage: { unit: "ratio", value: 0.5 },
      penetrationRatio: { unit: "ratio", value: 0 },
    })
    expect(result.coreAttributeBonuses[1]).toEqual([])
    expect(result.coreAttributeBonuses[3]).toEqual([
      {
        attribute: "attack",
        operation: "base-add",
        unit: "attack-points",
        value: 25,
      },
      {
        attribute: "energyRegen",
        operation: "base-add",
        unit: "energy-per-second",
        value: 0.12,
      },
    ])
    expect(result.coreAttributeBonuses[7].map((bonus) => bonus.value)).toEqual([
      75, 0.36,
    ])
  })

  it("preserves percentage cores and excludes Ben's passive defense-to-attack conversion", async () => {
    expect(
      convertAgentAttributes(await agent(1341)).coreAttributeBonuses[7],
    ).toContainEqual({
      attribute: "health",
      operation: "initial-percentage",
      unit: "ratio",
      value: 0.18,
    })
    expect(
      convertAgentAttributes(await agent(1491)).coreAttributeBonuses[7],
    ).toContainEqual({
      attribute: "attack",
      operation: "initial-percentage",
      unit: "ratio",
      value: 0.21,
    })
    const yixuan = convertAgentAttributes(await agent(1371))
    expect(yixuan.coreAttributeBonuses[7]).toContainEqual({
      attribute: "criticalRate",
      operation: "ratio-add",
      unit: "ratio",
      value: 0.144,
    })
    expect(yixuan.baseAttributes.energyRegen.value).toBe(0)
    const ben = convertAgentAttributes(await agent(1121))
    expect(ben.baseAttributes.attack.value).toBe(578.0866)
    expect(ben.baseAttributes.defense.value).toBe(724.0351)
    expect(ben.coreAttributeBonuses[7]).toContainEqual({
      attribute: "attack",
      operation: "base-add",
      unit: "attack-points",
      value: 75,
    })
  })

  it("rejects unverified properties, unsafe values and incomplete cultivation", async () => {
    const raw = await agent(1311)
    for (const mutate of [
      (value: AgentData) => {
        value.stats.penDelta = 1
      },
      (value: AgentData) => {
        value.stats.attackGrowth = Infinity
      },
      (value: AgentData) => {
        value.stats.hpMax = -1
      },
      (value: AgentData) => {
        value.stats.crit = Number.MAX_SAFE_INTEGER + 1
      },
      (value: AgentData) => {
        value.extraLevel["1"].extra["99999"] = { prop: 99999, value: 1 }
      },
      (value: AgentData) => {
        value.extraLevel["1"].extra["12101"].prop = 11101
      },
      (value: AgentData) => {
        delete value.extraLevel["6"]
      },
      (value: AgentData) => {
        value.level = {}
      },
    ]) {
      const changed = structuredClone(raw)
      mutate(changed)
      expect(() => convertAgentAttributes(changed)).toThrow(/agents\/1311/)
    }
  })

  it("separates engine ascension from refinement and matches independent pinned display attack for all 93 mapped engines", async () => {
    const data = await source<WEngineData>("w-engines/14131/data.json")
    const details = await source<WEngineDetails>(
      "w-engines/14131/details.zh.json",
    )
    expect(convertWEngineAttributes(data, details)).toEqual({
      schemaVersion: 1,
      entityId: "14131",
      level: 60,
      baseAttribute: {
        attribute: "attack",
        operation: "base-add",
        unit: "attack-points",
        value: 713.76,
      },
      advancedAttribute: {
        attribute: "attack",
        operation: "initial-percentage",
        unit: "ratio",
        value: 0.3,
      },
    })
    for (const entry of engineEvidence.engines) {
      const result = convertWEngineAttributes(
        await source<WEngineData>(`w-engines/${entry.entityId}/data.json`),
        await source<WEngineDetails>(
          `w-engines/${entry.entityId}/details.zh.json`,
        ),
      )
      expect(Math.floor(result.baseAttribute.value), entry.sourceId).toBe(
        entry.displayAttack,
      )
    }
    expect(() =>
      convertWEngineAttributes(data, {
        ...details,
        randProperty: { ...details.randProperty, name2: "未知属性" },
      }),
    ).toThrow(/randProperty/)
    expect(() =>
      convertWEngineAttributes({ ...data, stars: {} }, details),
    ).toThrow(/max-ascension/)
    expect(() =>
      convertWEngineAttributes(data, {
        ...details,
        randProperty: { ...details.randProperty, format: "{0:0}" },
      }),
    ).toThrow(/format/)
  })

  it("expresses S max main stats by slot and substats per roll in calculation units", () => {
    const result = sDriveDiscMaxLevelAffixes()
    expect(
      Object.values(result.mainStatsBySlot).map((options) => options.length),
    ).toEqual([1, 1, 1, 6, 9, 6])
    expect(
      [1, 2, 3].map(
        (slot) => result.mainStatsBySlot[slot as 1 | 2 | 3][0].value,
      ),
    ).toEqual([2200, 316, 184])
    expect(result.mainStatsBySlot[6].slice(3)).toEqual([
      {
        attribute: "anomalyMastery",
        operation: "initial-percentage",
        unit: "ratio",
        value: 0.3,
      },
      {
        attribute: "impact",
        operation: "initial-percentage",
        unit: "ratio",
        value: 0.18,
      },
      {
        attribute: "energyRegen",
        operation: "initial-percentage",
        unit: "ratio",
        value: 0.6,
      },
    ])
    expect(
      result.mainStatsBySlot[5]
        .filter((b) => b.attribute === "damageBonus")
        .map((b) => [b.element, b.value]),
    ).toEqual([
      ["physical", 0.3],
      ["fire", 0.3],
      ["ice", 0.3],
      ["electric", 0.3],
      ["ether", 0.3],
    ])
    expect(result.substatsPerRoll.map((b) => b.value)).toEqual([
      112, 0.03, 19, 0.03, 15, 0.048, 9, 0.024, 0.048, 9,
    ])
    expect(
      result.substatsPerRoll.find((b) => b.attribute === "penetrationValue")
        ?.operation,
    ).toBe("initial-fixed")
  })
})
