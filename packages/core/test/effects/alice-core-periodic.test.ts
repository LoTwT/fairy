import * as effectEngine from "../../src/effects/index.ts"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../../src/index.ts"
import type {
  AliceCorePeriodicCatalogInput,
  AliceCorePeriodicDamageInput,
  EffectEngine,
  EffectRule,
  IssueCode,
  Result,
  StaticEffectCatalog,
} from "../../src/index.ts"
import { general, inputFor } from "./static-fixtures.ts"

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
const optionId = "nanoka:agents:alice:core-periodic-damage"
const effectId = "agent:1401:nanoka:core-periodic-damage:mindscape:0"
const raw = JSON.parse(
  readFileSync(
    new URL("../../../data/definitions/effects/static.json", import.meta.url),
    "utf8",
  ),
)
const catalog = JSON.parse(
  readFileSync(
    new URL(
      "../../../data/definitions/effects/static-catalog.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as StaticEffectCatalog
function ok<T>(result: Result<T>): T {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function issue(result: Result<unknown>, code: IssueCode, pointer?: string) {
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (!result.ok)
    expect(
      result.issues.some(
        (i) =>
          i.code === code && (pointer === undefined || i.pointer === pointer),
      ),
      JSON.stringify(result.issues),
    ).toBe(true)
}
function set<T>(input: T, path: string, value: unknown): T {
  const result = structuredClone(input)
  const keys = path.split("/").slice(1)
  let object = result as Record<string, unknown>
  for (const key of keys.slice(0, -1))
    object = object[key] as Record<string, unknown>
  if (value === undefined) delete object[keys.at(-1)!]
  else object[keys.at(-1)!] = value
  return result
}
const actor = (entityId: `entity:${string}`, teamId: `team:${string}`) => ({
  kind: "actor" as const,
  entityId,
  teamId,
  generalStats: {},
  directStats: {},
})
function fixture(): Mutable<AliceCorePeriodicCatalogInput> {
  const world = {
    entities: [
      actor("entity:alice", "team:players"),
      actor("entity:provider", "team:players"),
      actor("entity:enemy", "team:enemies"),
    ],
    states: [],
    distances: [],
  }
  return structuredClone({
    mechanism: "alice-core-periodic-damage",
    definitions: ok(parseEffectRuleSet(raw)),
    catalog,
    bindings: [
      {
        kind: "agent",
        bindingId: "binding:alice",
        holderId: "entity:alice",
        sourceEntityId: "1401",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
    ],
    actorSources: [{ entityId: "entity:alice", agentEntityId: "1401" }],
    selections: [{ optionId, bindingId: "binding:alice", layers: 1 }],
    world,
    snapshots: [
      {
        snapshotId: "snapshot:original",
        atSeconds: 2,
        attributes: [],
        world: structuredClone(world),
      },
    ],
    atSeconds: 8.37,
    event: {
      eventId: "event:periodic",
      actorId: "entity:alice",
      targetId: "entity:enemy",
      sourceBindingId: "binding:alice",
      originalAnomalyEventId: "event:original",
      originalAnomalySnapshotId: "snapshot:original",
      originalAnomalyActive: true,
    },
    originalAnomalies: [
      {
        eventId: "event:original",
        snapshotId: "snapshot:original",
        sourceActorId: "entity:provider",
        targetId: "entity:enemy",
        kind: "assault",
        element: "physical",
        isAnomalyCritical: false,
        settledDamage: { unit: "damage-points", value: 12345.6789 },
      },
    ],
  } satisfies AliceCorePeriodicCatalogInput) as unknown as Mutable<AliceCorePeriodicCatalogInput>
}
function low(
  input: AliceCorePeriodicCatalogInput,
): AliceCorePeriodicDamageInput {
  const {
    catalog: _catalog,
    actorSources: _actors,
    selections,
    ...rest
  } = input
  return {
    ...rest,
    selections: selections.map((s) => ({
      bindingId: s.bindingId,
      layers: s.layers,
      effectId:
        s.optionId === optionId
          ? effectId
          : _catalog.options.find((o) => o.optionId === s.optionId)!
              .variants[0]!.effectIds[0]!,
    })),
  }
}
const originalActual =
  1234.567 *
  7.13 *
  1.37 *
  3.7125 *
  (794 / 1594) *
  0.77 *
  1.23 *
  1.61 *
  2 *
  1.17 *
  1.61 *
  1.29

it("shares the catalog actor level domain without changing Alice's settled actual damage", () => {
  const input = fixture()
  const before = ok(calculateStaticDamageFromCatalog(input))
  input.actorSources[0]!.level = 60
  expect(ok(calculateStaticDamageFromCatalog(input))).toEqual(before)
  input.actorSources[0]!.level = 1.5
  issue(
    calculateStaticDamageFromCatalog(input),
    "INVALID_INPUT",
    "/actorSources/0/level",
  )
})

describe.each(["catalog", "low"] as const)(
  "Alice periodic %s entry",
  (entry) => {
    const calculate = (i: AliceCorePeriodicCatalogInput) =>
      entry === "catalog"
        ? calculateStaticDamageFromCatalog(i)
        : calculateStaticDamage(low(i))
    it.each([
      [12345.6789, 308.64197250000007],
      [9876.54321, 246.91358025],
      [0, 0],
      [originalActual, 4131.583875755931],
      [Number.MAX_VALUE, Number.MAX_VALUE * 0.025],
    ])("actual D %s yields %s once", (damage, expected) => {
      const i = fixture()
      i.originalAnomalies[0]!.settledDamage.value = damage!
      const before = structuredClone(i),
        result = ok(calculate(i))
      expect(result.expected).toBeCloseTo(expected!, 8)
      expect(result).toMatchObject({
        mechanism: "alice-core-periodic-damage",
        status: "applied",
        critical: null,
        criticalRate: 0,
        criticalSemantics: "no-critical-settlement",
        nonCritical: result.expected,
        factors: {
          originalSettledDamage: damage,
          effectivePeriodicRatio: 0.025,
        },
      })
      expect(result.provenance).toEqual({
        event: i.event,
        holderId: "entity:alice",
        bindingId: "binding:alice",
        effectId,
        originalAnomaly: i.originalAnomalies[0],
        effectivePeriodicRatio: 0.025,
      })
      expect(result.contributions).toEqual([
        {
          effectId,
          bindingId: "binding:alice",
          holderId: "entity:alice",
          eventId: "event:periodic",
          originalAnomalyEventId: "event:original",
          ratio: { unit: "ratio", value: 0.025 },
        },
      ])
      expect(ok(calculate(i))).toEqual(result)
      expect(i).toEqual(before)
    })
    it.each([false, true])(
      "historical critical=%s is retained without another roll",
      (critical) => {
        const i = fixture()
        i.originalAnomalies[0]!.isAnomalyCritical = critical
        const r = ok(calculate(i))
        expect(r.expected).toBe(12345.6789 * 0.025)
        expect(r.provenance.originalAnomaly.isAnomalyCritical).toBe(critical)
      },
    )
    it.each([1, 2, 3, 4, 5, 6, 7] as const)(
      "core %s supports every M0—6",
      (core) => {
        for (const rank of [0, 1, 2, 3, 4, 5, 6] as const) {
          const i = fixture()
          i.bindings[0]!.configuration = {
            coreSkillLevel: core,
            mindscapeRank: rank,
          }
          expect(ok(calculate(i)).expected).toBe(12345.6789 * 0.025)
        }
      },
    )
    it.each(["unselected", "zero"])(
      "%s keeps all historical validation and emits no contribution",
      (mode) => {
        const i = fixture()
        i.selections =
          mode === "zero" ? [{ ...i.selections[0]!, layers: 0 }] : []
        expect(ok(calculate(i))).toMatchObject({
          status: "inactive",
          expected: 0,
          nonCritical: 0,
          critical: null,
          factors: {
            originalSettledDamage: 12345.6789,
            effectivePeriodicRatio: 0,
          },
          contributions: [],
        })
        issue(
          calculate({ ...i, originalAnomalies: [] }),
          "MISSING_FACT",
          "/event/originalAnomalyEventId",
        )
        issue(calculate({ ...i, snapshots: [] }), "MISSING_SNAPSHOT")
        issue(
          calculate(set(i, "/originalAnomalies/0/settledDamage/value", NaN)),
          "INVALID_INPUT",
        )
        issue(
          calculate(set(i, "/snapshots/0/atSeconds", 99)),
          "CONTEXT_MISMATCH",
        )
        issue(
          calculate(set(i, "/originalAnomalies/0/kind", "polarity-assault")),
          "CONTEXT_MISMATCH",
        )
      },
    )
    it("freezes actual D across changed current panels, team, enemy state, and absent provider", () => {
      const i = fixture()
      i.originalAnomalies[0]!.settledDamage.value = originalActual
      const changed = structuredClone(i)
      changed.world.entities = changed.world.entities.filter(
        (a) => a.entityId !== "entity:provider",
      )
      const alice = changed.world.entities[0]!
      if (alice.kind !== "actor") throw new Error("actor")
      alice.generalStats = {
        attack: general(8888),
        anomalyProficiency: general(17),
      } as Mutable<typeof alice.generalStats>
      alice.directStats = {
        criticalRate: { baseValue: 0.97, additions: [] },
        criticalDamage: { baseValue: 7.1, additions: [] },
      }
      const r = ok(calculate(changed))
      expect(r.expected).toBeCloseTo(originalActual * 0.025, 8)
      const wrongRecalculation =
        1234.567 *
        7.13 *
        1.37 *
        3.7125 *
        (794 / 1594) *
        0.95 *
        1.23 *
        1.92 *
        2 *
        1.17 *
        1.61 *
        1.29 *
        0.025
      expect(r.expected).not.toBeCloseTo(wrongRecalculation, 2)
      const present = fixture()
      present.world.entities[1]!.teamId = "team:enemies"
      expect(ok(calculate(present)).expected).toBe(12345.6789 * 0.025)
    })
    it("only replacing the referenced saved actual result changes the damage", () => {
      const i = fixture()
      i.originalAnomalies.push({
        ...i.originalAnomalies[0]!,
        eventId: "event:unrelated",
        settledDamage: { unit: "damage-points", value: 999999 },
      })
      expect(ok(calculate(i)).expected).toBe(12345.6789 * 0.025)
      i.originalAnomalies.reverse()
      expect(ok(calculate(i)).expected).toBe(12345.6789 * 0.025)
      const referenced = i.originalAnomalies.find(
        (a) => a.eventId === "event:original",
      )!
      referenced.settledDamage.value = 9876.54321
      expect(ok(calculate(i)).expected).toBe(9876.54321 * 0.025)
    })
    it("accepts Alice as original applier and preserves explicit identities", () => {
      const i = fixture()
      i.originalAnomalies[0]!.sourceActorId = "entity:alice"
      expect(ok(calculate(i)).provenance.originalAnomaly.sourceActorId).toBe(
        "entity:alice",
      )
    })
    it("isolates a second same-source Alice instead of adding or replacing her contribution", () => {
      const i = fixture()
      i.bindings.push({
        ...i.bindings[0]!,
        bindingId: "binding:alice-2",
        holderId: "entity:alice-2",
      })
      i.world.entities.push(actor("entity:alice-2", "team:players"))
      i.actorSources.push({ entityId: "entity:alice-2", agentEntityId: "1401" })
      i.snapshots[0]!.world.entities.push(
        actor("entity:alice-2", "team:players"),
      )
      const extra = {
        ...i.selections[0]!,
        bindingId: "binding:alice-2" as const,
      }
      i.selections.push(extra)
      issue(calculate(i), "CONTEXT_MISMATCH")
      i.selections[1]!.layers = 0
      expect(ok(calculate(i)).contributions).toHaveLength(1)
      i.event.actorId = "entity:alice-2"
      i.event.sourceBindingId = "binding:alice-2"
      i.selections = [extra]
      i.selections[0]!.layers = 1
      expect(ok(calculate(i)).provenance.holderId).toBe("entity:alice-2")
      i.world.entities.find((a) => a.entityId === "entity:alice-2")!.teamId =
        "team:enemies"
      issue(calculate(i), "CONTEXT_MISMATCH")
    })
    const malformed: readonly [string, string, unknown, IssueCode][] = [
      ["unknown mechanism", "/mechanism", "unknown", "INVALID_INPUT"],
      [
        "inactive state declaration",
        "/event/originalAnomalyActive",
        false,
        "INVALID_INPUT",
      ],
      ["ordinary hit mixed in", "/hit", inputFor().hit, "INVALID_INPUT"],
      [
        "ordinary damage mixed in",
        "/damage",
        inputFor().damage,
        "INVALID_INPUT",
      ],
      ["damage items mixed in", "/damageItems", [], "INVALID_INPUT"],
      ["probability mixed in", "/declaredCriticalRate", 0.5, "INVALID_INPUT"],
      ["inputs mixed in", "/inputs", [], "INVALID_INPUT"],
      [
        "negative D",
        "/originalAnomalies/0/settledDamage/value",
        -1,
        "INVALID_INPUT",
      ],
      [
        "NaN D",
        "/originalAnomalies/0/settledDamage/value",
        NaN,
        "INVALID_INPUT",
      ],
      [
        "infinite D",
        "/originalAnomalies/0/settledDamage/value",
        Infinity,
        "INVALID_INPUT",
      ],
      [
        "string D",
        "/originalAnomalies/0/settledDamage/value",
        "123",
        "INVALID_INPUT",
      ],
      [
        "wrong unit",
        "/originalAnomalies/0/settledDamage/unit",
        "ratio",
        "INVALID_INPUT",
      ],
      [
        "missing critical flag",
        "/originalAnomalies/0/isAnomalyCritical",
        undefined,
        "INVALID_INPUT",
      ],
      [
        "historical probability",
        "/originalAnomalies/0/isAnomalyCritical",
        0.5,
        "INVALID_INPUT",
      ],
      [
        "expected damage supplied",
        "/originalAnomalies/0/expectedDamage",
        123,
        "INVALID_INPUT",
      ],
      [
        "polarity assault",
        "/originalAnomalies/0/kind",
        "polarity-assault",
        "CONTEXT_MISMATCH",
      ],
      ["disorder", "/originalAnomalies/0/kind", "disorder", "CONTEXT_MISMATCH"],
      ["abloom", "/originalAnomalies/0/kind", "abloom", "CONTEXT_MISMATCH"],
      [
        "nonphysical",
        "/originalAnomalies/0/element",
        "fire",
        "CONTEXT_MISMATCH",
      ],
      ["missing original fact", "/originalAnomalies", [], "MISSING_FACT"],
      ["missing snapshot", "/snapshots", [], "MISSING_SNAPSHOT"],
      ["future snapshot", "/snapshots/0/atSeconds", 9, "CONTEXT_MISMATCH"],
      [
        "missing historical roles",
        "/snapshots/0/world/entities",
        [],
        "MISSING_SNAPSHOT",
      ],
      [
        "wrong original applier",
        "/originalAnomalies/0/sourceActorId",
        "entity:absent",
        "MISSING_SNAPSHOT",
      ],
      [
        "wrong historical team",
        "/snapshots/0/world/entities/1/teamId",
        "team:enemies",
        "CONTEXT_MISMATCH",
      ],
      [
        "wrong original target",
        "/originalAnomalies/0/targetId",
        "entity:provider",
        "CONTEXT_MISMATCH",
      ],
      [
        "wrong snapshot reference",
        "/originalAnomalies/0/snapshotId",
        "snapshot:other",
        "CONTEXT_MISMATCH",
      ],
      [
        "same original event",
        "/event/eventId",
        "event:original",
        "CONTEXT_MISMATCH",
      ],
      [
        "wrong holder",
        "/bindings/0/holderId",
        "entity:provider",
        "CONTEXT_MISMATCH",
      ],
      ["ineligible holder", "/bindings/0/eligible", false, "CONTEXT_MISMATCH"],
      [
        "wrong Alice source",
        "/bindings/0/sourceEntityId",
        "1261",
        "CONTEXT_MISMATCH",
      ],
      ["negative time", "/atSeconds", -1, "INVALID_INPUT"],
      ["missing time", "/atSeconds", undefined, "INVALID_INPUT"],
      [
        "unknown binding",
        "/event/sourceBindingId",
        "binding:absent",
        "MISSING_REFERENCE",
      ],
      ["excess layer", "/selections/0/layers", 2, "INVALID_INPUT"],
      ["fraction layer", "/selections/0/layers", 0.5, "INVALID_INPUT"],
      ["negative layer", "/selections/0/layers", -1, "INVALID_INPUT"],
      [
        "invalid core",
        "/bindings/0/configuration/coreSkillLevel",
        8,
        "INVALID_INPUT",
      ],
      [
        "invalid mindscape",
        "/bindings/0/configuration/mindscapeRank",
        7,
        "INVALID_INPUT",
      ],
    ]
    it.each(malformed)("rejects %s", (_name, path, value, code) =>
      issue(calculate(set(fixture(), path, value)), code),
    )
    it("rejects duplicate facts across snapshots, including inactive and unrelated entries", () => {
      const i = fixture()
      i.originalAnomalies.push({
        ...i.originalAnomalies[0]!,
        snapshotId: "snapshot:other",
      })
      issue(calculate(i), "DUPLICATE_ID")
      i.selections = []
      issue(calculate(i), "DUPLICATE_ID")
    })
    it("rejects duplicate selection even when one copy is zero", () => {
      const i = fixture()
      i.selections.push({ ...i.selections[0]!, layers: 0 })
      issue(calculate(i), "DUPLICATE_ID")
    })
    it.each([
      ["M1", "agents:alice:mindscape:1:blk-legacy:legacy-team-reduceDefense"],
      ["M2", "agents:alice:mindscape:2:blk-legacy:legacy-team-anomalyDmgBonus"],
      ["M4", "agents:alice:mindscape:4:blk-legacy:legacy-self-resPen"],
      [
        "old disorder",
        "agents:alice:mindscape:0:blk-legacy:legacy-self-disorderBaseMult",
      ],
      ["M6", "nanoka:agents:alice:m6-proficiency-damage"],
    ])(
      "rejects active %s and accepts a validated zero selection without extra output inputs",
      (_name, id) => {
        const i = fixture()
        i.selections.push({
          optionId: id!,
          bindingId: "binding:alice",
          layers: 1,
        })
        issue(calculate(i), "CONTEXT_MISMATCH")
        i.selections[1]!.layers = 0
        expect(ok(calculate(i)).expected).toBe(12345.6789 * 0.025)
      },
    )
    it("keeps ordinary API and EffectEngine calls working; active periodic rule cannot enter ordinary evaluation", () => {
      const i = fixture(),
        base = inputFor()
      const ordinary = {
        ...base,
        definitions: i.definitions,
        bindings: i.bindings,
        world: {
          ...base.world,
          entities: base.world.entities.map((a, index) =>
            index === 0 ? { ...a, entityId: "entity:alice" as const } : a,
          ),
        },
        selections: [],
      }
      const lowOrdinary = {
        ...ordinary,
        hit: { ...ordinary.hit, actorId: "entity:alice" as const },
      }
      expect(ok(calculateStaticDamage(lowOrdinary)).expected).toBeGreaterThan(0)
      issue(
        calculateStaticDamage({
          ...lowOrdinary,
          selections: [{ effectId, bindingId: "binding:alice", layers: 1 }],
        }),
        "CONTEXT_MISMATCH",
      )
      const engine: EffectEngine = effectEngine
      expect(ok(engine.calculateStaticDamage(low(i))).expected).toBe(
        12345.6789 * 0.025,
      )
      expect(ok(engine.calculateStaticDamageFromCatalog(i)).expected).toBe(
        12345.6789 * 0.025,
      )
      const prepared = ok(
        prepareEffects(
          {
            ...i.definitions,
            effects: i.definitions.effects.filter(
              (e) => e.effectId === effectId,
            ),
          },
          i.bindings,
        ),
      )
      const state = ok(
        supplyEffectState(prepared, {
          sessionId: "session:periodic",
          atSeconds: 8,
          instances: [
            {
              instanceId: "instance:periodic",
              effectId,
              bindingId: "binding:alice",
              beneficiaryIds: ["entity:alice"],
              stackKey: [],
              lifetime: { kind: "supplied" },
              layers: [
                {
                  layerId: "layer:periodic",
                  startedAt: 1,
                  expiresAt: null,
                  trigger: null,
                },
              ],
            },
          ],
          snapshots: i.snapshots,
          cooldowns: [],
          eventHistory: { processedIds: [], last: null },
        }),
      )
      issue(
        evaluateEffects(prepared, state, {
          kind: "contributions",
          beneficiaries: ["entity:alice"],
          observedSnapshots: [],
          world: i.world,
          atSeconds: 8,
        }),
        "CONTEXT_MISMATCH",
      )
    })
  },
)

describe("Alice ratio definitions and catalog closure", () => {
  const selectedRule = (i: Mutable<AliceCorePeriodicCatalogInput>) =>
    i.definitions.effects.findIndex((e) => e.effectId === effectId)
  it.each([
    [
      "ratio expression",
      "operation/ratio",
      { kind: "parameter", unit: "ratio", name: "x" },
    ],
    ["wrong ratio", "operation/ratio/value", 0.03],
    ["entity scope", "scope", "entity"],
    ["continuous", "activation", { kind: "continuous" }],
    ["too many layers", "activation/maximumLayers/value", 2],
    ["team beneficiary", "beneficiary", { kind: "team" }],
    ["when condition", "when", { kind: "constant", value: false }],
    [
      "parameters",
      "parameters",
      { x: { kind: "constant", unit: "ratio", value: 0.025 } },
    ],
    ["wrong source", "source/identity/entityId", "1261"],
    ["configuration removed", "config", { kind: "constant", value: true }],
  ] as const)("rejects unselected rule tamper: %s", (_name, path, value) => {
    const i = fixture()
    i.selections = []
    issue(
      calculateStaticDamage(
        low(set(i, `/definitions/effects/${selectedRule(i)}/${path}`, value)),
      ),
      "INVALID_DEFINITION",
    )
  })
  it("rejects two ratio rules even without a catalog", () => {
    const i = fixture(),
      rule = i.definitions.effects[selectedRule(i)]!
    i.definitions.effects.push({
      ...rule,
      effectId: "agent:1401:nanoka:duplicate",
    })
    issue(calculateStaticDamage(low(i)), "DUPLICATE_ID")
  })
  it.each(["configuration", "contribution"] as const)(
    "rejects %s modification before application",
    (phase) => {
      const i = fixture(),
        rule = i.definitions.effects[selectedRule(i)]!
      const modification = {
        kind: "modification",
        effectId: "agent:1401:test:modifier",
        source: rule.source,
        config: { kind: "constant", value: true },
        parameters: {},
        phase,
        ...(phase === "contribution"
          ? { when: { kind: "constant", value: true } }
          : {}),
        target: { kind: "effect", effectId },
        modifications: [
          phase === "configuration"
            ? {
                field: "parameter",
                parameter: "x",
                unit: "ratio",
                change: {
                  operator: "override",
                  value: { kind: "literal", unit: "ratio", value: 0.025 },
                },
              }
            : {
                field: "output",
                unit: "ratio",
                change: {
                  operator: "scale",
                  value: { kind: "literal", unit: "multiplier", value: 2 },
                },
              },
        ],
      } as unknown as EffectRule
      i.definitions.effects.push(modification as Mutable<EffectRule>)
      issue(calculateStaticDamage(low(i)), "INVALID_MODIFICATION")
    },
  )
  it.each([
    ["missing metadata", "delete"],
    ["wrong option", "optionId"],
    ["wrong effect", "effectId"],
    ["wrong agent", "agentEntityId"],
    ["duplicated metadata", "duplicate"],
    ["duplicate references", "references"],
    ["ratio in metadata", "ratio"],
  ])("rejects %s", (_name, mode) => {
    const i = fixture(),
      index = i.catalog.mechanisms!.findIndex(
        (m) => m.mechanism === "alice-core-periodic-damage",
      )
    if (mode === "delete") i.catalog.mechanisms!.splice(index, 1)
    else if (mode === "duplicate")
      i.catalog.mechanisms!.push(structuredClone(i.catalog.mechanisms![index]!))
    else if (mode === "references")
      i.catalog.mechanisms![index]!.references.push(
        i.catalog.mechanisms![index]!.references[0]!,
      )
    else Object.assign(i.catalog.mechanisms![index]!, { [mode!]: "wrong" })
    issue(
      calculateStaticDamageFromCatalog(i),
      mode === "duplicate" || mode === "references"
        ? "DUPLICATE_ID"
        : "INVALID_DEFINITION",
    )
  })
  it("rejects false actor source and unrelated malformed facts", () => {
    issue(
      calculateStaticDamageFromCatalog(
        set(fixture(), "/actorSources/0/agentEntityId", "1261"),
      ),
      "CONTEXT_MISMATCH",
    )
    const i = fixture()
    i.originalAnomalies.push({
      ...i.originalAnomalies[0]!,
      eventId: "event:unrelated",
      settledDamage: { unit: "damage-points", value: NaN },
    })
    issue(calculateStaticDamageFromCatalog(i), "INVALID_INPUT")
  })
  it("is unchanged by true definition, option, binding and fact reordering", () => {
    const i = fixture(),
      expected = ok(calculateStaticDamageFromCatalog(i))
    i.definitions.effects.reverse()
    i.catalog.options.reverse()
    i.catalog.entities.reverse()
    i.catalog.mechanisms!.reverse()
    expect(i.definitions.effects[0]).not.toEqual(
      fixture().definitions.effects[0],
    )
    expect(ok(calculateStaticDamageFromCatalog(i))).toEqual(expected)
  })
})

describe.each(["enabled", "unselected", "zero"] as const)(
  "Alice periodic catalog beneficiary %s",
  (selection) => {
    function input() {
      const i = fixture()
      if (selection === "unselected") i.selections = []
      else if (selection === "zero") i.selections[0]!.layers = 0
      return i
    }

    it("rejects a team variant override before settling the event", () => {
      const i = input()
      const option = i.catalog.options.find((o) => o.optionId === optionId)!
      option.variants[0]!.target = "team"
      const result = calculateStaticDamageFromCatalog(i)
      issue(result, "INVALID_DEFINITION")
      if (!result.ok)
        expect(
          result.issues.some(
            (error) =>
              error.code === "INVALID_DEFINITION" &&
              error.pointer.startsWith("/catalog/"),
          ),
        ).toBe(true)
    })

    it.each([
      ["explicit self", "self"],
      ["inherited self", undefined],
    ] as const)(
      "accepts %s with unchanged settlement and attribution",
      (_name, target) => {
        const i = input()
        const option = i.catalog.options.find((o) => o.optionId === optionId)!
        if (target === undefined) delete option.variants[0]!.target
        else option.variants[0]!.target = target
        const result = ok(calculateStaticDamageFromCatalog(i))
        const applied = selection === "enabled"
        const ratio = applied ? 0.025 : 0
        expect(result).toEqual(ok(calculateStaticDamage(low(i))))
        expect(result).toMatchObject({
          status: applied ? "applied" : "inactive",
          nonCritical: applied ? 308.64197250000007 : 0,
          expected: applied ? 308.64197250000007 : 0,
          critical: null,
          criticalRate: 0,
          factors: {
            originalSettledDamage: 12345.6789,
            effectivePeriodicRatio: ratio,
          },
        })
        expect(result.provenance).toEqual({
          event: i.event,
          holderId: "entity:alice",
          bindingId: "binding:alice",
          effectId,
          originalAnomaly: i.originalAnomalies[0],
          effectivePeriodicRatio: ratio,
        })
        expect(result.contributions).toEqual(
          applied
            ? [
                {
                  effectId,
                  bindingId: "binding:alice",
                  holderId: "entity:alice",
                  eventId: "event:periodic",
                  originalAnomalyEventId: "event:original",
                  ratio: { unit: "ratio", value: 0.025 },
                },
              ]
            : [],
        )
      },
    )

    it("rejects a team option even when its variant explicitly targets self", () => {
      const i = input()
      const option = i.catalog.options.find((o) => o.optionId === optionId)!
      option.target = "team"
      option.variants[0]!.target = "self"
      issue(calculateStaticDamageFromCatalog(i), "INVALID_DEFINITION")
    })
  },
)

describe("Alice existing sources remain independent nonzero settlements", () => {
  function ordinary() {
    const i = structuredClone(inputFor()) as unknown as Mutable<
      import("../../src/index.ts").StaticCatalogDamageInput
    >
    i.definitions = ok(parseEffectRuleSet(raw)) as Mutable<typeof i.definitions>
    i.catalog = structuredClone(catalog) as Mutable<typeof i.catalog>
    i.bindings = [
      {
        kind: "agent",
        bindingId: "binding:alice",
        holderId: "entity:attacker",
        sourceEntityId: "1401",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
    ]
    i.actorSources = [{ entityId: "entity:attacker", agentEntityId: "1401" }]
    const attacker = i.world.entities[0]!
    if (attacker.kind !== "actor") throw new Error("attacker")
    attacker.generalStats.attack = general(1234.567) as Mutable<
      ReturnType<typeof general>
    >
    attacker.generalStats.anomalyProficiency = general(371.25) as Mutable<
      ReturnType<typeof general>
    >
    i.hit.element = "physical"
    i.hit.skillCategory = "uncategorized"
    i.hit.damageItems = [
      {
        mode: "direct",
        role: "base",
        itemId: "original-assault",
        stat: "attack",
        statSource: { entityId: "entity:attacker" },
        damageMultiplier: 7.13,
      },
    ]
    const base = inputFor().damage
    if (base.kind !== "regular") throw new Error("regular")
    i.damage = {
      ...base,
      kind: "anomaly",
      damageBonus: [0.37],
      anomalyDamageBonus: [0.17],
      anomalyCriticalRate: 1,
      anomalyCriticalDamage: [0.61],
      refringe: { mode: "settled", multiplier: 1.29 },
      anomalySource: { entityId: "entity:attacker", level: 60 },
      resistance: {
        targetResistance: 0.23,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [0.23],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.61,
        targetStunDamageMultiplierAdjustments: [],
      },
    } as unknown as Mutable<typeof i.damage>
    return i
  }
  it.each([
    [
      "M1",
      "agents:alice:mindscape:1:blk-legacy:legacy-team-reduceDefense",
      1694 / 1514,
    ],
    [
      "M2",
      "agents:alice:mindscape:2:blk-legacy:legacy-team-anomalyDmgBonus",
      1.32 / 1.17,
    ],
    [
      "M4",
      "agents:alice:mindscape:4:blk-legacy:legacy-self-resPen",
      0.87 / 0.77,
    ],
  ])(
    "%s changes its ordinary anomaly factor without becoming a periodic source",
    (_name, id, ratio) => {
      const i = ordinary(),
        baseline = ok(calculateStaticDamageFromCatalog(i))
      i.selections = [
        { optionId: String(id), bindingId: "binding:alice", layers: 1 },
      ]
      const selected = ok(calculateStaticDamageFromCatalog(i))
      expect(selected.expected / baseline.expected).toBeCloseTo(
        Number(ratio),
        10,
      )
      expect(selected.expected).toBeGreaterThan(baseline.expected)
      expect(
        selected.evaluation.contributions.some(
          (c) => c.origin.bindingId === "binding:alice",
        ),
      ).toBe(true)
    },
  )
  it("M6 still reads current AP×33 and guarantees its own regular critical branch", () => {
    const i = ordinary(),
      base = inputFor().damage
    if (base.kind !== "regular") throw new Error("regular")
    i.damage = {
      ...base,
      damageBonus: [0.37],
      resistance: i.damage.resistance,
      damageTaken: i.damage.damageTaken,
      stunDamage: i.damage.stunDamage,
    } as unknown as Mutable<typeof i.damage>
    i.hit.damageItems = [
      {
        mode: "direct",
        role: "base",
        itemId: "alice:m6-proficiency-damage",
        stat: "anomalyProficiency",
        statSource: { entityId: "entity:attacker" },
        damageMultiplier: 0,
      },
    ]
    i.hit.skillTargetIds = ["zzz-hp:skill:alice-m6-proficiency-damage"]
    i.selections = [
      {
        optionId: "nanoka:agents:alice:m6-proficiency-damage",
        bindingId: "binding:alice",
        layers: 1,
      },
    ]
    const r = ok(calculateStaticDamageFromCatalog(i))
    expect(r.factors.nonCritical["baseDamage"]).toBe(371.25 * 33)
    expect(r.criticalRate).toBe(1)
    expect(r.expected).toBe(r.critical)
    issue(
      calculateStaticDamageFromCatalog({
        ...i,
        selections: [{ optionId, bindingId: "binding:alice", layers: 1 }],
      }),
      "CONTEXT_MISMATCH",
    )
  })
})

describe("periodic structural and metadata failures stay explicit", () => {
  it.each([
    ["event absent", "/event", undefined],
    ["event null", "/event", null],
    ["fact null", "/originalAnomalies/0", null],
    ["amount null", "/originalAnomalies/0/settledDamage", null],
    ["snapshot list absent", "/snapshots", undefined],
    ["selection null", "/selections/0", null],
    ["NaN layer", "/selections/0/layers", NaN],
    ["boolean layer", "/selections/0/layers", true],
    ["array facts absent", "/originalAnomalies", undefined],
  ] as const)("rejects %s without throwing", (_name, path, value) => {
    issue(
      calculateStaticDamageFromCatalog(set(fixture(), path, value)),
      "INVALID_INPUT",
    )
  })
  it.each([
    ["wrong target", "target", "team"],
    ["new exclusivity", "exclusiveGroup", "period"],
    ["extra maximum", "variants/0/maximumLayers", 2],
    [
      "missing core level",
      "variants/0/configuration/coreSkillLevels",
      [1, 2, 3, 4, 5, 6],
    ],
    ["wrong mindscape", "variants/0/configuration/minimumMindscape", 1],
    [
      "output requirement",
      "variants/0/inputs",
      [{ name: "unused", unit: "ratio", description: "must not be added" }],
    ],
  ] as const)(
    "rejects periodic option %s even when closed",
    (_name, path, value) => {
      const i = fixture()
      i.selections = []
      const index = i.catalog.options.findIndex((o) => o.optionId === optionId)
      const result = calculateStaticDamageFromCatalog(
        set(i, `/catalog/options/${index}/${path}`, value),
      )
      expect(result.ok, JSON.stringify(result)).toBe(false)
      if (!result.ok)
        expect(
          result.issues.every((error) => error.pointer.startsWith("/catalog/")),
        ).toBe(true)
    },
  )
  it("does not let current applier stats or enemy defense become historical damage", () => {
    const i = fixture(),
      baseline = ok(calculateStaticDamageFromCatalog(i))
    const provider = i.world.entities[1]!,
      target = i.world.entities[2]!
    if (provider.kind !== "actor" || target.kind !== "actor")
      throw new Error("actor")
    provider.generalStats = {
      attack: general(5432.123),
      anomalyProficiency: general(999),
    } as Mutable<typeof provider.generalStats>
    target.generalStats = { defense: general(7777) } as Mutable<
      typeof target.generalStats
    >
    expect(ok(calculateStaticDamageFromCatalog(i))).toEqual(baseline)
    i.snapshots[0]!.world.entities = i.snapshots[0]!.world.entities.filter(
      (a) => a.entityId !== provider.entityId,
    )
    issue(calculateStaticDamageFromCatalog(i), "MISSING_SNAPSHOT")
  })
})
