import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  CoreSkillLevel,
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { general, inputFor } from "./static-fixtures.ts"
import { resolveAgentAction } from "../../../data/src/skills/resolve.ts"
import type { AgentActions } from "../../../data/src/skills/types.ts"
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = read(
  "../../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog
const oracle = read("./fixtures/zzz-hp-static-catalog.json") as {
  sourceCommit: string
  tables: Record<string, unknown[]>
  cases: {
    pointer: string
    input: Record<string, number>
    expected: number
    unit: string
    effectIds: string[]
  }[]
}
const coverage = read(
  "../../../data/definitions/effects/static-coverage.json",
) as { records: { pointer: string; status: string }[] }

function referenceInput(pointer: string): StaticCatalogDamageInput {
  const vector = oracle.cases.find((entry) => entry.pointer === pointer)
  if (!vector) throw new Error(`Missing source fixture: ${pointer}`)
  return {
    ...Object.fromEntries(
      Object.entries(vector.input).map(([key, index]) => [
        key,
        structuredClone(oracle.tables[key]![index]),
      ]),
    ),
    definitions,
    catalog,
  } as unknown as StaticCatalogDamageInput
}

function calculateCatalogResult(
  input: StaticCatalogDamageInput,
): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function agentInput(
  agentEntityId: string,
  optionIds: readonly string[],
  mindscapeRank: MindscapeRank = 0,
  coreSkillLevel: CoreSkillLevel = 7,
  potentialLevel?: number,
): StaticCatalogDamageInput {
  const base = inputFor()
  return {
    ...base,
    definitions,
    catalog,
    bindings: [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: agentEntityId,
        eligible: true,
        configuration: {
          mindscapeRank,
          coreSkillLevel,
          ...(potentialLevel === undefined ? {} : { potentialLevel }),
        } as Extract<
          StaticCatalogDamageInput["bindings"][number],
          { kind: "agent" }
        >["configuration"],
      },
    ],
    actorSources: [{ entityId: "entity:attacker", agentEntityId }],
    selections: optionIds.map((optionId) => ({
      optionId,
      bindingId: "binding:static",
      layers: 1,
    })),
    hit: {
      ...base.hit,
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "base",
          stat: "attack",
          statSource: { entityId: "entity:attacker" },
          damageMultiplier: 2,
        },
      ],
    },
    damage: base.damage as Extract<
      StaticCatalogDamageInput["damage"],
      { kind: "regular" }
    >,
  }
}

/** 固定来源夹具输入上补充潜能等级；夹具绑定保留其原有核心与影画档位。 */
function withPotentialLevel(
  input: StaticCatalogDamageInput,
  potentialLevel: number,
): StaticCatalogDamageInput {
  return {
    ...input,
    bindings: input.bindings.map((binding) =>
      binding.kind === "agent"
        ? {
            ...binding,
            configuration: {
              ...binding.configuration,
              potentialLevel,
            },
          }
        : binding,
    ) as StaticCatalogDamageInput["bindings"],
  }
}

function actionWithDisc(
  id: string,
  suffix: string,
  discId: string,
  discKey: string,
  actionOptions: {
    potentialLevel?: number
    additionalAbilityActive?: boolean
  } = {},
): StaticCatalogDamageInput {
  const agent = read(
    `../../../data/definitions/skills/agents/${id}.json`,
  ) as AgentActions
  const action = resolveAgentAction({
    agent,
    actionId: `action:agent:${id}:action:${suffix}`,
    mindscapeRank: 0,
    levels: {
      basic: { mode: "trained", value: 12 },
      assist: { mode: "trained", value: 12 },
      dodge: { mode: "trained", value: 12 },
      special: { mode: "trained", value: 12 },
      chain: { mode: "trained", value: 12 },
    },
    ...(actionOptions.potentialLevel === undefined
      ? {}
      : { potentialLevel: actionOptions.potentialLevel }),
    ...(actionOptions.additionalAbilityActive === undefined
      ? {}
      : { additionalAbilityActive: actionOptions.additionalAbilityActive }),
  })
  if (
    !action.ok ||
    action.calculation.kind !== "damage" ||
    !action.skillCategory
  )
    throw new Error("Expected resolved damage action")
  expect(action.calculation.segments).toHaveLength(1)
  const segment = action.calculation.segments[0]!
  const base = agentInput(id, [])
  const options = catalog.options.filter((option) =>
    option.optionId.startsWith(`drive-discs:${discKey}:setPieces:2:`),
  )
  expect(options.length).toBeGreaterThan(0)
  const [firstItem, ...remainingItems] = segment.damageItems.map((item) => ({
    ...item,
    mode: "direct" as const,
    role: "base" as const,
    statSource: { entityId: "entity:attacker" as const },
  }))
  if (!firstItem) throw new Error("Expected nonempty action damage items")
  return {
    ...base,
    bindings: [
      {
        bindingId: "binding:static",
        kind: "drive-disc",
        holderId: "entity:attacker",
        sourceEntityId: discId,
        eligible: true,
        configuration: { setPieces: 2 },
      },
    ],
    selections: options.map((option) => ({
      optionId: option.optionId,
      bindingId: "binding:static",
      layers: 1,
    })),
    hit: {
      ...base.hit,
      actionId: action.actionId,
      skillCategory: action.skillCategory,
      skillTargetIds: action.skillTargetIds,
      skillTags: action.skillTags,
      element: segment.element,
      damageItems: [firstItem, ...remainingItems],
    },
  }
}

describe("published conversion boundaries", () => {
  it.each([
    [1000, 1.8],
    [3500, 2.55],
    [4000, 2.55],
  ])(
    "converts Sunna M6 attack %s into the described critical damage",
    (attack, factor) => {
      const input = agentInput(
        "1491",
        ["agents:sunna:mindscape:6:blk-legacy:legacy-self-critDmg"],
        6,
      )
      const result = calculateCatalogResult({
        ...input,
        world: {
          ...input.world,
          entities: input.world.entities.map((entity) =>
            entity.kind === "actor" && entity.entityId === input.hit.actorId
              ? {
                  ...entity,
                  generalStats: {
                    ...entity.generalStats,
                    attack: general(attack!),
                  },
                }
              : entity,
          ),
        },
      })
      expect(result.factors.critical?.critical).toBeCloseTo(factor!, 8)
    },
  )

  it.each([
    [120, 2000],
    [220, 3200],
    [250, 3200],
  ])("caps Qingyi's attack conversion at impact %s", (impact, baseDamage) => {
    const input = agentInput("1251", [
      "agents:qingyi:mindscape:0:blk-ms4b9fw6-467qoj:eff-ms4b9fw6-990jlw",
    ])
    const result = calculateCatalogResult({
      ...input,
      world: {
        ...input.world,
        entities: input.world.entities.map((entity) =>
          entity.kind === "actor" && entity.entityId === input.hit.actorId
            ? {
                ...entity,
                generalStats: {
                  ...entity.generalStats,
                  impact: general(impact!),
                },
              }
            : entity,
        ),
      },
    })
    expect(result.factors.nonCritical.baseDamage).toBe(baseDamage)
  })

  it("keeps Lucia M6 on initial health when her own veil increases current health", () => {
    const input = agentInput(
      "1451",
      [
        "agents:lucia:mindscape:6:blk-legacy:legacy-self-atk",
        "agents:lucia:mindscape:0:blk-ms46hxws-mu8xs8:eff-ms46hxws-g1rj8f",
      ],
      6,
    )
    const result = calculateCatalogResult(input)
    // Initial health 24000 gives 480 attack even after the separate 5% health buff.
    expect(result.factors.nonCritical.baseDamage).toBe(2960)
  })

  const cissiaDefenseOptions = [
    "agents:cissia:mindscape:0:blk-ms4l86mv-s5y0rv:eff-ms4l86mv-xyl5lp",
    "agents:cissia:mindscape:0:blk-ms4l86mv-s5y0rv:eff-ms4lam8x-a2cpjw",
    "agents:cissia:mindscape:1:blk-legacy:legacy-team-reduceDefense",
    "agents:cissia:mindscape:1:blk-legacy:eff-ms4lkt33-igdjwu",
  ]
  it.each([3.68, 4, 10])(
    "caps Cissia's core plus M1 at energy regeneration %s",
    (energyRegen) => {
      const input = agentInput("1521", cissiaDefenseOptions, 1)
      const result = calculateCatalogResult({
        ...input,
        hit: { ...input.hit, element: "electric" },
        inputs: cissiaDefenseOptions.flatMap((optionId) =>
          catalog.options
            .find((option) => option.optionId === optionId)!
            .variants.flatMap((variant) =>
              variant.inputs.map((requirement) => ({
                bindingId: "binding:static" as const,
                name: requirement.name,
                value: { unit: requirement.unit, value: energyRegen },
              })),
            ),
        ),
      })
      const reduction = result.evaluation.contributions
        .filter(
          (contribution) =>
            contribution.address.kind === "factor" &&
            contribution.address.channel === "target-defense-adjustment",
        )
        .reduce((total, contribution) => total - contribution.value.value, 0)
      expect(reduction).toBeCloseTo(0.35, 6)
    },
  )

  it.each([1, 6] as const)(
    "rejects Cissia's M1 defense enhancement at unverified core level %s",
    (level) => {
      for (const optionId of cissiaDefenseOptions.slice(2)) {
        const result = calculateStaticDamageFromCatalog({
          ...agentInput("1521", [optionId], 1, level),
          inputs: catalog.options
            .find((option) => option.optionId === optionId)!
            .variants.flatMap((variant) =>
              variant.inputs.map((requirement) => ({
                bindingId: "binding:static" as const,
                name: requirement.name,
                value: { unit: requirement.unit, value: 4 },
              })),
            ),
        })
        expect(result.ok).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some((issue) => issue.code === "MISSING_RANK"),
          ).toBe(true)
      }
    },
  )

  it("keeps Cissia's independent M1 resistance effect available at lower core levels", () => {
    const input = agentInput(
      "1521",
      ["agents:cissia:mindscape:1:blk-ms4lpjc1-18nt91:eff-ms4lpjc1-o5rpae"],
      1,
      1,
    )
    const result = calculateCatalogResult({
      ...input,
      hit: { ...input.hit, element: "electric" },
    })
    expect(result.factors.nonCritical.resistance).toBeCloseTo(1.05, 8)
  })
})

