import { describe, expect, it } from "vitest"
import type { ContributionRule } from "@randomplay/shared"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { SUPPLEMENTS } from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"
import { fixedSource325Data } from "./fixtures/fixed-source-325-entities.ts"

/**
 * D3：固定源补出四个补充实体后的迁移/回退契约。
 *
 * - fac62407 形状（固定源缺少四个 identity）继续创建 nanoka:* 补充实体，
 *   选项与规则不变；
 * - 3.2.5 形状（固定源已有四个 identity）不再创建重复补充实体，补充选项
 *   挂到固定实体，optionId/effectId 与修正后的语义不变；
 * - 固定源同条款记录保留为 semantic-conflict 入口，不重复贡献；
 * - 记录形状漂移拒绝生成，不静默覆盖 Fairy 已修正的语义。
 */

const collect = (pack: SourcePack) =>
  pack.effectBlocks?.flatMap((block) => block.effects) ?? pack.effects ?? []
const normalize = (entity: SourceEntity): SourceEntity => entity
const functions: SourceNormalization = {
  normalizeAgent: normalize,
  normalizeWengine: normalize,
  normalizeDriveDisc: normalize,
  collectEffectsFromPack: collect,
  applyAnomalyFlagsToPack: (pack: SourcePack) => pack,
}

const relevantPrefixes = [
  "nanoka:agents:1621:",
  "nanoka:w-engines:12014:",
  "nanoka:w-engines:13111",
  "nanoka:w-engines:14162:",
] as const
const supplements = SUPPLEMENTS.filter((supplement) =>
  relevantPrefixes.some((prefix) => supplement.supplementId.startsWith(prefix)),
)
const supplementOptionIds = [
  ...new Set(
    supplements.flatMap((supplement) =>
      "optionId" in supplement ? [supplement.optionId] : [],
    ),
  ),
].toSorted()

const absentSource: SourceData = {
  agents: [],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
}
const convert = (data: SourceData) =>
  convertSource(data, functions, [], supplements)

const supplementRules = (result: ReturnType<typeof convert>) => {
  const effectIds = new Set(
    result.catalog.options
      .filter((option) => supplementOptionIds.includes(option.optionId))
      .flatMap((option) =>
        option.variants.flatMap((variant) => variant.effectIds),
      ),
  )
  return result.definitions.effects.filter((effect) =>
    effectIds.has(effect.effectId),
  )
}

