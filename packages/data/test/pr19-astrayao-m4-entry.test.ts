import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import { validateStaticCatalog } from "../../core/src/effects/internal/static-catalog.ts"
import { rule as testRule } from "../../core/test/effects/static-fixtures.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import type {
  AstraYaoM4CatalogInput,
  AstraYaoM4DamageInput,
  ContributionRule,
  IssueCode,
  Result,
  RuleSet,
  StaticEffectCatalog,
} from "../../core/src/effects/types.ts"
import definitionsJson from "../definitions/effects/static.json" with { type: "json" }
import catalogJson from "../definitions/effects/static-catalog.json" with { type: "json" }
import {
  makeAstraYaoM4Request,
  type Mutable,
} from "./fixtures/astra-yao-m4-consumer.ts"

const effectId = "agent:1311:nanoka:m4-quick-assist-bonus-damage:mindscape:4"
const optionId = "nanoka:agents:astrayao:m4-quick-assist-bonus-damage"
const itemId = "astrayao:m4-quick-assist-bonus-damage"
type Request = Mutable<AstraYaoM4CatalogInput>
const input = () =>
  makeAstraYaoM4Request(
    structuredClone(definitionsJson) as unknown as RuleSet,
    structuredClone(catalogJson) as unknown as StaticEffectCatalog,
  )
const ok = <T>(result: Result<T>): T => {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
const bad = (result: Result<unknown>, code?: string) => {
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (!result.ok) {
    expect(result.issues.length).toBeGreaterThan(0)
    if (code)
      expect(
        result.issues.some((i) => i.code === code),
        JSON.stringify(result),
      ).toBe(true)
  }
}
function change(value: object, path: string, replacement: unknown) {
  const keys = path.split(".")
  let object = value as Record<string, unknown>
  for (const key of keys.slice(0, -1))
    object = object[key] as Record<string, unknown>
  if (replacement === undefined) delete object[keys.at(-1)!]
  else object[keys.at(-1)!] = replacement
}
function low(request: Request): Mutable<AstraYaoM4DamageInput> {
  request = structuredClone(request)
  const { catalog: _catalog, actorSources: _actorSources, ...base } = request
  const { skillTargetIds: _targets, damageItems, ...hit } = request.hit
  return {
    ...base,
    selections: request.selections.map((s) => ({
      effectId: request.catalog.options.find((o) => o.optionId === s.optionId)!
        .variants[0]!.effectIds[0]!,
      bindingId: s.bindingId,
      layers: s.layers,
    })),
    hit: {
      ...hit,
      damageItems: damageItems.map((item) => ({
        itemId: item.itemId,
        stat: item.stat,
        statSource: item.statSource,
        damageMultiplier: item.mode === "direct" ? item.damageMultiplier : 0,
      })),
    },
  } as Mutable<AstraYaoM4DamageInput>
}
const run = (request: Request) => calculateStaticDamageFromCatalog(request)
const sourceRule = (request: Request) =>
  request.definitions.effects.find((e) => e.effectId === effectId)!
const option = (request: Request) =>
  request.catalog.options.find((o) => o.optionId === optionId)!
const mechanism = (request: Request) =>
  request.catalog.mechanisms!.find((m) => m.mechanism === request.mechanism)!

describe("M4 closed fields return structured failures", () => {
  const states = ["enabled", "zero", "unselected"] as const
  const entries = [
    {
      entry: "low",
      calculate: (request: Request) => calculateStaticDamage(low(request)),
    },
    { entry: "catalog", calculate: run },
    { entry: "high", calculate: calculateStaticActionDamage },
  ] as const
  const catalogEntries = entries.filter(({ entry }) => entry !== "low")
  function setState(request: Request, state: (typeof states)[number]) {
    if (state === "zero") request.selections[0]!.layers = 0
    if (state === "unselected") request.selections = []
  }
  function expectStructuredFailure(
    calculate: () => Result<unknown>,
    code: IssueCode,
    pointer: string,
  ) {
    let result: Result<unknown> | undefined
    expect(() => {
      result = calculate()
    }).not.toThrow()
    expect(result?.ok).toBe(false)
    if (result && !result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === code &&
            (issue.pointer === pointer ||
              issue.pointer.startsWith(`${pointer}/`)),
        ),
        JSON.stringify(result.issues),
      ).toBe(true)
  }
  const sourceCases = [
    { field: "statSource bigint identity", value: () => ({ entityId: 1n }) },
    {
      field: "statSource bigint unknown field",
      value: () => ({ entityId: "entity:astra", extra: 1n }),
    },
    {
      field: "statSource cyclic unknown field",
      value: () => {
        const source: Record<string, unknown> = { entityId: "entity:astra" }
        source.extra = source
        return source
      },
    },
  ]
  it.each(
    states.flatMap((state) =>
      entries.flatMap((entry) =>
        sourceCases.map((field) => ({ state, ...entry, ...field })),
      ),
    ),
  )("$entry / $state / $field", ({ state, calculate, value }) => {
    const request = input()
    setState(request, state)
    change(request, "hit.damageItems.0.statSource", value())
    expectStructuredFailure(
      () => calculate(request),
      "INVALID_INPUT",
      "/hit/damageItems/0/statSource",
    )
  })
  it.each(
    states.flatMap((state) =>
      catalogEntries.flatMap((entry) =>
        ["bigint target", "cyclic target"].map((field) => ({
          state,
          ...entry,
          field,
        })),
      ),
    ),
  )("$entry / $state / $field", ({ state, calculate, field }) => {
    const request = input()
    setState(request, state)
    const targets: unknown[] = field === "bigint target" ? [1n] : []
    if (field === "cyclic target") targets.push(targets)
    change(request, "hit.skillTargetIds", targets)
    expectStructuredFailure(
      () => calculate(request),
      "CONTEXT_MISMATCH",
      "/hit/skillTargetIds",
    )
  })
  const referenceCases = [
    { domain: "mechanism", field: "bigint member" },
    ...["mechanism", "variant"].flatMap((domain) =>
      ["bigint locale", "bigint unknown field", "cyclic unknown field"].map(
        (field) => ({ domain, field }),
      ),
    ),
  ]
  it.each(
    states.flatMap((state) =>
      catalogEntries.flatMap((entry) =>
        referenceCases.map((field) => ({ state, ...entry, ...field })),
      ),
    ),
  )(
    "$entry / $state / $domain references / $field",
    ({ state, calculate, domain, field }) => {
      const request = input()
      setState(request, state)
      const owner =
        domain === "mechanism"
          ? mechanism(request)
          : option(request).variants[0]!
      const pointer =
        domain === "mechanism"
          ? `/catalog/mechanisms/${request.catalog.mechanisms!.indexOf(mechanism(request))}/references`
          : `/catalog/options/${request.catalog.options.indexOf(option(request))}/variants/0/references`
      if (field === "bigint member") change(owner, "references", [1n])
      else if (field === "bigint locale")
        change(owner, "references.0.locale", 1n)
      else
        change(
          owner,
          "references.0.extra",
          field === "cyclic unknown field" ? owner.references[0] : 1n,
        )
      expectStructuredFailure(
        () => calculate(request),
        "INVALID_DEFINITION",
        pointer,
      )
    },
  )
  it.each(
    states.flatMap((state) =>
      ["mechanism", "variant"].flatMap((domain) =>
        [
          "duplicate",
          "missing member",
          "different pointer",
          "different locale",
          "unknown field",
        ].map((field) => ({ state, domain, field })),
      ),
    ),
  )(
    "$state / $domain references preserve exact membership: $field",
    ({ state, domain, field }) => {
      const request = input()
      setState(request, state)
      const owner =
        domain === "mechanism"
          ? mechanism(request)
          : option(request).variants[0]!
      if (field === "duplicate")
        owner.references.push(structuredClone(owner.references[0]!))
      if (field === "missing member") owner.references.pop()
      if (field === "different pointer")
        owner.references[0]!.pointer = "/different"
      if (field === "different locale")
        owner.references[0]!.locale =
          owner.references[0]!.locale === "zh" ? "en" : "zh"
      if (field === "unknown field")
        change(owner, "references.0.extra", "unexpected")
      const pointer =
        field === "unknown field" && domain === "variant"
          ? `/catalog/options/${request.catalog.options.indexOf(option(request))}/variants/0/references`
          : `/catalog/mechanisms/${request.catalog.mechanisms!.indexOf(mechanism(request))}/references`
      expectStructuredFailure(
        () => run(request),
        domain === "mechanism" && field === "duplicate"
          ? "DUPLICATE_ID"
          : "INVALID_DEFINITION",
        pointer,
      )
    },
  )
  it.each(
    states.flatMap((state) => entries.map((entry) => ({ state, ...entry }))),
  )(
    "$entry / $state accepts complete bilingual references in either member and field order",
    ({ state, calculate }) => {
      const request = input()
      setState(request, state)
      const references = sourceRule(request).source.references
      expect(references.map((reference) => reference.locale)).toEqual(
        expect.arrayContaining(["zh", "en"]),
      )
      for (const owner of [mechanism(request), option(request).variants[0]!])
        change(
          owner,
          "references",
          owner.references
            .toReversed()
            .map((reference) =>
              Object.fromEntries(Object.entries(reference).reverse()),
            ),
        )
      const before = structuredClone(request)
      const value = ok(calculate(request))
      expect(value.expected).toBeCloseTo(
        state === "enabled" ? 12241.385843410926 : 0,
        8,
      )
      expect(value.status).toBe(state === "enabled" ? "applied" : "inactive")
      expect(value.provenance).toMatchObject({
        holderId: "entity:astra",
        hitActorId: "entity:trigger",
        beneficiaryId: "entity:trigger",
        attackProvider: { entityId: "entity:astra", stage: "current" },
        effectId,
      })
      expect(ok(calculate(request))).toEqual(value)
      expect(request).toEqual(before)
    },
  )
  it.each(["bigint", "cycle"])(
    "ordinary entries still reject the same %s fields structurally",
    (shape) => {
      const request = input()
      const {
        mechanism: _mechanism,
        event: _event,
        conditionalModel: _model,
        ...ordinary
      } = low(request)
      ordinary.selections = []
      const source: Record<string, unknown> = { entityId: "entity:astra" }
      if (shape === "bigint") source.entityId = 1n
      else source.extra = source
      change(ordinary, "hit.damageItems.0.statSource", source)
      expectStructuredFailure(
        () => calculateStaticDamage(ordinary),
        "INVALID_INPUT",
        "/hit/damageItems/0/statSource",
      )
      const {
        mechanism: _catalogMechanism,
        event: _catalogEvent,
        conditionalModel: _catalogModel,
        ...catalogRequest
      } = request
      catalogRequest.selections = []
      const targets: unknown[] = shape === "bigint" ? [1n] : []
      if (shape === "cycle") targets.push(targets)
      change(catalogRequest, "hit.skillTargetIds", targets)
      expectStructuredFailure(
        () => calculateStaticDamageFromCatalog(catalogRequest),
        "MISSING_REFERENCE",
        "/hit/skillTargetIds/0",
      )
    },
  )
})