describe("fixed-source catalog conformance", () => {
  it.each([
    ["1391", "0012", 1.15],
    ["1411", "0013", 1.15],
    ["1381", "0019", 1.15],
    ["1381", "0006", 1],
    ["1381", "0020", 1],
  ] as const)(
    "applies the follow-up set bonus to %s/%s at %f",
    (id, suffix, multiplier) => {
      const input = actionWithDisc(id, suffix, "32900", "SuitShadow")
      expect(
        calculateCatalogResult(input).nonCritical /
          calculateCatalogResult({ ...input, selections: [] }).nonCritical,
      ).toBeCloseTo(multiplier, 12)
    },
  )
  it("gates S0 Anby chain/ultimate follow-up identity on potential and the explicit fact", () => {
    const ratio = (input: StaticCatalogDamageInput) =>
      calculateCatalogResult(input).nonCritical /
      calculateCatalogResult({ ...input, selections: [] }).nonCritical
    // 潜能 0：保持连携/终结原本分类，不携带追加攻击身份
    expect(
      ratio(
        actionWithDisc("1381", "0014", "32900", "SuitShadow", {
          potentialLevel: 0,
        }),
      ),
    ).toBeCloseTo(1, 12)
    expect(
      ratio(
        actionWithDisc("1381", "0015", "32900", "SuitShadow", {
          potentialLevel: 0,
        }),
      ),
    ).toBeCloseTo(1, 12)
    // 潜能 1—6 且显式断言额外能力生效：视为追加攻击
    for (const suffix of ["0014", "0015"] as const)
      expect(
        ratio(
          actionWithDisc("1381", suffix, "32900", "SuitShadow", {
            potentialLevel: 6,
            additionalAbilityActive: true,
          }),
        ),
      ).toBeCloseTo(1.15, 12)
    // 潜能 1—6 但额外能力未生效：不携带追加攻击身份
    expect(
      ratio(
        actionWithDisc("1381", "0014", "32900", "SuitShadow", {
          potentialLevel: 6,
          additionalAbilityActive: false,
        }),
      ),
    ).toBeCloseTo(1, 12)
    // 潜能 1—6 缺必填事实：数据解析拒绝
    expect(() =>
      actionWithDisc("1381", "0014", "32900", "SuitShadow", {
        potentialLevel: 6,
      }),
    ).toThrow(/additionalAbilityActive/)
  })

  it.each([
    ["0002", 1.15],
    ["0003", 1.15],
    ["0021", 1.15],
    ["0022", 1.15],
    ["0015", 1.15],
    ["0001", 1],
  ] as const)(
    "applies the basic set bonus to Hugo %s at %f",
    (suffix, multiplier) => {
      const input = actionWithDisc("1291", suffix, "33300", "SuitDawnsBloom")
      expect(
        calculateCatalogResult(input).nonCritical /
          calculateCatalogResult({ ...input, selections: [] }).nonCritical,
      ).toBeCloseTo(multiplier, 12)
    },
  )

  it("matches Astra's M6 chord bonuses through the action targets, preserving enhanced-special identity", () => {
    const agent = read(
      "../../../data/definitions/skills/agents/1311.json",
    ) as AgentActions
    const base = agentInput(
      "1311",
      ["agents:astrayao:mindscape:6:blk-legacy:eff-ms38u6vr-0upby4"],
      6,
    )
    for (const [suffix, category, multiplier] of [
      ["0020", "enhanced-special", 2],
      ["0021", "special", 2],
      ["0003", "basic", 1],
    ] as const) {
      const action = agent.actions.find(
        (entry) => entry.actionId === `action:agent:1311:action:${suffix}`,
      )!
      expect(action.skillCategory).toBe(category)
      const input = {
        ...base,
        hit: {
          ...base.hit,
          actionId: action.actionId,
          skillCategory: category,
          skillTargetIds: action.skillTargetIds,
          element: "ether" as const,
        },
      }
      const selected = calculateCatalogResult(input)
      const disabled = calculateCatalogResult({ ...input, selections: [] })
      expect(selected.nonCritical / disabled.nonCritical).toBeCloseTo(
        multiplier,
        12,
      )
    }
  })

  it("consumes the resolved Nicole hits and the existing core debuff to reproduce the training sample", () => {
    const agent = read(
      "../../../data/definitions/skills/agents/1031.json",
    ) as AgentActions
    const action = resolveAgentAction({
      agent,
      actionId: "action:agent:1031:basic-enhanced-1",
      mindscapeRank: 6,
      levels: { basic: { mode: "effective", value: 15 } },
      requireIndividualHits: true,
    })
    if (
      !action.ok ||
      action.calculation.kind !== "damage" ||
      !action.skillCategory
    )
      throw new Error("fixture")
    const base = agentInput(
      "1031",
      ["agents:nicole:mindscape:0:blk-legacy:legacy-team-reduceDefense"],
      6,
    )
    if (base.damage.kind !== "regular") throw new Error("fixture")
    const world = {
      ...base.world,
      entities: base.world.entities.map((entity) =>
        entity.kind === "actor" && entity.entityId === "entity:attacker"
          ? {
              ...entity,
              generalStats: {
                ...entity.generalStats,
                attack: general(649.1691),
              },
              directStats: {
                ...entity.directStats,
                penetrationRatio: { baseValue: 0, additions: [] },
              },
            }
          : entity,
      ),
    }
    const displayed = action.calculation.segments.flatMap((segment) => {
      const result = calculateCatalogResult({
        ...base,
        world,
        hit: {
          ...base.hit,
          actionId: action.actionId,
          skillCategory: action.skillCategory!,
          skillTargetIds: action.skillTargetIds,
          skillTags: action.skillTags,
          element: segment.element,
          damageItems: segment.damageItems.map((item) => ({
            ...item,
            mode: "direct" as const,
            role: "base" as const,
            statSource: { entityId: "entity:attacker" as const },
          })) as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
        },
        damage: {
          ...(base.damage as Extract<
            StaticCatalogDamageInput["damage"],
            { kind: "regular" }
          >),
          defense: {
            attackerLevel: 60,
            targetBaseDefense: 921.04,
            defensePercentageAdjustments: [],
            penetrationValues: [],
          },
        },
      })
      return Array<number>(segment.repeat).fill(Math.ceil(result.nonCritical))
    })
    expect(displayed).toEqual([342, 144, 144, 144])
  })
  it("accepts assist follow-ups as assist scope and uncategorized damage without turning either into an entry", () => {
    for (const skillCategory of [
      "assist-follow-up",
      "uncategorized",
    ] as const) {
      const base = agentInput("1031", [])
      expect(
        calculateStaticDamageFromCatalog({
          ...base,
          hit: { ...base.hit, skillCategory },
        }).ok,
      ).toBe(true)
    }
  })
  it("applies the selected assist bonus to an assist follow-up", () => {
    const base = agentInput("1031", [])
    const input: StaticCatalogDamageInput = {
      ...base,
      bindings: [
        {
          bindingId: "binding:static",
          kind: "drive-disc",
          holderId: "entity:attacker",
          sourceEntityId: "31800",
          eligible: true,
          configuration: { setPieces: 4 },
        },
      ],
      selections: [
        {
          bindingId: "binding:static",
          optionId:
            "drive-discs:chaos-jazz:setPieces:4:blk-legacy:eff-ms0fd373-nsyrwm",
          layers: 1,
        },
      ],
      hit: { ...base.hit, skillCategory: "assist-follow-up" },
    }
    expect(
      calculateCatalogResult(input).nonCritical /
        calculateCatalogResult({ ...input, selections: [] }).nonCritical,
    ).toBeCloseTo(1.2, 12)
  })
  it.each(["anomaly", "anomaly-settlement", "vortex", "disorder"] as const)(
    "consumes generic anomaly bonuses in the final %s damage path",
    (kind) => {
      const input = referenceInput(
        "/driveDiscs/4/fourPieceBuffs/effectBlocks/0/effects/1",
      )
      if (input.damage.kind !== "anomaly") throw new Error("fixture")
      const request = { ...input, damage: { ...input.damage, kind } }
      const selected = calculateCatalogResult(request)
      const disabled = calculateCatalogResult({ ...request, selections: [] })
      // Fixed-source Chained four-piece: +16% in anomaly/release/vortex, not disorder.
      const multiplier = kind === "disorder" ? 1 : 1.16
      expect(selected.factors.nonCritical["anomalyDamageBonus"]).toBeCloseTo(
        multiplier,
        12,
      )
      expect(selected.expected / disabled.expected).toBeCloseTo(multiplier, 12)
    },
  )
  it.each(["anomaly", "anomaly-settlement", "vortex", "disorder"] as const)(
    "consumes generic anomaly critical contributions in the final %s damage path",
    (kind) => {
      const input = referenceInput(
        "/agents/43/mindscapeBuffs/0/effectBlocks/1/effects/1",
      )
      const criticalDamage = referenceInput(
        "/agents/43/mindscapeBuffs/0/effectBlocks/1/effects/2",
      )
      if (input.damage.kind !== "anomaly") throw new Error("fixture")
      const request = {
        ...input,
        selections: [...input.selections, ...criticalDamage.selections],
        damage: { ...input.damage, kind },
      }
      const selected = calculateCatalogResult(request)
      const disabled = calculateCatalogResult({ ...request, selections: [] })
      // Jane's explicit 40% anomaly critical rate and 50% damage are summed once.
      expect(selected.criticalRate).toBe(kind === "disorder" ? 0 : 0.4)
      expect(selected.expected / disabled.expected).toBeCloseTo(
        kind === "disorder" ? 1 : 1 + 0.4 * 0.5,
        12,
      )
    },
  )
  it("keeps an explicit anomaly scope narrower than a generic anomaly bonus", () => {
    const input = referenceInput(
      "/agents/37/mindscapeBuffs/2/effectBlocks/0/effects/0",
    )
    if (input.damage.kind !== "anomaly") throw new Error("fixture")
    for (const kind of ["anomaly", "anomaly-settlement", "vortex"] as const) {
      const request = { ...input, damage: { ...input.damage, kind } }
      const selected = calculateCatalogResult(request)
      const disabled = calculateCatalogResult({ ...request, selections: [] })
      expect(selected.expected / disabled.expected).toBeCloseTo(
        kind === "anomaly" ? 1.15 : 1,
        12,
      )
    }
  })
  it("consumes Burnice's skill multiplier only for the selected matching hit", () => {
    const input = referenceInput(
      "/agents/26/mindscapeBuffs/0/effectBlocks/1/effects/0",
    )
    const selected = calculateCatalogResult(input)
    const disabled = calculateCatalogResult({ ...input, selections: [] })
    expect(
      selected.factors.nonCritical["baseDamage"]! -
        disabled.factors.nonCritical["baseDamage"]!,
    ).toBeCloseTo(3.5 * 500, 12)
    expect(selected.expected / disabled.expected).toBeCloseTo(23.5 / 20, 12)
    const unrelated: StaticCatalogDamageInput = {
      ...input,
      hit: {
        ...input.hit,
        skillCategory: "basic",
        skillTargetIds: [],
        skillTags: [],
      },
    }
    expect(calculateCatalogResult(unrelated).expected).toBe(
      calculateCatalogResult({ ...unrelated, selections: [] }).expected,
    )
  })
  it("preserves The Vault's different self/team targets across refinement ranks", () => {
    const option = catalog.options.find(
      (o) =>
        o.optionId ===
        "w-engines:The_Vault:refinement:blk-legacy:legacy-self-dmgBonus",
    )!
    const input = agentInput("1311", [])
    const holder = input.world.entities[0]!
    if (holder.kind !== "actor") throw new Error("fixture")
    for (const [refinement, expectedBonus] of [
      [1, 0],
      [2, 0.175],
    ] as const) {
      const result = calculateStaticDamageFromCatalog({
        ...input,
        world: {
          ...input.world,
          entities: [
            ...input.world.entities,
            { ...holder, entityId: "entity:teammate" },
          ],
        },
        actorSources: [
          ...input.actorSources,
          { entityId: "entity:teammate", agentEntityId: "1311" },
        ],
        bindings: [
          {
            kind: "w-engine",
            bindingId: "binding:weapon",
            sourceEntityId: "13103",
            holderId: "entity:attacker",
            eligible: true,
            configuration: { refinement },
          },
        ],
        selections: [
          { optionId: option.optionId, bindingId: "binding:weapon", layers: 1 },
        ],
        hit: {
          ...input.hit,
          actorId: "entity:teammate",
          element: "ether",
          damageItems: [
            {
              ...input.hit.damageItems[0],
              statSource: { entityId: "entity:teammate" },
            },
          ],
        },
      })
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (result.ok)
        expect(result.value.factors.nonCritical["damageBonus"]).toBe(
          1 + expectedBonus,
        )
    }
  })
  /**
   * 本修订按 Nanoka potentialDetail 修正的来源位置仍在上游参考集中，
   * 但不按上游期望值比对（原值只有固定档、叠层近似或缺少门槛）；
   * 它们由本文件后面的具名潜能用例与覆盖状态单独验证。
   */
  const potentialCorrectedPointers = new Set([
    "/agents/1/mindscapeBuffs/0/effectBlocks/2/effects/0",
    "/agents/1/mindscapeBuffs/0/effectBlocks/2/effects/1",
    "/agents/26/mindscapeBuffs/0/effectBlocks/3/effects/0",
    "/agents/26/mindscapeBuffs/0/effectBlocks/3/effects/1",
    "/agents/29/mindscapeBuffs/0/effectBlocks/2/effects/0",
    "/agents/34/mindscapeBuffs/0/effectBlocks/0/effects/0",
    "/agents/34/mindscapeBuffs/0/effectBlocks/0/effects/1",
    "/agents/34/mindscapeBuffs/0/effectBlocks/2/effects/0",
    "/agents/34/mindscapeBuffs/0/effectBlocks/2/effects/1",
    "/agents/43/mindscapeBuffs/0/effectBlocks/2/effects/0",
    "/agents/47/mindscapeBuffs/0/effectBlocks/0/effects/0",
    "/agents/47/mindscapeBuffs/0/effectBlocks/2/effects/0",
    "/agents/47/mindscapeBuffs/0/effectBlocks/2/effects/1",
    "/agents/49/mindscapeBuffs/0/effectBlocks/0/effects/1",
    "/agents/56/mindscapeBuffs/0/effectBlocks/0/effects/2",
    "/agents/56/mindscapeBuffs/0/effectBlocks/1/effects/1",
  ])
  /** 已合并到完整档位选项、不再独立可选的部分记录。 */
  const potentialMergedPointers = new Set([
    "/agents/43/mindscapeBuffs/0/effectBlocks/2/effects/1",
    "/agents/56/mindscapeBuffs/0/effectBlocks/2/effects/0",
    "/agents/56/mindscapeBuffs/0/effectBlocks/2/effects/1",
  ])
  const potentialExplainedPointers = new Set([
    ...potentialCorrectedPointers,
    ...potentialMergedPointers,
  ])
  // 四条 core7 固定来源参考继续执行；corrected 只表示新增低档参数/差额语义。
  const coreRankExpandedPointers = new Set([
    "/agents/7/mindscapeBuffs/0/effectBlocks/0/effects/0",
    "/agents/7/mindscapeBuffs/2/effectBlocks/0/effects/0",
    "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/0",
    "/agents/35/mindscapeBuffs/6/effectBlocks/0/effects/0",
  ])
  it("accounts for every converted source position with an independent reference result", () => {
    expect(oracle.sourceCommit).toBe(catalog.source.commit)
    expect(oracle.cases.map((c) => c.pointer).toSorted()).toEqual(
      coverage.records
        .filter(
          (r) =>
            r.status === "converted" ||
            potentialExplainedPointers.has(r.pointer) ||
            coreRankExpandedPointers.has(r.pointer),
        )
        .map((r) => r.pointer)
        .toSorted(),
    )
  })
  it("matches each converted record in its actual rank and hit context", () => {
    for (const vector of oracle.cases) {
      if (potentialExplainedPointers.has(vector.pointer)) continue
      const values = Object.fromEntries(
        Object.entries(vector.input).map(([key, index]) => [
          key,
          oracle.tables[key]![index],
        ]),
      )
      const input = {
        ...values,
        definitions,
        catalog,
      } as unknown as StaticCatalogDamageInput
      const result = calculateStaticDamageFromCatalog(input)
      expect(
        result.ok,
        `${vector.pointer}: ${result.ok ? "" : JSON.stringify(result.issues)}`,
      ).toBe(true)
      if (!result.ok) continue
      const contributions = [
        ...result.value.evaluation.contributions,
        ...(result.value.preparations ?? []).flatMap((p) => p.contributions),
      ]
      const actual = contributions
        .filter(
          (c) =>
            vector.effectIds.includes(c.origin.effectId) &&
            c.origin.beneficiaryId === input.hit.actorId,
        )
        .reduce((sum, c) => sum + c.value.value, 0)
      expect(actual, vector.pointer).toBeCloseTo(
        vector.expected,
        vector.unit === "ratio" || vector.unit === "multiplier" ? 6 : 4,
      )
    }
  }, 120_000)
  it("keeps Astra M2 as one parameter modification at every verified core level", () => {
    const base = catalog.options.find((o) =>
      o.optionId.endsWith("eff-ms38hwcr-m9hn4v"),
    )!
    const corrected = catalog.options.filter((o) =>
      o.variants.some((v) => v.differences.includes("astra-mindscape-2")),
    )
    const rates = [0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.35]
    for (const mindscape of [0, 2, 6] as const)
      for (const [i, rate] of rates.entries()) {
        const input = agentInput(
          "1311",
          [
            base.optionId,
            ...(mindscape >= 2 ? corrected.map((o) => o.optionId) : []),
          ],
          mindscape,
        )
        const result = calculateStaticDamageFromCatalog({
          ...input,
          bindings: [
            {
              ...input.bindings[0]!,
              configuration: {
                coreSkillLevel: (i + 1) as 1,
                mindscapeRank: mindscape,
              },
            } as StaticCatalogDamageInput["bindings"][number],
          ],
          inputs: [
            {
              bindingId: "binding:static",
              name: base.variants[0].inputs[0]!.name,
              value: { unit: "attack-points", value: 1000 },
            },
          ],
        })
        expect(result.ok).toBe(true)
        if (result.ok)
          expect(result.value.factors.nonCritical["baseDamage"]).toBeCloseTo(
            2 * (1000 + 1000 * (rate + (mindscape >= 2 ? 0.19 : 0))),
            8,
          )
      }
    for (const [attack, expected] of [
      [0, 0],
      [4000, 1600],
    ]) {
      const input = agentInput(
        "1311",
        [base.optionId, ...corrected.map((o) => o.optionId)],
        6,
      )
      const result = calculateStaticDamageFromCatalog({
        ...input,
        inputs: [
          {
            bindingId: "binding:static",
            name: base.variants[0].inputs[0]!.name,
            value: { unit: "attack-points", value: attack! },
          },
        ],
      })
      expect(result.ok).toBe(true)
      // The fixed upstream now agrees at core level 7; Fairy still modifies one conversion across all verified levels.
      if (result.ok)
        expect(result.value.factors.nonCritical["baseDamage"]).toBe(
          2 * (1000 + expected!),
        )
    }
  })
  it("consumes the actual luminize mapping once and preserves both explicit-lumiflux M6 corrections", () => {
    const mapping = catalog.options.find((o) =>
      o.variants.some((v) => v.parameterMapping),
    )!
    const m6 = catalog.options.filter((o) =>
      o.variants.some((v) =>
        v.differences.includes("luminize-explicit-element"),
      ),
    )
    const input = agentInput("1581", [mapping.optionId], 6)
    if (input.damage.kind !== "regular") throw new Error("fixture")
    const history = {
      kind: "actor",
      entityId: "entity:source",
      teamId: "team:players",
      generalStats: {},
      directStats: {},
    } as const
    const luminous: StaticCatalogDamageInput = {
      ...input,
      world: {
        ...input.world,
        entities: input.world.entities.map((e) =>
          e.kind === "actor" && e.entityId === "entity:attacker"
            ? {
                ...e,
                generalStats: {
                  ...e.generalStats,
                  anomalyProficiency: general(400),
                },
              }
            : e,
        ),
      },
      actorSources: [
        ...input.actorSources,
        { entityId: "entity:source", agentEntityId: "1311" },
      ],
      snapshots: [
        {
          snapshotId: "snapshot:source",
          atSeconds: 0,
          world: {
            ...input.world,
            entities: [...input.world.entities, history],
          },
          attributes: [
            {
              entityId: "entity:source",
              stat: "attack",
              stage: "current",
              value: { unit: "attack-points", value: 2500 },
            },
            {
              entityId: "entity:source",
              stat: "anomalyProficiency",
              stage: "current",
              value: { unit: "anomaly-proficiency-points", value: 300 },
            },
            {
              entityId: "entity:source",
              stat: "penetrationRatio",
              stage: "current",
              value: { unit: "ratio", value: 0.25 },
            },
          ],
        },
      ],
      hit: {
        ...input.hit,
        element: "lumiflux",
        damageItems: [
          {
            ...input.hit.damageItems[0],
            statSource: {
              entityId: "entity:source",
              snapshotId: "snapshot:source",
            },
          },
        ],
      },
      damage: {
        ...input.damage,
        kind: "luminize",
        anomalyDamageBonus: [],
        refringe: { mode: "settled", multiplier: 1.38 },
        anomalySource: {
          entityId: "entity:source",
          snapshotId: "snapshot:source",
          level: 50,
        },
        luminizeMultiplier: {
          baseLuminizeMultiplier: 3.2,
          multiplicativeLuminizeMultiplierAdjustments: [],
        },
      },
    }
    const result = calculateStaticDamageFromCatalog(luminous)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) {
      expect(result.value.factors.nonCritical["luminizeMultiplier"]).toBe(4)
      expect(result.value.factors.nonCritical["anomalyProficiency"]).toBe(3)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(5000)
      expect(result.value.factors.nonCritical["refringe"]).toBe(1.38)
      const withAnomalyBonus = calculateCatalogResult({
        ...luminous,
        bindings: [
          ...luminous.bindings,
          {
            kind: "drive-disc",
            bindingId: "binding:disc",
            sourceEntityId: "33800",
            holderId: "entity:attacker",
            eligible: true,
            configuration: { setPieces: 4 },
          },
        ],
        selections: [
          ...luminous.selections,
          {
            optionId:
              "drive-discs:SuitNotesFromtheChained:setPieces:4:blk-legacy:legacy-self-anomalyDmgBonus",
            bindingId: "binding:disc",
            layers: 1,
          },
        ],
      })
      expect(withAnomalyBonus.factors.nonCritical["anomalyDamageBonus"]).toBe(
        1.16,
      )
      expect(withAnomalyBonus.expected / result.value.expected).toBeCloseTo(
        1.16,
        12,
      )
    }
    const enhanced = calculateStaticDamageFromCatalog({
      ...luminous,
      hit: {
        ...luminous.hit,
        skillTargetIds: ["zzz-hp:skill:remiel-basic-ms95pjew"],
      },
      selections: [
        ...luminous.selections,
        ...m6.map((o) => ({
          optionId: o.optionId,
          bindingId: "binding:static" as const,
          layers: 1,
        })),
      ],
    })
    expect(enhanced.ok).toBe(true)
    if (enhanced.ok)
      expect(
        enhanced.value.factors.nonCritical["luminizeMultiplier"],
      ).toBeCloseTo((3.2 + 0.8 + 1.8) * 0.25, 10)
    expect(
      calculateStaticDamageFromCatalog({ ...luminous, selections: [] }).ok,
    ).toBe(false)
    expect(
      calculateStaticDamageFromCatalog({
        ...luminous,
        damage: {
          ...luminous.damage,
          anomalySource: { entityId: "entity:attacker", level: 60 },
        } as StaticCatalogDamageInput["damage"],
      }).ok,
    ).toBe(false)
  })
})

