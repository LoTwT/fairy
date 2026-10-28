import { describe, expect, it } from "vitest"
import type {
  SourceEntity,
  SourceNormalization,
  SourceData,
} from "../scripts/static-effects/source.ts"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { verifyPheonyM2BurnDurationArtifacts } from "../scripts/static-effects/pheony-m2.ts"
import { COMPLETE_STATE_OPTIONS } from "../scripts/static-effects/semantics.ts"
import type { ContributionRule } from "@randomplay/shared"
import fixture from "./fixtures/pheony-m2-source.json" with { type: "json" }

/**
 * PR-B3：菲欧妮（1641）影画 2[好奇心害不死猫]的“[灼烧]持续时间提升2秒”。
 *
 * 固定源把该条款编为 anomalyDuration +2、elementFilter 火、applyTarget team，
 * 却额外限定 conditions.damageTypes=turbulence。修正保留原 Pointer、数值与
 * 公开 optionId/effectId，把记录改为具名 corrected：目录使用
 * `independent-settlement` 伤害项要求，要求伤害项读取绑定持有者自己施加的
 * 原异常（holder-anomaly-source），持续秒数进入既有
 * `anomaly-duration-addition` 通道。元素限制仍由 applicability 的火属性和
 * 规则的命中元素条件承担，不把 turbulence 专用限制保留下来。
 */
const OPTION_ID =
  "agents:pheony:mindscape:2:blk-mindscapeBuffs-2-1:eff-mvdz21so-s2au9j"
const EFFECT_ID =
  "agent:1641:zzz-hp:eff-mvdz21so-s2au9j:blk-mindscapeBuffs-2-1:mindscape:2"
const ITEM_ID = "pheony:m2-burn-duration"
const DIFFERENCE_ID = "pheony-m2-holder-burn-duration"
const FIXED_POINTER_SUFFIX = "/mindscapeBuffs/2/effectBlocks/0/effects/1"

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

/**
 * 本夹具只包含 M2 块，不包含[灼蚀]完整状态所需的 17 条核心/影画记录；
 * 合成转换用例因此不登记菲欧妮完整状态选项，真实全量生成仍由正式登记
 * 覆盖（发布制品消费用例验证）。
 */
const nonPheonyCompleteStateOptions = COMPLETE_STATE_OPTIONS.filter(
  (entry) => entry.catalogEntityId !== "agents:pheony",
)

const convert = (
  agent: SourceEntity = cloneAgent(),
  normalization: SourceNormalization = functions,
) =>
  convertSource(
    {
      agents: [agent],
      wengines: [],
      driveDiscs: [],
      skillSubcategories: [],
      followUpSkillRules: [],
    } satisfies SourceData,
    normalization,
    [],
    [],
    nonPheonyCompleteStateOptions,
  )

const m2Block = (agent: SourceEntity) => {
  const block = agent.mindscapeBuffs?.[2]?.effectBlocks?.[0]
  if (block === undefined) throw new Error("missing Pheony M2 block")
  return block
}

const m2Record = (agent: SourceEntity) => {
  const record = m2Block(agent).effects?.[1]
  if (record === undefined) throw new Error("missing Pheony M2 duration record")
  return record
}

const optionFor = (output: ReturnType<typeof convert>) => {
  const option = output.catalog.options.find(
    (entry) => entry.optionId === OPTION_ID,
  )
  if (!option) throw new Error(`missing generated option ${OPTION_ID}`)
  return option
}

const ruleFor = (output: ReturnType<typeof convert>) => {
  const rule = output.definitions.effects.find(
    (entry) => entry.effectId === EFFECT_ID,
  )
  if (!rule) throw new Error(`missing generated rule ${EFFECT_ID}`)
  return rule as ContributionRule
}

const fixedReference = {
  sourceId: "zzz-hp",
  version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
  locale: "zh",
  resourcePath: "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
} as const

const nanokaReference = (locale: "zh" | "en") => ({
  sourceId: "nanoka-integrated",
  version: "3.3.12+19634983",
  locale,
  resourcePath: `agents/1641/details.${locale}.json`,
  pointer: "/talent/2/desc",
})