describe("M4 ATK source rejects effective snapshots", () => {
  const states = ["enabled", "zero", "unselected"] as const
  const entries = [
    {
      entry: "low",
      prepare: (request: Request) => {
        const prepared = low(request)
        return {
          request: prepared,
          calculate: () => calculateStaticDamage(prepared),
        }
      },
    },
    {
      entry: "catalog",
      prepare: (request: Request) => ({
        request,
        calculate: () => run(request),
      }),
    },
    {
      entry: "high",
      prepare: (request: Request) => ({
        request,
        calculate: () => calculateStaticActionDamage(request),
      }),
    },
  ] as const
  const snapshotId = "snapshot:saved-atk"
  function withSavedAttack(
    request: Request | Mutable<AstraYaoM4DamageInput>,
    state: (typeof states)[number],
  ) {
    if (state === "zero") request.selections[0]!.layers = 0
    if (state === "unselected") request.selections = []
    request.snapshots = [
      {
        snapshotId,
        atSeconds: 2,
        world: structuredClone(request.world),
        attributes: [
          {
            entityId: "entity:astra",
            stat: "attack",
            stage: "current",
            value: { unit: "attack-points", value: 7777.125 },
          },
        ],
      },
    ]
  }
  const snapshotSources = [
    {
      shape: "plain snapshot",
      keys: ["entityId", "snapshotId"],
      source: () => ({ entityId: "entity:astra", snapshotId }),
    },
    {
      shape: "inherited entityId with own snapshotId",
      keys: ["snapshotId"],
      source: () =>
        Object.assign(Object.create({ entityId: "entity:astra" }) as object, {
          snapshotId,
        }),
    },
    {
      shape: "non-enumerable entityId with own snapshotId",
      keys: ["snapshotId"],
      source: () =>
        Object.defineProperty({ snapshotId }, "entityId", {
          value: "entity:astra",
          enumerable: false,
        }),
    },
    {
      shape: "own entityId with inherited snapshotId",
      keys: ["entityId"],
      source: () =>
        Object.assign(Object.create({ snapshotId }) as object, {
          entityId: "entity:astra",
        }),
    },
    {
      shape: "own entityId with non-enumerable snapshotId",
      keys: ["entityId"],
      source: () =>
        Object.defineProperty({ entityId: "entity:astra" }, "snapshotId", {
          value: snapshotId,
          enumerable: false,
        }),
    },
  ]
  it.each(
    states.flatMap((state) =>
      entries.flatMap((entry) =>
        snapshotSources.map((source) => ({ state, ...entry, ...source })),
      ),
    ),
  )(
    "$entry / $state rejects $shape with a valid saved ATK",
    ({ state, prepare, source, keys }) => {
      const { request, calculate } = prepare(input())
      withSavedAttack(request, state)
      const statSource = source() as Record<string, unknown>
      change(request, "hit.damageItems.0.statSource", statSource)
      expect(request.hit.damageItems[0]!.statSource).toBe(statSource)
      expect(Object.keys(statSource)).toEqual(keys)
      expect(statSource.entityId).toBe("entity:astra")
      expect(statSource.snapshotId).toBe(snapshotId)
      let result: ReturnType<typeof calculate> | undefined
      expect(() => {
        result = calculate()
      }).not.toThrow()
      expect(
        result?.ok,
        JSON.stringify(
          result?.ok
            ? {
                expected: result.value.expected,
                attackProvider: result.value.provenance.attackProvider,
              }
            : result,
        ),
      ).toBe(false)
      if (result && !result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.pointer === "/hit/damageItems/0/statSource",
          ),
          JSON.stringify(result.issues),
        ).toBe(true)
    },
  )
  it.each(
    states.flatMap((state) =>
      entries.flatMap((entry) =>
        ["plain current", "null-prototype current"].map((shape) => ({
          state,
          ...entry,
          shape,
        })),
      ),
    ),
  )(
    "$entry / $state accepts $shape despite a different saved ATK",
    ({ state, prepare, shape }) => {
      const { request, calculate } = prepare(input())
      withSavedAttack(request, state)
      const statSource =
        shape === "plain current"
          ? { entityId: "entity:astra" }
          : Object.assign(Object.create(null) as object, {
              entityId: "entity:astra",
            })
      change(request, "hit.damageItems.0.statSource", statSource)
      expect(request.hit.damageItems[0]!.statSource).toBe(statSource)
      expect(Object.keys(statSource)).toEqual(["entityId"])
      expect(statSource.entityId).toBe("entity:astra")
      expect("snapshotId" in statSource).toBe(false)
      if (shape === "null-prototype current")
        expect(Object.getPrototypeOf(statSource)).toBeNull()
      const value = ok(calculate())
      expect(value.nonCritical).toBeCloseTo(
        state === "enabled" ? 9282.567464197858 : 0,
        8,
      )
      expect(value.expected).toBeCloseTo(
        state === "enabled" ? 12241.385843410926 : 0,
        8,
      )
      expect(value.status).toBe(state === "enabled" ? "applied" : "inactive")
      expect(value.provenance.attackProvider).toEqual({
        entityId: "entity:astra",
        stage: "current",
      })
    },
  )
})