describe("special skill level selection", () => {
  const lucyLinear =
    "agent:1151:zzz-hp:eff-ms384fjz-fgct7r:blk-legacy:mindscape:0"
  const lucyOptions = [
    "agents:lucy:mindscape:0:blk-legacy:legacy-team-atk",
    "agents:lucy:mindscape:0:blk-legacy:eff-ms384fjz-fgct7r",
  ]
  const luciaOptions = [
    "agents:lucia:mindscape:0:blk-legacy:eff-ms46goq2-wtmb9a",
    "agents:lucia:mindscape:0:blk-legacy:eff-ms46h2gh-mbmhuc",
  ]
  const sumContributions = (
    input: StaticCatalogDamageInput,
    effectIds: readonly string[],
  ): number => {
    const result = calculateCatalogResult(input)
    return result.evaluation.contributions
      .filter(
        (contribution) =>
          effectIds.includes(contribution.origin.effectId) &&
          contribution.origin.beneficiaryId === input.hit.actorId,
      )
      .reduce((total, contribution) => total + contribution.value.value, 0)
  }
  const withSpecial = (
    agentEntityId: string,
    optionIds: readonly string[],
    specialSkillLevel: number | undefined,
    overrides: {
      health?: number
      itemStat?: "attack" | "sheerForce"
      coreSkillLevel?: CoreSkillLevel
      inputs?: readonly { name: string; unit: string; value: number }[]
    } = {},
  ): StaticCatalogDamageInput => {
    const base = agentInput(agentEntityId, optionIds)
    const entity = base.world.entities[0]
    return {
      ...base,
      ...(overrides.health !== undefined && entity?.kind === "actor"
        ? {
            world: {
              ...base.world,
              entities: [
                {
                  ...entity,
                  generalStats: {
                    ...entity.generalStats,
                    health: general(overrides.health),
                  },
                },
                ...base.world.entities.slice(1),
              ],
            },
          }
        : {}),
      ...(overrides.itemStat === undefined
        ? {}
        : {
            hit: {
              ...base.hit,
              damageItems: [
                {
                  mode: "direct" as const,
                  role: "base" as const,
                  itemId: "base",
                  damageMultiplier: 2,
                  stat: overrides.itemStat,
                  statSource: { entityId: "entity:attacker" },
                },
              ],
            },
          }),
      bindings: [
        {
          bindingId: "binding:static",
          kind: "agent",
          holderId: "entity:attacker",
          sourceEntityId: agentEntityId,
          eligible: true,
          configuration: {
            coreSkillLevel: overrides.coreSkillLevel ?? 7,
            mindscapeRank: 0,
            ...(specialSkillLevel === undefined
              ? {}
              : { specialSkillLevel: specialSkillLevel as 1 }),
          },
        },
      ],
      ...(overrides.inputs === undefined
        ? {}
        : {
            inputs: overrides.inputs.map((entry) => ({
              bindingId: "binding:static" as const,
              name: entry.name,
              value: {
                unit: entry.unit as "attack-points",
                value: entry.value,
              },
            })),
          }),
    }
  }

  it.each([
    [12, 2000, 540],
    [16, 2000, 600],
    [1, 1000, 182],
  ])(
    "expands Lucy's buff from the level expression (L%i, attack %s)",
    (level, attack, expected) => {
      const total = sumContributions(
        withSpecial("1151", lucyOptions, level, {
          inputs: [
            {
              name: `${lucyLinear}:source`,
              unit: "attack-points",
              value: attack,
            },
          ],
        }),
        [
          "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0",
          lucyLinear,
        ],
      )
      expect(total).toBeCloseTo(expected, 6)
    },
  )

  it.each([
    [12, 12000, 456],
    [12, 24000, 900],
    [12, 30000, 900],
    [16, 12000, 504],
    [16, 24000, 996],
  ])(
    "expands Lucia's Chorus from the level expression (L%i, health %s)",
    (level, health, expected) => {
      const total = sumContributions(
        withSpecial("1451", luciaOptions, level, {
          health,
          itemStat: "sheerForce",
        }),
        [
          "agent:1451:zzz-hp:eff-ms46goq2-wtmb9a:blk-legacy:mindscape:0",
          "agent:1451:zzz-hp:eff-ms46h2gh-mbmhuc:blk-legacy:mindscape:0",
        ],
      )
      expect(total).toBeCloseTo(expected, 6)
    },
  )

  it("keeps Jane's frenzy identical at core 1 and 7", () => {
    const frenzy = ["agents:jane:mindscape:0:blk-legacy:legacy-self-atk"]
    // 面板异常精通 300：超过 120 的部分每点 +2 → 360；核心等级不影响结果。
    const values = [1, 7].map((coreSkillLevel) =>
      sumContributions(
        withSpecial("1261", frenzy, undefined, {
          coreSkillLevel: coreSkillLevel as CoreSkillLevel,
        }),
        ["agent:1261:zzz-hp:legacy-self-atk:blk-legacy:mindscape:0"],
      ),
    )
    for (const value of values) expect(value).toBeCloseTo(360, 6)
  })

  it("requires an explicit special skill level before using its parameters", () => {
    for (const [agentEntityId, optionIds] of [
      ["1151", lucyOptions],
      ["1451", luciaOptions],
    ] as const) {
      const result = calculateStaticDamageFromCatalog(
        withSpecial(agentEntityId, optionIds, undefined, {
          inputs: [
            {
              name: `${lucyLinear}:source`,
              unit: "attack-points",
              value: 2000,
            },
          ],
        }),
      )
      expect(result.ok, JSON.stringify(result)).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "MISSING_RANK"),
        ).toBe(true)
    }
  })

  it("rejects an out-of-domain special skill level as invalid input", () => {
    const result = calculateStaticDamageFromCatalog(
      withSpecial("1151", lucyOptions, 17, {
        inputs: [
          { name: `${lucyLinear}:source`, unit: "attack-points", value: 2000 },
        ],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.code === "INVALID_INPUT"),
      ).toBe(true)
  })
})

describe("anomaly multipliers and hit scoping", () => {
  const fixtureTables = {
    disorder: oracle.tables.damage!.find(
      (entry) => (entry as { kind?: string }).kind === "disorder",
    )!,
    settlement: oracle.tables.damage!.find(
      (entry) => (entry as { kind?: string }).kind === "anomaly-settlement",
    )!,
  }
  const generalStatsWith = (
    input: StaticCatalogDamageInput,
    stat: string,
    value: number,
  ): StaticCatalogDamageInput => {
    const entity = input.world.entities[0]
    if (entity?.kind !== "actor") throw new Error("actor")
    return {
      ...input,
      world: {
        ...input.world,
        entities: [
          {
            ...entity,
            generalStats: {
              ...entity.generalStats,
              [stat]: general(value),
            },
          },
          ...input.world.entities.slice(1),
        ],
      },
    }
  }

  it("applies Alice's disorder multiplier only to the declared physical disorder item", () => {
    const option =
      "agents:alice:mindscape:0:blk-legacy:legacy-self-disorderBaseMult"
    const aliceEffect =
      "agent:1401:zzz-hp:legacy-self-disorderBaseMult:blk-legacy:mindscape:0"
    const base = agentInput("1401", [option], 0, 7)
    const disorderItem = (itemId: string, attribute: "physical" | "fire") => ({
      mode: "standard-disorder" as const,
      role: "base" as const,
      itemId,
      stat: "attack" as const,
      statSource: { entityId: "entity:attacker" },
      originalAnomalyAttribute: attribute,
      baseDurationSeconds: 30,
      elapsedSeconds: 10,
    })
    const hit = {
      ...base.hit,
      damageItems: [
        disorderItem("zzz-hp:alice:disorder-base:physical", "physical"),
        disorderItem("other:disorder-base:fire", "fire"),
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "third",
          stat: "health" as const,
          damageMultiplier: 3,
          statSource: { entityId: "entity:attacker" },
        },
      ] as unknown as typeof base.hit.damageItems,
    }
    const damage = {
      ...fixtureTables.disorder,
      anomalySource: { entityId: "entity:attacker", level: 60 },
    } as unknown as StaticCatalogDamageInput["damage"]
    for (const [layers, expected] of [
      [0, 0],
      [1, 0.18],
      [10, 1.8],
    ] as const) {
      const result = calculateCatalogResult({
        ...base,
        hit,
        damage,
        selections: [{ optionId: option, bindingId: "binding:static", layers }],
      })
      const physical = result.evaluation.hit!.damageItems.find(
        (item) => item.itemId === "zzz-hp:alice:disorder-base:physical",
      )!
      const others = result.evaluation.hit!.damageItems.filter(
        (item) => item.itemId !== "zzz-hp:alice:disorder-base:physical",
      )
      const bonus = result.evaluation.contributions.filter(
        (contribution) => contribution.origin.effectId === aliceEffect,
      )
      expect(
        bonus.reduce((total, entry) => total + entry.value.value, 0),
      ).toBeCloseTo(expected, 9)
      for (const entry of bonus)
        expect(entry.address).toMatchObject({
          itemId: "zzz-hp:alice:disorder-base:physical",
        })
      void others
      void physical
    }
  })

  it("rejects Alice's selection when the declared item is missing or misattributed", () => {
    const option =
      "agents:alice:mindscape:0:blk-legacy:legacy-self-disorderBaseMult"
    const base = agentInput("1401", [option], 0, 7)
    const damage = {
      ...fixtureTables.disorder,
      anomalySource: { entityId: "entity:attacker", level: 60 },
    } as unknown as StaticCatalogDamageInput["damage"]
    const missingItem = calculateStaticDamageFromCatalog({
      ...base,
      damage,
      hit: { ...base.hit, damageItems: base.hit.damageItems },
    })
    expect(missingItem).toMatchObject({
      ok: false,
      issues: [{ code: "MISSING_REFERENCE" }],
    })
    const wrongAttribute = calculateStaticDamageFromCatalog({
      ...base,
      damage,
      hit: {
        ...base.hit,
        damageItems: [
          {
            mode: "standard-disorder" as const,
            role: "base" as const,
            itemId: "zzz-hp:alice:disorder-base:physical",
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
            originalAnomalyAttribute: "fire" as const,
            baseDurationSeconds: 30,
            elapsedSeconds: 10,
          },
        ],
      },
    })
    expect(wrongAttribute).toMatchObject({
      ok: false,
      issues: [{ code: "CONTEXT_MISMATCH" }],
    })
  })

  const ariaReleaseOptions = {
    ether: "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36k7q1-vqttu0",
    electric: "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36muwl-79wv54",
    fire: "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36nek6-psc6pl",
    ice: "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36o0uv-yslwma",
    physical: "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36oy6h-izqgcq",
    wind: "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36pcqr-9tpwhs",
  } as const
  it.each([
    ["ether", 3.438],
    ["electric", 3.576],
    ["fire", 3.57],
    ["ice", 3.6],
    ["physical", 3.566],
    ["wind", 3.5],
  ] as const)(
    "scales Aria's %s release from 200 initial anomaly control",
    (element, expected) => {
      const input = generalStatsWith(
        agentInput(
          "1501",
          [
            "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36jo9z-7gl5e0",
            ariaReleaseOptions[element],
          ],
          0,
          7,
        ),
        "anomalyMastery",
        200,
      )
      const result = calculateCatalogResult({
        ...input,
        hit: { ...input.hit, element },
        damage: {
          ...fixtureTables.settlement,
          anomalySource: { entityId: "entity:attacker", level: 60 },
        } as unknown as StaticCatalogDamageInput["damage"],
      })
      const mastery = result.evaluation.contributions.filter(
        (contribution) =>
          contribution.address.kind === "stat" &&
          contribution.address.stat === "anomalyProficiency",
      )
      expect(
        mastery.reduce((total, entry) => total + entry.value.value, 0),
      ).toBe(90)
      const release = result.evaluation.contributions.filter(
        (contribution) =>
          contribution.address.kind === "factor" &&
          contribution.address.channel === "base-multiplier-addition",
      )
      expect(
        release.reduce((total, entry) => total + entry.value.value, 0),
      ).toBeCloseTo(expected, 6)
    },
  )

  it("keeps Nangongyu's tremolo additive across layers and settles after stagger recovery", () => {
    const option =
      "agents:nangongyu:mindscape:0:blk-ms4cegmd-bwnttd:eff-ms4cm9a5-wou1p2"
    const base = agentInput("1511", [option], 0, 7)
    const damage = {
      ...fixtureTables.settlement,
      anomalySource: { entityId: "entity:attacker", level: 60 },
    } as unknown as StaticCatalogDamageInput["damage"]
    const factorAt = (layers: number, isStunned: boolean) => {
      const result = calculateCatalogResult({
        ...base,
        damage: {
          ...damage,
          stunDamage: { ...damage.stunDamage, isTargetStunned: isStunned },
        },
        selections: [{ optionId: option, bindingId: "binding:static", layers }],
      })
      return result.evaluation.contributions
        .filter(
          (contribution) =>
            contribution.address.kind === "factor" &&
            contribution.address.channel === "base-multiplier-increase",
        )
        .reduce((total, entry) => total + entry.value.value, 0)
    }
    expect(factorAt(1, true)).toBeCloseTo(0.25, 9)
    expect(factorAt(4, true)).toBeCloseTo(1, 9)
    // 恢复后结算：非失衡快照同样成立（具名修正 stagger-recovery-settlement）
    expect(factorAt(4, false)).toBeCloseTo(1, 9)
    expect(factorAt(0, false)).toBe(0)
  })

  it("caps Velina's two conversions at different points and keeps the cyclones apart", () => {
    const options = [
      "agents:velina:mindscape:0:blk-legacy:legacy-self-dmgBonus",
      "agents:velina:mindscape:0:blk-legacy:legacy-self-anomalyControl",
      "agents:velina:mindscape:0:blk-legacy:legacy-team-anomalyReleaseMult",
      "agents:velina:mindscape:0:blk-legacy:eff-ms4tphp6-6zyuxs",
    ]
    const energyInput = (value: number): StaticCatalogDamageInput => {
      const base = agentInput("1561", options, 0, 7)
      const entity = base.world.entities[0]
      if (entity?.kind !== "actor") throw new Error("actor")
      return {
        ...base,
        world: {
          ...base.world,
          entities: [
            {
              ...entity,
              generalStats: {
                ...entity.generalStats,
                energyRegen: general(value),
                anomalyMastery: general(500),
              },
            },
            ...base.world.entities.slice(1),
          ],
        },
        hit: {
          ...base.hit,
          element: "wind" as const,
          skillTags: [
            "zzz-hp:skill:velina-special-ms4tnsha",
            "zzz-hp:skill:velina-special-ms4tnzvq",
          ],
          damageItems: [
            ...base.hit.damageItems,
            {
              mode: "direct" as const,
              role: "base" as const,
              itemId: "mastery-read",
              stat: "anomalyMastery" as const,
              damageMultiplier: 1,
              statSource: { entityId: "entity:attacker" },
            },
          ],
        },
        damage: {
          ...fixtureTables.settlement,
          anomalySource: { entityId: "entity:attacker", level: 60 },
        } as unknown as StaticCatalogDamageInput["damage"],
        inputs: options.flatMap((optionId) =>
          catalog.options
            .find((option) => option.optionId === optionId)!
            .variants.flatMap((variant) =>
              variant.inputs.map((requirement) => ({
                bindingId: "binding:static" as const,
                name: requirement.name,
                value: { unit: requirement.unit, value },
              })),
            ),
        ),
      }
    }
    const sums = (result: StaticDamageResult) =>
      result.evaluation.contributions.reduce(
        (totals, contribution) => {
          if (
            contribution.address.kind === "stat" &&
            contribution.address.stat === "anomalyMastery"
          )
            totals.control += contribution.value.value
          if (
            contribution.address.kind === "factor" &&
            contribution.address.channel === "base-multiplier-addition"
          )
            totals.release += contribution.value.value
          if (
            contribution.address.kind === "factor" &&
            contribution.address.channel === "damage-bonus"
          )
            totals.bonus += contribution.value.value
          return totals
        },
        { control: 0, release: 0, bonus: 0 },
      )
    // E=2：增伤 0.168、掌控 40、异放 1.45+2.55
    const atTwo = sums(calculateCatalogResult(energyInput(2)))
    expect(atTwo.bonus).toBeCloseTo(0.168, 9)
    expect(atTwo.control).toBeCloseTo(40, 6)
    expect(atTwo.release).toBeCloseTo(4, 6)
    // E=2.88：增伤封顶 0.35，掌控封顶 84 —— 两个封顶点不同
    const atCap = sums(calculateCatalogResult(energyInput(2.88)))
    expect(atCap.bonus).toBeCloseTo(0.35, 9)
    expect(atCap.control).toBeCloseTo(84, 6)
  })
})

