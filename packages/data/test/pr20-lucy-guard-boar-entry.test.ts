import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  calculateStaticActionDamage,
} from "../../core/src/index.ts"
import type {
  EffectRule,
  LucyGuardBoarCatalogInput,
  LucyGuardBoarDamageInput,
  Result,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/types.ts"
import definitionsJson from "../definitions/effects/static.json" with { type: "json" }
import catalogJson from "../definitions/effects/static-catalog.json" with { type: "json" }
import {
  makeLucyGuardBoarRequest,
  type Mutable,
} from "./fixtures/lucy-guard-boar-consumer.ts"
type Request = Mutable<LucyGuardBoarCatalogInput>
const ids = {
  inheritance: "nanoka:agents:lucy:guard-boar-inheritance",
  m6: "nanoka:agents:lucy:m6-boar-rain",
  fixed: "agents:lucy:mindscape:0:blk-legacy:legacy-team-atk",
  convert: "agents:lucy:mindscape:0:blk-legacy:eff-ms384fjz-fgct7r",
  m4: "agents:lucy:mindscape:4:blk-legacy:legacy-team-critDmg",
} as const
const conversionName =
  "agent:1151:zzz-hp:eff-ms384fjz-fgct7r:blk-legacy:mindscape:0:source"
const input = () =>
  makeLucyGuardBoarRequest(
    structuredClone(definitionsJson) as unknown as RuleSet,
    structuredClone(catalogJson) as unknown as StaticEffectCatalog,
  )
const ok = <T>(result: Result<T>): T => {
  expect(result.ok, JSON.stringify(result.ok ? null : result.issues)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function bad(run: () => Result<unknown>, code: string, pointer?: string) {
  let result: Result<unknown> | undefined
  expect(() => {
    result = run()
  }).not.toThrow()
  expect(result?.ok).toBe(false)
  if (result && !result.ok)
    expect(
      result.issues.some(
        (i) =>
          i.code === code &&
          (pointer === undefined ||
            i.pointer === pointer ||
            i.pointer.startsWith(pointer + "/")),
      ),
      JSON.stringify(result.issues),
    ).toBe(true)
}
function low(r: Request): LucyGuardBoarDamageInput {
  const { catalog, actorSources: _actors, ...base } = r
  return {
    ...base,
    selections: r.selections.map((s) => ({
      effectId: catalog.options.find((o) => o.optionId === s.optionId)!
        .variants[0]!.effectIds[0]!,
      bindingId: s.bindingId,
      layers: s.layers,
    })),
  }
}
const entries = [
  { name: "low", run: (r: Request) => calculateStaticDamage(low(r)) },
  { name: "catalog", run: calculateStaticDamageFromCatalog },
  { name: "high", run: calculateStaticActionDamage },
] as const
const actor = (r: Request, id = "entity:lucy") => {
  const actor = r.world.entities.find(
    (a) => a.kind === "actor" && a.entityId === id,
  )
  if (!actor || actor.kind !== "actor") throw new Error("Missing actor fixture")
  return actor
}
const binding = (r: Request) => {
  const value = r.bindings[0]!
  if (value.kind !== "agent") throw new Error("Missing agent fixture")
  return value
}
const explosion = (r: Request) => {
  if (r.settlement.kind !== "m6-explosion")
    throw new Error("Missing event fixture")
  return r.settlement
}
function disable(r: Request, id: string, mode: "zero" | "unselected") {
  if (mode === "zero") r.selections.find((s) => s.optionId === id)!.layers = 0
  else r.selections = r.selections.filter((s) => s.optionId !== id)
}
function set(value: object, path: string, replacement: unknown) {
  const keys = path.split(".")
  let parent = value as Record<string, unknown>
  for (const key of keys.slice(0, -1))
    parent = parent[key] as Record<string, unknown>
  if (replacement === undefined) delete parent[keys.at(-1)!]
  else parent[keys.at(-1)!] = replacement
}
function unrelatedTeam(r: Request) {
  r.actorSources.find((a) => a.entityId === "entity:trigger")!.agentEntityId =
    "1021"
  r.teamCondition = { kind: "not-satisfied" }
}

describe("Lucy named inheritance and one M6 event", () => {
  it.each(entries)(
    "$name matches an independent nonneutral anchor and source attribution",
    ({ name, run }) => {
      const r = input(),
        before = structuredClone(r),
        result = ok(run(r))
      expect(result.attributes.attack.value).toBeCloseTo(1704.9163, 10)
      expect(result.attributes.impact.value).toBe(155)
      expect(result.attributes.anomalyProficiency.value).toBe(230.5)
      expect(result.attributes.criticalRate.value).toBeCloseTo(0.44, 12)
      expect(result.attributes.criticalDamage.value).toBeCloseTo(1.12, 12)
      expect(result.attributes.penetrationRatio.value).toBe(0.17)
      expect(result.settlement!.nonCritical).toBeCloseTo(6902.0273326394645, 8)
      expect(result.settlement!.critical).toBeCloseTo(14632.297945195665, 8)
      expect(result.settlement!.expected).toBeCloseTo(9298.411222531886, 8)
      expect(result.settlement).toMatchObject({
        status: "applied",
        itemId: "lucy:m6-boar-rain",
        skillTargetId: "nanoka:lucy-m6-boar-rain",
        element: "fire",
        skillCategory: "uncategorized",
        skillTags: [],
        attackProvider: { entityId: "entity:boar", stage: "current" },
      })
      expect(result.settlement!.evaluation.hit!.damageItems).toEqual([
        {
          itemId: "lucy:m6-boar-rain",
          damageMultiplier: 3,
          finalStat: result.attributes.attack.value,
        },
      ])
      expect(result.provenance.teamConditionEvidence).toBe(
        name === "low" ? "caller-asserted" : "catalog-verified",
      )
      expect(result.provenance.conversionInput).toMatchObject({
        source: "derived-owner-initial",
        value: { value: 1173.25 },
        ownerId: "entity:lucy",
        stage: "initial",
      })
      expect(result.provenance.removedOwnerCheerContributions).toHaveLength(3)
      expect(
        result.provenance.boarCheerContributions.filter(
          (c) => c.stat === "criticalDamage",
        ),
      ).toMatchObject([
        { multiplier: 1, value: { value: 0.1 }, beneficiaryId: "entity:boar" },
      ])
      expect(result.provenance.inheritanceContributions).toHaveLength(5)
      expect(
        result.provenance.inheritanceContributions.every(
          (c) => c.references.length > 0 && c.sourceEntityId === "entity:lucy",
        ),
      ).toBe(true)
      expect(ok(run(r))).toEqual(result)
      expect(r).toEqual(before)
    },
  )
  const ranks = [1, 2, 3, 4, 5, 6, 7].flatMap((core) =>
    [0, 4, 6].flatMap((mindscape) =>
      [1, 12, 16].map((level) => ({ core, mindscape, level })),
    ),
  )
  it.each(ranks)(
    "core $core / M$mindscape / final special $level",
    ({ core, mindscape, level }) => {
      const r = input()
      Object.assign(binding(r).configuration, {
        coreSkillLevel: core,
        mindscapeRank: mindscape,
        specialSkillLevel: level,
      })
      if (mindscape < 4) disable(r, ids.m4, "unselected")
      if (mindscape < 6) {
        disable(r, ids.m6, "unselected")
        r.settlement = { kind: "attributes" }
      }
      const result = ok(calculateStaticDamageFromCatalog(r))
      const cheer = Math.min(
        1173.25 * ((130 + 8 * level) / 1000) + 40 + 4 * level,
        600,
      )
      expect(result.attributes.attack.value).toBeCloseTo(
        37.25 + 1173.25 + [1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2][core - 1]! * cheer,
        9,
      )
      expect(result.attributes.criticalDamage.value).toBeCloseTo(
        0.19 + 0.83 + (mindscape >= 4 ? 0.1 : 0),
        12,
      )
      expect(result.settlement === null).toBe(mindscape < 6)
    },
  )
  it("second capped noninteger anchor", () => {
    const r = input(),
      a = actor(r)
    Object.assign(binding(r).configuration, {
      coreSkillLevel: 7,
      specialSkillLevel: 16,
    })
    set(a, "generalStats.attack.baseValue", 2437.625)
    set(a, "generalStats.impact.baseValue", 166.75)
    set(a, "generalStats.anomalyProficiency.baseValue", 318.125)
    a.directStats.criticalRate!.baseValue = 0.41
    a.directStats.criticalDamage!.baseValue = 1.137
    r.boar.ownStats.attack.value = 51.875
    r.boar.ownStats.impact.value = 9.25
    r.boar.ownStats.anomalyProficiency.value = 26.5
    r.boar.ownStats.criticalRate.value = 0.09
    r.boar.ownStats.criticalDamage.value = 0.27
    explosion(r).criticalRate.value = 0.67
    const result = ok(calculateStaticDamageFromCatalog(r))
    expect(result.attributes.attack.value).toBe(3689.5)
    expect(result.attributes.impact.value).toBe(176)
    expect(result.attributes.anomalyProficiency.value).toBe(344.625)
    expect(result.attributes.criticalDamage.value).toBeCloseTo(1.507, 12)
    expect(result.settlement!.expected).toBeCloseTo(30017.201329316147, 8)
  })
  it("initial/current split with selected contributions removed only once", () => {
    const r = input()
    actor(r).generalStats.attack = {
      baseValue: 923.125,
      initialPercentage: [0.175],
      initialFixed: [31.375],
      finalPercentage: [0.225],
      finalFixed: [73.625],
    }
    const initial = 923.125 * 1.175 + 31.375,
      current = initial * 1.225 + 73.625
    const cheer = Math.min(initial * 0.226, 512) + 88
    const result = ok(calculateStaticDamageFromCatalog(r))
    expect(result.provenance.conversionInput!.value.value).toBeCloseTo(
      initial,
      12,
    )
    expect(result.attributes.attack.value).toBeCloseTo(
      37.25 + current + 1.4 * cheer,
      9,
    )
    expect(
      result.provenance.ownerReadings.find(
        (a) => a.stat === "attack" && a.stage === "current",
      )!.value.value,
    ).toBeCloseTo(current + cheer, 9)
    expect(initial).not.toBe(current)
  })
  it.each([0, 512 / 0.226, 4200.125])("cheer cap for initial %s", (initial) => {
    const r = input()
    set(actor(r), "generalStats.attack.baseValue", initial)
    const result = ok(calculateStaticDamageFromCatalog(r)),
      c = Math.min(initial * 0.226 + 88, 600)
    expect(
      result.provenance.boarCheerContributions
        .filter((x) => x.stat === "attack")
        .reduce((s, x) => s + x.sourceValue.value, 0),
    ).toBeCloseTo(c, 10)
  })
  it.each([
    { fixed: false, convert: false },
    { fixed: true, convert: false },
    { fixed: false, convert: true },
    { fixed: true, convert: true },
  ])("separate fixed=$fixed conversion=$convert", ({ fixed, convert }) => {
    const r = input()
    set(actor(r), "generalStats.attack.baseValue", 4000.5)
    if (!fixed) disable(r, ids.fixed, "unselected")
    if (!convert) disable(r, ids.convert, "unselected")
    const result = ok(calculateStaticDamageFromCatalog(r))
    const c = (fixed ? 88 : 0) + (convert ? 512 : 0)
    expect(result.attributes.attack.value).toBeCloseTo(
      37.25 + 4000.5 + 1.4 * c,
      10,
    )
    expect(result.provenance.conversionInput === null).toBe(!convert)
  })
  it.each(
    entries.flatMap((entry) =>
      ["unselected", "zero"].map((mode) => ({
        ...entry,
        mode: mode as "unselected" | "zero",
      })),
    ),
  )("$name M6 $mode retains panel and reports inactive", ({ run, mode }) => {
    const r = input()
    disable(r, ids.m6, mode)
    const result = ok(run(r))
    expect(result.attributes.attack.value).toBeCloseTo(1704.9163, 9)
    expect(result.settlement).toMatchObject({
      status: "inactive",
      nonCritical: 0,
      critical: 0,
      expected: 0,
    })
  })
  it.each(
    entries.flatMap((entry) =>
      ["unselected", "zero"].map((mode) => ({
        ...entry,
        mode: mode as "unselected" | "zero",
      })),
    ),
  )(
    "$name inheritance $mode does not read unavailable inheritance-only attributes",
    ({ run, mode }) => {
      const r = input()
      disable(r, ids.inheritance, mode)
      delete actor(r).generalStats.impact
      delete actor(r).generalStats.anomalyProficiency
      delete actor(r).directStats.criticalRate
      delete actor(r).directStats.criticalDamage
      const result = ok(run(r))
      expect(result.attributes.attack.value).toBeCloseTo(37.25 + 353.1545, 9)
      expect(result.attributes.impact.value).toBe(11.5)
      expect(result.attributes.anomalyProficiency.value).toBe(17.75)
      expect(result.attributes.criticalDamage.value).toBeCloseTo(0.29, 12)
      expect(result.provenance.ownerReadings.map((x) => x.stage)).toEqual([
        "initial",
      ])
      expect(result.provenance.inheritanceContributions).toEqual([])
    },
  )
  it("fully off accepts legal own zeros and absent owner output-only facts", () => {
    const r = input()
    r.selections = []
    actor(r).generalStats = {}
    actor(r).directStats = {}
    for (const value of Object.values(r.boar.ownStats)) value.value = 0
    const result = ok(calculateStaticDamageFromCatalog(r))
    expect(Object.values(result.attributes).every((v) => v.value === 0)).toBe(
      true,
    )
    expect(result.settlement!.expected).toBe(0)
    expect(result.provenance.ownerReadings).toEqual([])
  })
  it.each(["same-element", "same-faction", "rupture"] as const)(
    "independent metadata reason %s",
    (reason) => {
      const r = input()
      r.actorSources[1]!.agentEntityId =
        reason === "same-element"
          ? "1041"
          : reason === "same-faction"
            ? "1281"
            : "1371"
      r.teamCondition = { kind: "teammate", entityId: "entity:trigger", reason }
      expect(
        ok(calculateStaticDamageFromCatalog(r)).attributes.criticalRate.value,
      ).toBeCloseTo(0.44, 12)
    },
  )
  it("false condition retains own CR/CD and direct M4 without requiring Lucy CR/CD", () => {
    const r = input()
    unrelatedTeam(r)
    delete actor(r).directStats.criticalRate
    delete actor(r).directStats.criticalDamage
    const result = ok(calculateStaticDamageFromCatalog(r))
    expect(result.attributes.criticalRate.value).toBe(0.07)
    expect(result.attributes.criticalDamage.value).toBeCloseTo(0.29, 12)
    expect(
      result.provenance.inheritanceContributions.map((x) => x.stat),
    ).toEqual(["attack", "impact", "anomalyProficiency"])
  })
  it("Lucy alone cannot self-satisfy; a separate Lucy instance can", () => {
    const alone = input()
    alone.world.entities = alone.world.entities.filter(
      (e) => e.entityId !== "entity:trigger",
    )
    alone.actorSources = [alone.actorSources[0]!]
    alone.teamCondition = { kind: "not-satisfied" }
    alone.settlement = { kind: "attributes" }
    disable(alone, ids.m6, "unselected")
    expect(
      ok(calculateStaticDamageFromCatalog(alone)).attributes.criticalRate.value,
    ).toBe(0.07)
    const second = input()
    second.actorSources[1]!.agentEntityId = "1151"
    second.teamCondition = {
      kind: "teammate",
      entityId: "entity:trigger",
      reason: "same-faction",
    }
    expect(
      ok(calculateStaticDamageFromCatalog(second)).attributes.criticalRate
        .value,
    ).toBeCloseTo(0.44, 12)
  })
  it("unclamped inherited CR is independent of explicit M6 probability", () => {
    const r = input()
    r.boar.ownStats.criticalRate.value = 0.85
    explosion(r).criticalRate.value = 0
    const result = ok(calculateStaticDamageFromCatalog(r))
    expect(result.attributes.criticalRate.value).toBeCloseTo(1.22, 12)
    expect(result.settlement!.expected).toBe(result.settlement!.nonCritical)
    expect(result.settlement!.critical).toBeGreaterThan(
      result.settlement!.nonCritical,
    )
  })
  it.each(["trigger attack", "Lucy penetration", "trigger critical damage"])(
    "%s is not the explosion provider",
    (field) => {
      const r = input(),
        before = ok(calculateStaticDamageFromCatalog(r))
      if (field === "trigger attack")
        set(actor(r, "entity:trigger"), "generalStats.attack.baseValue", 1.25)
      if (field === "Lucy penetration")
        actor(r).directStats.penetrationRatio!.baseValue = 0.01
      if (field === "trigger critical damage")
        actor(r, "entity:trigger").directStats.criticalDamage!.baseValue = 0.07
      expect(ok(calculateStaticDamageFromCatalog(r)).settlement!.expected).toBe(
        before.settlement!.expected,
      )
    },
  )
  it.each([
    "own attack",
    "Lucy attack",
    "own penetration",
    "own critical damage",
  ])("%s changes the corresponding source only", (field) => {
    const r = input(),
      before = ok(calculateStaticDamageFromCatalog(r))
    if (field === "own attack") r.boar.ownStats.attack.value += 13.375
    if (field === "Lucy attack")
      set(actor(r), "generalStats.attack.baseValue", 1373.25)
    if (field === "own penetration")
      r.boar.ownStats.penetrationRatio.value = 0.31
    if (field === "own critical damage")
      r.boar.ownStats.criticalDamage.value += 0.125
    const result = ok(calculateStaticDamageFromCatalog(r))
    expect(result.settlement!.expected).toBeGreaterThan(
      before.settlement!.expected,
    )
    if (field === "own attack")
      expect(
        result.attributes.attack.value - before.attributes.attack.value,
      ).toBeCloseTo(13.375, 10)
  })
  it.each(["derived", "explicit"] as const)(
    "%s owner initial provenance",
    (mode) => {
      const r = input()
      if (mode === "explicit")
        r.inputs = [
          {
            bindingId: "binding:lucy",
            name: conversionName,
            value: { unit: "attack-points", value: 1173.25 },
          },
        ]
      const result = ok(calculateStaticDamageFromCatalog(r))
      expect(result.provenance.conversionInput!.source).toBe(
        mode === "derived" ? "derived-owner-initial" : "caller-provided",
      )
    },
  )
})

describe("Lucy closed boundaries and no silent dependency loss", () => {
  const mutations: readonly [string, string, unknown, string, string][] = [
    ["unknown root", "hit", {}, "INVALID_INPUT", "/hit"],
    [
      "missing own stat",
      "boar.ownStats.impact",
      undefined,
      "INVALID_INPUT",
      "/boar/ownStats/impact",
    ],
    [
      "own wrong unit",
      "boar.ownStats.attack.unit",
      "ratio",
      "UNIT_MISMATCH",
      "/boar/ownStats/attack/unit",
    ],
    [
      "own negative",
      "boar.ownStats.impact.value",
      -1,
      "INVALID_INPUT",
      "/boar/ownStats/impact/value",
    ],
    [
      "own infinite",
      "boar.ownStats.attack.value",
      Infinity,
      "INVALID_INPUT",
      "/boar/ownStats/attack/value",
    ],
    [
      "own rate too high",
      "boar.ownStats.criticalRate.value",
      1.1,
      "INVALID_INPUT",
      "/boar/ownStats/criticalRate/value",
    ],
    [
      "own penetration too high",
      "boar.ownStats.penetrationRatio.value",
      1.1,
      "INVALID_INPUT",
      "/boar/ownStats/penetrationRatio/value",
    ],
    [
      "own unknown field",
      "boar.ownStats.damageBonus",
      0.3,
      "INVALID_INPUT",
      "/boar/ownStats/damageBonus",
    ],
    [
      "wrong owner source",
      "boar.ownerSource.entityId",
      "entity:trigger",
      "CONTEXT_MISMATCH",
      "/boar",
    ],
    [
      "saved owner source",
      "boar.ownerSource.snapshotId",
      "snapshot:old",
      "CONTEXT_MISMATCH",
      "/boar/ownerSource/snapshotId",
    ],
    [
      "extra model",
      "conditionalModel.extra",
      true,
      "INVALID_INPUT",
      "/conditionalModel/extra",
    ],
    [
      "missing model",
      "conditionalModel.otherEffects",
      undefined,
      "INVALID_INPUT",
      "/conditionalModel/otherEffects",
    ],
    [
      "wrong model",
      "conditionalModel.damageFactors",
      "owner-current",
      "INVALID_INPUT",
      "/conditionalModel/damageFactors",
    ],
    ["time negative", "atSeconds", -1, "INVALID_INPUT", "/atSeconds"],
    ["time missing", "atSeconds", undefined, "INVALID_INPUT", "/atSeconds"],
    [
      "probability missing",
      "settlement.criticalRate",
      undefined,
      "INVALID_INPUT",
      "/settlement/criticalRate",
    ],
    [
      "probability negative",
      "settlement.criticalRate.value",
      -0.1,
      "INVALID_INPUT",
      "/settlement/criticalRate/value",
    ],
    [
      "probability nonfinite",
      "settlement.criticalRate.value",
      NaN,
      "INVALID_INPUT",
      "/settlement/criticalRate/value",
    ],
    [
      "probability overflow",
      "settlement.criticalRate.value",
      1.01,
      "INVALID_INPUT",
      "/settlement/criticalRate/value",
    ],
    [
      "probability unit",
      "settlement.criticalRate.unit",
      "multiplier",
      "UNIT_MISMATCH",
      "/settlement/criticalRate/unit",
    ],
    [
      "probability extras",
      "settlement.criticalRate.extra",
      0,
      "INVALID_INPUT",
      "/settlement/criticalRate/extra",
    ],
    [
      "event alias refused",
      "settlement.event.skillCategory",
      "ex-special",
      "CONTEXT_MISMATCH",
      "/settlement/event/skillCategory",
    ],
    [
      "event self trigger",
      "settlement.event.triggerActorId",
      "entity:lucy",
      "CONTEXT_MISMATCH",
      "/settlement/event/triggerActorId",
    ],
    [
      "event summon trigger",
      "settlement.event.triggerActorId",
      "entity:boar",
      "MISSING_FACT",
      "/settlement/event/triggerActorId",
    ],
    [
      "event wrong source",
      "settlement.event.sourceBindingId",
      "binding:other",
      "CONTEXT_MISMATCH",
      "/settlement/event/sourceBindingId",
    ],
    [
      "event ally target",
      "settlement.event.targetId",
      "entity:lucy",
      "CONTEXT_MISMATCH",
      "/settlement/event/targetId",
    ],
    [
      "event missing target",
      "settlement.event.targetId",
      "entity:missing",
      "MISSING_FACT",
      "/settlement/event/targetId",
    ],
    [
      "event missing cheer",
      "settlement.event.cheerOn",
      false,
      "CONTEXT_MISMATCH",
      "/settlement/event/cheerOn",
    ],
    [
      "event multiplier pollution",
      "settlement.event.multiplier",
      9,
      "INVALID_INPUT",
      "/settlement/event/multiplier",
    ],
    [
      "mixed multiplier",
      "settlement.damageMultiplier",
      9,
      "INVALID_INPUT",
      "/settlement/damageMultiplier",
    ],
    [
      "damage unknown field",
      "settlement.damage.extra",
      9,
      "INVALID_INPUT",
      "/settlement/damage/extra",
    ],
    [
      "damage nonfinite",
      "settlement.damage.defense.targetBaseDefense",
      Infinity,
      "INVALID_INPUT",
      "/settlement/damage/defense/targetBaseDefense",
    ],
    [
      "self team condition",
      "teamCondition.entityId",
      "entity:lucy",
      "CONTEXT_MISMATCH",
      "/teamCondition/entityId",
    ],
    [
      "unknown team reason",
      "teamCondition.reason",
      "support",
      "INVALID_INPUT",
      "/teamCondition/reason",
    ],
    [
      "wrong team structure",
      "teamCondition",
      null,
      "INVALID_INPUT",
      "/teamCondition",
    ],
    [
      "layers fraction",
      "selections.0.layers",
      0.5,
      "INVALID_INPUT",
      "/selections/0/layers",
    ],
    [
      "layers over one",
      "selections.0.layers",
      2,
      "INVALID_INPUT",
      "/selections/0/layers",
    ],
  ]
  it.each(
    entries.flatMap((entry) =>
      ["on", "zero", "unselected"].flatMap((state) =>
        mutations.map(([caseName, path, value, code, pointer]) => ({
          ...entry,
          state,
          caseName,
          path,
          value,
          code,
          pointer,
        })),
      ),
    ),
  )(
    "$name $state rejects $caseName",
    ({ run, state, path, value, code, pointer }) => {
      const r = input()
      // Only M6 selection state changes; index0 remains the inheritance selection.
      if (state !== "on") disable(r, ids.m6, state as "zero" | "unselected")
      set(r, path, value)
      bad(() => run(r), code, pointer)
    },
  )
  it.each(["inherited", "nonenumerable"] as const)(
    "%s snapshotId is actually read",
    (mode) => {
      const r = input()
      r.boar.ownerSource =
        mode === "inherited"
          ? Object.assign(Object.create({ snapshotId: "snapshot:old" }), {
              entityId: "entity:lucy",
            })
          : Object.defineProperty({ entityId: "entity:lucy" }, "snapshotId", {
              value: "snapshot:old",
              enumerable: false,
            })
      for (const entry of entries)
        bad(
          () => entry.run(r),
          "CONTEXT_MISMATCH",
          "/boar/ownerSource/snapshotId",
        )
    },
  )
  it("accepts a legal null-prototype current owner source", () => {
    const r = input()
    r.boar.ownerSource = Object.assign(Object.create(null), {
      entityId: "entity:lucy",
    })
    expect(
      ok(calculateStaticDamageFromCatalog(r)).attributes.attack.value,
    ).toBeCloseTo(1704.9163, 9)
  })
  it.each([0, 17, 1.5])("rejects invalid final special rank %s", (level) => {
    const r = input()
    set(binding(r), "configuration.specialSkillLevel", level)
    bad(() => calculateStaticDamageFromCatalog(r), "INVALID_INPUT")
  })
  it.each(["zero", "unselected"] as const)(
    "explicit contradictory conversion input remains invalid when %s",
    (mode) => {
      const r = input()
      disable(r, ids.convert, mode)
      r.inputs = [
        {
          bindingId: "binding:lucy",
          name: conversionName,
          value: { unit: "attack-points", value: 1173.251 },
        },
      ]
      bad(
        () => calculateStaticDamageFromCatalog(r),
        "CONTEXT_MISMATCH",
        "/inputs/0/value/value",
      )
    },
  )
  it.each(["wrong unit", "nonfinite", "duplicate", "missing binding"])(
    "rejects %s numeric input even when disabled",
    (kind) => {
      const r = input()
      r.selections = []
      r.inputs = [
        {
          bindingId: "binding:lucy",
          name: conversionName,
          value: { unit: "attack-points", value: 1173.25 },
        },
      ]
      if (kind === "wrong unit") set(r, "inputs.0.value.unit", "ratio")
      if (kind === "nonfinite") set(r, "inputs.0.value.value", Infinity)
      if (kind === "duplicate") r.inputs.push(structuredClone(r.inputs[0]!))
      if (kind === "missing binding") r.inputs[0]!.bindingId = "binding:missing"
      bad(
        () => calculateStaticDamageFromCatalog(r),
        kind === "wrong unit"
          ? "UNIT_MISMATCH"
          : kind === "duplicate"
            ? "DUPLICATE_ID"
            : kind === "missing binding"
              ? "MISSING_REFERENCE"
              : "INVALID_INPUT",
        "/inputs",
      )
    },
  )
  it("does not require absent initial input when conversion is off", () => {
    const r = input()
    disable(r, ids.inheritance, "unselected")
    disable(r, ids.convert, "unselected")
    delete actor(r).generalStats.attack
    expect(
      ok(calculateStaticDamageFromCatalog(r)).attributes.attack.value,
    ).toBe(125.25)
  })
  it("attributes-only M6 conflict and legitimate M6 zero", () => {
    const r = input()
    r.settlement = { kind: "attributes" }
    bad(
      () => calculateStaticDamageFromCatalog(r),
      "CONTEXT_MISMATCH",
      "/settlement",
    )
    disable(r, ids.m6, "zero")
    expect(ok(calculateStaticDamageFromCatalog(r)).settlement).toBeNull()
  })
  it.each([0, 1, 4, 5])("M%s cannot select M6 even at zero layers", (rank) => {
    const r = input()
    binding(r).configuration.mindscapeRank = rank as 0 | 1 | 4 | 5
    if (rank < 4) disable(r, ids.m4, "unselected")
    disable(r, ids.m6, "zero")
    bad(
      () => calculateStaticDamageFromCatalog(r),
      "CONTEXT_MISMATCH",
      "/selections/1",
    )
  })
  it.each([
    "wrong owner",
    "undeployed",
    "wrong kind",
    "other team",
    "duplicate entity",
    "duplicate binding",
    "wrong holder binding",
    "false condition",
    "missing identity",
    "other-team trigger",
  ])("rejects %s identity facts", (kind) => {
    const r = input()
    const boar = r.world.entities.find((e) => e.kind === "summon")!
    if (kind === "wrong owner") set(boar, "ownerId", "entity:trigger")
    if (kind === "undeployed") set(boar, "deployed", false)
    if (kind === "wrong kind") set(boar, "summonKind", "other")
    if (kind === "other team") set(boar, "teamId", "team:enemies")
    if (kind === "duplicate entity")
      r.world.entities.push(structuredClone(r.world.entities[0]!))
    if (kind === "duplicate binding")
      r.bindings.push({
        ...structuredClone(binding(r)),
        bindingId: "binding:second",
      })
    if (kind === "wrong holder binding") {
      binding(r).holderId = "entity:trigger"
      set(boar, "ownerId", "entity:trigger")
      r.boar.ownerSource.entityId = "entity:trigger"
    }
    if (kind === "false condition") r.teamCondition = { kind: "not-satisfied" }
    if (kind === "missing identity") r.actorSources.pop()
    if (kind === "other-team trigger")
      actor(r, "entity:trigger").teamId = "team:enemies"
    bad(
      () => calculateStaticDamageFromCatalog(r),
      kind.startsWith("duplicate")
        ? "DUPLICATE_ID"
        : kind === "missing identity"
          ? "MISSING_FACT"
          : "CONTEXT_MISMATCH",
    )
  })
  const metadataMutations: readonly [string, (r: Request) => void][] = [
    [
      "missing mechanism",
      (r) => {
        r.catalog.mechanisms = r.catalog.mechanisms!.filter(
          (m) => m.mechanism !== "lucy-guard-boar",
        )
      },
    ],
    [
      "faction member missing",
      (r) => {
        set(
          r.catalog.mechanisms!.find((m) => m.mechanism === "lucy-guard-boar")!,
          "sameFactionAgentEntityIds",
          ["1151"],
        )
      },
    ],
    [
      "faction references malformed",
      (r) => {
        set(
          r.catalog.mechanisms!.find((m) => m.mechanism === "lucy-guard-boar")!,
          "factionReferences",
          [null],
        )
      },
    ],
    [
      "references malformed",
      (r) => {
        set(
          r.catalog.mechanisms!.find((m) => m.mechanism === "lucy-guard-boar")!,
          "references",
          [{}],
        )
      },
    ],
    [
      "variant target pollution",
      (r) => {
        r.catalog.options.find(
          (o) => o.optionId === ids.inheritance,
        )!.variants[0]!.target = "team"
      },
    ],
    [
      "mapping pollution",
      (r) => {
        set(
          r.catalog.mechanisms!.find((m) => m.mechanism === "lucy-guard-boar")!,
          "cheerFixed.effectId",
          "agent:wrong:x",
        )
      },
    ],
    [
      "multiplier pollution",
      (r) => {
        set(
          r.definitions.effects.find(
            (e) => e.effectId === "agent:1151:nanoka:m6-boar-rain:mindscape:6",
          )!,
          "operation.multiplier.value",
          9,
        )
      },
    ],
    [
      "inheritance table pollution",
      (r) => {
        set(
          r.definitions.effects.find(
            (e) =>
              e.effectId ===
              "agent:1151:nanoka:guard-boar-inheritance:mindscape:0",
          )!,
          "operation.cheerMultiplier.values.1",
          1.5,
        )
      },
    ],
    [
      "old when pollution",
      (r) => {
        set(
          r.definitions.effects.find(
            (e) =>
              e.effectId ===
              "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0",
          )!,
          "when",
          { kind: "one-of", fact: "hit.element", values: ["fire"] },
        )
        set(
          r.definitions.effects.find(
            (e) =>
              e.effectId ===
              "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0",
          )!,
          "scope",
          "hit",
        )
      },
    ],
    [
      "old amount pollution",
      (r) => {
        set(
          r.definitions.effects.find(
            (e) =>
              e.effectId ===
              "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0",
          )!,
          "parameters.amount.values.12",
          99,
        )
      },
    ],
    [
      "fixed target pollution",
      (r) => {
        r.catalog.skillTargets.find(
          (t) => t.targetId === "nanoka:lucy-m6-boar-rain",
        )!.category = "enhanced-special"
      },
    ],
  ]
  it.each(
    metadataMutations.flatMap(([name, mutate]) =>
      ["on", "zero", "unselected"].map((state) => ({ name, mutate, state })),
    ),
  )("$state validates $name", ({ mutate, state }) => {
    const r = input()
    if (state !== "on") disable(r, ids.m6, state as "zero" | "unselected")
    mutate(r)
    bad(() => calculateStaticDamageFromCatalog(r), "INVALID_DEFINITION")
  })
})

const extraOption = "agents:lucy:test:external"
function addExternal(r: Request) {
  const template = r.definitions.effects.find(
    (e) =>
      e.effectId === "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0",
  )!
  const rule = {
    ...structuredClone(template),
    effectId: "agent:1151:test:external",
    config: { kind: "constant", value: true },
    parameters: {},
    scope: "hit",
    beneficiary: { kind: "holder" },
    when: { kind: "constant", value: true },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "input", unit: "ratio", name: "externalMissing" },
    },
  } as unknown as Mutable<EffectRule>
  r.definitions.effects.push(rule)
  const option = structuredClone(
    r.catalog.options.find((o) => o.optionId === ids.fixed)!,
  )
  option.optionId = extraOption
  option.name = "external missing output"
  option.variants[0]!.effectIds = [rule.effectId]
  option.variants[0]!.configuration = { minimumMindscape: 0 }
  option.variants[0]!.inputs = [
    {
      name: "externalMissing",
      unit: "ratio",
      description: "An intentionally absent external output fact",
    },
  ]
  r.catalog.options.push(option)
  return rule
}
describe("Lucy's source boundary does not evaluate rejected outputs", () => {
  it.each(
    entries.flatMap((entry) =>
      [true, false].flatMap((when) =>
        ["positive", "zero", "unselected"].map((state) => ({
          ...entry,
          when,
          state,
        })),
      ),
    ),
  )("$name $when supplied $state", ({ run, when, state }) => {
    const r = input(),
      rule = addExternal(r)
    set(rule, "when.value", when)
    if (state !== "unselected")
      r.selections.push({
        optionId: extraOption,
        bindingId: "binding:lucy",
        layers: state === "positive" ? 1 : 0,
      })
    if (state === "positive")
      bad(() => run(r), "CONTEXT_MISMATCH", "/selections")
    else
      expect(ok(run(r)).settlement!.expected).toBeCloseTo(9298.411222531886, 8)
  })
  it("ordinary entry still evaluates the extra source and reports its missing fact", () => {
    const r = input()
    addExternal(r)
    const request: StaticCatalogDamageInput = {
      definitions: r.definitions,
      catalog: r.catalog,
      bindings: r.bindings,
      world: r.world,
      atSeconds: r.atSeconds,
      actorSources: r.actorSources,
      selections: [
        { optionId: extraOption, bindingId: "binding:lucy", layers: 1 },
      ],
      hit: {
        actorId: "entity:lucy",
        targetId: "entity:enemy",
        actionId: "action:ordinary-lucy",
        element: "fire",
        skillCategory: "basic",
        damageItems: [
          {
            itemId: "ordinary",
            stat: "attack",
            statSource: { entityId: "entity:lucy" },
            mode: "direct",
            role: "base",
            damageMultiplier: 1,
          },
        ],
      },
      damage: explosion(r).damage,
    }
    bad(() => calculateStaticDamageFromCatalog(request), "MISSING_FACT")
    expect(
      ok(
        calculateStaticDamageFromCatalog({
          ...request,
          inputs: [
            {
              bindingId: "binding:lucy",
              name: "externalMissing",
              value: { unit: "ratio", value: 0.25 },
            },
          ],
        }),
      ).expected,
    ).toBeGreaterThan(0)
  })
  it.each(
    entries.flatMap((entry) =>
      [true, false].flatMap((config) =>
        [true, false].map((when) => ({ ...entry, config, when })),
      ),
    ),
  )(
    "$name continuous candidate config=$config when=$when",
    ({ run, config, when }) => {
      const r = input(),
        rule = addExternal(r)
      set(rule, "activation", { kind: "continuous" })
      set(rule, "config.value", config)
      set(rule, "when.value", when)
      if (config) bad(() => run(r), "CONTEXT_MISMATCH", "/definitions/effects")
      else
        expect(ok(run(r)).settlement!.expected).toBeCloseTo(
          9298.411222531886,
          8,
        )
    },
  )
  it.each(entries)(
    "$name ignores an ineligible continuous source without reading its output",
    ({ run }) => {
      const r = input(),
        rule = addExternal(r)
      set(rule, "source.identity.entityId", "1041")
      set(rule, "effectId", "agent:1041:test:external")
      set(rule, "activation", { kind: "continuous" })
      r.catalog.options = r.catalog.options.filter(
        (o) => o.optionId !== extraOption,
      )
      r.bindings.push({
        ...structuredClone(binding(r)),
        bindingId: "binding:ineligible",
        holderId: "entity:trigger",
        sourceEntityId: "1041",
        eligible: false,
      })
      expect(ok(run(r)).settlement!.expected).toBeCloseTo(9298.411222531886, 8)
    },
  )
  it.each(
    entries.flatMap((entry) =>
      [
        "configuration-parameter",
        "configuration-output",
        "contribution-parameter",
        "contribution-output",
        "activation-timing",
      ].flatMap((kind) =>
        ["positive", "zero"].map((state) => ({ ...entry, kind, state })),
      ),
    ),
  )(
    "$name rejects $kind before preparation for $state target",
    ({ run, kind, state }) => {
      const r = input(),
        target = r.definitions.effects.find(
          (e) =>
            e.effectId ===
            "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0",
        )!
      if (state === "zero") disable(r, ids.fixed, "zero")
      const phase = kind.split("-")[0]
      const change =
        phase === "activation"
          ? {
              field: "duration-seconds",
              change: {
                operator: "add",
                value: { kind: "literal", unit: "seconds", value: 1 },
              },
            }
          : {
              field: kind.endsWith("parameter") ? "parameter" : "output",
              ...(kind.endsWith("parameter") ? { name: "amount" } : {}),
              unit: "attack-points",
              change: {
                operator: "add",
                value: { kind: "literal", unit: "attack-points", value: 1 },
              },
            }
      r.definitions.effects.push({
        kind: "modification",
        effectId: "agent:1151:test:modification",
        source: target.source,
        parameters: {},
        config: { kind: "constant", value: true },
        phase,
        ...(phase !== "configuration"
          ? { when: { kind: "constant", value: false } }
          : {}),
        target: { kind: "effect", effectId: target.effectId },
        modifications: [change],
      } as unknown as Mutable<EffectRule>)
      // supplied 目标没有计时配置：既有规则解析器已先行拒绝 activation 修改。
      bad(
        () => run(r),
        phase === "activation" ? "INVALID_MODIFICATION" : "CONTEXT_MISMATCH",
        phase === "activation" ? "/effects" : "/definitions/effects",
      )
    },
  )
  it.each(entries)(
    "$name validates even a wholly unselected malformed definition",
    ({ run }) => {
      const r = input(),
        rule = addExternal(r)
      set(rule, "operation.value.unit", "attack-points")
      bad(() => run(r), "UNIT_MISMATCH")
    },
  )
  it("reads inherited and nonenumerable own stats without dropping validated attributes", () => {
    const r = input(),
      stats = r.boar.ownStats
    r.boar.ownStats = Object.create(stats)
    Object.defineProperty(r.boar.ownStats, "attack", {
      value: stats.attack,
      enumerable: false,
    })
    const result = ok(calculateStaticDamageFromCatalog(r))
    expect(result.attributes.attack.value).toBeCloseTo(1704.9163, 9)
    expect(result.provenance.ownStats).toEqual(stats)
    expect(result.settlement).toMatchObject({
      effectId: "agent:1151:nanoka:m6-boar-rain:mindscape:6",
      bindingId: "binding:lucy",
    })
    expect(result.settlement!.references).toHaveLength(2)
  })
})

it.each(
  entries.flatMap((entry) =>
    ["positive", "zero", "unselected"].map((state) => ({ ...entry, state })),
  ),
)(
  "$name handles real Soukaku team conversion $state without hiding missing output inputs",
  ({ run, state }) => {
    const r = input()
    r.world.entities.push({
      kind: "actor",
      entityId: "entity:soukaku",
      teamId: "team:players",
      generalStats: {},
      directStats: {},
    })
    r.actorSources.push({ entityId: "entity:soukaku", agentEntityId: "1131" })
    r.bindings.push({
      kind: "agent",
      bindingId: "binding:soukaku",
      holderId: "entity:soukaku",
      sourceEntityId: "1131",
      eligible: true,
      configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
    })
    if (state !== "unselected")
      r.selections.push({
        optionId:
          "agents:soukaku:mindscape:0:blk-ms38aesz-9cm823:eff-ms38aesz-iqurbm",
        bindingId: "binding:soukaku",
        layers: state === "positive" ? 1 : 0,
      })
    if (state === "positive")
      bad(() => run(r), "CONTEXT_MISMATCH", "/selections")
    else
      expect(ok(run(r)).settlement!.expected).toBeCloseTo(9298.411222531886, 8)
  },
)
it.each(entries)(
  "$name rejects another valid binding's explicit Lucy conversion input even when off",
  ({ run }) => {
    const r = input()
    r.selections = []
    r.bindings.push({
      kind: "agent",
      bindingId: "binding:other",
      holderId: "entity:trigger",
      sourceEntityId: "1041",
      eligible: true,
      configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
    })
    r.inputs = [
      {
        bindingId: "binding:other",
        name: conversionName,
        value: { unit: "attack-points", value: 1173.25 },
      },
    ]
    bad(() => run(r), "CONTEXT_MISMATCH", "/inputs/0/bindingId")
  },
)

it.each(
  entries.flatMap((entry) =>
    [0, 1].map((probability) => ({ ...entry, probability })),
  ),
)(
  "$name probability $probability preserves both damage branches without rewriting inherited CR",
  ({ run, probability }) => {
    const request = input()
    explosion(request).criticalRate.value = probability
    const result = ok(run(request))
    expect(result.attributes.criticalRate.value).toBeCloseTo(0.44, 12)
    expect(result.settlement!.nonCritical).toBeCloseTo(6902.0273326394645, 8)
    expect(result.settlement!.critical).toBeCloseTo(14632.297945195665, 8)
    expect(result.settlement!.expected).toBe(
      probability === 0
        ? result.settlement!.nonCritical
        : result.settlement!.critical,
    )
  },
)