describe("Astra Yao M4 explicit cross-actor model", () => {
  it.each([0, 0.375, 1])(
    "independent non-neutral anchor r=%s at all three entries",
    (rate) => {
      const request = input()
      request.conditionalModel.criticalRate.value = rate
      for (const result of [
        run(request),
        calculateStaticDamage(low(request)),
        calculateStaticActionDamage(request),
      ]) {
        const value = ok(result)
        expect(value.nonCritical).toBeCloseTo(9282.567464197858, 8)
        expect(value.critical).toBeCloseTo(17172.74980876604, 8)
        expect(value.expected).toBeCloseTo(
          9282.567464197858 * (1 - rate) + 17172.74980876604 * rate,
          8,
        )
        expect(value.provenance).toMatchObject({
          holderId: "entity:astra",
          triggerActorId: "entity:trigger",
          hitActorId: "entity:trigger",
          beneficiaryId: "entity:trigger",
          attackProvider: { entityId: "entity:astra", stage: "current" },
          targetId: "entity:enemy",
        })
        expect(
          value.evaluation.contributions.filter(
            (c) => c.origin.effectId === effectId,
          ),
        ).toHaveLength(1)
      }
    },
  )
  it("second independent anchor distinguishes all four ATK stages", () => {
    const request = input()
    change(request, "world.entities.0.generalStats.attack", {
      baseValue: 2600.125,
      initialPercentage: [0.175],
      initialFixed: [70.35],
      finalPercentage: [0.115],
      finalFixed: [215.875],
    })
    change(request, "world.entities.1.generalStats.attack.baseValue", 2134.8125)
    change(
      request,
      "world.entities.1.directStats.criticalDamage.baseValue",
      1.3125,
    )
    change(
      request,
      "world.entities.1.directStats.penetrationRatio.baseValue",
      0.235,
    )
    request.conditionalModel.criticalRate.value = 0.625
    request.damage.damageBonus = [0.3125]
    request.damage.defense = {
      attackerLevel: 60,
      targetBaseDefense: 1248.875,
      defensePercentageAdjustments: [-0.075],
      penetrationValues: [42.125],
    }
    request.damage.resistance = {
      targetResistance: 0.425,
      targetResistanceReductions: [0.0625],
      attackerResistanceIgnoreValues: [0.115],
    }
    request.damage.damageTaken = {
      targetDamageTakenIncreases: [0.145],
      targetDamageTakenReductions: [0.0275],
    }
    request.damage.stunDamage = {
      isTargetStunned: true,
      targetBaseStunDamageMultiplier: 1.625,
      targetStunDamageMultiplierAdjustments: [0.0875],
    }
    const value = ok(run(request))
    expect(value.nonCritical).toBeCloseTo(10186.898274515115, 8)
    expect(value.critical).toBeCloseTo(23557.202259816204, 8)
    expect(value.expected).toBeCloseTo(18543.338265328293, 8)
  })
  it.each([0, 1, 2, 3, 4, 5, 6])(
    "rank %s enabled and both inactive forms",
    (rank) => {
      const request = input()
      change(request, "bindings.0.configuration.mindscapeRank", rank)
      if (rank < 4) bad(run(request), "CONTEXT_MISMATCH")
      else expect(ok(run(request)).status).toBe("applied")
      for (const selections of [
        [],
        [{ optionId, bindingId: "binding:astra", layers: 0 }],
      ]) {
        change(request, "selections", selections)
        for (const result of [
          run(request),
          calculateStaticDamage(low(request)),
        ]) {
          const value = ok(result)
          expect([value.nonCritical, value.critical, value.expected]).toEqual([
            0, 0, 0,
          ])
          expect(value.criticalRate).toBe(0.375)
          expect(value.status).toBe("inactive")
          expect(
            value.evaluation.contributions.some(
              (c) => c.origin.effectId === effectId,
            ),
          ).toBe(false)
        }
      }
    },
  )
  it.each([1, 2, 3, 4, 5, 6, 7])(
    "all core levels %s preserve 3×ATK",
    (core) => {
      const request = input()
      change(request, "bindings.0.configuration.coreSkillLevel", core)
      expect(ok(run(request)).expected).toBeCloseTo(12241.385843410926, 8)
    },
  )
  it.each([
    [
      "holder ATK",
      "world.entities.0.generalStats.attack.baseValue",
      4000.125,
      true,
    ],
    [
      "trigger ATK",
      "world.entities.1.generalStats.attack.baseValue",
      4000.125,
      false,
    ],
    [
      "holder CR",
      "world.entities.0.directStats.criticalRate.baseValue",
      0.03,
      false,
    ],
    [
      "trigger CR",
      "world.entities.1.directStats.criticalRate.baseValue",
      0.93,
      false,
    ],
    [
      "holder CD",
      "world.entities.0.directStats.criticalDamage.baseValue",
      2.1,
      false,
    ],
    [
      "trigger CD",
      "world.entities.1.directStats.criticalDamage.baseValue",
      2.1,
      true,
    ],
    [
      "holder pen",
      "world.entities.0.directStats.penetrationRatio.baseValue",
      0.08,
      false,
    ],
    [
      "trigger pen",
      "world.entities.1.directStats.penetrationRatio.baseValue",
      0.28,
      true,
    ],
    ["damage bonus", "damage.damageBonus.0", 0.6, true],
    [
      "resistance ignore",
      "damage.resistance.attackerResistanceIgnoreValues.0",
      0.2,
      true,
    ],
    ["enemy defense", "damage.defense.targetBaseDefense", 1101.25, true],
  ] as const)("%s dependency is explicit", (_name, path, value, affects) => {
    const request = input()
    change(request, path, value)
    const result = ok(run(request))
    expect(Math.abs(result.expected - 12241.385843410926) > 1e-6).toBe(affects)
  })
  it("zero holder ATK is applied; repeated calls are pure and do not accumulate", () => {
    const request = input()
    change(request, "world.entities.0.generalStats.attack.baseValue", 0)
    const before = structuredClone(request)
    const a = ok(run(request)),
      b = ok(run(request))
    expect(a).toEqual(b)
    expect(request).toEqual(before)
    expect(a.status).toBe("applied")
    expect(a.expected).toBe(0)
    expect(
      a.evaluation.contributions.filter((c) => c.origin.effectId === effectId),
    ).toHaveLength(1)
  })
  const invalids: readonly [string, string, unknown, string?][] = [
    ["missing model", "conditionalModel", undefined],
    ["null model", "conditionalModel", null],
    ["array model", "conditionalModel", []],
    ["missing event", "event", undefined],
    ["null event", "event", null],
    ["array hit", "hit", []],
    ["null hit", "hit", null],
    ["array damage", "damage", []],
    ["null item", "hit.damageItems.0", null],
    ["unknown input", "allowCrossActor", true],
    ["probability absent", "conditionalModel.criticalRate", undefined],
    ["probability null", "conditionalModel.criticalRate", null],
    [
      "probability units",
      "conditionalModel.criticalRate.unit",
      "multiplier",
      "UNIT_MISMATCH",
    ],
    ["probability NaN", "conditionalModel.criticalRate.value", NaN],
    ["probability infinity", "conditionalModel.criticalRate.value", Infinity],
    ["probability negative", "conditionalModel.criticalRate.value", -0.1],
    ["probability above one", "conditionalModel.criticalRate.value", 1.1],
    ["source null", "conditionalModel.criticalDamageSource", null],
    ["source array", "conditionalModel.penetrationRatioSource", []],
    [
      "source other",
      "conditionalModel.criticalDamageSource.entityId",
      "entity:enemy",
      "CONTEXT_MISMATCH",
    ],
    ["attack reading", "conditionalModel.attackReading", "holder-initial"],
    [
      "factor beneficiary",
      "conditionalModel.factorBeneficiary",
      "holder-current",
    ],
    ["rate on hit", "hit.declaredCriticalRate", 0.375],
    ["attribute override", "hit.attributeSources", {}],
    ["missing element", "hit.element", undefined],
    ["unknown element", "hit.element", "imaginary"],
    ["ordinary classification", "hit.skillCategory", "quick-assist"],
    ["follow-up tag", "hit.skillTags", ["zzz-hp:follow-up"]],
    ["other target", "hit.skillTargetIds", ["zzz-hp:skill:other"]],
    [
      "multiple targets",
      "hit.skillTargetIds",
      ["zzz-hp:skill:astrayao-m4-quick-assist-bonus-damage", "other"],
    ],
    ["missing source", "hit.damageItems.0.statSource", undefined],
    ["wrong ATK", "hit.damageItems.0.statSource.entityId", "entity:trigger"],
    ["snapshot ATK", "hit.damageItems.0.statSource.snapshotId", "snapshot:any"],
    ["nonzero input", "hit.damageItems.0.damageMultiplier", 3],
    ["wrong item", "hit.damageItems.0.itemId", "attack"],
    ["wrong stat", "hit.damageItems.0.stat", "defense"],
    ["wrong role", "hit.damageItems.0.role", "settlement"],
    ["nonregular", "damage.kind", "anomaly"],
    ["missing time", "atSeconds", undefined],
    ["future invalid time", "atSeconds", -1],
    ["infinite time", "atSeconds", Infinity],
    ["wrong event identity", "event.eventId", "plain"],
    ["false Cadenza", "event.idyllicCadenza", false],
    ["false entry", "event.enteredViaQuickAssist", false],
    ["false heavy hit", "event.nextQuickAssistHeavyHit", false],
    ["nonattack claim", "event.triggerSpecialty", "stun"],
    ["self trigger", "event.triggerActorId", "entity:astra"],
    ["wrong target", "event.targetId", "entity:astra"],
    [
      "missing binding",
      "event.sourceBindingId",
      "binding:missing",
      "MISSING_REFERENCE",
    ],
    ["ineligible source", "bindings.0.eligible", false],
    ["wrong identity", "bindings.0.sourceEntityId", "1401"],
    ["enemy trigger", "world.entities.1.teamId", "team:enemies"],
    ["friendly enemy", "world.entities.2.teamId", "team:players"],
    ["real nonattack", "actorSources.1.agentEntityId", "1311"],
    ["two layers", "selections.0.layers", 2],
    ["negative layers", "selections.0.layers", -1],
    ["fraction layers", "selections.0.layers", 0.5],
    ["negative ATK", "world.entities.0.generalStats.attack.baseValue", -1],
    [
      "overflow ATK",
      "world.entities.0.generalStats.attack.baseValue",
      Number.MAX_VALUE,
    ],
  ]
  it.each(invalids)(
    "%s is a structured failure",
    (_name, path, value, code) => {
      const request = input()
      change(request, path, value)
      bad(run(request), code)
    },
  )
  it.each(["unselected", "zero"] as const)(
    "inactive %s still needs attributes",
    (state) => {
      const request = input()
      request.selections =
        state === "zero"
          ? [{ optionId, bindingId: "binding:astra", layers: 0 }]
          : []
      change(request, "world.entities.1.directStats.criticalDamage", undefined)
      bad(run(request), "MISSING_FACT")
    },
  )
  it.each(["criticalDamage", "penetrationRatio"] as const)(
    "explicit %s current/saved holder and trigger readings",
    (stat) => {
      for (const entityId of ["entity:astra", "entity:trigger"] as const) {
        const request = input()
        const field =
          stat === "criticalDamage"
            ? "criticalDamageSource"
            : "penetrationRatioSource"
        request.conditionalModel[field] = { entityId }
        const current = ok(run(request))
        request.snapshots = [
          {
            snapshotId: "snapshot:saved",
            atSeconds: 2,
            world: structuredClone(request.world),
            attributes: [
              {
                entityId,
                stat,
                stage: "current",
                value: {
                  unit: "ratio",
                  value: stat === "criticalDamage" ? 0.525 : 0.215,
                },
              },
            ],
          },
        ]
        request.conditionalModel[field] = {
          entityId,
          snapshotId: "snapshot:saved",
        }
        const saved = ok(run(request))
        expect(saved.expected).not.toBe(current.expected)
        change(
          request,
          `world.entities.${entityId === "entity:astra" ? 0 : 1}.directStats.${stat}.baseValue`,
          0.79,
        )
        expect(ok(run(request)).expected).toBe(saved.expected)
        expect(saved.provenance[field]).toEqual({
          entityId,
          snapshotId: "snapshot:saved",
        })
      }
    },
  )
  it.each([
    ["missing", "snapshots", []],
    ["future", "snapshots.0.atSeconds", 11],
    ["wrong actor", "snapshots.0.attributes.0.entityId", "entity:astra"],
    ["wrong stat", "snapshots.0.attributes.0.stat", "penetrationRatio"],
    ["wrong stage", "snapshots.0.attributes.0.stage", "initial"],
    ["no actor", "snapshots.0.world.entities", []],
  ] as const)("snapshot %s fails without fallback", (_name, path, value) => {
    const request = input()
    request.snapshots = [
      {
        snapshotId: "snapshot:saved",
        atSeconds: 2,
        world: structuredClone(request.world),
        attributes: [
          {
            entityId: "entity:trigger",
            stat: "criticalDamage",
            stage: "current",
            value: { unit: "ratio", value: 0.525 },
          },
        ],
      },
    ]
    request.conditionalModel.criticalDamageSource = {
      entityId: "entity:trigger",
      snapshotId: "snapshot:saved",
    }
    change(request, path, value)
    bad(run(request))
  })
  it("a second actual Attack agent is accepted, independent of element", () => {
    const request = input()
    request.actorSources[1]!.agentEntityId = "1041"
    request.hit.element = "ice"
    expect(ok(run(request)).expected).toBeCloseTo(12241.385843410926, 8)
  })
  it.each(["enabled", "zero", "unselected"] as const)(
    "bad definitions and metadata cannot hide behind %s",
    (state) => {
      const mutations: ((r: Request) => void)[] = [
        (r) => change(sourceRule(r), "operation.multiplier.value", 4),
        (r) => change(sourceRule(r), "beneficiary.kind", "holder"),
        (r) => change(sourceRule(r), "when.value", false),
        (r) => change(option(r), "target", "self"),
        (r) => change(option(r), "variants.0.target", "self"),
        (r) =>
          change(option(r), "variants.0.damageItemRequirements", undefined),
        (r) => change(option(r), "variants.0.exclusiveDamageItem", undefined),
        (r) =>
          change(
            option(r),
            "variants.0.damageItemRequirements.0.requiredCriticalRateDeclaration",
            true,
          ),
        (r) => change(mechanism(r), "itemId", "other"),
        (r) => change(mechanism(r), "references", []),
        (r) =>
          change(
            r,
            "catalog.mechanisms",
            r.catalog.mechanisms!.filter((m) => m.mechanism !== r.mechanism),
          ),
        (r) =>
          r.catalog.options.push({
            ...structuredClone(option(r)),
            optionId: "alias",
          }),
      ]
      for (const mutate of mutations) {
        const request = input()
        if (state === "zero") request.selections[0]!.layers = 0
        if (state === "unselected") request.selections = []
        mutate(request)
        bad(run(request))
      }
    },
  )
  it.each(["effective", "ineligible", "zero", "other-team"] as const)(
    "second source %s uses final beneficiary filtering",
    (kind) => {
      const request = input()
      const holder = structuredClone(request.world.entities[0]!)
      holder.entityId = "entity:astra2"
      if (kind === "other-team") holder.teamId = "team:other"
      request.world.entities.push(holder)
      request.actorSources.push({
        entityId: "entity:astra2",
        agentEntityId: "1311",
      })
      const binding = structuredClone(request.bindings[0]!)
      binding.bindingId = "binding:astra2"
      binding.holderId = "entity:astra2"
      binding.eligible = kind !== "ineligible"
      request.bindings.push(binding)
      request.selections.push({
        optionId,
        bindingId: binding.bindingId,
        layers: kind === "zero" ? 0 : 1,
      })
      if (kind === "effective") bad(run(request), "CONTEXT_MISMATCH")
      else {
        const value = ok(run(request))
        request.bindings.reverse()
        request.selections.reverse()
        request.world.entities.reverse()
        request.actorSources.reverse()
        expect(ok(run(request))).toEqual(value)
      }
      const l = low(request)
      if (kind === "effective")
        bad(calculateStaticDamage(l), "CONTEXT_MISMATCH")
      else expect(ok(calculateStaticDamage(l)).status).toBe("applied")
    },
  )
  it("same-holder bindings and event declaring an inactive source cannot hide an effective source", () => {
    const request = input()
    const binding = structuredClone(request.bindings[0]!)
    binding.bindingId = "binding:alias"
    request.bindings.push(binding)
    request.selections.push({ optionId, bindingId: "binding:alias", layers: 1 })
    bad(run(request), "DUPLICATE_ID")
    bad(calculateStaticDamage(low(request)), "DUPLICATE_ID")
    request.selections = [{ optionId, bindingId: "binding:alias", layers: 1 }]
    bad(run(request), "DUPLICATE_ID")
  })
  it("formal definitions and catalog validate, including the unselected named operation", () => {
    const request = input()
    ok(parseEffectRuleSet(request.definitions))
    ok(validateStaticCatalog(request.catalog, request.definitions))
    const {
      mechanism: _m,
      event: _e,
      conditionalModel: _c,
      ...plain
    } = low(request)
    change(plain, "hit.declaredCriticalRate", 0.375)
    bad(calculateStaticDamage(plain), "INVALID_INPUT")
    change(plain, "hit.declaredCriticalRate", undefined)
    bad(calculateStaticDamage(plain), "CONTEXT_MISMATCH")
    plain.selections = []
    change(plain, "validatedAstraYaoM4Context", {})
    bad(calculateStaticDamage(plain), "INVALID_INPUT")
    bad(
      calculateStaticDamage({ ...plain, mechanism: "unknown" } as never),
      "INVALID_INPUT",
    )
  })
})