describe("velina cyclone catalog linkage", () => {
  it("resolves the wind cyclone attack as an uncategorized action", () => {
    const agent = read(
      "../../../data/definitions/skills/agents/1561.json",
    ) as AgentActions
    const action = resolveAgentAction({
      agent,
      actionId: "action:agent:1561:action:0019",
      mindscapeRank: 0,
      levels: { special: { mode: "trained", value: 12 } },
    })
    expect(action.ok).toBe(true)
    if (action.ok) {
      expect(action.skillCategory).toBe("uncategorized")
      expect(action.skillTargetIds).toEqual([
        "zzz-hp:skill:velina-special-ms4tnzvq",
      ])
      expect(action.calculation.kind).toBe("damage")
    }
  })
  it("keeps the dye cyclone unavailable with a specific element requirement", () => {
    const agent = read(
      "../../../data/definitions/skills/agents/1561.json",
    ) as AgentActions
    const action = resolveAgentAction({
      agent,
      actionId: "action:agent:1561:action:0020",
      mindscapeRank: 0,
      levels: { special: { mode: "trained", value: 12 } },
    })
    expect(action.ok).toBe(false)
    if (!action.ok)
      expect(
        action.issues.some((issue) => issue.code === "unknown-element"),
      ).toBe(true)
  })
  const target = catalog.skillTargets.find(
    (entry) => entry.targetId === "zzz-hp:skill:velina-special-ms4tnzvq",
  )!
  it("publishes the cyclone target as uncategorized", () => {
    expect(target.category).toBe("uncategorized")
  })

  const withPotential = (
    optionIds: readonly string[],
    potentialLevel: number | undefined,
  ) => {
    const input = agentInput("1021", optionIds) as StaticCatalogDamageInput
    return {
      ...input,
      bindings: [
        {
          ...input.bindings[0]!,
          configuration: {
            ...input.bindings[0]!.configuration,
            ...(potentialLevel === undefined ? {} : { potentialLevel }),
          },
        } as StaticCatalogDamageInput["bindings"][number],
      ],
    }
  }

  it("switches Nekomata's ordinary bonus between potential branches by gate", () => {
    const optionId =
      "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus"
    const factorAt = (potentialLevel: number | undefined) =>
      calculateCatalogResult(withPotential([optionId], potentialLevel)).factors
        .nonCritical["damageBonus"]
    // 潜能 0（普通分支）：闪反/快支命中只是触发条件，选中增益后作用于
    // 自身造成的全部伤害；基础普攻命中同样得到 60% 增伤
    expect(factorAt(0)).toBeCloseTo(1.6, 8)
    // 潜能 1 起：潜能分支按同一乘区消费 60%
    expect(factorAt(1)).toBeCloseTo(1.6, 8)
    expect(factorAt(6)).toBeCloseTo(1.6, 8)
    // 未提供潜能：按归一默认 0 走潜能 0 分支，不报错
    expect(factorAt(undefined)).toBeCloseTo(1.6, 8)
  })

  it("gates the stack record behind potential 1 and keeps layers explicit", () => {
    const optionId =
      "agents:nekomata:mindscape:0:blk-ms4f4rbb-id7p58:eff-ms4f4rbb-y2jon7"
    const option = catalog.options.find((o) => o.optionId === optionId)!
    expect(option.variants.map((v) => v.configuration.potentialLevels)).toEqual(
      [[1, 2, 3, 4, 5, 6], [0]],
    )
    const stack = withPotential([optionId], 1)
    const stacked = calculateStaticDamageFromCatalog({
      ...stack,
      selections: [{ optionId, bindingId: "binding:static", layers: 2 }],
    })
    expect(stacked.ok, JSON.stringify(stacked)).toBe(true)
  })

  it("applies Nekomata's potential-level expressions only from potential 2", () => {
    const completeOption =
      "agents:nekomata:mindscape:0:blk-ms4f5yzr-3tuoc1:eff-ms4f5yzr-pivfr6"
    const mergedOption =
      "agents:nekomata:mindscape:0:blk-ms4f5yzr-3tuoc1:eff-ms4f845b-c51ysw"
    // 未提供潜能等级或潜能 1：无证据键，缺档拒绝
    for (const potentialLevel of [undefined, 1]) {
      const result = calculateStaticDamageFromCatalog(
        potentialLevel === undefined
          ? withPotential([completeOption], undefined)
          : withPotential([completeOption], potentialLevel),
      )
      expect(result.ok, String(potentialLevel)).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "MISSING_RANK"),
          String(potentialLevel),
        ).toBe(true)
    }
    // 旧增量部分记录已合并：单独选择或与完整值同时选择都被拒绝
    const below = calculateStaticDamageFromCatalog(
      withPotential([mergedOption], 2),
    )
    expect(below.ok, JSON.stringify(below)).toBe(false)
    if (below.ok) return
    expect(
      below.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" &&
          issue.message.includes("已合并至完整状态选项"),
      ),
    ).toBe(true)
    expect(
      calculateStaticDamageFromCatalog(
        withPotential([completeOption, mergedOption], 6),
      ).ok,
    ).toBe(false)

    const criticalAt = (potentialLevel: number) =>
      calculateCatalogResult(withPotential([completeOption], potentialLevel))
        .factors.critical?.critical
    const baseline = calculateCatalogResult(withPotential([], 2)).factors
      .critical?.critical
    // Nanoka potentialDetail：完整档位值 20/30/40/50/60%，只加一次
    expect(criticalAt(2)! - baseline!).toBeCloseTo(0.2, 8)
    expect(criticalAt(3)! - baseline!).toBeCloseTo(0.3, 8)
    expect(criticalAt(6)! - baseline!).toBeCloseTo(0.6, 8)
    expect(
      catalog.options
        .find((o) => o.optionId === mergedOption)!
        .variants.map((v) => v.status),
    ).toEqual(["unsupported"])
  })

  it("integrates the verified Nanoka supplements with provenance", () => {
    const entity = catalog.entities.find(
      (e) => e.catalogEntityId === "nanoka:w-engines:13111",
    )
    expect(entity?.supplementProvenance).toMatchObject({
      sourceId: "nanoka-integrated",
      version: "3.1",
    })
    expect(entity?.supplementProvenance?.resources.length).toBeGreaterThan(0)
    const coverage = read(
      "../../../data/definitions/effects/static-coverage.json",
    ) as { summary: { supplements: Record<string, number> } }
    expect(coverage.summary.supplements).toMatchObject({
      records: 10,
      integrated: 9,
      rules: 9,
      options: 4,
      entities: 1,
      outOfScope: 1,
    })
  })

  it("applies the red-axis talent at every refinement to electric basic and dash direct hits", () => {
    const option = catalog.options.find(
      (o) => o.optionId === "nanoka:w-engines:13111:refinement:red-axis",
    )!
    const bonusAt = (
      refinement: 1 | 2 | 3 | 4 | 5,
      skillCategory: "basic" | "dash" | "ultimate",
      element: "electric" | "fire",
    ) => {
      const base = agentInput("1021", []) as StaticCatalogDamageInput
      return calculateCatalogResult({
        ...base,
        bindings: [
          {
            kind: "w-engine" as const,
            bindingId: "binding:weapon",
            sourceEntityId: "13111",
            holderId: "entity:attacker",
            eligible: true,
            configuration: { refinement },
          },
        ],
        selections: [
          { optionId: option.optionId, bindingId: "binding:weapon", layers: 1 },
        ],
        hit: {
          ...base.hit,
          skillCategory,
          element,
        },
      }).factors.nonCritical["damageBonus"]
    }
    // Nanoka 红莲电机 1—5 档：0.50/0.575/0.65/0.725/0.80，仅电属性普通/冲刺直伤
    for (const [refinement, expectedBonus] of [
      [1, 0.5],
      [2, 0.575],
      [3, 0.65],
      [4, 0.725],
      [5, 0.8],
    ] as const) {
      expect(
        bonusAt(refinement, "basic", "electric"),
        `R${refinement} basic`,
      ).toBeCloseTo(1 + expectedBonus, 8)
      expect(
        bonusAt(refinement, "dash", "electric"),
        `R${refinement} dash`,
      ).toBeCloseTo(1 + expectedBonus, 8)
    }
    for (const [label, skillCategory, element] of [
      ["non-electric", "basic", "fire"],
      ["non basic/dash", "ultimate", "electric"],
    ] as const)
      expect(bonusAt(5, skillCategory, element), label).toBe(1)
  })
})