describe("Pheony M2 burn duration conversion", () => {
  it("generates a corrected independent-settlement option with a holder source requirement", () => {
    const output = convert()
    expect(output.definitions.revision).toBe("60")
    const option = optionFor(output)
    expect(option.target).toBe("team")
    const [variant] = option.variants
    expect(variant).toMatchObject({
      status: "corrected",
      configuration: { minimumMindscape: 2 },
      maximumLayers: 1,
      effectIds: [EFFECT_ID],
      differences: [DIFFERENCE_ID],
      applicability: { beneficiaryElements: ["fire"] },
    })
    expect(variant!.mechanism).toEqual({
      kind: "independent-settlement",
      isolateDamageItems: true,
      damageItemRequirements: [
        {
          itemId: ITEM_ID,
          stat: "attack",
          role: "base",
          allowedModes: ["standard-disorder", "standard-vortex"],
          source: "holder-anomaly-source",
        },
      ],
    })
  })

  it("retains the original fixed pointer and adds the Nanoka talent 2 evidence", () => {
    const output = convert()
    const [variant] = optionFor(output).variants
    expect(variant!.references).toContainEqual({
      ...fixedReference,
      pointer: expect.stringMatching(
        new RegExp(`${FIXED_POINTER_SUFFIX}$`, "u"),
      ),
    })
    expect(variant!.references).toContainEqual(nanokaReference("zh"))
    expect(variant!.references).toContainEqual(nanokaReference("en"))
  })

  it("compiles both seconds into the existing anomaly duration preparation channel", () => {
    const output = convert()
    const rule = ruleFor(output)
    expect(rule.operation).toEqual({
      kind: "factor-contribution",
      channel: "anomaly-duration-addition",
      value: { kind: "parameter", unit: "seconds", name: "amount" },
    })
    expect(rule.parameters).toEqual({
      amount: { kind: "constant", unit: "seconds", value: 2 },
    })
    expect(rule.beneficiary).toEqual({ kind: "team" })
    expect(rule.when).toEqual({
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["disorder", "vortex"],
        },
        { kind: "one-of", fact: "hit.element", values: ["fire"] },
      ],
    })
    // 不保留固定源的 turbulence 专用限制，也不产生乱流专用通道。
    expect(JSON.stringify(rule)).not.toContain("turbulence")
  })

  it("records the named correction and keeps the source record corrected", () => {
    const output = convert()
    const difference = output.catalog.differences.find(
      (entry) => entry.differenceId === DIFFERENCE_ID,
    )
    expect(difference).toBeDefined()
    expect(difference!.explanation).toContain("holder-anomaly-source")
    expect(difference!.explanation).toContain("turbulence")
    expect(difference!.references.length).toBeGreaterThan(0)
    const record = output.coverage.records.find(
      (entry) =>
        entry.catalogEntityId === "agents:pheony" &&
        entry.pointer.endsWith(FIXED_POINTER_SUFFIX),
    )
    expect(record).toMatchObject({
      status: "corrected",
      effectIds: [EFFECT_ID],
    })
  })

  it.each([
    [
      "element filter",
      (agent: SourceEntity) => {
        m2Record(agent).elementFilter = ["电"]
      },
    ],
    [
      "value",
      (agent: SourceEntity) => {
        m2Record(agent).value = 3
      },
    ],
    [
      "apply target",
      (agent: SourceEntity) => {
        m2Record(agent).applyTarget = "self"
      },
    ],
    [
      "damage types",
      (agent: SourceEntity) => {
        m2Record(agent).conditions = { damageTypes: ["disorder"] }
      },
    ],
    [
      "condition removal",
      (agent: SourceEntity) => {
        delete m2Record(agent).conditions
      },
    ],
    [
      "stat",
      (agent: SourceEntity) => {
        m2Record(agent).stat = "dmgBonus"
      },
    ],
    [
      "block note",
      (agent: SourceEntity) => {
        m2Block(agent).note =
          "菲欧妮对敌人施加[灼烧]效果时，该效果的持续时间提升3秒。"
      },
    ],
  ] as const)("rejects fixed-source drift in the %s", (_label, mutate) => {
    const agent = cloneAgent()
    mutate(agent)
    expect(() => convert(agent)).toThrow()
  })

  it.each([
    [
      "renamed block",
      (agent: SourceEntity) => {
        m2Block(agent).id = "blk-renamed-m2-burn-duration"
      },
    ],
    [
      "record moved to another block",
      (agent: SourceEntity) => {
        const sourceBlock = m2Block(agent)
        const movedRecord = sourceBlock.effects![1]!
        sourceBlock.effects = sourceBlock.effects!.filter(
          (_, index) => index !== 1,
        )
        agent.mindscapeBuffs![2]!.effectBlocks!.push({
          id: "blk-extra-m2-burn-duration",
          name: "extra",
          effects: [movedRecord],
        })
      },
    ],
    [
      "record moved to another rank",
      (agent: SourceEntity) => {
        const rankBlock = m2Block(agent)
        agent.mindscapeBuffs![2]!.effectBlocks = []
        agent.mindscapeBuffs![3]!.effectBlocks = [rankBlock]
      },
    ],
  ] as const)(
    "rejects a fixed M2 %s instead of falling back to the generic encoding",
    (_label, mutate) => {
      const agent = cloneAgent()
      mutate(agent)
      expect(() => convert(agent)).toThrow(/Pheony M2 burn duration/)
    },
  )

  it("rejects added, removed or unknown execution fields in the raw record", () => {
    const added = cloneAgent()
    ;(m2Record(added) as unknown as Record<string, unknown>).appliesToAnomaly =
      false
    expect(() => convert(added)).toThrow(/Holder anomaly duration registration/)

    const unknown = cloneAgent()
    ;(
      m2Record(unknown) as unknown as Record<string, unknown>
    ).futureExecutionField = true
    expect(() => convert(unknown)).toThrow(
      /Holder anomaly duration registration/,
    )

    const removed = cloneAgent()
    delete (m2Record(removed) as unknown as Record<string, unknown>).stackable
    expect(() => convert(removed)).toThrow(
      /Holder anomaly duration registration/,
    )
  })

  it("rejects added or unknown execution fields in the normalized record", () => {
    const normalizeWith = (
      fields: Record<string, unknown>,
    ): SourceNormalization => ({
      ...functions,
      normalizeAgent: (entity) => {
        const normalized = structuredClone(functions.normalizeAgent(entity))
        const record =
          normalized.mindscapeBuffs![2]!.effectBlocks![0]!.effects![1]!
        Object.assign(record, fields)
        return normalized
      },
    })
    expect(() =>
      convert(cloneAgent(), normalizeWith({ appliesToAnomaly: false })),
    ).toThrow(/Holder anomaly duration registration/)
    expect(() =>
      convert(cloneAgent(), normalizeWith({ futureExecutionField: true })),
    ).toThrow(/Holder anomaly duration registration/)
  })
})

