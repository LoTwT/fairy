import { describe, expect, it } from "vitest"
import { calculateStaticDamageFromCatalog } from "../src/index.ts"
import type {
  ContributionOperation,
  StaticCatalogDamageInput,
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
  it("keeps historical anomaly source independent of the hitter", () => {
    const input = anomalyInput(fixture())
    if (input.damage.kind !== "anomaly") throw new Error("fixture")
    const result = calculateStaticDamageFromCatalog({
      ...input,
      actorSources: [
        ...input.actorSources,
        { entityId: "entity:source", agentEntityId: "1311" },
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
              entityId: "entity:source",
              stat: "attack",
              stage: "current",
              value: { unit: "attack-points", value: 2500 },
            },
            {
              entityId: "entity:source",
              stat: "anomalyProficiency",
              stage: "current",
              value: { unit: "anomaly-proficiency-points", value: 400 },
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
              entityId: "entity:source",
              snapshotId: "snapshot:history",
            },
          },
        ],
      },
      damage: {
        ...input.damage,
        anomalySource: {
          entityId: "entity:source",
          snapshotId: "snapshot:history",
          level: 50,
        },
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(5000)
      expect(result.value.factors.nonCritical["anomalyProficiency"]).toBe(4)
    }
  })
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
})
