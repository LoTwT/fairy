import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  CoreSkillLevel,
  DamageKind,
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { general, inputFor } from "./static-fixtures.ts"

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
const completeOptionId = "agents:yuzuha:mindscape:0:tanuki-wish-complete-state"
const resistanceOptionId =
  "agents:yuzuha:mindscape:1:blk-legacy:legacy-team-resPen"
const partialIdentities = [
  [0, "blk-ms38y9v7-07td4j", "eff-ms38y9v7-2ded3l"],
  [0, "blk-ms38y9v7-07td4j", "eff-ms3969fx-lmmkyw"],
  [1, "blk-legacy", "eff-ms44bnmi-zp616x"],
  [1, "blk-legacy", "eff-ms44dh8h-xb20mu"],
] as const
const completeVariant = () =>
  catalog.options.find((option) => option.optionId === completeOptionId)!
    .variants[0]!

function request({
  am,
  mindscape = 0,
  core = 7,
  layers = 1,
  kind = "anomaly",
  actor = "holder",
  selected = true,
  resistance = false,
}: {
  am?: number
  mindscape?: MindscapeRank
  core?: CoreSkillLevel
  layers?: number
  kind?: DamageKind
  actor?: "holder" | "teammate" | "outsider"
  selected?: boolean
  resistance?: boolean
}): StaticCatalogDamageInput {
  const base = inputFor()
  const actorId =
    kind === "luminize" ? "entity:remiel" : (`entity:${actor}` as const)
  const statSource = { entityId: `entity:${actor}` as const }
  const actorTemplate = base.world.entities[0]!
  if (actorTemplate.kind !== "actor") throw new Error("Expected actor fixture")
  const common = base.damage as Extract<
    StaticCatalogDamageInput["damage"],
    { kind: "regular" }
  >
  return {
    ...base,
    definitions,
    catalog,
    bindings: [
      ...(kind === "luminize"
        ? [
            {
              kind: "agent" as const,
              bindingId: "binding:remiel" as const,
              holderId: "entity:remiel" as const,
              sourceEntityId: "1581",
              eligible: true,
              configuration: {
                mindscapeRank: 0 as const,
                coreSkillLevel: 7 as const,
              },
            },
          ]
        : []),
      {
        kind: "agent",
        bindingId: "binding:static" as const,
        holderId: "entity:holder",
        sourceEntityId: "1411",
        eligible: true,
        configuration: { mindscapeRank: mindscape, coreSkillLevel: core },
      },
    ],
    actorSources: [
      ...(kind === "luminize"
        ? [{ entityId: "entity:remiel" as const, agentEntityId: "1581" }]
        : []),
      { entityId: "entity:holder", agentEntityId: "1411" },
      { entityId: "entity:teammate", agentEntityId: "1211" },
      { entityId: "entity:outsider", agentEntityId: "1211" },
    ],
    selections: [
      ...(kind === "luminize"
        ? [
            {
              optionId:
                "agents:remiel:mindscape:0:blk-legacy:eff-ms7tarv6-tfz2kz",
              bindingId: "binding:remiel" as const,
              layers: 1,
            },
          ]
        : []),
      ...(selected
        ? [
            {
              optionId: completeOptionId,
              bindingId: "binding:static" as const,
              layers,
            },
          ]
        : []),
      ...(resistance
        ? [
            {
              optionId: resistanceOptionId,
              bindingId: "binding:static" as const,
              layers: 1,
            },
          ]
        : []),
    ],
    inputs:
      am === undefined
        ? []
        : completeVariant().inputs.map((input) => ({
            bindingId: "binding:static" as const,
            name: input.name,
            value: { unit: "anomaly-mastery-points" as const, value: am },
          })),
    world: {
      ...base.world,
      entities: [
        ...(kind === "luminize"
          ? [
              {
                ...actorTemplate,
                entityId: "entity:remiel" as const,
                teamId:
                  actor === "outsider"
                    ? ("team:other" as const)
                    : ("team:players" as const),
              },
            ]
          : []),
        ...(["holder", "teammate", "outsider"] as const).map((name) => ({
          ...actorTemplate,
          entityId: `entity:${name}` as const,
          teamId:
            name === "outsider"
              ? ("team:other" as const)
              : ("team:players" as const),
          directStats: {
            ...actorTemplate.directStats,
            sharpCriticalDamage: { baseValue: 0, additions: [] },
          },
          generalStats: {
            ...actorTemplate.generalStats,
            anomalyMastery: general(999),
          },
        })),
        base.world.entities[1]!,
      ],
    },
    hit: {
      ...base.hit,
      actorId,
      element: kind === "luminize" ? "lumiflux" : "physical",
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "base",
          stat: "attack",
          statSource,
          damageMultiplier: 1,
        },
      ],
    },
    damage: (kind === "regular" || kind === "sheer" || kind === "sharpen"
      ? {
          ...Object.fromEntries(
            Object.entries(common).filter(
              ([key]) => kind !== "sheer" || key !== "defense",
            ),
          ),
          kind,
          ...(kind === "sheer" ? { sheerDamageBonus: [] } : {}),
          ...(kind === "sharpen" ? { sharpenDamageBonus: [] } : {}),
        }
      : {
          ...common,
          kind,
          damageBonus: { settledMultiplier: 1 },
          anomalySource: { ...statSource, level: 60 },
          anomalyDamageBonus: [],
          refringe: { mode: "settled", multiplier: 1 },
          ...(kind === "luminize"
            ? {
                luminizeMultiplier: {
                  baseLuminizeMultiplier: 1,
                  multiplicativeLuminizeMultiplierAdjustments: [],
                },
              }
            : { anomalyCriticalRate: 0, anomalyCriticalDamage: [] }),
        }) as StaticCatalogDamageInput["damage"],
  }
}