type ConvertedOutput = ReturnType<typeof convert>

interface MutableVariant {
  status: string
  mechanism: {
    damageItemRequirements: {
      source: string
      allowedModes: string[]
    }[]
  }
  applicability: { beneficiaryElements: string[] }
  references: { sourceId: string; pointer: string }[]
}

interface MutableRule {
  when: unknown
  operation: { channel: string }
  parameters: { amount: { value: number } }
}

const mutableVariant = (output: ConvertedOutput): MutableVariant => {
  const option = output.catalog.options.find(
    (entry) => entry.optionId === OPTION_ID,
  )
  if (!option) throw new Error("missing M2 option")
  return option.variants[0] as unknown as MutableVariant
}

const mutableRule = (output: ConvertedOutput): MutableRule => {
  const rule = output.definitions.effects.find(
    (entry) => entry.effectId === EFFECT_ID,
  )
  if (!rule) throw new Error("missing M2 rule")
  return rule as unknown as MutableRule
}

const presentSourceState = {
  kind: "present",
  records: [
    {
      category: "agents",
      entityId: "pheony",
      rankKind: "mindscape",
      rank: 2,
      blockId: "blk-mindscapeBuffs-2-1",
      rawId: "eff-mvdz21so-s2au9j",
      stat: "anomalyDuration",
    },
  ],
} as const

