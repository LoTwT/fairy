import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  CoreSkillLevel,
  MindscapeRank,
  StaticCatalogDamageInput,
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
        configuration: { mindscapeRank, coreSkillLevel },
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

function actionWithDisc(
  id: string,
  suffix: string,
  discId: string,
  discKey: string,
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
    ["1381", "0014", 1.15],
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
  it("accounts for every converted source position with an independent reference result", () => {
    expect(oracle.sourceCommit).toBe(catalog.source.commit)
    expect(oracle.cases.map((c) => c.pointer).toSorted()).toEqual(
      coverage.records
        .filter((r) => r.status === "converted")
        .map((r) => r.pointer)
        .toSorted(),
    )
  })
  it("matches each converted record in its actual rank and hit context", () => {
    for (const vector of oracle.cases) {
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
    // 潜能 0：南卡普通段规则只对快支/回避反击生效，普通直伤不消费
    expect(factorAt(0)).toBe(1)
    // 潜能 1 起：潜能分支规则按普通直伤消费 60%
    expect(factorAt(1)).toBeCloseTo(1.6, 8)
    expect(factorAt(6)).toBeCloseTo(1.6, 8)
    // 未提供潜能：按归一默认 0 走潜能 0 分支，不报错
    expect(factorAt(undefined)).toBe(1)
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
    const fixedOption =
      "agents:nekomata:mindscape:0:blk-ms4f5yzr-3tuoc1:eff-ms4f5yzr-pivfr6"
    const incrementsOption =
      "agents:nekomata:mindscape:0:blk-ms4f5yzr-3tuoc1:eff-ms4f845b-c51ysw"
    // 未提供潜能等级：依赖它的记录缺档，返回 MISSING_RANK
    for (const optionId of [fixedOption, incrementsOption]) {
      const result = calculateStaticDamageFromCatalog(
        withPotential([optionId], undefined),
      )
      expect(result.ok, optionId).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "MISSING_RANK"),
          optionId,
        ).toBe(true)
    }
    // 潜能 1：无证据键，缺档拒绝
    const below = calculateStaticDamageFromCatalog(
      withPotential([fixedOption, incrementsOption], 1),
    )
    expect(below.ok, JSON.stringify(below)).toBe(false)
    if (below.ok) return
    expect(below.issues.some((issue) => issue.code === "MISSING_RANK")).toBe(
      true,
    )

    const criticalAt = (potentialLevel: number) =>
      calculateCatalogResult(
        withPotential([fixedOption, incrementsOption], potentialLevel),
      ).factors.critical?.critical
    const baseline = calculateCatalogResult(withPotential([], 2)).factors
      .critical?.critical
    // 固定 +20% 与增量 0/10/20/30/40：潜能 2 合计 +20%，3 为 +30%，6 为 +60%
    expect(criticalAt(2)! - baseline!).toBeCloseTo(0.2, 8)
    expect(criticalAt(3)! - baseline!).toBeCloseTo(0.3, 8)
    expect(criticalAt(6)! - baseline!).toBeCloseTo(0.6, 8)
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
      records: 4,
      integrated: 3,
      outOfScope: 1,
    })
  })
})
