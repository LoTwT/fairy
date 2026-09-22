import { describe, expect, it } from "vitest"
import { calculateDefenseLevelBase } from "@randomplay/core"
import { calculateStaticDamageFromCatalog } from "../src/index.ts"
import type {
  ContributionOperation,
  StaticCatalogDamageInput,
  StaticCatalogDamageItem,
  StaticCatalogVariant,
  StaticEffectCatalog,
} from "../src/index.ts"
import { general, inputFor, literal, rule } from "./static-fixtures.ts"

function fixture(
  operations: ContributionOperation[] = [],
): StaticCatalogDamageInput {
  const base = inputFor(
    operations.map((operation, i) => rule(String(i), operation)),
  )
  const definitions = {
    ...base.definitions,
    effects: base.definitions.effects.map((r) => ({
      ...r,
      source: {
        ...r.source,
        identity: { kind: "agent" as const, entityId: "1311" },
      },
    })),
  }
  const entities: StaticEffectCatalog["entities"] = [
    {
      catalogEntityId: "test:agent",
      upstreamId: "astra",
      name: "Astra",
      identity: { kind: "agent", entityId: "1311" },
      status: "mapped",
      profession: "支援",
      element: "ether",
    },
  ]
  const catalog: StaticEffectCatalog = {
    schemaVersion: 1,
    ruleSetId: definitions.ruleSetId,
    revision: definitions.revision,
    source: { repository: "test", commit: "1", files: [] },
    entities,
    options: definitions.effects.map((r, i) => ({
      optionId: `option:${i}`,
      catalogEntityId: "test:agent",
      name: String(i),
      conditionDescription: "explicit condition",
      target: "self" as const,
      variants: [
        {
          configuration: {},
          status: "converted" as const,
          references: r.source.references,
          effectIds: [r.effectId],
          maximumLayers: 3,
          inputs: [],
          applicability: {},
          differences: [],
        },
      ],
    })),
    skillTargets: [],
    differences: [],
  }
  return {
    ...base,
    definitions,
    catalog,
    bindings: [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: "1311",
        eligible: true,
        configuration: { coreSkillLevel: 7, mindscapeRank: 6 },
      },
    ],
    selections: catalog.options.map((o) => ({
      optionId: o.optionId,
      bindingId: "binding:static",
      layers: 1,
    })),
    actorSources: [{ entityId: "entity:attacker", agentEntityId: "1311" }],
    hit: {
      ...base.hit,
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "base",
          damageMultiplier: 2,
          stat: "attack",
          statSource: { entityId: "entity:attacker" },
        },
      ],
    },
    damage: base.damage as Extract<
      StaticCatalogDamageInput["damage"],
      { kind: "regular" }
    >,
  }
}
const contribution = (
  channel:
    | "base-multiplier-increase"
    | "refringe-coefficient-increase"
    | "anomaly-duration-addition"
    | "settlement-multiplier-addition",
  value: number,
): ContributionOperation =>
  ({
    kind: "factor-contribution",
    channel,
    value: literal(
      channel === "anomaly-duration-addition"
        ? "seconds"
        : channel === "settlement-multiplier-addition"
          ? "multiplier"
          : "ratio",
      value,
    ),
  }) as ContributionOperation
function anomalyInput(
  input: StaticCatalogDamageInput,
  kind: "anomaly" | "disorder" | "vortex" = "anomaly",
): StaticCatalogDamageInput {
  if (input.damage.kind !== "regular") throw new Error("fixture")
  return {
    ...input,
    damage: {
      ...input.damage,
      kind,
      anomalyDamageBonus: [],
      anomalyCriticalDamage: [],
      anomalyCriticalRate: 0,
      refringe: { mode: "from-effects" },
      anomalySource: { entityId: "entity:attacker", level: 60 },
    },
  }
}
function changeVariant(
  input: StaticCatalogDamageInput,
  change: Partial<StaticCatalogVariant>,
): StaticCatalogDamageInput {
  return {
    ...input,
    catalog: {
      ...input.catalog,
      options: input.catalog.options.map((option) => ({
        ...option,
        variants: [{ ...option.variants[0], ...change }],
      })),
    },
  }
}