describe("Pheony M2 burn duration generation guard", () => {
  it("accepts the frozen corrected artifact shape", () => {
    const output = convert()
    expect(() =>
      verifyPheonyM2BurnDurationArtifacts(
        output.definitions,
        output.catalog,
        presentSourceState,
      ),
    ).not.toThrow()
  })

  it("rejects a missing fixed record in the production source", () => {
    const output = convert()
    expect(() =>
      verifyPheonyM2BurnDurationArtifacts(output.definitions, output.catalog, {
        kind: "absent-required",
      }),
    ).toThrow()
  })

  it("rejects a fixed record location outside the reviewed block", () => {
    const output = convert()
    expect(() =>
      verifyPheonyM2BurnDurationArtifacts(output.definitions, output.catalog, {
        kind: "present",
        records: [
          {
            ...presentSourceState.records[0],
            blockId: "blk-renamed-m2-burn-duration",
          },
        ],
      }),
    ).toThrow()
  })

  it("skips the guard when the fixed M2 block is absent from a synthetic subset", () => {
    const output = structuredClone(convert())
    ;(output.catalog as unknown as { options: unknown[] }).options =
      output.catalog.options.filter((entry) => entry.optionId !== OPTION_ID)
    expect(() =>
      verifyPheonyM2BurnDurationArtifacts(output.definitions, output.catalog, {
        kind: "absent-subset",
      }),
    ).not.toThrow()
  })

  it.each([
    [
      "corrected status",
      (output: ConvertedOutput) => {
        mutableVariant(output).status = "converted"
      },
    ],
    [
      "holder source requirement",
      (output: ConvertedOutput) => {
        mutableVariant(output).mechanism.damageItemRequirements[0]!.source =
          "anomaly-source"
      },
    ],
    [
      "allowed preparation modes",
      (output: ConvertedOutput) => {
        mutableVariant(
          output,
        ).mechanism.damageItemRequirements[0]!.allowedModes = [
          "standard-disorder",
        ]
      },
    ],
    [
      "fire applicability",
      (output: ConvertedOutput) => {
        mutableVariant(output).applicability.beneficiaryElements = ["electric"]
      },
    ],
    [
      "fixed source Pointer",
      (output: ConvertedOutput) => {
        const reference = mutableVariant(output).references.find(
          (entry) => entry.sourceId === "zzz-hp",
        )
        if (!reference) throw new Error("missing fixed reference")
        reference.pointer =
          "/agents/52/mindscapeBuffs/2/effectBlocks/0/effects/0"
      },
    ],
    [
      "Nanoka evidence Pointer",
      (output: ConvertedOutput) => {
        const reference = mutableVariant(output).references.find(
          (entry) => entry.sourceId === "nanoka-integrated",
        )
        if (!reference) throw new Error("missing Nanoka reference")
        reference.pointer = "/talent/3/desc"
      },
    ],
    [
      "fire disorder/vortex condition",
      (output: ConvertedOutput) => {
        mutableRule(output).when = {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.damageKind",
              values: ["vortex"],
            },
            { kind: "one-of", fact: "hit.element", values: ["fire"] },
          ],
        }
      },
    ],
    [
      "duration channel",
      (output: ConvertedOutput) => {
        mutableRule(output).operation.channel = "turbulence-duration-addition"
      },
    ],
    [
      "duration value",
      (output: ConvertedOutput) => {
        mutableRule(output).parameters.amount.value = 3
      },
    ],
    [
      "named correction explanation",
      (output: ConvertedOutput) => {
        const difference = output.catalog.differences.find(
          (entry) => entry.differenceId === DIFFERENCE_ID,
        )
        if (!difference) throw new Error("missing difference")
        ;(difference as unknown as { explanation: string }).explanation =
          difference.explanation.replace(
            "holder-anomaly-source",
            "generic-source",
          )
      },
    ],
    [
      "named correction entry",
      (output: ConvertedOutput) => {
        ;(output.catalog as unknown as { differences: unknown[] }).differences =
          output.catalog.differences.filter(
            (entry) => entry.differenceId !== DIFFERENCE_ID,
          )
      },
    ],
    [
      "corrected option",
      (output: ConvertedOutput) => {
        ;(output.catalog as unknown as { options: unknown[] }).options =
          output.catalog.options.filter((entry) => entry.optionId !== OPTION_ID)
      },
    ],
    [
      "duration rule",
      (output: ConvertedOutput) => {
        ;(output.definitions as unknown as { effects: unknown[] }).effects =
          output.definitions.effects.filter(
            (entry) => entry.effectId !== EFFECT_ID,
          )
      },
    ],
  ] as const)("rejects %s drift", (_label, mutate) => {
    const output = structuredClone(convert())
    mutate(output)
    expect(() =>
      verifyPheonyM2BurnDurationArtifacts(
        output.definitions,
        output.catalog,
        presentSourceState,
      ),
    ).toThrow()
  })
})
