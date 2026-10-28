import { describe, expect, it } from "vitest"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE,
  PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_AGENT_ENTITY_IDS,
  verifyPheonyAdditionalAbilitySameFactionIndex,
} from "../scripts/static-effects/pheony-additional.ts"
import type {
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import fixture from "./fixtures/pheony-additional-source.json" with { type: "json" }

/**
 * PR-B1：菲欧妮（1641）额外能力[黑枝王牌]的四条 15% 暴伤记录在固定
 * ZZZ-HP 991bb0e 中是无条件 team 记录；块 note 与 Nanoka
 * `/passive/level/1641501—1641507/desc/1` 明确要求敌人处于[灼蚀]，
 * 且队伍中存在另一名[异常]角色或另一名同阵营角色。转换器把四条记录
 * 从 declared-unsupported 改为具名 corrected，并保留原始来源身份。
 */
const camp12 = ["1341", "1471", "1481", "1541", "1641"]
const differenceId = "pheony-additional-ability-team-condition"
const options = {
  anomaly: "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-4",
  anomalySettlement: "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-10",
  vortex: "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-11",
  luminize: "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-12",
} as const
const expectedChannels = {
  [options.anomaly]: "anomaly-critical-damage",
  [options.anomalySettlement]: "anomaly-settlement-critical-damage",
  [options.vortex]: "turbulence-critical-damage",
  [options.luminize]: "luminize-critical-damage",
} as const

const functions: SourceNormalization = {
  normalizeAgent: (entity) => ({
    ...entity,
    mindscapeBuffs: Array.from(
      { length: 7 },
      (_, index) => entity.mindscapeBuffs?.[index] ?? {},
    ),
  }),
  normalizeWengine: (entity) => entity,
  normalizeDriveDisc: (entity) => entity,
  collectEffectsFromPack: (pack) =>
    pack.effectBlocks?.flatMap((block) => block.effects) ?? pack.effects ?? [],
  applyAnomalyFlagsToPack: (pack) => pack,
}

const cloneAgent = (): SourceEntity =>
  structuredClone(fixture.agent) as SourceEntity

const convert = (agent: SourceEntity = cloneAgent()) =>
  convertSource(
    {
      agents: [agent],
      wengines: [],
      driveDiscs: [],
      skillSubcategories: [],
      followUpSkillRules: [],
    } satisfies SourceData,
    functions,
    [],
    [],
    [],
  )

const effectRecords = (agent: SourceEntity) =>
  agent.mindscapeBuffs![0]!.effectBlocks![0]!.effects

const mutateEffect = (
  id: string,
  mutate: (effect: SourceEffect) => void,
): SourceEntity => {
  const agent = cloneAgent()
  const effect = effectRecords(agent).find((entry) => entry.id === id)
  if (!effect) throw new Error(`missing fixture effect ${id}`)
  mutate(effect)
  return agent
}

const ruleFor = (output: ReturnType<typeof convert>, optionId: string) => {
  const option = output.catalog.options.find(
    (entry) => entry.optionId === optionId,
  )
  if (!option) throw new Error(`missing generated option ${optionId}`)
  const effectId = option.variants[0]!.effectIds[0]!
  const rule = output.definitions.effects.find(
    (entry) => entry.effectId === effectId,
  )
  if (!rule) throw new Error(`missing generated rule ${effectId}`)
  return { option, rule }
}

describe("Pheony additional ability conversion", () => {
  it("generates four corrected options with the OR eligibility contract", () => {
    const output = convert()
    expect(output.definitions.revision).toBe("58")
    for (const [key, optionId] of Object.entries(options)) {
      const option = output.catalog.options.find(
        (entry) => entry.optionId === optionId,
      )
      expect(option, key).toBeDefined()
      expect(option!.variants[0], key).toMatchObject({
        status: "corrected",
        maximumLayers: 1,
        applicability: {
          otherTeammateProfessions: ["异常"],
          otherTeammateAgentEntityIds: camp12,
        },
      })
      expect(option!.variants[0]!.differences, key).toContain(differenceId)
      expect(option!.variants[0]!.reason, key).toBeUndefined()
    }
  })

  it("keeps each of the four channels and the 15% value exactly once", () => {
    const output = convert()
    for (const [optionId, channel] of Object.entries(expectedChannels)) {
      const { rule } = ruleFor(output, optionId)
      expect(rule.kind, optionId).toBe("contribution")
      if (rule.kind !== "contribution") throw new Error("unreachable")
      expect(rule.beneficiary, optionId).toEqual({ kind: "team" })
      expect(rule.operation, optionId).toMatchObject({
        kind: "factor-contribution",
        channel,
        value: { kind: "parameter", unit: "ratio", name: "amount" },
      })
      expect(rule.parameters.amount, optionId).toMatchObject({
        kind: "constant",
        unit: "ratio",
        value: 0.15,
      })
    }
  })

  it("retains the fixed pointer and cites all seven Nanoka passive levels in both locales", () => {
    const output = convert()
    for (const [optionId] of Object.entries(expectedChannels)) {
      const { option } = ruleFor(output, optionId)
      const references = option.variants[0]!.references
      expect(
        references.some(
          (reference) =>
            reference.sourceId === "zzz-hp" &&
            reference.resourcePath ===
              "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        ),
        optionId,
      ).toBe(true)
      for (const level of [
        "1641501",
        "1641502",
        "1641503",
        "1641504",
        "1641505",
        "1641506",
        "1641507",
      ])
        for (const locale of ["zh", "en"] as const)
          expect(
            references.some(
              (reference) =>
                reference.sourceId === "nanoka-integrated" &&
                reference.locale === locale &&
                reference.resourcePath ===
                  `agents/1641/details.${locale}.json` &&
                reference.pointer === `/passive/level/${level}/desc/1`,
            ),
            `${optionId} ${locale} ${level}`,
          ).toBe(true)
      for (const memberId of camp12)
        expect(
          references.some(
            (reference) =>
              reference.sourceId === "nanoka-integrated" &&
              reference.resourcePath === "index.json" &&
              reference.pointer ===
                `/entities/agents/members/${memberId}/sourceRecord/camp`,
          ),
          `${optionId} camp ${memberId}`,
        ).toBe(true)
    }
  })

  it.each([
    [
      "stat",
      (effect: SourceEffect) => {
        effect.stat = "anomalyCritRate"
      },
    ],
    [
      "value",
      (effect: SourceEffect) => {
        effect.value = 25
      },
    ],
    [
      "target",
      (effect: SourceEffect) => {
        effect.applyTarget = "self"
      },
    ],
    [
      "profession",
      (effect: SourceEffect) => {
        effect.teamProfession = "异常"
      },
    ],
    [
      "enabledDefault",
      (effect: SourceEffect) => {
        effect.enabledDefault = false
      },
    ],
    [
      "new condition",
      (effect: SourceEffect) => {
        effect.conditions = { damageTypes: ["turbulence"] }
      },
    ],
  ])(
    "rejects a fixed-record %s drift instead of copying it",
    (_label, mutate) => {
      expect(() => convert(mutateEffect("eff-10", mutate))).toThrow(
        /Pheony additional ability/,
      )
    },
  )

  it("rejects a block-note condition drift", () => {
    const agent = cloneAgent()
    const block = agent.mindscapeBuffs![0]!.effectBlocks![0]!
    block.note = block.note!.replace(
      "队伍中存在其他[异常]角色或同阵营角色时触发",
      "队伍中存在其他[异常]角色时触发",
    )
    expect(() => convert(agent)).toThrow(/Pheony additional ability/)
  })
})

describe("Pheony additional ability faction evidence", () => {
  const indexBytes = readFileSync(
    new URL("../integrated/index.json", import.meta.url),
  )
  const index = JSON.parse(indexBytes.toString("utf8")) as {
    entities: {
      agents: {
        members: Record<string, { sourceRecord: { camp: number } }>
      }
    }
  }

  it("pins the verified integrated index and derives exactly camp 12", () => {
    expect(createHash("sha256").update(indexBytes).digest("hex")).toBe(
      PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE.sha256,
    )
    expect(verifyPheonyAdditionalAbilitySameFactionIndex(index)).toEqual([
      ...PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_AGENT_ENTITY_IDS,
    ])
  })

  it("rejects camp membership drift", () => {
    const changed = structuredClone(index)
    changed.entities.agents.members["1481"]!.sourceRecord.camp = 5
    expect(() =>
      verifyPheonyAdditionalAbilitySameFactionIndex(changed),
    ).toThrow(/faction camp changed/)
  })

  it("rejects an additional camp 12 member", () => {
    const changed = structuredClone(index)
    changed.entities.agents.members["1261"]!.sourceRecord.camp = 12
    expect(() =>
      verifyPheonyAdditionalAbilitySameFactionIndex(changed),
    ).toThrow(/faction membership changed/)
  })

  it("rejects a missing sourceRecord/camp Pointer", () => {
    const changed = structuredClone(index) as unknown as {
      entities: {
        agents: {
          members: Record<string, Record<string, unknown>>
        }
      }
    }
    delete changed.entities.agents.members["1341"]!["sourceRecord"]
    expect(() =>
      verifyPheonyAdditionalAbilitySameFactionIndex(changed),
    ).toThrow(/faction pointer missing|faction camp changed/)
  })
})