describe("potential-gated static effects", () => {
  const optionOf = (optionId: string) =>
    catalog.options.find((option) => option.optionId === optionId)!
  const variantInputName = (optionId: string, potentialLevel: number) => {
    const option = optionOf(optionId)
    const variant = option.variants.find(
      (entry) =>
        !entry.configuration.potentialLevels ||
        (entry.configuration.potentialLevels as readonly number[]).includes(
          potentialLevel,
        ),
    )!
    return variant.inputs[0]!.name
  }
  const contributionSum = (result: StaticDamageResult, effectId: string) =>
    [
      ...result.evaluation.contributions,
      ...(result.preparations ?? []).flatMap((entry) => entry.contributions),
    ]
      .filter((entry) => entry.origin.effectId === effectId)
      .reduce((sum, entry) => sum + entry.value.value, 0)
  const withManualInput = (
    input: StaticCatalogDamageInput,
    name: string,
    unit: "ratio" | "energy-per-second",
    value: number,
  ): StaticCatalogDamageInput =>
    ({
      ...input,
      inputs: [
        {
          bindingId: input.bindings[0]!.bindingId,
          name,
          value: { unit, value },
        },
      ],
    }) as unknown as StaticCatalogDamageInput
  const select = (
    input: StaticCatalogDamageInput,
    optionId: string,
    layers = 1,
  ): StaticCatalogDamageInput => ({
    ...input,
    selections: [{ optionId, bindingId: input.bindings[0]!.bindingId, layers }],
  })
  const expectMissingRank = (
    input: StaticCatalogDamageInput,
    label: string,
  ) => {
    const result = calculateStaticDamageFromCatalog(input)
    expect(result.ok, label).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.code === "MISSING_RANK"),
        label,
      ).toBe(true)
  }
  const fixtureContribution = (
    pointer: string,
    optionId: string,
    potentialLevel: number,
    effectId: string,
    layers = 1,
  ) =>
    contributionSum(
      calculateCatalogResult(
        select(
          withPotentialLevel(referenceInput(pointer), potentialLevel),
          optionId,
          layers,
        ),
      ),
      effectId,
    )

  it("applies Soldier 11's potential critical damage from potential 2", () => {
    const optionId = "nanoka:agents:soldier11:potential:flame-prowess"
    const effectId = "agent:1041:nanoka:flame-prowess:mindscape:0"
    const at = (potentialLevel: number) =>
      contributionSum(
        calculateCatalogResult(
          agentInput("1041", [optionId], 0, 7, potentialLevel),
        ),
        effectId,
      )
    expectMissingRank(agentInput("1041", [optionId], 0, 7, 1), "P1")
    expect(at(2)).toBeCloseTo(0.16, 8)
    expect(at(3)).toBeCloseTo(0.24, 8)
    expect(at(6)).toBeCloseTo(0.48, 8)
  })

  it("applies Lycaon's potential impact to basic/dash/dodge-counter direct hits", () => {
    const optionId = "nanoka:agents:lycaon:potential:ice-hunt-impact"
    const effectId = "agent:1141:nanoka:ice-hunt-impact:mindscape:0"
    const rule = definitions.effects.find(
      (entry) => entry.effectId === effectId,
    )
    if (rule?.kind !== "contribution") throw new Error("fixture")
    // 冲击力只进入失衡计算；当前伤害路径不读取该属性，因此这里锁定目录门槛、
    // 档位数值与命中范围，行为贡献待失衡通道接入后再补。
    expect(rule.parameters.amount).toMatchObject({
      kind: "by-rank",
      rank: "potentialLevel",
      values: { 2: 0.05, 3: 0.075, 4: 0.1, 5: 0.125, 6: 0.15 },
    })
    expect(rule.operation).toMatchObject({
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
    })
    const when = JSON.stringify(rule.when)
    expect(when).toContain("hit.damageKind")
    expect(when).toContain("hit.skillCategory")
    expect(when).toContain("dodge-counter")
    for (const potentialLevel of [2, 6]) {
      const result = calculateStaticDamageFromCatalog(
        agentInput("1141", [optionId], 0, 7, potentialLevel),
      )
      expect(result.ok, `P${potentialLevel}`).toBe(true)
    }
    expectMissingRank(agentInput("1141", [optionId], 0, 7, 1), "P1")
  })

  it("gates Lycaon's other-element damage bonus behind the potential branch", () => {
    const pointer = "/agents/49/mindscapeBuffs/0/effectBlocks/0/effects/1"
    const optionId = "agents:lycaon:mindscape:0:blk-legacy:legacy-team-dmgBonus"
    const effectId =
      "agent:1141:zzz-hp:legacy-team-dmgBonus:blk-legacy:mindscape:0"
    expect(fixtureContribution(pointer, optionId, 1, effectId)).toBeCloseTo(
      0.3,
      8,
    )
    expect(fixtureContribution(pointer, optionId, 6, effectId)).toBeCloseTo(
      0.3,
      8,
    )
    expectMissingRank(
      select(withPotentialLevel(referenceInput(pointer), 0), optionId),
      "P0",
    )
    const resPenPointer = "/agents/49/mindscapeBuffs/0/effectBlocks/0/effects/0"
    const resPenOption =
      "agents:lycaon:mindscape:0:blk-legacy:legacy-team-resPen"
    const resPenEffect =
      "agent:1141:zzz-hp:legacy-team-resPen:blk-legacy:mindscape:0"
    expect(
      fixtureContribution(resPenPointer, resPenOption, 0, resPenEffect),
    ).toBeCloseTo(0.25, 8)
  })

  it("scales Burnice's boiling-point conversion rates by potential with fixed caps", () => {
    const controlPointer =
      "/agents/26/mindscapeBuffs/0/effectBlocks/3/effects/0"
    const controlOption =
      "agents:burnice:mindscape:0:blk-ms4njqvi-f55a5p:eff-ms4njqvi-e0gd6d"
    const controlEffect =
      "agent:1171:zzz-hp:eff-ms4njqvi-e0gd6d:blk-ms4njqvi-f55a5p:mindscape:0"
    const damagePointer = "/agents/26/mindscapeBuffs/0/effectBlocks/3/effects/1"
    const damageOption =
      "agents:burnice:mindscape:0:blk-ms4njqvi-f55a5p:eff-ms4nnnk0-1esj6u"
    const damageEffect =
      "agent:1171:zzz-hp:eff-ms4nnnk0-1esj6u:blk-ms4njqvi-f55a5p:mindscape:0"
    const controlAt = (potentialLevel: number, energy: number) =>
      contributionSum(
        calculateCatalogResult(
          withManualInput(
            select(
              withPotentialLevel(
                referenceInput(controlPointer),
                potentialLevel,
              ),
              controlOption,
            ),
            variantInputName(controlOption, potentialLevel),
            "energy-per-second",
            energy,
          ),
        ),
        controlEffect,
      )
    const damageAt = (potentialLevel: number, energy: number) =>
      contributionSum(
        calculateCatalogResult(
          withManualInput(
            select(
              withPotentialLevel(referenceInput(damagePointer), potentialLevel),
              damageOption,
            ),
            variantInputName(damageOption, potentialLevel),
            "energy-per-second",
            energy,
          ),
        ),
        damageEffect,
      )
    expect(controlAt(2, 2.8)).toBeCloseTo(10, 6)
    expect(controlAt(6, 2.8)).toBeCloseTo(25, 6)
    expect(damageAt(2, 2.8)).toBeCloseTo(0.1, 8)
    expect(damageAt(6, 2.8)).toBeCloseTo(0.2, 8)
    expect(controlAt(6, 1.8)).toBe(0)
    expect(damageAt(6, 1.8)).toBe(0)
    expect(controlAt(6, 9)).toBeCloseTo(25, 6)
    expect(damageAt(6, 9)).toBeCloseTo(0.2, 8)
    expectMissingRank(
      withManualInput(
        select(
          withPotentialLevel(referenceInput(controlPointer), 1),
          controlOption,
        ),
        variantInputName(controlOption, 6),
        "energy-per-second",
        2.8,
      ),
      "P1",
    )
  })
  it("applies Grace's electrical enhancement as a complete potential value", () => {
    const pointer = "/agents/29/mindscapeBuffs/0/effectBlocks/2/effects/0"
    const optionId =
      "agents:grace:mindscape:0:blk-ms4o8tep-z28y9w:eff-ms4o8tep-htm584"
    const effectId =
      "agent:1181:zzz-hp:eff-ms4o8tep-htm584:blk-ms4o8tep-z28y9w:mindscape:0"
    expect(fixtureContribution(pointer, optionId, 2, effectId)).toBeCloseTo(
      0.1,
      8,
    )
    expect(fixtureContribution(pointer, optionId, 6, effectId)).toBeCloseTo(
      0.3,
      8,
    )
    expectMissingRank(
      select(withPotentialLevel(referenceInput(pointer), 1), optionId),
      "P1",
    )
    expect(optionOf(optionId).variants[0]!.maximumLayers).toBe(1)
  })

  it("keeps Ellen's real storm-surge layers separate from potential values", () => {
    const critPointer = "/agents/47/mindscapeBuffs/0/effectBlocks/2/effects/0"
    const critOption =
      "agents:ellen:mindscape:0:blk-ms4fuyir-dotq6c:eff-ms4fuyir-e3fuww"
    const critEffect =
      "agent:1191:zzz-hp:eff-ms4fuyir-e3fuww:blk-ms4fuyir-dotq6c:mindscape:0"
    const resPenPointer = "/agents/47/mindscapeBuffs/0/effectBlocks/2/effects/1"
    const resPenOption =
      "agents:ellen:mindscape:0:blk-ms4fuyir-dotq6c:eff-ms4fvlsz-x4x1hj"
    const resPenEffect =
      "agent:1191:zzz-hp:eff-ms4fvlsz-x4x1hj:blk-ms4fuyir-dotq6c:mindscape:0"
    expect(
      fixtureContribution(critPointer, critOption, 6, critEffect, 9),
    ).toBeCloseTo(9 * 0.048, 8)
    expect(
      fixtureContribution(critPointer, critOption, 6, critEffect, 10),
    ).toBeCloseTo(0.48, 8)
    expect(
      fixtureContribution(critPointer, critOption, 2, critEffect, 10),
    ).toBeCloseTo(0.16, 8)
    expect(fixtureContribution(critPointer, critOption, 6, critEffect, 0)).toBe(
      0,
    )
    expect(
      fixtureContribution(resPenPointer, resPenOption, 6, resPenEffect),
    ).toBeCloseTo(0.1, 8)
    expect(
      fixtureContribution(resPenPointer, resPenOption, 2, resPenEffect),
    ).toBeCloseTo(0.033, 8)
    expectMissingRank(
      select(
        withPotentialLevel(referenceInput(critPointer), 1),
        critOption,
        10,
      ),
      "P1",
    )
    const eleven = calculateStaticDamageFromCatalog(
      select(
        withPotentialLevel(referenceInput(critPointer), 6),
        critOption,
        11,
      ),
    )
    expect(eleven.ok).toBe(false)
    if (!eleven.ok)
      expect(
        eleven.issues.some((issue) => issue.code === "INVALID_INPUT"),
      ).toBe(true)
  })

  it("switches Ellen's core-passive critical damage between ordinary and potential scopes", () => {
    const optionId = "agents:ellen:mindscape:0:blk-legacy:legacy-self-critDmg"
    const effectId =
      "agent:1191:zzz-hp:legacy-self-critDmg:blk-legacy:mindscape:0"
    const ordinaryEffect = "agent:1191:nanoka:ordinary-blade-dance:mindscape:0"
    const at = (potentialLevel: number, skillTags: readonly string[]) => {
      const base = agentInput("1191", [optionId], 0, 7, potentialLevel)
      const result = calculateCatalogResult({
        ...base,
        hit: { ...base.hit, skillTags },
      })
      return {
        potential: contributionSum(result, effectId),
        ordinary: contributionSum(result, ordinaryEffect),
      }
    }
    expect(at(0, ["zzz-hp:skill:ellen-basic-ms4ftctx"]).ordinary).toBeCloseTo(
      1,
      8,
    )
    expect(at(0, ["zzz-hp:skill:ellen-basic-ms4ftctx"]).potential).toBe(0)
    expect(at(0, ["zzz-hp:skill:ellen-basic-ms4ftyxj"]).ordinary).toBe(0)
    expect(at(0, ["zzz-hp:category:chain"]).ordinary).toBe(0)
    expect(
      at(1, ["zzz-hp:category:basic", "zzz-hp:skill:ellen-basic-ms4ftyxj"])
        .potential,
    ).toBeCloseTo(1, 8)
    expect(at(1, ["zzz-hp:skill:ellen-basic-ms4ftctx"]).ordinary).toBe(0)
  })

  it("switches Harumasa's core extras between ordinary and potential scopes", () => {
    const critRateOption =
      "agents:harumasa:mindscape:0:blk-legacy:legacy-self-critRate"
    const critRateEffect =
      "agent:1201:zzz-hp:legacy-self-critRate:blk-legacy:mindscape:0"
    const critDmgOption =
      "agents:harumasa:mindscape:0:blk-legacy:eff-ms4gx7ds-ijkzuy"
    const critDmgEffect =
      "agent:1201:zzz-hp:eff-ms4gx7ds-ijkzuy:blk-legacy:mindscape:0"
    const ordinaryRate = "agent:1201:nanoka:ordinary-crit-rate:mindscape:0"
    const ordinaryDmg = "agent:1201:nanoka:ordinary-crit-dmg:mindscape:0"
    const at = (
      potentialLevel: number,
      skillTags: readonly string[],
      optionId: string,
      layers = 1,
    ) => {
      const base = agentInput("1201", [optionId], 0, 7, potentialLevel)
      return calculateCatalogResult({
        ...base,
        selections: [
          { optionId, bindingId: base.bindings[0]!.bindingId, layers },
        ],
        hit: { ...base.hit, skillTags },
      })
    }
    const flying = ["zzz-hp:skill:harumasa-dodge-ms4gw5t2"]
    const thunder = [
      "zzz-hp:category:dodge",
      "zzz-hp:skill:harumasa-dodge-ms4gwjug",
    ]
    expect(
      contributionSum(at(0, flying, critRateOption), ordinaryRate),
    ).toBeCloseTo(0.25, 8)
    expect(contributionSum(at(0, thunder, critRateOption), ordinaryRate)).toBe(
      0,
    )
    expect(
      contributionSum(
        at(0, ["zzz-hp:category:ultimate"], critRateOption),
        ordinaryRate,
      ),
    ).toBe(0)
    expect(
      contributionSum(at(0, thunder, critRateOption), critRateEffect),
    ).toBe(0)
    expect(
      contributionSum(at(1, thunder, critRateOption), critRateEffect),
    ).toBeCloseTo(0.25, 8)
    expect(
      contributionSum(
        at(1, ["zzz-hp:category:ultimate"], critRateOption),
        critRateEffect,
      ),
    ).toBeCloseTo(0.25, 8)
    expect(
      contributionSum(at(0, flying, critDmgOption, 6), ordinaryDmg),
    ).toBeCloseTo(0.72, 8)
    expect(contributionSum(at(0, thunder, critDmgOption, 6), ordinaryDmg)).toBe(
      0,
    )
    expect(
      contributionSum(at(1, thunder, critDmgOption, 6), critDmgEffect),
    ).toBeCloseTo(0.72, 8)
  })

  it("keeps ordinary core-passive branches out of potential levels at the rule level", () => {
    // 低层入口按 effectId 直接取规则，不会执行目录变体的潜能配置：
    // 规则必须自行声明潜能门槛，否则潜能 1 下同时选中普通与潜能分支会让
    // 艾莲核心暴伤从 +100% 变成 +200%（选择校验必须拒绝普通分支）。
    const ellenOrdinary = "agent:1191:nanoka:ordinary-blade-dance:mindscape:0"
    const ellenPotential =
      "agent:1191:zzz-hp:legacy-self-critDmg:blk-legacy:mindscape:0"
    const harumasaRateOrdinary =
      "agent:1201:nanoka:ordinary-crit-rate:mindscape:0"
    const harumasaDmgOrdinary =
      "agent:1201:nanoka:ordinary-crit-dmg:mindscape:0"
    const lowLevel = (
      agentEntityId: string,
      effectIds: readonly string[],
      potentialLevel: number,
      skillTags: readonly string[],
      layers = 1,
    ) => {
      const fixture = inputFor()
      const base = agentInput(agentEntityId, [], 0, 7, potentialLevel)
      return calculateStaticDamage({
        definitions,
        bindings: base.bindings,
        damage: fixture.damage,
        world: fixture.world,
        hit: { ...fixture.hit, skillTags },
        selections: effectIds.map((effectId) => ({
          effectId:
            effectId as StaticDamageInput["selections"][number]["effectId"],
          bindingId: "binding:static",
          layers,
        })),
      })
    }
    const rejectsEffect = (
      result: ReturnType<typeof lowLevel>,
      effectId: string,
    ) => {
      expect(result.ok, JSON.stringify(result)).toBe(false)
      return (
        !result.ok &&
        result.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            JSON.stringify(issue).includes(effectId),
        )
      )
    }
    const ellenTags = [
      "zzz-hp:category:basic",
      "zzz-hp:skill:ellen-basic-ms4ftctx",
    ]
    const ellenAt = (potentialLevel: number, effectIds: readonly string[]) =>
      lowLevel("1191", effectIds, potentialLevel, ellenTags)
    const ellenOrdinaryAtZero = ellenAt(0, [ellenOrdinary])
    expect(ellenOrdinaryAtZero.ok, JSON.stringify(ellenOrdinaryAtZero)).toBe(
      true,
    )
    if (ellenOrdinaryAtZero.ok)
      expect(
        contributionSum(ellenOrdinaryAtZero.value, ellenOrdinary),
      ).toBeCloseTo(1, 8)
    // 潜能 1：普通分支不可再选，不能与潜能分支重复叠加
    expect(rejectsEffect(ellenAt(1, [ellenOrdinary]), ellenOrdinary)).toBe(true)
    expect(
      rejectsEffect(ellenAt(1, [ellenOrdinary, ellenPotential]), ellenOrdinary),
    ).toBe(true)
    const ellenPotentialAtOne = ellenAt(1, [ellenPotential])
    expect(ellenPotentialAtOne.ok, JSON.stringify(ellenPotentialAtOne)).toBe(
      true,
    )
    if (ellenPotentialAtOne.ok)
      expect(
        contributionSum(ellenPotentialAtOne.value, ellenPotential),
      ).toBeCloseTo(1, 8)
    const harumasaTags = [
      "zzz-hp:category:dodge",
      "zzz-hp:skill:harumasa-dodge-ms4gw5t2",
    ]
    const harumasaRateAtZero = lowLevel(
      "1201",
      [harumasaRateOrdinary],
      0,
      harumasaTags,
    )
    expect(harumasaRateAtZero.ok, JSON.stringify(harumasaRateAtZero)).toBe(true)
    if (harumasaRateAtZero.ok)
      expect(
        contributionSum(harumasaRateAtZero.value, harumasaRateOrdinary),
      ).toBeCloseTo(0.25, 8)
    expect(
      rejectsEffect(
        lowLevel("1201", [harumasaRateOrdinary], 1, harumasaTags),
        harumasaRateOrdinary,
      ),
    ).toBe(true)
    const harumasaDmgAtZero = lowLevel(
      "1201",
      [harumasaDmgOrdinary],
      0,
      harumasaTags,
      6,
    )
    expect(harumasaDmgAtZero.ok, JSON.stringify(harumasaDmgAtZero)).toBe(true)
    if (harumasaDmgAtZero.ok)
      expect(
        contributionSum(harumasaDmgAtZero.value, harumasaDmgOrdinary),
      ).toBeCloseTo(0.72, 8)
    expect(
      rejectsEffect(
        lowLevel("1201", [harumasaDmgOrdinary], 1, harumasaTags, 6),
        harumasaDmgOrdinary,
      ),
    ).toBe(true)
  })

  it("applies Harumasa's concentration values by potential from level 2", () => {
    const atkPointer = "/agents/34/mindscapeBuffs/0/effectBlocks/2/effects/0"
    const atkOption =
      "agents:harumasa:mindscape:0:blk-ms4gyswd-hl5ii6:eff-ms4gyswd-zyloo3"
    const atkEffect =
      "agent:1201:zzz-hp:eff-ms4gyswd-zyloo3:blk-ms4gyswd-hl5ii6:mindscape:0"
    const penPointer = "/agents/34/mindscapeBuffs/0/effectBlocks/2/effects/1"
    const penOption =
      "agents:harumasa:mindscape:0:blk-ms4gyswd-hl5ii6:eff-ms4h0385-xlwhvy"
    const penEffect =
      "agent:1201:zzz-hp:eff-ms4h0385-xlwhvy:blk-ms4gyswd-hl5ii6:mindscape:0"
    expect(
      fixtureContribution(atkPointer, atkOption, 2, atkEffect),
    ).toBeCloseTo(0.04, 8)
    expect(
      fixtureContribution(atkPointer, atkOption, 6, atkEffect),
    ).toBeCloseTo(0.12, 8)
    expect(
      fixtureContribution(penPointer, penOption, 6, penEffect),
    ).toBeCloseTo(0.15, 8)
    expectMissingRank(
      select(withPotentialLevel(referenceInput(atkPointer), 1), atkOption),
      "P1",
    )
  })
  it("keeps Rina's potential penetration and core conversion rates separate", () => {
    const pierceOption =
      "nanoka:agents:alexandrina:potential:perfect-service-pierce"
    const pierceEffect = "agent:1211:nanoka:perfect-service-pierce:mindscape:0"
    const attackPointer = "/agents/1/mindscapeBuffs/0/effectBlocks/2/effects/0"
    const attackOption =
      "agents:alexandrina:mindscape:0:blk-ms4719qz-139572:eff-ms4719qz-a5ce2o"
    const attackEffect =
      "agent:1211:zzz-hp:eff-ms4719qz-a5ce2o:blk-ms4719qz-139572:mindscape:0"
    const defensePointer = "/agents/1/mindscapeBuffs/0/effectBlocks/2/effects/1"
    const defenseOption =
      "agents:alexandrina:mindscape:0:blk-ms4719qz-139572:eff-ms478uay-hcl0vd"
    const defenseEffect =
      "agent:1211:zzz-hp:eff-ms478uay-hcl0vd:blk-ms4719qz-139572:mindscape:0"
    const pierceAt = (potentialLevel: number) =>
      contributionSum(
        calculateCatalogResult(
          agentInput("1211", [pierceOption], 0, 7, potentialLevel),
        ),
        pierceEffect,
      )
    expect(pierceAt(2)).toBeCloseTo(0.016, 8)
    expect(pierceAt(3)).toBeCloseTo(0.032, 8)
    expect(pierceAt(6)).toBeCloseTo(0.08, 8)
    expectMissingRank(agentInput("1211", [pierceOption], 0, 7, 1), "P1")
    const conversionAt = (
      pointer: string,
      optionId: string,
      effectId: string,
      potentialLevel: number,
      ratio: number,
    ) =>
      contributionSum(
        calculateCatalogResult(
          withManualInput(
            select(
              withPotentialLevel(referenceInput(pointer), potentialLevel),
              optionId,
            ),
            variantInputName(optionId, potentialLevel),
            "ratio",
            ratio,
          ),
        ),
        effectId,
      )
    expect(
      conversionAt(attackPointer, attackOption, attackEffect, 2, 0.72),
    ).toBeCloseTo(216, 6)
    expect(
      conversionAt(attackPointer, attackOption, attackEffect, 6, 0.72),
    ).toBeCloseTo(576, 6)
    expect(
      conversionAt(attackPointer, attackOption, attackEffect, 6, 9),
    ).toBeCloseTo(576, 6)
    expect(
      conversionAt(defensePointer, defenseOption, defenseEffect, 2, 0.72),
    ).toBeCloseTo(180, 6)
    expect(
      conversionAt(defensePointer, defenseOption, defenseEffect, 6, 0.72),
    ).toBeCloseTo(468, 6)
    expect(
      conversionAt(defensePointer, defenseOption, defenseEffect, 6, 9),
    ).toBeCloseTo(468, 6)
    expectMissingRank(
      withManualInput(
        select(
          withPotentialLevel(referenceInput(attackPointer), 1),
          attackOption,
        ),
        variantInputName(attackOption, 6),
        "ratio",
        0.72,
      ),
      "P1",
    )
    // 读取值来自调用方显式输入：改变持有者当前面板不改变转化贡献
    const manual = withManualInput(
      select(
        withPotentialLevel(referenceInput(attackPointer), 6),
        attackOption,
      ),
      variantInputName(attackOption, 6),
      "ratio",
      0.36,
    )
    const changedHolder: StaticCatalogDamageInput = {
      ...manual,
      world: {
        ...manual.world,
        entities: manual.world.entities.map((entity) =>
          entity.kind === "actor" && entity.entityId === manual.hit.actorId
            ? {
                ...entity,
                directStats: {
                  ...entity.directStats,
                  penetrationRatio: { baseValue: 0.9, additions: [] },
                },
              }
            : entity,
        ),
      },
    }
    expect(
      contributionSum(calculateCatalogResult(changedHolder), attackEffect),
    ).toBeCloseTo(
      contributionSum(calculateCatalogResult(manual), attackEffect),
      6,
    )
  })

  it("applies Jane's complete potential strong-hit critical damage and rejects the partial record", () => {
    const pointer = "/agents/43/mindscapeBuffs/0/effectBlocks/2/effects/0"
    const optionId =
      "agents:jane:mindscape:0:blk-ms34gorp-m9dlxw:eff-ms34gorp-xrbl8x"
    const effectId =
      "agent:1261:zzz-hp:eff-ms34gorp-xrbl8x:blk-ms34gorp-m9dlxw:mindscape:0"
    expect(fixtureContribution(pointer, optionId, 2, effectId)).toBeCloseTo(
      0.1,
      8,
    )
    expect(fixtureContribution(pointer, optionId, 4, effectId)).toBeCloseTo(
      0.2,
      8,
    )
    expect(fixtureContribution(pointer, optionId, 6, effectId)).toBeCloseTo(
      0.3,
      8,
    )
    expectMissingRank(
      select(withPotentialLevel(referenceInput(pointer), 1), optionId),
      "P1",
    )
    const merged = calculateStaticDamageFromCatalog(
      select(
        withPotentialLevel(referenceInput(pointer), 6),
        "agents:jane:mindscape:0:blk-ms34gorp-m9dlxw:eff-ms34hzuh-214aho",
      ),
    )
    expect(merged.ok).toBe(false)
    if (!merged.ok)
      expect(
        merged.issues.some((issue) =>
          issue.message.includes("已合并至完整状态选项"),
        ),
      ).toBe(true)
  })

  it("applies S0 Anby's complete follow-up damage bonus and gates the 5% conversion", () => {
    const bonusPointer = "/agents/56/mindscapeBuffs/0/effectBlocks/1/effects/1"
    const bonusOption =
      "agents:s0anby:mindscape:0:blk-ms4jqdq1-rkmmm3:eff-ms4jqsm1-qkfx1a"
    const bonusEffect =
      "agent:1381:zzz-hp:eff-ms4jqsm1-qkfx1a:blk-ms4jqdq1-rkmmm3:mindscape:0"
    expect(
      fixtureContribution(bonusPointer, bonusOption, 0, bonusEffect),
    ).toBeCloseTo(0.25, 8)
    expect(
      fixtureContribution(bonusPointer, bonusOption, 1, bonusEffect),
    ).toBeCloseTo(0.25, 8)
    expect(
      fixtureContribution(bonusPointer, bonusOption, 2, bonusEffect),
    ).toBeCloseTo(0.34, 8)
    expect(
      fixtureContribution(bonusPointer, bonusOption, 6, bonusEffect),
    ).toBeCloseTo(0.5, 8)
    for (const partial of [
      "agents:s0anby:mindscape:0:blk-ms4jrci5-unykui:eff-ms4jrci5-nxk6sq",
      "agents:s0anby:mindscape:0:blk-ms4jrci5-unykui:eff-ms4jtmex-gz9fiw",
    ]) {
      const result = calculateStaticDamageFromCatalog(
        select(withPotentialLevel(referenceInput(bonusPointer), 6), partial),
      )
      expect(result.ok, partial).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) =>
            issue.message.includes("已合并至完整状态选项"),
          ),
          partial,
        ).toBe(true)
    }
    const conversionPointer =
      "/agents/56/mindscapeBuffs/0/effectBlocks/0/effects/2"
    const conversionOption =
      "agents:s0anby:mindscape:0:blk-legacy:eff-ms4jp2fs-cmvkjd"
    const conversionEffect =
      "agent:1381:zzz-hp:eff-ms4jp2fs-cmvkjd:blk-legacy:mindscape:0"
    const conversionAt = (potentialLevel: number, criticalDamage: number) =>
      contributionSum(
        calculateCatalogResult(
          withManualInput(
            select(
              withPotentialLevel(
                referenceInput(conversionPointer),
                potentialLevel,
              ),
              conversionOption,
            ),
            variantInputName(conversionOption, potentialLevel),
            "ratio",
            criticalDamage,
          ),
        ),
        conversionEffect,
      )
    expectMissingRank(
      select(
        withPotentialLevel(referenceInput(conversionPointer), 0),
        conversionOption,
      ),
      "P0",
    )
    expect(conversionAt(1, 2)).toBeCloseTo(0.1, 8)
    expect(conversionAt(6, 2)).toBeCloseTo(0.1, 8)
  })
})