function withExtraRule(
  request: Mutable<AstraYaoM4DamageInput>,
  effect: ContributionRule,
  layers = 1,
  holderId: "entity:trigger" | "entity:astra" = "entity:trigger",
) {
  request.definitions.effects.push(
    structuredClone(effect) as Mutable<ContributionRule>,
  )
  request.bindings.push({
    kind: "environment",
    bindingId: "binding:extra",
    holderId,
    sourceEntityId: "static-tests",
    eligible: true,
    configuration: {},
  })
  if (layers > 0)
    request.selections.push({
      effectId: effect.effectId,
      bindingId: "binding:extra",
      layers,
    })
  return request
}
describe("M4 fixed multiplier and explicit stat consumption", () => {
  it.each(
    [0, 1].flatMap((active) =>
      ["add", "scale", "wildcard"].map((kind) => ({ active, kind })),
    ),
  )("$kind pollution rejects with active=$active", ({ active, kind }) => {
    const request = low(input())
    request.selections[0]!.layers = active
    const rule = testRule("pollution", {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: kind === "scale" ? "scale" : "add",
      ...(kind === "wildcard" ? {} : { itemIds: [itemId] as [string] }),
      value: { kind: "literal", unit: "multiplier", value: 2 },
    })
    bad(calculateStaticDamage(withExtraRule(request, rule)), "CONTEXT_MISMATCH")
  })
  it.each(["unselected", "false", "other-item", "other-beneficiary"] as const)(
    "nonapplicable multiplier %s preserves fixed output",
    (kind) => {
      const request = low(input())
      const rule = testRule("not-pollution", {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: [kind === "other-item" ? "another-item" : itemId],
        value: { kind: "literal", unit: "multiplier", value: 2 },
      })
      if (kind === "false")
        change(rule, "when", { kind: "constant", value: false })
      const result = ok(
        calculateStaticDamage(
          withExtraRule(
            request,
            rule,
            kind === "unselected" ? 0 : 1,
            kind === "other-beneficiary" ? "entity:astra" : "entity:trigger",
          ),
        ),
      )
      expect(result.expected).toBeCloseTo(12241.385843410926, 8)
    },
  )
  it("missing multiplier when fact remains an error", () => {
    const request = low(input())
    const rule = testRule(
      "missing-condition",
      {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: [itemId],
        value: { kind: "literal", unit: "multiplier", value: 2 },
      },
      {
        kind: "compare-number",
        unit: "ratio",
        operator: "gt",
        left: { kind: "input", unit: "ratio", name: "condition" },
        right: { kind: "literal", unit: "ratio", value: 0 },
      },
    )
    bad(calculateStaticDamage(withExtraRule(request, rule)), "MISSING_FACT")
  })
  it.each([0, 0.375, 1])(
    "hit CR and source guarantee conflict before replaced output at r=%s",
    (rate) => {
      for (const kind of ["criticalRate", "guarantee"] as const) {
        const request = low(input())
        request.conditionalModel.criticalRate.value = rate
        const rule =
          kind === "guarantee"
            ? testRule("guarantee", { kind: "guaranteed-critical", itemId })
            : testRule("hit-cr", {
                kind: "stat-adjustment",
                stat: "criticalRate",
                stage: "direct",
                value: {
                  kind: "input",
                  unit: "ratio",
                  name: "unused-cr-output",
                },
              })
        bad(
          calculateStaticDamage(withExtraRule(request, rule)),
          "CONTEXT_MISMATCH",
        )
      }
    },
  )
  it.each(["unselected", "false", "other-beneficiary"] as const)(
    "inapplicable source guarantee %s is not a conflict",
    (kind) => {
      const request = low(input()),
        rule = testRule("guarantee", { kind: "guaranteed-critical", itemId })
      if (kind === "false")
        change(rule, "when", { kind: "constant", value: false })
      expect(
        ok(
          calculateStaticDamage(
            withExtraRule(
              request,
              rule,
              kind === "unselected" ? 0 : 1,
              kind === "other-beneficiary" ? "entity:astra" : "entity:trigger",
            ),
          ),
        ).expected,
      ).toBeCloseTo(12241.385843410926, 8)
    },
  )
  it("entity CR does not demand an unused output, but a real when dependency still does", () => {
    const request = low(input()),
      rule = testRule("entity-cr", {
        kind: "stat-adjustment",
        stat: "criticalRate",
        stage: "direct",
        value: { kind: "input", unit: "ratio", name: "unused" },
      })
    change(rule, "scope", "entity")
    withExtraRule(request, rule)
    expect(ok(calculateStaticDamage(request)).expected).toBeCloseTo(
      12241.385843410926,
      8,
    )
    change(
      request.definitions.effects.at(-1)!,
      "operation.stat",
      "criticalDamage",
    )
    bad(calculateStaticDamage(request), "MISSING_FACT")
  })
  it.each(["criticalDamage", "penetrationRatio"] as const)(
    "hit %s applies only to current hit actor, never saved or another source",
    (stat) => {
      const baseline = input()
      const rule = testRule("hit-stat", {
        kind: "stat-adjustment",
        stat,
        stage: "direct",
        value: { kind: "literal", unit: "ratio", value: 0.125 },
      })
      for (const provider of ["entity:astra", "entity:trigger"] as const) {
        const field =
          stat === "criticalDamage"
            ? "criticalDamageSource"
            : "penetrationRatioSource"
        const request = low(baseline)
        request.conditionalModel[field] = { entityId: provider }
        const plain = ok(calculateStaticDamage(request))
        const result = ok(calculateStaticDamage(withExtraRule(request, rule)))
        expect(result.expected !== plain.expected).toBe(
          provider === "entity:trigger",
        )
        request.snapshots = [
          {
            snapshotId: "snapshot:saved",
            atSeconds: 1,
            world: structuredClone(request.world),
            attributes: [
              {
                entityId: provider,
                stat,
                stage: "current",
                value: {
                  unit: "ratio",
                  value: stat === "criticalDamage" ? 0.85 : 0.12,
                },
              },
            ],
          },
        ]
        request.conditionalModel[field] = {
          entityId: provider,
          snapshotId: "snapshot:saved",
        }
        const saved = ok(calculateStaticDamage(request))
        request.selections.pop()
        expect(ok(calculateStaticDamage(request)).expected).toBe(saved.expected)
      }
    },
  )
  it("holder entity ATK bonuses change the scaling provider; trigger hit ATK bonuses do not", () => {
    const effect = testRule("attack", {
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
      value: { kind: "literal", unit: "attack-points", value: 125.375 },
    })
    change(effect, "scope", "entity")
    const holder = ok(
      calculateStaticDamage(
        withExtraRule(low(input()), effect, 1, "entity:astra"),
      ),
    )
    expect(holder.expected).toBeCloseTo(
      (12241.385843410926 * (3245.375 + 125.375)) / 3245.375,
      8,
    )
    change(effect, "scope", "hit")
    expect(
      ok(calculateStaticDamage(withExtraRule(low(input()), effect))).expected,
    ).toBeCloseTo(12241.385843410926, 8)
  })
})

