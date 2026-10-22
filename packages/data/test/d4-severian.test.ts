import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  D4_325_SOURCE,
  d4BasePanels,
  d4EntityData,
  d4SkillInventory,
} from "../scripts/static-effects/d4-325.ts"
import { mergeSupplementalSource } from "../scripts/static-effects/d4-merge.ts"
import { D4_SEVERIAN_GRIP_SUPPLEMENTS } from "../scripts/static-effects/d4-severian.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"

/**
 * D4-3：赛维里安（1631）与禁罪囚笼（14163）只登记目录身份、技能/基础面板
 * 清单与明确缺口。2628b32 没有两人的可执行增益机器记录，不能从 note 或
 * 空块推断倍率。
 */
const collect = (pack: SourcePack) => {
  const blocks = (pack.effectBlocks ?? []).flatMap((block) => block.effects)
  return blocks.length ? blocks : (pack.effects ?? [])
}
const normalize = (entity: SourceEntity): SourceEntity => ({
  ...entity,
  mindscapeBuffs: Array.from(
    { length: 7 },
    (_, index) => entity.mindscapeBuffs?.[index] ?? {},
  ),
  refinementBuffs: Array.from(
    { length: 5 },
    (_, index) => entity.refinementBuffs?.[index] ?? {},
  ),
})
const functions: SourceNormalization = {
  normalizeAgent: normalize,
  normalizeWengine: normalize,
  normalizeDriveDisc: normalize,
  collectEffectsFromPack: collect,
  applyAnomalyFlagsToPack: (pack) => pack,
}
const emptySource: SourceData = {
  agents: [],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
}

const conversion = () =>
  convertSource(
    d4EntityData(["severian", "Incarcerating_Grip"]),
    functions,
    [],
    D4_SEVERIAN_GRIP_SUPPLEMENTS,
    undefined,
    { supplemental: true },
  )

describe("D4 Severian and Incarcerating Grip gap registration", () => {
  it("registers both entities and explicit unsupported options", () => {
    const result = conversion()
    for (const [optionId, entityId] of [
      ["nanoka:agents:1631:unregistered-buffs", "agents:severian"],
      ["nanoka:w-engines:14163:passive", "w-engines:Incarcerating_Grip"],
    ] as const) {
      const option = result.catalog.options.find(
        (candidate) => candidate.optionId === optionId,
      )!
      expect(option, optionId).toBeDefined()
      expect(option.catalogEntityId).toBe(entityId)
      expect(option.variants[0]!.status).toBe("unsupported")
      expect(option.variants[0]!.reason).toBe("formula-out-of-scope")
      expect(option.variants[0]!.effectIds).toEqual([])
    }
    expect(
      result.definitions.effects.some(
        (effect) =>
          effect.effectId.includes(":1631:") ||
          effect.effectId.includes(":14163:"),
      ),
    ).toBe(false)
  })

  it("keeps the 17-skill and base-panel inventory", () => {
    const skills = d4SkillInventory(["severian"])
    expect(skills).toHaveLength(17)
    expect(new Set(skills.map((skill) => skill.agentId))).toEqual(
      new Set(["severian"]),
    )
    const panels = d4BasePanels(["severian", "Incarcerating_Grip"])
    expect(panels).toEqual([
      {
        catalogEntityId: "agents:severian",
        identity: "agent/1631",
        values: expect.objectContaining({
          hp: 7826,
          atk: 933,
          def: 606,
          critRate: 5,
          critDmg: 78.8,
          mastery: 90,
          anomalyControl: 91,
        }),
      },
      {
        catalogEntityId: "w-engines:Incarcerating_Grip",
        identity: "w-engine/14163",
        values: {
          baseAtk: 713,
          baseDef: 0,
          advancedStats: expect.objectContaining({
            critRate: 24,
            externalDefPercent: 32,
          }),
        },
      },
    ])
  })

  it("adds provenance without creating executable rules", () => {
    const main = convertSource(emptySource, functions, [], [])
    const supplemental = conversion()
    const merged = mergeSupplementalSource(
      main,
      supplemental,
      D4_325_SOURCE,
      {
        skills: d4SkillInventory(["severian"]),
        basePanels: d4BasePanels(["severian", "Incarcerating_Grip"]),
        gaps: [],
      },
      "test",
    )
    for (const entityId of [
      "agents:severian",
      "w-engines:Incarcerating_Grip",
    ]) {
      const entity = merged.catalog.entities.find(
        (candidate) => candidate.catalogEntityId === entityId,
      )
      expect(entity?.supplementProvenance, entityId).toEqual({
        sourceId: "zzz-hp",
        version: D4_325_SOURCE.commit,
        resources: [
          {
            path: D4_325_SOURCE.resourcePath,
            sha256: D4_325_SOURCE.sha256,
          },
        ],
      })
    }
    expect(merged.definitions.effects).toHaveLength(0)
    expect(merged.coverage.summary.rules).toBe(0)
    expect(merged.coverage.summary.options).toBe(2)
  })
})