describe("fixed-source supplement entity migration", () => {
  it("keeps the fac62407 supplement entities and options when fixed source lacks the identities", () => {
    const result = convert(absentSource)
    expect(
      result.catalog.entities
        .map((entity) => entity.catalogEntityId)
        .filter((id) => id.startsWith("nanoka:")),
    ).toEqual([
      "nanoka:agents:1621",
      "nanoka:w-engines:12014",
      "nanoka:w-engines:13111",
      "nanoka:w-engines:14162",
    ])
    expect(result.coverage.reverseGaps).toEqual([
      "agents/1621",
      "w-engines/12014",
      "w-engines/13111",
      "w-engines/14162",
    ])
    expect(result.coverage.summary.supplements.entities).toBe(4)
    for (const optionId of supplementOptionIds)
      expect(
        result.catalog.options.some((option) => option.optionId === optionId),
      ).toBe(true)
  })

  it("attaches the same supplement options and effects to the fixed entities without duplicate entities", () => {
    const fallback = convert(absentSource)
    const result = convert(fixedSource325Data())
    const fixedEntityIds = new Set([
      "agents:Roxy",
      "w-engines:Crimson_Moon_Casket",
      "w-engines:Drill_Rig_Red-Axis",
      "w-engines:Identity_Inflection",
    ])
    expect(
      result.catalog.entities
        .map((entity) => entity.catalogEntityId)
        .filter((id) => id.startsWith("nanoka:")),
    ).toEqual([])
    expect(
      result.catalog.entities
        .map((entity) => entity.catalogEntityId)
        .filter((id) => fixedEntityIds.has(id)),
    ).toEqual([...fixedEntityIds].toSorted())
    expect(result.coverage.reverseGaps).toEqual([])
    expect(result.coverage.summary.supplements.entities).toBe(0)

    const fixedByOptionId = new Map(
      result.catalog.options.map((option) => [option.optionId, option]),
    )
    for (const optionId of supplementOptionIds) {
      const fallbackOption = fallback.catalog.options.find(
        (option) => option.optionId === optionId,
      )!
      const fixedOption = fixedByOptionId.get(optionId)!
      // 唯一允许的差异是容器实体：optionId、变体、effectIds、条件与语义
      // 全部保持不变。
      expect({
        ...fixedOption,
        catalogEntityId: fallbackOption.catalogEntityId,
      }).toEqual(fallbackOption)
      expect(fixedEntityIds.has(fixedOption.catalogEntityId)).toBe(true)
    }

    // 12014 没有固定记录，空记录登记只负责把补充实体与不可选选项挂到
    // 固定实体。
    expect(
      fixedByOptionId.get("nanoka:w-engines:12014:attacker-damage-reduction")
        ?.catalogEntityId,
    ).toBe("w-engines:Identity_Inflection")

    // 规则逐条深比较：effectId、参数、条件、受益者、唯一性与证据引用不变。
    expect(supplementRules(result)).toEqual(supplementRules(fallback))
    expect(supplementRules(result).length).toBeGreaterThan(0)

    const optionIds = result.catalog.options.map((option) => option.optionId)
    expect(new Set(optionIds).size).toBe(optionIds.length)
  })

  it("marks every fixed-source duplicate as a semantic-conflict migration entry without executable effects", () => {
    const result = convert(fixedSource325Data())
    const migratedEntities = new Set([
      "agents:Roxy",
      "w-engines:Crimson_Moon_Casket",
      "w-engines:Drill_Rig_Red-Axis",
    ])
    const migrated = result.coverage.records.filter((record) =>
      migratedEntities.has(record.catalogEntityId),
    )
    expect(migrated).toHaveLength(37)
    for (const record of migrated) {
      expect(record.status).toBe("unsupported")
      expect(record.reason).toBe("semantic-conflict")
      expect(record.effectIds).toEqual([])
      expect(record.explanation).toContain("nanoka:")
    }
    for (const effect of result.definitions.effects)
      expect(effect.effectId).not.toMatch(
        /^(?:agent:1621|w-engine:(?:13111|14162)):zzz-hp:/,
      )

    // Roxy 的 special 18 与正文 8% 冲突，不能被当作已修正的风化直接增伤。
    const weathered = migrated.find(
      (record) => record.stat === "special" && record.rawValue === 18,
    )!
    expect(weathered.explanation).toContain("8%")
    expect(
      result.definitions.effects.some((effect) =>
        effect.effectId.includes("eff-muppe3ty-86s1uf"),
      ),
    ).toBe(false)
  })

  it("preserves the reviewed supplement semantics after the entity switch", () => {
    const result = convert(fixedSource325Data())
    const rules = new Map(
      result.definitions.effects.flatMap((effect) =>
        effect.kind === "contribution"
          ? [[effect.effectId, effect] as const]
          : [],
      ),
    )
    const weathered = rules.get(
      "agent:1621:nanoka:additional-weathered-direct-damage",
    ) as ContributionRule
    expect(weathered.operation).toMatchObject({
      kind: "factor-contribution",
      channel: "windswept-direct-damage-coefficient-increase",
    })

    const crimsonSquad = rules.get(
      "w-engine:14162:nanoka:squad-damage-bonus",
    ) as ContributionRule
    expect(crimsonSquad.beneficiary).toEqual({ kind: "team-except-holder" })
    expect(
      result.catalog.options.find(
        (option) =>
          option.optionId === "nanoka:w-engines:14162:squad-damage-bonus",
      )!.variants[0]!.mechanism,
    ).toEqual({ kind: "squad-unique" })

    const crimsonCrit = rules.get(
      "w-engine:14162:nanoka:crit-rate",
    ) as ContributionRule
    expect(crimsonCrit.beneficiary).toEqual({ kind: "holder" })
    expect(crimsonCrit.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
    })

    const redAxis = rules.get(
      "w-engine:13111:nanoka:red-axis-talent",
    ) as ContributionRule
    expect(redAxis.when).toMatchObject({
      kind: "all",
      conditions: expect.arrayContaining([
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["basic", "dash"],
        },
        { kind: "one-of", fact: "hit.element", values: ["electric"] },
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
      ]),
    })
  })

  it("rejects drifted fixed-source records instead of silently overriding the corrected clause", () => {
    const data = fixedSource325Data()
    const special =
      data.agents[0]!.mindscapeBuffs![0]!.effectBlocks![1]!.effects[3]!
    special.value = 8
    expect(() => convert(data)).toThrow(/field value drifted/)
  })
})