describe("M4 coexists with the actual Astra catalog", () => {
  const coreOption =
    "agents:astrayao:mindscape:0:blk-ms38hwcr-q7y9sx:eff-ms38hwcr-m9hn4v"
  const coreInput =
    "agent:1311:zzz-hp:eff-ms38hwcr-m9hn4v:blk-ms38hwcr-q7y9sx:mindscape:0:source"
  const select = (request: Request, id: string, layers = 1) =>
    request.selections.push({
      optionId: id,
      bindingId: "binding:astra",
      layers,
    })
  it("M0 team damage and CD, M1 resistance ignore, and ordinary stun consume trigger channels", () => {
    const request = input()
    select(
      request,
      "agents:astrayao:mindscape:0:blk-legacy:legacy-team-dmgBonus",
    )
    select(
      request,
      "agents:astrayao:mindscape:0:blk-legacy:legacy-team-critDmg",
    )
    select(
      request,
      "agents:astrayao:mindscape:1:blk-legacy:legacy-team-resPen",
      3,
    )
    const value = ok(run(request))
    const expectedN =
      ((9282.567464197858 * (1 + 0.2375 + 0.2)) / (1 + 0.2375)) *
      ((1 - 0.32 + 0.045 + 0.0675 + 0.18) / (1 - 0.32 + 0.045 + 0.0675))
    expect(value.nonCritical).toBeCloseTo(expectedN, 8)
    expect(value.critical).toBeCloseTo(expectedN * (1 + 0.85 + 0.25), 8)
    expect(value.expected).toBeCloseTo(
      expectedN * (1 + 0.375 * (0.85 + 0.25)),
      8,
    )
  })
  it.each([1, 2, 3, 4, 5, 6, 7])(
    "core%s initial conversion adds to the actual holder current ATK",
    (level) => {
      const request = input()
      change(request, "bindings.0.configuration.coreSkillLevel", level)
      select(request, coreOption)
      request.inputs = [
        {
          bindingId: "binding:astra",
          name: coreInput,
          value: { unit: "attack-points", value: 2200.125 },
        },
      ]
      // 既有 M2 modification 由配置自动生效；两个目录别名不是第二次转模。
      const rate = [0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.35][level - 1]! + 0.19
      const expected =
        (12241.385843410926 * (3245.375 + Math.min(2200.125 * rate, 1600))) /
        3245.375
      expect(ok(run(request)).expected).toBeCloseTo(expected, 8)
      for (const alias of [
        "agents:astrayao:mindscape:2:blk-legacy:legacy-team-atk",
        "agents:astrayao:mindscape:2:blk-legacy:eff-muhxkum2-5x20c1",
      ]) {
        const selected = structuredClone(request)
        select(selected, alias)
        expect(ok(run(selected)).expected).toBeCloseTo(expected, 8)
      }
    },
  )
  it.each(["enabled", "zero", "unselected"] as const)(
    "core inputs stay required with M4 %s",
    (state) => {
      const request = input()
      if (state === "zero") request.selections[0]!.layers = 0
      if (state === "unselected") request.selections = []
      select(request, coreOption)
      bad(run(request), "MISSING_FACT")
      request.inputs = [
        {
          bindingId: "binding:astra",
          name: coreInput,
          value: { unit: "attack-points", value: 3000.5 },
        },
      ]
      const value = ok(run(request))
      expect(value.expected > 0).toBe(state === "enabled")
      const plain = low(request)
      const {
        mechanism: _m,
        event: _e,
        conditionalModel: _c,
        ...ordinary
      } = plain
      ordinary.selections = ordinary.selections.filter(
        (s) => s.effectId !== effectId,
      )
      change(
        ordinary,
        "hit.damageItems.0.statSource.entityId",
        "entity:trigger",
      )
      change(ordinary, "hit.damageItems.0.damageMultiplier", 2)
      expect(ok(calculateStaticDamage(ordinary)).expected).toBeGreaterThan(0)
    },
  )
  it("both M6 options remain inapplicable to the teammate uncategorized item", () => {
    const request = input()
    change(request, "bindings.0.configuration.mindscapeRank", 6)
    for (const suffix of ["eff-ms38u6vr-0upby4", "legacy-self-critRate"])
      select(request, "agents:astrayao:mindscape:6:blk-legacy:" + suffix)
    expect(ok(run(request)).expected).toBeCloseTo(12241.385843410926, 8)
    request.selections[1]!.layers = 0
    request.selections[2]!.layers = 0
    expect(ok(run(request)).expected).toBeCloseTo(12241.385843410926, 8)
  })
  it("reordering rule and option arrays retains full non-neutral results", () => {
    const request = input(),
      original = ok(run(request))
    request.definitions.effects.reverse()
    request.catalog.options.reverse()
    expect(ok(run(request))).toEqual(original)
  })
  it("a declared inactive holder cannot authorize another effective same-name instance", () => {
    const request = input(),
      holder = structuredClone(request.world.entities[0]!)
    holder.entityId = "entity:astra2"
    request.world.entities.push(holder)
    request.actorSources.push({
      entityId: "entity:astra2",
      agentEntityId: "1311",
    })
    const binding = structuredClone(request.bindings[0]!)
    binding.bindingId = "binding:astra2"
    binding.holderId = "entity:astra2"
    request.bindings.push(binding)
    request.selections = [{ optionId, bindingId: "binding:astra2", layers: 1 }]
    bad(run(request), "CONTEXT_MISMATCH")
    bad(calculateStaticDamage(low(request)), "CONTEXT_MISMATCH")
  })
})
describe("M4 sealed definition and ordinary entry boundaries", () => {
  it.each(
    [4, 5, 6].flatMap((rank) =>
      [1, 2, 3, 4, 5, 6, 7].map((core) => ({ rank, core })),
    ),
  )("M$rank/core$core is independently legal", ({ rank, core }) => {
    const request = input()
    change(request, "bindings.0.configuration.mindscapeRank", rank)
    change(request, "bindings.0.configuration.coreSkillLevel", core)
    expect(ok(run(request)).expected).toBeCloseTo(12241.385843410926, 8)
  })
  it.each([1, 12, 16])(
    "legitimate explicit special-skill level %s does not change this fixed event",
    (level) => {
      const request = input()
      change(request, "bindings.0.configuration.specialSkillLevel", level)
      expect(ok(run(request)).expected).toBeCloseTo(12241.385843410926, 8)
    },
  )
  it.each([0, 1])(
    "r=%s still requires CD for both ordinary conditional branches",
    (rate) => {
      const request = input()
      request.conditionalModel.criticalRate.value = rate
      change(request, "world.entities.1.directStats.criticalDamage", undefined)
      bad(run(request), "MISSING_FACT")
    },
  )
  it.each([
    ["activation.maximumLayers.value", 2],
    ["activation.exclusiveGroup", "m4"],
    ["operation.multiplier.kind", "literal"],
    ["operation.multiplier.unit", "ratio"],
    ["operation.itemId", "other"],
    ["parameters.extra", { kind: "constant", unit: "ratio", value: 0.1 }],
    ["source.identity.entityId", "1401"],
    ["config.conditions.0.right.value", 3],
    [
      "uniqueness",
      { key: "m4", scope: "team", select: { kind: "single-source-only" } },
    ],
  ] as const)("sealed rule refuses %s even unselected", (path, value) => {
    const request = input()
    request.selections = []
    change(sourceRule(request), path, value)
    bad(run(request))
  })
  it("external operation modifications are rejected at definition validation", () => {
    const request = input()
    const modification = structuredClone(
      request.definitions.effects.find(
        (e) => e.effectId === "agent:1311:zzz-hp:mindscape-2:attack-conversion",
      )!,
    )
    change(modification, "effectId", "agent:1311:test:m4-modifier")
    change(modification, "target.effectId", effectId)
    request.definitions.effects.push(modification)
    request.selections = []
    bad(run(request), "INVALID_MODIFICATION")
  })
  it("ordinary unselected definitions work, but an active Alice period remains a different event", () => {
    const request = low(input())
    const { mechanism: _m, event: _e, conditionalModel: _c, ...plain } = request
    plain.selections = []
    expect(ok(calculateStaticDamage(plain)).expected).toBe(0)
    const alice = {
      kind: "actor" as const,
      entityId: "entity:alice" as const,
      teamId: "team:players" as const,
      generalStats: {},
      directStats: {},
    }
    request.world.entities.push(alice)
    request.bindings.push({
      kind: "agent",
      bindingId: "binding:alice",
      holderId: alice.entityId,
      sourceEntityId: "1401",
      eligible: true,
      configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
    })
    request.selections.push({
      effectId: "agent:1401:nanoka:core-periodic-damage:mindscape:0",
      bindingId: "binding:alice",
      layers: 1,
    })
    bad(calculateStaticDamage(request), "CONTEXT_MISMATCH")
  })
})