describe("catalog static calculation", () => {
  it("sums same-zone multiplier increases before multiplying", () => {
    const result = calculateStaticDamageFromCatalog(
      fixture([
        contribution("base-multiplier-increase", 0.2),
        contribution("base-multiplier-increase", 0.3),
      ]),
    )
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(3000)
  })
  it("applies a refringe coefficient exactly once", () => {
    const result = calculateStaticDamageFromCatalog(
      anomalyInput(
        fixture([contribution("refringe-coefficient-increase", 0.1)]),
      ),
    )
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["refringe"]).toBe(1.1)
  })
  it("does not read current conversion inputs in settled refringe mode", () => {
    let input = anomalyInput(
      fixture([
        {
          kind: "factor-contribution",
          channel: "refringe-coefficient-increase",
          value: { kind: "input", unit: "ratio", name: "current-coefficient" },
        },
      ]),
    )
    input = changeVariant(input, {
      inputs: [
        {
          name: "current-coefficient",
          unit: "ratio",
          description: "current input",
        },
      ],
    })
    if (input.damage.kind === "anomaly")
      input = {
        ...input,
        damage: {
          ...input.damage,
          refringe: { mode: "settled", multiplier: 1.38 },
        },
      }
    const result = calculateStaticDamageFromCatalog(input)
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["refringe"]).toBe(1.38)
  })
  it("uses disorder remaining time once and never infers it from a final multiplier", () => {
    const input = anomalyInput(
      fixture([contribution("anomaly-duration-addition", 3)]),
      "disorder",
    )
    const item = {
      mode: "standard-disorder",
      role: "base",
      itemId: "base",
      stat: "attack",
      statSource: { entityId: "entity:attacker" },
      originalAnomalyAttribute: "electric",
      baseDurationSeconds: 10,
      elapsedSeconds: 3,
    } as const
    const result = calculateStaticDamageFromCatalog({
      ...input,
      hit: { ...input.hit, damageItems: [item] },
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(
        result.value.evaluation.hit!.damageItems[0]!.damageMultiplier,
      ).toBe(17)
    expect(calculateStaticDamageFromCatalog(input)).toMatchObject({
      ok: false,
      issues: [{ code: "MISSING_FACT", pointer: "/hit/damageItems" }],
    })
  })
  it("uses vortex source duration without subtracting disorder elapsed time", () => {
    const input = anomalyInput(
      fixture([contribution("anomaly-duration-addition", 3)]),
      "vortex",
    )
    const result = calculateStaticDamageFromCatalog({
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          {
            mode: "standard-vortex",
            role: "base",
            itemId: "base",
            stat: "attack",
            statSource: { entityId: "entity:attacker" },
            profile: "shock",
            baseDurationSeconds: 10,
          },
        ],
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(
        result.value.evaluation.hit!.damageItems[0]!.damageMultiplier,
      ).toBe(22.75)
  })
  it.each([
    ["disorder", 17],
    ["vortex", 22.75],
  ] as const)(
    "applies item-specific add and scale after preparing %s multipliers",
    (kind, baseMultiplier) => {
      const input = anomalyInput(
        fixture([
          contribution("anomaly-duration-addition", 3),
          {
            kind: "hit-adjustment",
            field: "damageMultiplier",
            operator: "add",
            itemIds: ["base"],
            value: literal("multiplier", 2),
          },
          {
            kind: "hit-adjustment",
            field: "damageMultiplier",
            operator: "scale",
            itemIds: ["base"],
            value: literal("multiplier", 1.5),
          },
        ]),
        kind,
      )
      const derivedItem: StaticCatalogDamageItem = {
        role: "base",
        itemId: "base",
        stat: "attack",
        statSource: { entityId: "entity:attacker" },
        baseDurationSeconds: 10,
        ...(kind === "disorder"
          ? {
              mode: "standard-disorder",
              originalAnomalyAttribute: "electric",
              elapsedSeconds: 3,
            }
          : { mode: "standard-vortex", profile: "shock" }),
      }
      const result = calculateStaticDamageFromCatalog({
        ...input,
        hit: {
          ...input.hit,
          damageItems: [derivedItem, { ...derivedItem, itemId: "unscaled" }],
        },
      })
      const directItem: StaticCatalogDamageItem = {
        mode: "direct",
        role: "base",
        itemId: "base",
        stat: "attack",
        statSource: { entityId: "entity:attacker" },
        damageMultiplier: baseMultiplier,
      }
      const direct = calculateStaticDamageFromCatalog({
        ...input,
        selections: input.selections.slice(1),
        hit: {
          ...input.hit,
          damageItems: [directItem, { ...directItem, itemId: "unscaled" }],
        },
      })
      expect(result.ok).toBe(true)
      expect(direct.ok).toBe(true)
      if (result.ok && direct.ok) {
        expect(
          result.value.evaluation.hit!.damageItems.map(
            (item) => item.damageMultiplier,
          ),
        ).toEqual([(baseMultiplier + 2) * 1.5, baseMultiplier])
        expect(result.value.expected).toBeCloseTo(direct.value.expected, 12)
        expect(
          result.value.preparations?.map((p) => p.durationAdjustment),
        ).toEqual([3, 3])
      }
    },
  )
  it("keeps settlement on its designated item", () => {
    const input = fixture([contribution("settlement-multiplier-addition", 10)])
    const result = calculateStaticDamageFromCatalog({
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          input.hit.damageItems[0],
          {
            mode: "direct",
            role: "settlement",
            itemId: "settlement",
            stat: "attack",
            statSource: { entityId: "entity:attacker" },
            damageMultiplier: 0,
          },
        ],
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(
        result.value.evaluation.hit!.damageItems.map((i) => i.damageMultiplier),
      ).toEqual([2, 10])
    expect(calculateStaticDamageFromCatalog(input).ok).toBe(false)
  })
  it.each(["entity:attacker", "entity:source"] as const)(
    "keeps saved anomaly attributes and level independent of current %s values",
    (sourceEntityId) => {
      const input = anomalyInput(fixture())
      if (input.damage.kind !== "anomaly") throw new Error("fixture")
      const request: StaticCatalogDamageInput = {
        ...input,
        actorSources: [
          ...input.actorSources,
          ...(sourceEntityId === "entity:source"
            ? [{ entityId: sourceEntityId, agentEntityId: "1311" }]
            : []),
        ],
        snapshots: [
          {
            snapshotId: "snapshot:history",
            atSeconds: 0,
            world: {
              ...input.world,
              entities: [
                ...input.world.entities,
                {
                  kind: "actor",
                  entityId: "entity:source",
                  teamId: "team:players",
                  generalStats: { attack: general(9000) },
                  directStats: {},
                },
              ],
            },
            attributes: [
              {
                entityId: sourceEntityId,
                stat: "attack",
                stage: "current",
                value: { unit: "attack-points", value: 2500 },
              },
              {
                entityId: sourceEntityId,
                stat: "anomalyProficiency",
                stage: "current",
                value: { unit: "anomaly-proficiency-points", value: 400 },
              },
              {
                entityId: sourceEntityId,
                stat: "penetrationRatio",
                stage: "current",
                value: { unit: "ratio", value: 0.5 },
              },
            ],
          },
        ],
        hit: {
          ...input.hit,
          damageItems: [
            {
              ...input.hit.damageItems[0],
              statSource: {
                entityId: sourceEntityId,
                snapshotId: "snapshot:history",
              },
            },
          ],
        },
        damage: {
          ...input.damage,
          anomalySource: {
            entityId: sourceEntityId,
            snapshotId: "snapshot:history",
            level: 50,
          },
        },
      }
      const result = calculateStaticDamageFromCatalog(request)
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (result.ok) {
        expect(result.value.factors.nonCritical["baseDamage"]).toBe(5000)
        expect(result.value.factors.nonCritical["anomalyProficiency"]).toBe(4)
        const levelBase = calculateDefenseLevelBase(50)
        expect(result.value.factors.nonCritical["defense"]).toBeCloseTo(
          levelBase / (levelBase + 1000 * (1 - 0.5)),
          12,
        )
        expect(result.value.evaluation.attributes).toContainEqual(
          expect.objectContaining({
            entityId: sourceEntityId,
            snapshotId: "snapshot:history",
            stat: "penetrationRatio",
            value: { unit: "ratio", value: 0.5 },
          }),
        )
        const changedCurrent = calculateStaticDamageFromCatalog({
          ...request,
          world: {
            ...request.world,
            entities: request.world.entities.map((entity) =>
              entity.kind === "actor" && entity.entityId === input.hit.actorId
                ? {
                    ...entity,
                    directStats: {
                      criticalRate: entity.directStats.criticalRate!,
                    },
                  }
                : entity,
            ),
          },
        })
        expect(changedCurrent.ok, JSON.stringify(changedCurrent)).toBe(true)
        if (changedCurrent.ok)
          expect(changedCurrent.value.expected).toBe(result.value.expected)
      }
      const missingPenetration = calculateStaticDamageFromCatalog({
        ...request,
        snapshots: request.snapshots!.map((snapshot) => ({
          ...snapshot,
          attributes: snapshot.attributes.filter(
            (attribute) => attribute.stat !== "penetrationRatio",
          ),
        })),
      })
      expect(missingPenetration).toMatchObject({
        ok: false,
        issues: [{ code: "MISSING_SNAPSHOT" }],
      })
    },
  )
  it("leaves a known missing rank irrelevant until selected", () => {
    const input = changeVariant(
      fixture([contribution("base-multiplier-increase", 0.2)]),
      { configuration: { coreSkillLevels: [1] } },
    )
    expect(calculateStaticDamageFromCatalog(input)).toMatchObject({
      ok: false,
      issues: [{ code: "MISSING_RANK" }],
    })
    expect(
      calculateStaticDamageFromCatalog({ ...input, selections: [] }).ok,
    ).toBe(true)
  })
  it.each([-1, 0.5, 4, Number.NaN])(
    "rejects invalid layer count %s",
    (layers) => {
      const input = fixture([contribution("base-multiplier-increase", 0.2)])
      expect(
        calculateStaticDamageFromCatalog({
          ...input,
          selections: [
            { optionId: "option:0", bindingId: "binding:static", layers },
          ],
        }).ok,
      ).toBe(false)
    },
  )
  it("treats zero layers as disabled and still rejects unknown options", () => {
    const input = fixture([contribution("base-multiplier-increase", 0.2)])
    const result = calculateStaticDamageFromCatalog({
      ...input,
      selections: [
        { optionId: "option:0", bindingId: "binding:static", layers: 0 },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(2000)
    expect(
      calculateStaticDamageFromCatalog({
        ...input,
        selections: [
          { optionId: "missing", bindingId: "binding:static", layers: 0 },
        ],
      }).ok,
    ).toBe(false)
  })
  it("validates catalog closure and revision even with no selection", () => {
    const input = fixture([contribution("base-multiplier-increase", 0.2)])
    expect(
      calculateStaticDamageFromCatalog({
        ...input,
        catalog: { ...input.catalog, revision: "bad" },
      }).ok,
    ).toBe(false)
    const broken = changeVariant(input, { effectIds: ["agent:missing"] })
    expect(
      calculateStaticDamageFromCatalog({ ...broken, selections: [] }),
    ).toMatchObject({ ok: false, issues: [{ code: "MISSING_REFERENCE" }] })
  })
  it("reports selected unsupported entries instead of ignoring them", () => {
    const input = changeVariant(
      fixture([contribution("base-multiplier-increase", 0.2)]),
      {
        status: "unsupported",
        reason: "missing-parameter",
        explanation: "not provided",
        effectIds: [],
      },
    )
    expect(calculateStaticDamageFromCatalog(input).ok).toBe(false)
  })
  it("applies exact profession counts and beneficiary metadata", () => {
    const input = changeVariant(
      fixture([contribution("base-multiplier-increase", 0.2)]),
      {
        applicability: { teamProfession: { profession: "支援", counts: [2] } },
      },
    )
    const result = calculateStaticDamageFromCatalog(input)
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(2000)
  })
  it("prepares each original anomaly element independently of the current hit", () => {
    let input = anomalyInput(
      fixture([
        contribution("anomaly-duration-addition", 3),
        contribution("anomaly-duration-addition", 4),
      ]),
      "disorder",
    )
    input = {
      ...input,
      catalog: {
        ...input.catalog,
        options: input.catalog.options.map((option, index) => ({
          ...option,
          target: "team",
          variants: [
            {
              ...option.variants[0],
              applicability: {
                beneficiaryElements: [index === 0 ? "electric" : "ether"],
              },
            },
          ],
        })),
      },
    }
    const item = {
      mode: "standard-disorder",
      role: "base",
      stat: "attack",
      statSource: { entityId: "entity:attacker" },
      baseDurationSeconds: 10,
      elapsedSeconds: 3,
    } as const
    const result = calculateStaticDamageFromCatalog({
      ...input,
      hit: {
        ...input.hit,
        element: "fire",
        damageItems: [
          { ...item, itemId: "shock", originalAnomalyAttribute: "electric" },
          { ...item, itemId: "corruption", originalAnomalyAttribute: "ether" },
        ],
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.value.preparations?.map((p) => p.durationAdjustment),
      ).toEqual([3, 4])
      // Both core profiles use 4.5 + 1.25 × remaining seconds.
      expect(
        result.value.evaluation.hit!.damageItems.map((i) => i.damageMultiplier),
      ).toEqual([17, 18.25])
    }
  })
  it("derives sheer force from updated health and attack plus independent contributions", () => {
    const input = fixture([
      {
        kind: "stat-adjustment",
        stat: "health",
        stage: "final-fixed",
        value: literal("health-points", 2400),
      },
      {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: literal("attack-points", 100),
      },
    ])
    if (input.damage.kind !== "regular") throw new Error("fixture")
    const { defense: _defense, ...common } = input.damage
    const result = calculateStaticDamageFromCatalog({
      ...input,
      hit: {
        ...input.hit,
        damageItems: [{ ...input.hit.damageItems[0], stat: "sheerForce" }],
      },
      damage: { ...common, kind: "sheer", sheerDamageBonus: [] },
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(6940)
  })
  it("matches team beneficiary element rather than current hit element", () => {
    const input = changeVariant(
      fixture([contribution("base-multiplier-increase", 0.2)]),
      { applicability: { beneficiaryElements: ["ether"] } },
    )
    const result = calculateStaticDamageFromCatalog(input)
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(2400)
    const noMatch = calculateStaticDamageFromCatalog(
      changeVariant(input, {
        applicability: { beneficiaryElements: ["fire"] },
      }),
    )
    expect(noMatch.ok).toBe(true)
    if (noMatch.ok)
      expect(noMatch.value.factors.nonCritical["baseDamage"]).toBe(2000)
  })
  it("keeps identical weapons on different holders distinct and checks profession", () => {
    const input = fixture([contribution("base-multiplier-increase", 0.2)])
    const weapon: StaticCatalogDamageInput = {
      ...input,
      definitions: {
        ...input.definitions,
        effects: input.definitions.effects.map((r) => ({
          ...r,
          source: {
            ...r.source,
            identity: { kind: "w-engine", entityId: "weapon" },
          },
          beneficiary: { kind: "team" },
        })) as StaticCatalogDamageInput["definitions"]["effects"],
      },
      catalog: {
        ...input.catalog,
        entities: [
          ...input.catalog.entities,
          {
            catalogEntityId: "weapon",
            upstreamId: "weapon",
            name: "weapon",
            identity: { kind: "w-engine", entityId: "weapon" },
            status: "mapped",
            profession: "支援",
            element: null,
          },
        ],
        options: input.catalog.options.map((o) => ({
          ...o,
          catalogEntityId: "weapon",
          target: "team",
        })),
      },
      world: {
        ...input.world,
        entities: [
          ...input.world.entities,
          {
            kind: "actor",
            entityId: "entity:second",
            teamId: "team:players",
            generalStats: {},
            directStats: {},
          },
        ],
      },
      actorSources: [
        ...input.actorSources,
        { entityId: "entity:second", agentEntityId: "1311" },
      ],
      bindings: ["entity:attacker", "entity:second"].map((holderId, i) => ({
        bindingId: `binding:weapon${i}`,
        kind: "w-engine",
        holderId: holderId as `entity:${string}`,
        sourceEntityId: "weapon",
        eligible: true,
        configuration: { refinement: 1 },
      })),
      selections: [0, 1].map((i) => ({
        optionId: "option:0",
        bindingId: `binding:weapon${i}`,
        layers: 1,
      })),
    }
    const result = calculateStaticDamageFromCatalog(weapon)
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(2800)
    const noMatch = calculateStaticDamageFromCatalog({
      ...weapon,
      catalog: {
        ...weapon.catalog,
        entities: weapon.catalog.entities.map((e) =>
          e.catalogEntityId === "weapon" ? { ...e, profession: "强攻" } : e,
        ),
      },
    })
    expect(noMatch.ok).toBe(true)
    if (noMatch.ok)
      expect(noMatch.value.factors.nonCritical["baseDamage"]).toBe(2000)
  })
  it("rejects conflicting tiers but allows a disabled tier", () => {
    const input = fixture([
      contribution("base-multiplier-increase", 0.2),
      contribution("base-multiplier-increase", 0.3),
    ])
    const exclusive = {
      ...input,
      catalog: {
        ...input.catalog,
        options: input.catalog.options.map((o) => ({
          ...o,
          exclusiveGroup: "tier",
        })),
      },
    }
    expect(calculateStaticDamageFromCatalog(exclusive)).toMatchObject({
      ok: false,
      issues: [{ code: "CONTEXT_MISMATCH" }],
    })
    expect(
      calculateStaticDamageFromCatalog({
        ...exclusive,
        selections: exclusive.selections.map((s, i) => ({ ...s, layers: i })),
      }).ok,
    ).toBe(true)
  })
  it("keeps binding and exclusive group identities distinct when they contain colons", () => {
    const input = fixture([
      contribution("base-multiplier-increase", 0.2),
      contribution("base-multiplier-increase", 0.3),
    ])
    const independent: StaticCatalogDamageInput = {
      ...input,
      catalog: {
        ...input.catalog,
        options: input.catalog.options.map((option, index) => ({
          ...option,
          exclusiveGroup: index === 0 ? "b:c" : "c",
        })),
      },
      world: {
        ...input.world,
        entities: [
          ...input.world.entities,
          {
            kind: "actor",
            entityId: "entity:second",
            teamId: "team:players",
            generalStats: {},
            directStats: {},
          },
        ],
      },
      actorSources: [
        ...input.actorSources,
        { entityId: "entity:second", agentEntityId: "1311" },
      ],
      bindings: (["binding:a", "binding:a:b"] as const).map(
        (bindingId, index) => ({
          ...input.bindings[0]!,
          bindingId,
          holderId: index === 0 ? "entity:attacker" : "entity:second",
        }),
      ),
      selections: input.selections.map((selection, index) => ({
        ...selection,
        bindingId: index === 0 ? "binding:a" : "binding:a:b",
      })),
    }
    const result = calculateStaticDamageFromCatalog(independent)
    const renamed = calculateStaticDamageFromCatalog({
      ...independent,
      bindings: independent.bindings.map((binding, index) => ({
        ...binding,
        bindingId: `binding:renamed${index}`,
      })),
      selections: independent.selections.map((selection, index) => ({
        ...selection,
        bindingId: `binding:renamed${index}`,
      })),
    })
    expect(result.ok).toBe(true)
    expect(renamed.ok).toBe(true)
    if (result.ok && renamed.ok) {
      expect(result.value.factors).toEqual(renamed.value.factors)
      expect(result.value.expected).toBe(renamed.value.expected)
    }
  })
  it("validates optional variant explanation before using it in a diagnostic", () => {
    const input = fixture([contribution("base-multiplier-increase", 0.2)])
    for (const status of ["converted", "unsupported"] as const)
      for (const explanation of [null, 7, JSON.parse('{"toString":null}')])
        expect(
          calculateStaticDamageFromCatalog(
            changeVariant(input, {
              status,
              ...(status === "unsupported"
                ? { effectIds: [], reason: "semantic-conflict" }
                : {}),
              explanation,
            }),
          ),
        ).toMatchObject({
          ok: false,
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: "INVALID_INPUT",
              pointer: "/catalog/options/0/variants/0/explanation",
            }),
          ]),
        })
  })
  it("keeps holder and drive-disc identities distinct when they contain colons", () => {
    const input = fixture()
    const sourceEntityIds = ["c", "b:drive-disc:c"] as const
    const withSecondHolder = (
      secondHolder: "entity:a" | "entity:distinct",
    ): StaticCatalogDamageInput => {
      const holders = ["entity:a:drive-disc:b", secondHolder] as const
      return {
        ...input,
        catalog: {
          ...input.catalog,
          entities: [
            ...input.catalog.entities,
            ...sourceEntityIds.map((entityId) => ({
              catalogEntityId: `test:disc:${entityId}`,
              upstreamId: entityId,
              name: entityId,
              identity: { kind: "drive-disc" as const, entityId },
              status: "mapped" as const,
              profession: null,
              element: null,
            })),
          ],
        },
        world: {
          ...input.world,
          entities: [
            ...input.world.entities,
            ...holders.map((entityId) => ({
              kind: "actor" as const,
              entityId,
              teamId: "team:players" as const,
              generalStats: {},
              directStats: {},
            })),
          ],
        },
        actorSources: [
          ...input.actorSources,
          ...holders.map((entityId) => ({ entityId, agentEntityId: "1311" })),
        ],
        bindings: holders.map((holderId, index) => ({
          bindingId: `binding:disc${index}`,
          kind: "drive-disc",
          holderId,
          sourceEntityId: sourceEntityIds[index]!,
          eligible: true,
          configuration: { setPieces: 2 },
        })),
      }
    }
    const inputWithColons = withSecondHolder("entity:a")
    const result = calculateStaticDamageFromCatalog(inputWithColons)
    expect(result.ok).toBe(true)
    expect(result).toEqual(
      calculateStaticDamageFromCatalog(withSecondHolder("entity:distinct")),
    )
    expect(
      calculateStaticDamageFromCatalog({
        ...inputWithColons,
        bindings: [
          ...inputWithColons.bindings,
          { ...inputWithColons.bindings[0]!, bindingId: "binding:duplicate" },
        ],
      }),
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "DUPLICATE_ID",
          pointer: "/bindings/2",
        }),
      ]),
    })
  })
  it("returns structured errors for malformed public input and duplicate rule references", () => {
    const input = fixture([contribution("base-multiplier-increase", 0.2)])
    for (const broken of [
      { ...input, inputs: [null] },
      { ...input, bindings: [null] },
      { ...input, hit: { ...input.hit, skillTags: {} } },
      { ...input, catalog: { ...input.catalog, entities: [null] } },
    ]) {
      expect(
        calculateStaticDamageFromCatalog(
          broken as unknown as StaticCatalogDamageInput,
        ).ok,
      ).toBe(false)
    }
    const id = input.definitions.effects[0]!.effectId
    expect(
      calculateStaticDamageFromCatalog(
        changeVariant(input, { effectIds: [id, id] }),
      ),
    ).toMatchObject({ ok: false, issues: [{ code: "DUPLICATE_ID" }] })
  })
  it.each([
    "/catalog/entities/0/status",
    "/catalog/entities/0/identity/kind",
    "/catalog/options/0/catalogEntityId",
    "/catalog/options/0/target",
    "/catalog/options/0/variants/0/status",
    "/catalog/options/0/variants/0/effectIds/0",
    "/catalog/options/0/variants/0/differences/0",
    "/hit/skillCategory",
    "/selections/0/optionId",
    "/selections/0/bindingId",
  ])(
    "rejects an object at the scalar field %s without coercing it",
    (pointer) => {
      const input = fixture([contribution("base-multiplier-increase", 0.2)])
      const segments = pointer.slice(1).split("/")
      let target = input as unknown as Record<string, unknown>
      for (const segment of segments.slice(0, -1))
        target = target[segment] as Record<string, unknown>
      target[segments.at(-1)!] = JSON.parse('{"toString":null}')
      expect(calculateStaticDamageFromCatalog(input)).toMatchObject({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "INVALID_INPUT", pointer }),
        ]),
      })
    },
  )
  it("rejects malformed conditional catalog and preparation enums without coercing them", () => {
    const input = fixture([contribution("base-multiplier-increase", 0.2)])
    const malformed = JSON.parse('{"toString":null}')
    const samples = [
      changeVariant(input, {
        status: "unsupported",
        effectIds: [],
        reason: malformed,
      }),
      changeVariant(input, {
        parameterMapping: {
          kind: "luminize-proficiency",
          source: malformed,
          rate: 0.002,
        },
      }),
      ...(["disorder", "vortex"] as const).map((kind) => ({
        ...anomalyInput(input, kind),
        hit: {
          ...input.hit,
          damageItems: [
            {
              role: "base",
              itemId: "base",
              stat: "attack",
              statSource: { entityId: "entity:attacker" },
              baseDurationSeconds: 10,
              ...(kind === "disorder"
                ? {
                    mode: "standard-disorder",
                    originalAnomalyAttribute: malformed,
                    elapsedSeconds: 3,
                  }
                : { mode: "standard-vortex", profile: malformed }),
            },
          ],
        },
      })),
    ]
    for (const sample of samples)
      expect(
        calculateStaticDamageFromCatalog(sample as StaticCatalogDamageInput),
      ).toMatchObject({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "INVALID_INPUT" }),
        ]),
      })
  })
  it.each(["optionId", "bindingId"] as const)(
    "validates %s before serializing the selection identity",
    (field) => {
      const input = fixture([contribution("base-multiplier-increase", 0.2)])
      const circular: Record<string, unknown> = {}
      circular["self"] = circular
      for (const malformed of [1n, circular])
        expect(
          calculateStaticDamageFromCatalog({
            ...input,
            selections: [{ ...input.selections[0], [field]: malformed }],
          } as StaticCatalogDamageInput),
        ).toMatchObject({
          ok: false,
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: "INVALID_INPUT",
              pointer: `/selections/0/${field}`,
            }),
          ]),
        })
    },
  )
})