function contributionOf(result: StaticDamageResult, effectId: string): number {
  return [
    ...result.evaluation.contributions,
    ...(result.preparations ?? []).flatMap((p) => p.contributions),
  ]
    .filter(
      (c) =>
        c.origin.effectId === effectId &&
        c.origin.beneficiaryId === "entity:attacker",
    )
    .reduce((sum, c) => sum + c.value.value, 0)
}

function withAttack(
  input: StaticCatalogDamageInput,
  attack: number,
): StaticCatalogDamageInput {
  return {
    ...input,
    world: {
      ...input.world,
      entities: input.world.entities.map((entity) =>
        entity.kind === "actor" && entity.entityId === input.hit.actorId
          ? {
              ...entity,
              generalStats: {
                ...entity.generalStats,
                attack: general(attack),
              },
            }
          : entity,
      ),
    },
  }
}

describe("same-block core evidence scoping and independent damage items", () => {
  it("keeps same-block mindscape records outside the core passive's level gate", () => {
    // 影画记录与核心被动共用 blk-legacy 块 ID，但核心档位证据只核对 rank 0
    // 核心被动块的等级说明；影画解锁后核心 1/6/7 均可用且贡献不随核心等级变化。
    const cases = [
      {
        agentEntityId: "1021",
        optionId: "agents:nekomata:mindscape:1:blk-legacy:legacy-self-resPen",
        effectId: "agent:1021:zzz-hp:legacy-self-resPen:blk-legacy:mindscape:1",
        mindscapeRank: 1,
        expected: 0.16,
      },
      {
        agentEntityId: "1021",
        optionId: "agents:nekomata:mindscape:4:blk-legacy:legacy-self-critRate",
        effectId:
          "agent:1021:zzz-hp:legacy-self-critRate:blk-legacy:mindscape:4",
        mindscapeRank: 4,
        expected: 0.07,
      },
      {
        agentEntityId: "1021",
        optionId: "agents:nekomata:mindscape:6:blk-legacy:legacy-self-critDmg",
        effectId:
          "agent:1021:zzz-hp:legacy-self-critDmg:blk-legacy:mindscape:6",
        mindscapeRank: 6,
        expected: 0.18,
      },
      {
        agentEntityId: "1551",
        optionId: "agents:pyrois:mindscape:1:blk-legacy:legacy-self-critRate",
        effectId:
          "agent:1551:zzz-hp:legacy-self-critRate:blk-legacy:mindscape:1",
        mindscapeRank: 1,
        expected: 0.08,
      },
    ] as const
    for (const entry of cases) {
      const option = catalog.options.find((o) => o.optionId === entry.optionId)!
      expect(
        option.variants.map((v) => v.configuration.coreSkillLevels),
        entry.optionId,
      ).toEqual([undefined])
      for (const coreSkillLevel of [1, 6, 7] as const) {
        const base = agentInput(
          entry.agentEntityId,
          [entry.optionId],
          entry.mindscapeRank as 1,
          coreSkillLevel,
        )
        // M1 记录的来源 elementFilter 限定物理；按元素条件提供合法命中
        const input =
          entry.agentEntityId === "1021" && entry.mindscapeRank === 1
            ? { ...base, hit: { ...base.hit, element: "physical" as const } }
            : base
        const result = calculateCatalogResult(input)
        expect(
          contributionOf(result, entry.effectId),
          `${entry.optionId} core ${coreSkillLevel}`,
        ).toBeCloseTo(entry.expected, 8)
      }
      // 影画未解锁仍然拒绝
      const locked = calculateStaticDamageFromCatalog(
        agentInput(entry.agentEntityId, [entry.optionId], 0, 7),
      )
      expect(locked.ok, entry.optionId).toBe(false)
      if (!locked.ok)
        expect(
          locked.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes("not unlocked"),
          ),
          entry.optionId,
        ).toBe(true)
    }
  })

  it("leaves core-level gates only on rank-0 evidence blocks, explicit core enhancers and recorded mindscape dependencies", () => {
    const gatedMindscape = catalog.options
      .filter((o) =>
        o.variants.some(
          (v) =>
            (v.configuration.minimumMindscape ?? 0) >= 1 &&
            v.configuration.coreSkillLevels !== undefined,
        ),
      )
      .map((o) => o.optionId)
      .toSorted()
    // 影画默认不继承同块核心证据；只有显式记录级登记的依赖保留核心门槛：
    // 希希芙 1 影防御强化（核心强化）、凯撒 2 影攻击增益（核心比例强化）、
    // 潘引壶 6 影通窍强化（核心转换率与封顶变化）
    expect(gatedMindscape).toEqual([
      "agents:caesar:mindscape:2:blk-legacy:legacy-team-atk",
      "agents:cissia:mindscape:1:blk-legacy:eff-ms4lkt33-igdjwu",
      "agents:cissia:mindscape:1:blk-legacy:legacy-team-reduceDefense",
      "agents:panyinhu:mindscape:6:blk-legacy:legacy-team-pierce",
    ])
    // 真正按核心等级选参的选项保持既有档位：60% 潜能分支只有已核实核心 7
    const bonus = "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus"
    const bonusOption = catalog.options.find((o) => o.optionId === bonus)!
    expect(
      bonusOption.variants.map((v) => [
        v.configuration.coreSkillLevels,
        v.configuration.potentialLevels,
      ]),
    ).toEqual([
      [[7], [1, 2, 3, 4, 5, 6]],
      [[7], [0]],
    ])
    const atCoreOne = calculateStaticDamageFromCatalog({
      ...agentInput("1021", [bonus], 0, 1),
      bindings: [
        {
          ...agentInput("1021", [bonus], 0, 1).bindings[0]!,
          configuration: {
            mindscapeRank: 0,
            coreSkillLevel: 1,
            potentialLevel: 1,
          },
        } as StaticCatalogDamageInput["bindings"][number],
      ],
    })
    expect(atCoreOne.ok).toBe(false)
    if (!atCoreOne.ok)
      expect(
        atCoreOne.issues.some((issue) => issue.code === "MISSING_RANK"),
      ).toBe(true)
  })

  const caesarBase = "agents:caesar:mindscape:0:blk-legacy:legacy-team-atk"
  const caesarIncrement = "agents:caesar:mindscape:2:blk-legacy:legacy-team-atk"
  const panBase = "agents:panyinhu:mindscape:0:blk-legacy:legacy-team-pierce"
  const panIncrement =
    "agents:panyinhu:mindscape:6:blk-legacy:legacy-team-pierce"
  const panBaseEffect =
    "agent:1421:zzz-hp:legacy-team-pierce:blk-legacy:mindscape:0"
  const panIncrementEffect =
    "agent:1421:zzz-hp:legacy-team-pierce:blk-legacy:mindscape:6"
  const coreLevels = [1, 2, 3, 4, 5, 6, 7] as const

  function panInput(
    core: CoreSkillLevel,
    attack: number,
    selected: readonly string[] = [panBase, panIncrement],
  ): StaticCatalogDamageInput {
    const base = agentInput("1421", selected, 6, core)
    if (base.damage.kind !== "regular") throw new Error("fixture")
    const { defense: _defense, ...common } = base.damage
    return {
      ...base,
      inputs: [panBaseEffect, panIncrementEffect].map((effectId) => ({
        bindingId: "binding:static",
        name: `${effectId}:source`,
        value: { unit: "attack-points", value: attack },
      })),
      hit: {
        ...base.hit,
        damageItems: [
          {
            itemId: "base",
            mode: "direct",
            role: "base",
            statSource: { entityId: "entity:attacker" },
            stat: "sheerForce",
            damageMultiplier: 1,
          },
        ],
      },
      damage: { ...common, kind: "sheer", sheerDamageBonus: [] },
    }
  }

  function lowLevelResult(input: StaticCatalogDamageInput): StaticDamageResult {
    const item = input.hit.damageItems[0]!
    if (item.mode !== "direct") throw new Error("Expected direct fixture")
    const result = calculateStaticDamage({
      definitions: input.definitions,
      bindings: input.bindings,
      world: input.world,
      inputs: input.inputs ?? [],
      damage: input.damage as StaticDamageInput["damage"],
      hit: {
        ...input.hit,
        damageItems: [
          {
            itemId: item.itemId,
            stat: item.stat,
            statSource: item.statSource,
            damageMultiplier: item.damageMultiplier,
          },
        ],
      },
      selections: input.selections.flatMap((selection) =>
        catalog.options
          .find((option) => option.optionId === selection.optionId)!
          .variants[0]!.effectIds.map((effectId) => ({
            effectId,
            bindingId: selection.bindingId,
            layers: selection.layers,
          })),
      ),
    })
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    return result.value
  }

  it.each(coreLevels)(
    "evaluates Caesar core %i with independent base and M2 selections",
    (core) => {
      // 固定 3.1 原文逐档值；期望不读取生成参数。
      const baseAmount = [40, 135, 240, 400, 650, 900, 1000][core - 1]!
      const increment = [20, 67.5, 120, 200, 325, 450, 500][core - 1]!
      for (const mindscape of [2, 3, 6] as const)
        for (const [selected, expected] of [
          [[], 0],
          [[caesarBase], baseAmount],
          [[caesarIncrement], increment],
          [[caesarBase, caesarIncrement], baseAmount + increment],
        ] as const) {
          const input = agentInput("1071", selected, mindscape, core)
          for (const result of [
            calculateCatalogResult(input),
            lowLevelResult(input),
          ]) {
            expect(
              result.evaluation.hit!.damageItems[0]!.finalStat,
            ).toBeCloseTo(1000 + expected, 8)
            expect(result.factors.nonCritical.baseDamage).toBeCloseTo(
              (1000 + expected) * 2,
              8,
            )
          }
        }
      const zero = agentInput("1071", [caesarBase, caesarIncrement], 6, core)
      expect(
        calculateCatalogResult({
          ...zero,
          selections: zero.selections.map((s) => ({ ...s, layers: 0 })),
        }).factors.nonCritical.baseDamage,
      ).toBe(2000)
    },
  )

  it.each(coreLevels)(
    "evaluates Panyinhu core %i on both sides of both caps",
    (core) => {
      // 数学参考以百分数整数/千分数计算，独立于转换器表达式。
      const ratePerThousand = [90, 105, 120, 135, 150, 165, 180][core - 1]!
      const firstCap = [
        4800,
        48000 / 11,
        4000,
        48000 / 13,
        24000 / 7,
        3200,
        3000,
      ][core - 1]!
      const secondCap = [6000, 36000 / 7, 4500, 4000, 3600, 36000 / 11, 3000][
        core - 1
      ]!
      for (const attack of [
        -100,
        0,
        firstCap - 1,
        firstCap,
        firstCap + 1,
        (firstCap + secondCap) / 2,
        secondCap - 1,
        secondCap,
        secondCap + 1,
        10000,
      ]) {
        const positive = Math.max(0, attack)
        const baseAmount = Math.min((positive * ratePerThousand) / 1000, 540)
        const total = Math.min((positive * (ratePerThousand + 60)) / 1000, 720)
        for (const [selected, expected] of [
          [[], 0],
          [[panBase], baseAmount],
          [[panIncrement], total - baseAmount],
          [[panBase, panIncrement], total],
        ] as const) {
          const input = panInput(core, attack, selected)
          const result = calculateCatalogResult(input)
          expect(
            result.evaluation.hit!.damageItems[0]!.finalStat,
            `core ${core}, A=${attack}`,
          ).toBeCloseTo(500 + 24000 * 0.1 + 1000 * 0.3 + expected, 8)
          expect(result.factors.nonCritical.baseDamage).toBeCloseTo(
            500 + 24000 * 0.1 + 1000 * 0.3 + expected,
            8,
          )
          if (selected.some((optionId) => optionId === panIncrement)) {
            const increments = result.evaluation.contributions.filter(
              (c) =>
                c.origin.effectId === panIncrementEffect &&
                c.origin.beneficiaryId === "entity:attacker",
            )
            expect(increments).toHaveLength(1)
            expect(increments[0]!.value.value).toBeCloseTo(
              total - baseAmount,
              8,
            )
          }
        }
        const low = lowLevelResult(panInput(core, attack, [panIncrement]))
        expect(contributionOf(low, panIncrementEffect)).toBeCloseTo(
          total - baseAmount,
          8,
        )
      }
      const zero = panInput(core, 4800)
      expect(
        calculateCatalogResult({
          ...zero,
          inputs: [],
          selections: zero.selections.map((s) => ({ ...s, layers: 0 })),
        }).factors.nonCritical.baseDamage,
      ).toBe(3200)
    },
  )

  it.each([
    [6, 3200, 192],
    [6, 3300, 180],
    [1, 4800, 288],
    [1, 6000, 180],
    [7, 3200, 180],
  ] as const)(
    "keeps the independent Panyinhu example core %i / attack %i = %i",
    (core, attack, increment) => {
      expect(
        contributionOf(
          calculateCatalogResult(panInput(core, attack, [panIncrement])),
          panIncrementEffect,
        ),
      ).toBeCloseTo(increment, 8)
    },
  )

  it("keeps mindscape unlock and missing/invalid core diagnostics", () => {
    for (const [agent, option, ranks] of [
      ["1071", caesarIncrement, [0, 1]],
      ["1421", panIncrement, [0, 1, 2, 3, 4, 5]],
    ] as const)
      for (const rank of ranks) {
        const result = calculateStaticDamageFromCatalog(
          agentInput(agent, [option], rank, 1),
        )
        expect(result.ok).toBe(false)
        if (!result.ok)
          expect(result.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: "CONTEXT_MISMATCH",
                message: expect.stringContaining("not unlocked"),
              }),
            ]),
          )
      }
    for (const [agent, options] of [
      ["1071", [caesarBase, caesarIncrement]],
      ["1421", [panBase, panIncrement]],
    ] as const)
      for (const core of [undefined, 0, 8, 1.5]) {
        const input = agentInput(agent, options, 6)
        const result = calculateStaticDamageFromCatalog({
          ...input,
          bindings: input.bindings.map((binding) => ({
            ...binding,
            configuration: {
              mindscapeRank: 6,
              ...(core === undefined ? {} : { coreSkillLevel: core }),
            },
          })) as StaticCatalogDamageInput["bindings"],
        })
        expect(result.ok).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some((issue) => issue.code === "INVALID_INPUT"),
          ).toBe(true)
      }
  })

  it("requires each explicit initial attack and preserves units and source isolation", () => {
    const input = panInput(1, 4800, [panIncrement])
    for (const inputs of [
      [],
      [
        {
          bindingId: "binding:static",
          name: `${panBaseEffect}:source`,
          value: { unit: "attack-points", value: 4800 },
        },
      ],
      [
        {
          bindingId: "binding:static",
          name: `${panIncrementEffect}:source`,
          value: { unit: "sheer-force-points", value: 4800 },
        },
      ],
    ]) {
      const result = calculateStaticDamageFromCatalog({
        ...input,
        inputs,
      } as StaticCatalogDamageInput)
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "MISSING_FACT" || issue.code === "UNIT_MISMATCH",
          ),
        ).toBe(true)
    }
    // 另一来源用不同显式读数；当前面板大幅变化不替代 A。
    const otherBinding: StaticCatalogDamageInput["bindings"][number] = {
      ...input.bindings[0]!,
      bindingId: "binding:other" as const,
      holderId: "entity:other",
    }
    const holder = input.world.entities.find(
      (entity) => entity.kind === "actor",
    )!
    const result = calculateCatalogResult({
      ...withAttack(input, 99999),
      bindings: [...input.bindings, otherBinding],
      actorSources: [
        ...input.actorSources,
        { entityId: "entity:other", agentEntityId: "1421" },
      ],
      world: {
        ...input.world,
        entities: [
          ...withAttack(input, 99999).world.entities,
          { ...holder, entityId: "entity:other" },
        ],
      },
      selections: [
        ...input.selections,
        { optionId: panIncrement, bindingId: "binding:other", layers: 1 },
      ],
      inputs: [
        ...input.inputs!,
        {
          bindingId: "binding:other",
          name: `${panIncrementEffect}:source`,
          value: { unit: "attack-points", value: 6000 },
        },
      ],
    })
    expect(contributionOf(result, panIncrementEffect)).toBeCloseTo(288 + 180, 8)
    expect(result.evaluation.hit!.damageItems[0]!.finalStat).toBeCloseTo(
      500 + 24000 * 0.1 + 99999 * 0.3 + 288 + 180,
      8,
    )
  })

  it("applies the ordinary 60% branch to every hit category once selected", () => {
    const optionId =
      "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus"
    const factorAt = (skillCategory: string, potentialLevel: number) => {
      const base = agentInput("1021", [optionId]) as StaticCatalogDamageInput
      const input = {
        ...base,
        bindings: [
          {
            ...base.bindings[0]!,
            configuration: {
              ...base.bindings[0]!.configuration,
              potentialLevel,
            },
          } as StaticCatalogDamageInput["bindings"][number],
        ],
        hit: { ...base.hit, skillCategory: skillCategory as "basic" },
      }
      return calculateCatalogResult(input).factors.nonCritical["damageBonus"]
    }
    // 触发动作（闪反/快支）只是触发条件；选中增益后普攻、强化特殊技、
    // 终结技、闪反、快支命中都获得 0.6 增伤贡献
    for (const category of [
      "basic",
      "enhanced-special",
      "ultimate",
      "dodge-counter",
      "quick-assist",
    ])
      expect(factorAt(category, 0), category).toBeCloseTo(1.6, 8)
    // 未选中时保持 1；普通与潜能变体互斥，不会叠成 2.2
    const unselected = calculateCatalogResult(
      agentInput("1021", []) as StaticCatalogDamageInput,
    ).factors.nonCritical["damageBonus"]
    expect(unselected).toBe(1)
    expect(factorAt("basic", 1)).toBeCloseTo(1.6, 8)
  })

  const clawOption =
    "agents:nekomata:mindscape:0:blk-legacy:eff-ms4f47p3-p1s9yz"
  const clawEffect =
    "agent:1021:zzz-hp:eff-ms4f47p3-p1s9yz:blk-legacy:mindscape:0"
  const clawTarget = "zzz-hp:skill:nekomata-claw-mark"

  function clawInput(overrides: {
    skillCategory?: string
    element?: string
    skillTargetIds?: readonly string[]
    /** 追加到命中现有标签之后的保留分类标签（如 `zzz-hp:category:basic`）。 */
    skillTags?: readonly string[]
    damageMultiplier?: number
    /** "omitted" 表示完全不提供潜能等级（与显式 0 不同）。 */
    potentialLevel?: number | "omitted"
    coreSkillLevel?: number
    statSourceEntityId?: string
    stat?: "attack" | "impact"
    role?: "base" | "settlement"
    omitItem?: boolean
  }): StaticCatalogDamageInput {
    const base = agentInput("1021", [clawOption]) as StaticCatalogDamageInput
    const potentialLevel =
      overrides.potentialLevel === "omitted"
        ? undefined
        : (overrides.potentialLevel ?? 1)
    const binding = {
      ...base.bindings[0]!,
      configuration: {
        mindscapeRank: 0,
        coreSkillLevel: (overrides.coreSkillLevel ?? 7) as 7,
        ...(potentialLevel === undefined
          ? {}
          : { potentialLevel: potentialLevel as 1 }),
      },
    } as StaticCatalogDamageInput["bindings"][number]
    const clawItem = {
      mode: "direct" as const,
      role: overrides.role ?? ("base" as const),
      itemId: "nekomata:claw-mark",
      damageMultiplier: overrides.damageMultiplier ?? 0,
      stat: overrides.stat ?? ("attack" as const),
      statSource: {
        entityId: overrides.statSourceEntityId ?? "entity:attacker",
      },
    }
    // 目录要求命中至少包含一个伤害项；缺项场景保留基础攻击项
    const items = overrides.omitItem
      ? [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "base",
            damageMultiplier: 2,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ]
      : [clawItem]
    return {
      ...base,
      bindings: [binding],
      hit: {
        ...base.hit,
        skillCategory: (overrides.skillCategory ?? "uncategorized") as "basic",
        element: (overrides.element ?? "physical") as "physical",
        skillTargetIds: overrides.skillTargetIds ?? [clawTarget],
        skillTags: [
          ...(base.hit.skillTags ?? []),
          ...(overrides.skillTags ?? []),
        ],
        damageItems:
          items as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    }
  }

  const dawnsBloomOptionId =
    "drive-discs:SuitDawnsBloom:setPieces:2:blk-ms0cxr3v-4ihs7d:legacy-self-skillDmgBonus"
  function withDawnsBloom(input: StaticCatalogDamageInput) {
    return {
      ...input,
      bindings: [
        ...input.bindings,
        {
          bindingId: "binding:disc",
          kind: "drive-disc" as const,
          holderId: "entity:attacker",
          sourceEntityId: "33300",
          eligible: true,
          configuration: { setPieces: 2 as const },
        },
      ] as StaticCatalogDamageInput["bindings"],
      selections: [
        ...input.selections,
        {
          optionId: dawnsBloomOptionId,
          bindingId: "binding:disc",
          layers: 1,
        },
      ] as StaticCatalogDamageInput["selections"],
    }
  }

  it("gates the claw mark behind potential with its own core-level evidence", () => {
    const option = catalog.options.find((o) => o.optionId === clawOption)!
    expect(option.variants).toHaveLength(1)
    expect(option.variants[0]!.configuration).toMatchObject({
      coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
      potentialLevels: [1, 2, 3, 4, 5, 6],
    })
    // 潜能省略（归一为 0）或显式 0：按既有目录错误契约拒绝
    for (const potentialLevel of ["omitted", 0] as const) {
      const result = calculateStaticDamageFromCatalog(
        clawInput({ potentialLevel }),
      )
      expect(result.ok, `potential ${String(potentialLevel)}`).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "MISSING_RANK"),
        ).toBe(true)
    }
    // 潜能 1、2、6 在自身证据支持的核心档位上可算：爪印倍率不随核心等级变化
    for (const potentialLevel of [1, 2, 6] as const)
      for (const coreSkillLevel of [1, 7] as const) {
        const result = calculateCatalogResult(
          clawInput({ potentialLevel, coreSkillLevel }),
        )
        expect(
          contributionOf(result, clawEffect),
          `potential ${potentialLevel} core ${coreSkillLevel}`,
        ).toBeCloseTo(0.3, 8)
      }
  })

  it("starts the three independent items from a zero multiplier", () => {
    // 目录对消费方可见的元数据包含零倍率要求
    const expected: readonly (readonly [optionId: string, itemId: string])[] = [
      [clawOption, "nekomata:claw-mark"],
      [
        "agents:pyrois:mindscape:0:blk-legacy:eff-ms4m4nah-o17lgq",
        "pyrois:ult-left-extra",
      ],
      [
        "agents:pyrois:mindscape:0:blk-legacy:eff-ms4m5tqw-4wvfng",
        "pyrois:ult-right-settlement",
      ],
    ]
    for (const [optionId, itemId] of expected) {
      const option = catalog.options.find((o) => o.optionId === optionId)!
      const requirement = option.variants[0]!.damageItemRequirements!.find(
        (r) => r.itemId === itemId,
      )!
      expect(requirement.requiredDirectMultiplier, optionId).toBe(0)
    }
    // 攻击力 500：爪印 150、佩洛伊斯左分支 4500、右分支结算 11250
    const claw = calculateCatalogResult(withAttack(clawInput({}), 500))
    expect(claw.factors.nonCritical.baseDamage).toBeCloseTo(150, 6)
    const ultBase = (overrides: {
      itemId: string
      role: "base" | "settlement"
      targetId: string
      prefilled?: number
    }) => {
      const optionId = overrides.itemId.endsWith("left-extra")
        ? "agents:pyrois:mindscape:0:blk-legacy:eff-ms4m4nah-o17lgq"
        : "agents:pyrois:mindscape:0:blk-legacy:eff-ms4m5tqw-4wvfng"
      const base = agentInput("1551", [optionId]) as StaticCatalogDamageInput
      return {
        ...base,
        hit: {
          ...base.hit,
          skillCategory: "ultimate" as const,
          element: "physical" as const,
          skillTargetIds: [`zzz-hp:skill:${overrides.targetId}`],
          damageItems: [
            {
              mode: "direct" as const,
              role: overrides.role,
              itemId: overrides.itemId,
              damageMultiplier: overrides.prefilled ?? 0,
              stat: "attack" as const,
              statSource: { entityId: "entity:attacker" },
            },
          ] as StaticCatalogDamageInput["hit"]["damageItems"],
        },
      }
    }
    const left = calculateCatalogResult(
      withAttack(
        ultBase({
          itemId: "pyrois:ult-left-extra",
          role: "base",
          targetId: "pyrois-ultimate-ms4m57ys",
        }),
        500,
      ),
    )
    expect(left.factors.nonCritical.baseDamage).toBeCloseTo(4500, 6)
    const right = calculateCatalogResult(
      withAttack(
        ultBase({
          itemId: "pyrois:ult-right-settlement",
          role: "settlement",
          targetId: "pyrois-ultimate-ms4m66yy",
        }),
        500,
      ),
    )
    expect(right.factors.nonCritical.baseDamage).toBeCloseTo(11250, 6)
    // 预填对应机制倍率或其他非零倍率：返回 CONTEXT_MISMATCH，
    // 不能因重复填写机制倍率变成 300、9000、22500
    const prefilled = calculateStaticDamageFromCatalog(
      withAttack(clawInput({ damageMultiplier: 0.3 }), 500),
    )
    expect(prefilled.ok).toBe(false)
    if (!prefilled.ok)
      expect(
        prefilled.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    for (const [itemId, role, targetId, prefilledValue] of [
      ["pyrois:ult-left-extra", "base", "pyrois-ultimate-ms4m57ys", 9],
      [
        "pyrois:ult-right-settlement",
        "settlement",
        "pyrois-ultimate-ms4m66yy",
        22.5,
      ],
    ] as const) {
      const result = calculateStaticDamageFromCatalog(
        withAttack(
          ultBase({ itemId, role, targetId, prefilled: prefilledValue }),
          500,
        ),
      )
      expect(result.ok, itemId).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
          itemId,
        ).toBe(true)
    }
  })

  it("settles the claw mark as an independent uncategorized hit", () => {
    // 目录登记稳定独立目标：不是来源技能（upstreamId 为 null），分类为
    // 项目采用的 uncategorized 独立结算契约
    const target = catalog.skillTargets.find((t) => t.targetId === clawTarget)
    expect(target).toMatchObject({
      upstreamId: null,
      agentEntityId: "1021",
      category: "uncategorized",
      countsAsFollowUp: false,
    })
    // 独立命中：攻击力 1000 时爪印基础伤害 300
    const independent = calculateCatalogResult(clawInput({}))
    expect(contributionOf(independent, clawEffect)).toBeCloseTo(0.3, 8)
    expect(independent.factors.nonCritical.baseDamage).toBeCloseTo(300, 6)
    // 错误普通分类：借用普攻分类被目录约束拒绝
    const basicCategory = calculateStaticDamageFromCatalog(
      clawInput({ skillCategory: "basic" }),
    )
    expect(basicCategory.ok).toBe(false)
    if (!basicCategory.ok)
      expect(
        basicCategory.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    // 错误元素／错误目标：合法但不匹配，爪印独立项保持零倍率零贡献
    for (const [label, overrides] of [
      ["element", { element: "fire" }],
      ["target", { skillTargetIds: [] }],
    ] as const) {
      const result = calculateCatalogResult(clawInput(overrides))
      expect(contributionOf(result, clawEffect), label).toBe(0)
      expect(result.factors.nonCritical.baseDamage, label).toBe(0)
    }
    // 缺项：选中爪印但命中不含独立项
    const absent = calculateStaticDamageFromCatalog(
      clawInput({ omitItem: true }),
    )
    expect(absent.ok).toBe(false)
    if (!absent.ok)
      expect(
        absent.issues.some((issue) => issue.code === "MISSING_REFERENCE"),
      ).toBe(true)
    // 错误归属：读取他人当前属性
    const wrongHolder = calculateStaticDamageFromCatalog(
      clawInput({ statSourceEntityId: "entity:enemy" }),
    )
    expect(wrongHolder.ok).toBe(false)
    if (!wrongHolder.ok)
      expect(
        wrongHolder.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    // 错属性：伤害项不按声明的攻击力缩放
    const wrongStat = calculateStaticDamageFromCatalog(
      clawInput({ stat: "impact" }),
    )
    expect(wrongStat.ok).toBe(false)
    if (!wrongStat.ok)
      expect(
        wrongStat.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("scales impact, expected attack"),
        ),
      ).toBe(true)
    // 错误角色：独立项必须是声明的 base 伤害项
    const wrongRole = calculateStaticDamageFromCatalog(
      clawInput({ role: "settlement" }),
    )
    expect(wrongRole.ok).toBe(false)
    if (!wrongRole.ok)
      expect(
        wrongRole.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("has role settlement, expected base"),
        ),
      ).toBe(true)
    // 错误目标：未登记的独立目标按既有目录契约拒绝
    const unknownTarget = calculateStaticDamageFromCatalog(
      clawInput({ skillTargetIds: ["zzz-hp:skill:not-a-target"] }),
    )
    expect(unknownTarget.ok).toBe(false)
    if (!unknownTarget.ok)
      expect(
        unknownTarget.issues.some(
          (issue) =>
            issue.code === "MISSING_REFERENCE" &&
            issue.message.includes("Unknown skill target"),
        ),
      ).toBe(true)
  })

  it("keeps the claw mark out of ordinary basic-attack assembly and disc bonuses", () => {
    // 普通攻击命中不会自动追加爪印：爪印选项按潜能门槛合法选中时，
    // 基础攻击命中缺少独立项报 MISSING_REFERENCE，而不是自动补上爪印
    const selected = agentInput("1021", [
      clawOption,
    ]) as StaticCatalogDamageInput
    const autoAppend = calculateStaticDamageFromCatalog({
      ...selected,
      bindings: [
        {
          ...selected.bindings[0]!,
          configuration: {
            ...selected.bindings[0]!.configuration,
            potentialLevel: 1,
          },
        } as StaticCatalogDamageInput["bindings"][number],
      ],
    })
    expect(autoAppend.ok, JSON.stringify(autoAppend)).toBe(false)
    if (!autoAppend.ok)
      expect(
        autoAppend.issues.some((issue) => issue.code === "MISSING_REFERENCE"),
      ).toBe(true)
    // 与拂晓生花两件套组合：爪印独立命中不吃 15% 普攻增伤
    const clawAlone = calculateCatalogResult(clawInput({})).nonCritical
    const clawWithDisc = calculateCatalogResult(
      withDawnsBloom(clawInput({})),
    ).nonCritical
    expect(clawWithDisc).toBeCloseTo(clawAlone, 6)
    // 对照：同一两件套在基础攻击命中上提供 1.15 倍
    const basicAlone = calculateCatalogResult(
      agentInput("1021", []) as StaticCatalogDamageInput,
    ).nonCritical
    const basicWithDisc = calculateCatalogResult(
      withDawnsBloom(agentInput("1021", []) as StaticCatalogDamageInput),
    ).nonCritical
    expect(basicWithDisc / basicAlone).toBeCloseTo(1.15, 8)
  })

  it("rejects borrowed category labels and targets that conflict with the independent hit category", () => {
    const extraAbilityOption =
      "agents:nekomata:mindscape:0:blk-ms4f4rbb-id7p58:eff-ms4f4rbb-y2jon7"
    const globalDodgeTarget = "zzz-hp:skill:all-dodge-ms4e5xea"
    // 路径一：调用方保留的普攻分类标签与独立结算契约冲突，拂晓生花
    // 两件套原本会因此给出 15% 普攻增伤（合法输入不受影响）。
    const borrowedByTag = calculateStaticDamageFromCatalog(
      withDawnsBloom(clawInput({ skillTags: ["zzz-hp:category:basic"] })),
    )
    expect(borrowedByTag.ok).toBe(false)
    if (!borrowedByTag.ok)
      expect(
        borrowedByTag.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("zzz-hp:category:basic"),
        ),
        JSON.stringify(borrowedByTag.issues),
      ).toBe(true)
    // 对照：合法独立命中不受影响，也不额外吃两件套普攻增伤
    const legalClaw = calculateCatalogResult(withDawnsBloom(clawInput({})))
    expect(legalClaw.factors.nonCritical.baseDamage).toBeCloseTo(
      calculateCatalogResult(clawInput({})).factors.nonCritical.baseDamage!,
      6,
    )
    // 路径二：合法全局目标展开出 dodge 分类，猫又额外能力因此给出 35% 增伤
    const borrowedByTarget = calculateStaticDamageFromCatalog({
      ...clawInput({ skillTargetIds: [clawTarget, globalDodgeTarget] }),
      selections: [
        ...clawInput({}).selections,
        {
          optionId: extraAbilityOption,
          bindingId: "binding:static",
          layers: 1,
        },
      ],
    })
    expect(borrowedByTarget.ok).toBe(false)
    if (!borrowedByTarget.ok)
      expect(
        borrowedByTarget.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("zzz-hp:category:dodge"),
        ),
        JSON.stringify(borrowedByTarget.issues),
      ).toBe(true)
    // 对照：普通命中保留多标签、多目标与分类别名，两件套普攻增伤仍为 1.15
    const ordinary = agentInput("1021", []) as StaticCatalogDamageInput
    const ordinaryMulti = withDawnsBloom({
      ...ordinary,
      hit: {
        ...ordinary.hit,
        skillTargetIds: [globalDodgeTarget],
        skillTags: [
          ...(ordinary.hit.skillTags ?? []),
          "zzz-hp:category:basic",
          "zzz-hp:skill:all-dodge-ms4e5xea",
        ],
      },
    })
    const ordinaryAlone = calculateCatalogResult(ordinary).nonCritical
    expect(
      calculateCatalogResult(ordinaryMulti).nonCritical / ordinaryAlone,
    ).toBeCloseTo(1.15, 8)
  })

  it("reports illegal skill tag members with accurate paths instead of throwing", () => {
    // 选中爪印（潜能 1、核心 7、独立分类要求、层数 1）后，非法标签成员在
    // 分类解释前就按 /hit/skillTags/<index> 返回 INVALID_INPUT 错误 Result，
    // 不在有效分类校验中抛 TypeError；JSON 序列化往返后同样可复现。
    const withTags = (tags: readonly unknown[]) =>
      ({
        ...clawInput({}),
        hit: {
          ...clawInput({}).hit,
          skillTags:
            tags as unknown as StaticCatalogDamageInput["hit"]["skillTags"],
        },
      }) as StaticCatalogDamageInput
    for (const [label, tags, pointer] of [
      ["null", [null], "/hit/skillTags/0"],
      ["number", [1], "/hit/skillTags/0"],
      ["object", [{}], "/hit/skillTags/0"],
      ["boolean", [false], "/hit/skillTags/0"],
      ["empty string", [""], "/hit/skillTags/0"],
      [
        "legal tag followed by an illegal member",
        ["zzz-hp:category:uncategorized", null],
        "/hit/skillTags/1",
      ],
    ] as const) {
      const result = calculateStaticDamageFromCatalog(withTags(tags))
      expect(result.ok, label).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" && issue.pointer === pointer,
          ),
          `${label}: ${JSON.stringify(result.issues)}`,
        ).toBe(true)
    }
    // 对照：合法空数组与独立分类标签正常结算，攻击力 1000 → 300
    for (const tags of [[], ["zzz-hp:category:uncategorized"]] as const)
      expect(
        calculateCatalogResult(withTags(tags)).factors.nonCritical.baseDamage,
        JSON.stringify(tags),
      ).toBeCloseTo(300, 6)
    // 对照：未选中或零层时，非法标签仍由校验流程返回同一错误
    for (const [label, input] of [
      [
        "unselected",
        { ...withTags([null]), selections: [] } as StaticCatalogDamageInput,
      ],
      [
        "zero layers",
        {
          ...withTags([null]),
          selections: [
            { optionId: clawOption, bindingId: "binding:static", layers: 0 },
          ],
        } as StaticCatalogDamageInput,
      ],
    ] as const) {
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok, label).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.pointer === "/hit/skillTags/0",
          ),
          `${label}: ${JSON.stringify(result.issues)}`,
        ).toBe(true)
    }
  })
})