function evaluate(input: StaticCatalogDamageInput): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
const bonus = (result: StaticDamageResult) =>
  (result.factors.nonCritical.anomalyDamageBonus ?? 1) - 1

describe("Yuzuha additional ability complete state", () => {
  // 独立数值锚点；小数点掌控仅验证连续读取约定，不声称游戏取整实测。
  it.each([
    [88, 0, 0],
    [99.9, 0, 0],
    [100, 0, 0],
    [100.1, 0.0002, 0.00026],
    [124, 0.048, 0.0624],
    [150, 0.1, 0.13],
    [200, 0.2, 0.26],
    [210, 0.2, 0.26],
    [300, 0.2, 0.26],
  ])("AM %s gives M0 %s / M1 %s for anomaly and disorder", (am, m0, m1) => {
    for (const kind of ["anomaly", "disorder"] as const)
      for (const [mindscape, expected] of [
        [0, m0],
        [1, m1],
      ] as const) {
        const result = evaluate(request({ am, mindscape, kind }))
        const off = evaluate(request({ kind, selected: false }))
        expect(bonus(result)).toBeCloseTo(expected, 12)
        expect(result.expected / off.expected).toBeCloseTo(1 + expected, 12)
      }
  })

  it("keeps the complete-state metadata: base AM, core 7 bonus and two panel-specific inputs without preset", () => {
    const attributes = read(
      "../../../data/definitions/attributes/agents/1411.json",
    )
    expect(attributes.baseAttributes.anomalyMastery.value).toBe(88)
    expect(
      attributes.coreAttributeBonuses["7"].find(
        (entry: { attribute: string }) => entry.attribute === "anomalyMastery",
      ).value,
    ).toBe(36)
    expect(completeVariant().configuration.coreSkillLevels).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ])
    expect(completeVariant().maximumLayers).toBe(1)
    expect(completeVariant().layerCountInputName).toBeUndefined()
    expect(completeVariant().inputs).toHaveLength(2)
    expect(completeVariant().inputs.map((input) => input.name)).toEqual([
      "yuzuha:tanuki-wish:anomaly-mastery-final",
      "yuzuha:tanuki-wish:anomaly-mastery-external",
    ])
    for (const input of completeVariant().inputs)
      expect(input.preset).toBeUndefined()
  })

  it.each([
    [1, 0],
    [1, 1],
    [2, 0],
    [2, 1],
    [3, 0],
    [3, 1],
    [4, 0],
    [4, 1],
    [5, 0],
    [5, 1],
    [6, 0],
    [6, 1],
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ] as const)(
    "uses the same option at core %s / mindscape %s with explicit AM independent of the panel",
    (core, mindscape) => {
      for (const am of [88, 124, 175] as const)
        expect(bonus(evaluate(request({ core, mindscape, am })))).toBeCloseTo(
          (am === 88 ? 0 : am === 124 ? 0.048 : 0.15) *
            (mindscape === 0 ? 1 : 1.3),
          12,
        )
    },
  )

  it("requires AM only for the enabled state and rejects illegal or duplicate layers", () => {
    expect(bonus(evaluate(request({ layers: 0 })))).toBe(0)
    expect(calculateStaticDamageFromCatalog(request({})).ok).toBe(false)
    for (const layers of [-1, 0.5, 2, Number.NaN, Number.POSITIVE_INFINITY])
      expect(
        calculateStaticDamageFromCatalog(request({ am: 124, layers })).ok,
      ).toBe(false)
    const input = request({ am: 124 })
    expect(
      calculateStaticDamageFromCatalog({
        ...input,
        selections: [...input.selections, ...input.selections],
      }).ok,
    ).toBe(false)
  })

  it.each([
    ["holder", "anomaly"],
    ["holder", "anomaly-settlement"],
    ["holder", "disorder"],
    ["holder", "vortex"],
    ["holder", "luminize"],
    ["holder", "regular"],
    ["holder", "sheer"],
    ["holder", "sharpen"],
    ["teammate", "anomaly"],
    ["teammate", "anomaly-settlement"],
    ["teammate", "disorder"],
    ["teammate", "vortex"],
    ["teammate", "luminize"],
    ["teammate", "regular"],
    ["teammate", "sheer"],
    ["teammate", "sharpen"],
    ["outsider", "anomaly"],
    ["outsider", "anomaly-settlement"],
    ["outsider", "disorder"],
    ["outsider", "vortex"],
    ["outsider", "luminize"],
    ["outsider", "regular"],
    ["outsider", "sheer"],
    ["outsider", "sharpen"],
  ] as const)(
    "preserves anomaly classifications and team boundaries without benefiting direct damage for %s / %s",
    (actor, kind) => {
      const on = evaluate(request({ am: 150, mindscape: 6, actor, kind }))
      const off = evaluate(request({ actor, kind, selected: false }))
      const expected =
        actor !== "outsider" && !["regular", "sheer", "sharpen"].includes(kind)
          ? 0.13
          : 0
      expect(bonus(on)).toBeCloseTo(expected, 12)
      expect(on.expected / off.expected).toBeCloseTo(1 + expected, 12)
    },
  )

  it("keeps M1 resistance independent and does not activate the state from configuration", () => {
    const resistanceOnly = evaluate(
      request({ mindscape: 1, selected: false, resistance: true }),
    )
    const together = evaluate(
      request({ am: 150, mindscape: 1, resistance: true }),
    )
    expect(bonus(resistanceOnly)).toBe(0)
    expect(bonus(together)).toBeCloseTo(0.13, 12)
    for (const result of [resistanceOnly, together])
      expect(
        result.evaluation.contributions
          .filter(
            (entry) =>
              entry.address.kind === "factor" &&
              entry.address.channel === "attacker-resistance-ignore",
          )
          .map((entry) => entry.value.value),
      ).toEqual([0.1])
  })

  it("rejects each old partial option and every old low-level contribution, including mixed calls", () => {
    const input = request({ am: 124, mindscape: 1 })
    for (const [rank, block, effect] of partialIdentities) {
      const optionId = `agents:yuzuha:mindscape:${rank}:${block}:${effect}`
      const variant = catalog.options.find(
        (option) => option.optionId === optionId,
      )!.variants[0]!
      expect(variant).toMatchObject({
        status: "unsupported",
        reason: "semantic-conflict",
        effectIds: [],
      })
      expect(variant.explanation).toContain(completeOptionId)
      const oldSelection = {
        optionId,
        bindingId: "binding:static" as const,
        layers: 1,
      }
      for (const selections of [
        [oldSelection],
        [...input.selections, oldSelection],
      ]) {
        const result = calculateStaticDamageFromCatalog({
          ...input,
          selections,
        })
        expect(result.ok).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some(
              (issue) =>
                issue.message.includes("semantic-conflict") &&
                issue.message.includes(completeOptionId),
            ),
          ).toBe(true)
      }
      const effectId =
        `agent:1411:zzz-hp:${effect}:${block}:mindscape:${rank}` as const
      expect(
        definitions.effects.some((rule) => rule.effectId === effectId),
      ).toBe(false)
      const lowLevel = calculateStaticDamage({
        ...inputFor(),
        definitions,
        bindings: input.bindings,
        world: input.world,
        inputs: input.inputs!,
        hit: { ...inputFor().hit, actorId: "entity:holder" },
        selections: [
          ...completeVariant().effectIds.map((effectId) => ({
            effectId,
            bindingId: "binding:static" as const,
            layers: 1,
          })),
          { effectId, bindingId: "binding:static" as const, layers: 1 },
        ],
      })
      expect(lowLevel.ok).toBe(false)
      if (!lowLevel.ok)
        expect(
          lowLevel.issues.some(
            (issue) =>
              issue.code === "MISSING_REFERENCE" &&
              issue.pointer === "/selections/2/effectId" &&
              issue.effectId === effectId &&
              issue.bindingId === "binding:static",
          ),
        ).toBe(true)
    }
  })

  it("isolates different noncapped inputs and M1 modifications by binding", () => {
    const first = request({ am: 124 })
    const secondId = "binding:second" as const
    const combined: StaticCatalogDamageInput = {
      ...first,
      bindings: [
        ...first.bindings,
        {
          ...first.bindings[0]!,
          kind: "agent",
          bindingId: secondId,
          holderId: "entity:teammate",
          configuration: { mindscapeRank: 1, coreSkillLevel: 1 },
        },
      ],
      actorSources: first.actorSources.map((source) =>
        source.entityId === "entity:teammate"
          ? { ...source, agentEntityId: "1411" }
          : source,
      ),
      selections: [
        ...first.selections,
        { ...first.selections[0]!, bindingId: secondId },
      ],
      inputs: [
        ...first.inputs!,
        ...first.inputs!.map((input) => ({
          ...input,
          bindingId: secondId,
          value: { unit: "anomaly-mastery-points" as const, value: 150 },
        })),
      ],
    }
    expect(bonus(evaluate(combined))).toBeCloseTo(0.048 + 0.13, 12)
    expect(
      bonus(
        evaluate({ ...combined, selections: combined.selections.slice(1) }),
      ),
    ).toBeCloseTo(0.13, 12)
    expect(
      bonus(
        evaluate({ ...combined, selections: combined.selections.slice(0, 1) }),
      ),
    ).toBeCloseTo(0.048, 12)
  })
})
