import { expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type { StaticEffectCatalog } from "../../src/effects/types.ts"
import rawDefinitions from "../../../data/definitions/effects/static.json" with { type: "json" }
import rawCatalog from "../../../data/definitions/effects/static-catalog.json" with { type: "json" }
import { makeRoxyWeatheredRequest } from "../../../data/test/fixtures/roxy-weathered-direct-damage-consumer.ts"

const parsed = parseEffectRuleSet(rawDefinitions)
if (!parsed.ok) throw new Error(JSON.stringify(parsed))
const sparseIncreases: number[] = []
sparseIncreases.length = 1
const definitions = parsed.value
const catalog = rawCatalog as unknown as StaticEffectCatalog

it("keeps the base windswept factor when Roxy is off: 2340 × 1.10 = 2574", () => {
  const result = calculateStaticDamageFromCatalog(
    makeRoxyWeatheredRequest(definitions, catalog),
  )
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) return
  expect(result.value.nonCritical).toBeCloseTo(2574, 8)
  expect(result.value.factors.nonCritical.windsweptDirectDamage).toBe(1.1)
})

import { describe } from "vitest"
import { windsweptDirectDamageFactor } from "../../src/formulas.ts"
import { calculateStaticDamage } from "../../src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticDamageInput,
} from "../../src/effects/types.ts"
import {
  makeWindsweptCannonRotorRequest,
  roxyWeatheredOption,
  roxyWeatheredInput,
} from "../../../data/test/fixtures/roxy-weathered-direct-damage-consumer.ts"
import { makeLucyGuardBoarRequest } from "../../../data/test/fixtures/lucy-guard-boar-consumer.ts"
import { makeAstraYaoM4Request } from "../../../data/test/fixtures/astra-yao-m4-consumer.ts"

const select = (layers = 1, bindingId = "binding:roxy") => ({
  optionId: roxyWeatheredOption,
  bindingId,
  layers,
})
const fresh = (): any =>
  structuredClone(makeRoxyWeatheredRequest(definitions, catalog))
const calculate = (input: StaticCatalogDamageInput): StaticDamageResult => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result))
  return result.value
}
const rejected = (
  input: StaticCatalogDamageInput,
  code: string,
  pointer: string,
) => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (!result.ok)
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code, pointer })]),
    )
}
const additional = (result: StaticDamageResult) =>
  result.evaluation.contributions.filter(
    (c) =>
      c.address.kind === "factor" &&
      c.address.channel === "windswept-direct-damage-coefficient-increase",
  )

describe("named windswept coefficient factor", () => {
  it.each([
    [0, [], 1],
    [0.2, [0.03, 0.04], 1.27],
    [0.1, [0.08, 0.08], 1.26],
  ] as const)(
    "base %s, increases %j",
    (baseCoefficient, coefficientIncreases, expected) => {
      expect(
        windsweptDirectDamageFactor.calculate({
          baseCoefficient,
          coefficientIncreases,
        }),
      ).toBeCloseTo(expected, 12)
    },
  )
  it.each([
    undefined,
    {},
    { baseCoefficient: 0 },
    { baseCoefficient: -1, coefficientIncreases: [] },
    { baseCoefficient: Infinity, coefficientIncreases: [] },
    { baseCoefficient: 0, coefficientIncreases: [NaN] },
    { baseCoefficient: 0, coefficientIncreases: [-0.01] },
    { baseCoefficient: 0, coefficientIncreases: sparseIncreases },
    {
      baseCoefficient: Number.MAX_VALUE,
      coefficientIncreases: [Number.MAX_VALUE],
    },
  ])("rejects malformed or nonfinite arithmetic %j", (input) => {
    expect(() => windsweptDirectDamageFactor.calculate(input as any)).toThrow()
  })
})

describe("independent coefficient arithmetic and attribution", () => {
  it.each([
    [0, 0, 2340],
    [0, 1, 2527.2],
    [0.1, 0, 2574],
    [0.1, 1, 2761.2],
    [0.2, 0, 2808],
    [0.2, 1, 2995.2],
    [0.18, 0, 2761.2],
  ])("base %s / Roxy %s", (base, on, expected) => {
    const input = fresh()
    input.targetWindswept.baseCoefficient.value = base
    input.selections = [select(on)]
    const result = calculate(input)
    expect(result.nonCritical).toBeCloseTo(expected!, 8)
    expect(result.critical).toBeCloseTo(expected! * 1.5, 8)
    expect(result.expected).toBeCloseTo(expected! * 1.125, 8)
    expect(result.factors.nonCritical.windsweptDirectDamage).toBeCloseTo(
      1 + base! + on! * 0.08,
      12,
    )
    expect(result.factors.critical!.windsweptDirectDamage).toBe(
      result.factors.nonCritical.windsweptDirectDamage,
    )
    expect(additional(result)).toHaveLength(on!)
    if (on) expect(additional(result)[0]!.value.value).toBe(0.08)
  })
  it("multiplies ordinary damage taken independently instead of adding there or multiplying 1.08", () => {
    const input = fresh()
    input.selections = [select()]
    const result = calculate(input)
    expect(result.nonCritical).not.toBeCloseTo(2779.92, 6)
    expect(result.factors.nonCritical.damageTaken).toBe(1.3)
    input.damage.damageTaken = {
      targetDamageTakenIncreases: [],
      targetDamageTakenReductions: [0.2],
    }
    expect(calculate(input).nonCritical).toBeCloseTo(1699.2, 8)
  })
  it.each(["sheer", "sharpen"])("includes explicitly classified %s", (kind) => {
    const input = fresh()
    input.selections = [select()]
    input.damage.kind = kind
    input.world.entities[0].directStats.sharpCriticalDamage = {
      baseValue: 0.5,
      additions: [],
    }
    if (kind === "sheer") {
      delete input.damage.defense
      input.damage.sheerDamageBonus = []
    } else input.damage.sharpenDamageBonus = []
    const result = calculate(input)
    expect(result.factors.nonCritical.windsweptDirectDamage).toBeCloseTo(
      1.18,
      12,
    )
    expect(result.factors.critical!.windsweptDirectDamage).toBeCloseTo(1.18, 12)
  })
  it("rejects critical branch overflow even at CR 0", () => {
    const input = fresh()
    input.world.entities[0].generalStats.attack.baseValue = 8e307
    input.world.entities[0].directStats.criticalRate.baseValue = 0
    input.hit.damageItems[0].damageMultiplier = 1
    input.damage.damageBonus = []
    input.damage.defense.targetBaseDefense = 0
    input.damage.resistance.targetResistance = 0
    input.damage.damageTaken.targetDamageTakenIncreases = []
    input.damage.stunDamage = {
      isTargetStunned: false,
      targetBaseStunDamageMultiplier: 1,
      targetStunDamageMultiplierAdjustments: [],
    }
    input.targetWindswept.baseCoefficient.value = 0.6
    rejected(input, "INVALID_INPUT", "/damage")
  })
})

describe("current target and direct attack facts", () => {
  it.each([
    ["wind", null, true, 2761.2],
    ["fire", "fire", true, 2761.2],
    ["ice", "fire", true, 2340],
    ["fire", null, true, 2340],
    ["wind", "fire", false, 2340],
    ["ether", "ether", true, 2761.2],
  ] as const)(
    "%s contamination %s direct %s",
    (element, contamination, directAttack, expected) => {
      const input = fresh()
      input.hit.element = element
      input.hit.directAttack = directAttack
      input.targetWindswept.contaminationElement = contamination
      input.selections = [select()]
      expect(calculate(input).nonCritical).toBeCloseTo(expected, 8)
    },
  )
  it.each([undefined, 0, 1])(
    "validates active-state facts with selection %s",
    (layers) => {
      const input = fresh()
      input.selections = layers === undefined ? [] : [select(layers)]
      delete input.hit.directAttack
      rejected(input, "MISSING_FACT", "/hit/directAttack")
      input.hit.directAttack = false
      delete input.targetWindswept.contaminationElement
      rejected(input, "MISSING_FACT", "/targetWindswept/contaminationElement")
    },
  )
  it.each([
    [
      "missing base",
      (i: any): unknown => delete i.targetWindswept.baseCoefficient,
      "MISSING_FACT",
      "/targetWindswept/baseCoefficient",
    ],
    [
      "unit",
      (i: any): unknown =>
        (i.targetWindswept.baseCoefficient.unit = "multiplier"),
      "UNIT_MISMATCH",
      "/targetWindswept/baseCoefficient/unit",
    ],
    [
      "missing unit",
      (i: any): unknown => delete i.targetWindswept.baseCoefficient.unit,
      "MISSING_FACT",
      "/targetWindswept/baseCoefficient/unit",
    ],
    [
      "negative",
      (i: any): unknown => (i.targetWindswept.baseCoefficient.value = -0.1),
      "INVALID_INPUT",
      "/targetWindswept/baseCoefficient/value",
    ],
    [
      "nonfinite",
      (i: any): unknown => (i.targetWindswept.baseCoefficient.value = Infinity),
      "INVALID_INPUT",
      "/targetWindswept/baseCoefficient/value",
    ],
    [
      "false type",
      (i: any): unknown => (i.hit.directAttack = 0),
      "INVALID_INPUT",
      "/hit/directAttack",
    ],
    [
      "target",
      (i: any): unknown => (i.targetWindswept.targetId = "entity:enemy2"),
      "CONTEXT_MISMATCH",
      "/targetWindswept/targetId",
    ],
    [
      "missing applier",
      (i: any): unknown => delete i.targetWindswept.applierActorId,
      "MISSING_FACT",
      "/targetWindswept/applierActorId",
    ],
    [
      "unobserved applier",
      (i: any): unknown =>
        (i.targetWindswept.applierActorId = "entity:missing"),
      "MISSING_FACT",
      "/targetWindswept/applierActorId",
    ],
    [
      "same target team",
      (i: any): unknown => (i.targetWindswept.applierActorId = "entity:enemy2"),
      "CONTEXT_MISMATCH",
      "/targetWindswept/applierActorId",
    ],
    [
      "special contamination",
      (i: any): unknown =>
        (i.targetWindswept.contaminationElement = "auric-ink"),
      "INVALID_INPUT",
      "/targetWindswept/contaminationElement",
    ],
    [
      "special hit",
      (i: any): unknown => (i.hit.element = "auric-ink"),
      "INVALID_INPUT",
      "/hit/element",
    ],
    [
      "extra field",
      (i: any): unknown => (i.targetWindswept.activeBuffElements = ["wind"]),
      "INVALID_INPUT",
      "/targetWindswept/activeBuffElements",
    ],
  ] as const)(
    "rejects %s even at zero layers",
    (_label, mutate, code, pointer) => {
      const input = fresh()
      input.selections = [select(0)]
      mutate(input)
      rejected(input, code, pointer)
    },
  )
  it("accepts absent without classification; leaves old requests unchanged", () => {
    const input = fresh()
    delete input.hit.directAttack
    input.targetWindswept = { status: "absent", targetId: "entity:enemy" }
    input.selections = [select()]
    expect(calculate(input).nonCritical).toBeCloseTo(2340, 8)
    delete input.targetWindswept
    input.selections = []
    expect(calculate(input).nonCritical).toBeCloseTo(2340, 8)
    input.selections = [select()]
    input.bindings[0].eligible = false
    rejected(input, "MISSING_FACT", "/targetWindswept")
  })
  it.each(["anomaly", "disorder", "vortex", "anomaly-settlement", "luminize"])(
    "rejects true for known excluded %s before formula preparation",
    (kind) => {
      const input = fresh()
      input.damage.kind = kind
      rejected(input, "CONTEXT_MISMATCH", "/hit/directAttack")
    },
  )
})

function addRoxy(input: any, teamId = "team:players", eligible = true) {
  input.world.entities.push({
    ...structuredClone(input.world.entities[0]),
    entityId: "entity:roxy2",
    teamId,
  })
  input.actorSources.push({ entityId: "entity:roxy2", agentEntityId: "1621" })
  input.bindings.push({
    ...structuredClone(input.bindings[0]),
    holderId: "entity:roxy2",
    bindingId: "binding:roxy2",
    eligible,
  })
  input.selections.push(select(1, "binding:roxy2"))
}

describe("Roxy data qualification and effective source ownership", () => {
  it.each(["1111", "1471", "1611"])(
    "qualifying profession of agent %s",
    (agent) => {
      const input = fresh()
      input.actorSources.find(
        (s: any) => s.entityId === "entity:qualifier",
      ).agentEntityId = agent
      input.selections = [select()]
      expect(calculate(input).nonCritical).toBeCloseTo(2761.2, 8)
    },
  )
  it("uses the actual beneficiary's team and accepts a different same-team applier", () => {
    const input = fresh()
    input.selections = [select()]
    input.actorSources.find(
      (s: any) => s.entityId === "entity:qualifier",
    ).agentEntityId = "1251"
    expect(calculate(input).nonCritical).toBeCloseTo(2574, 8)
  })
  it.each([false, true])(
    "ignores an inactive or different-team source before an applicable source: other team %s",
    (otherTeam) => {
      const input = fresh()
      input.selections = [select()]
      addRoxy(input, otherTeam ? "team:others" : "team:players", otherTeam)
      input.selections.reverse()
      expect(calculate(input).nonCritical).toBeCloseTo(2761.2, 8)
    },
  )
  it("does not stack two applicable Roxy sources; zero layers frees the group", () => {
    const input = fresh()
    input.selections = [select()]
    addRoxy(input)
    rejected(input, "CONTEXT_MISMATCH", "/selections/1")
    input.selections[0].layers = 0
    expect(calculate(input).nonCritical).toBeCloseTo(2761.2, 8)
  })
  it("rejects duplicate option, binding conflict and externally supplied applicability", () => {
    const input = fresh()
    input.selections = [select(), select()]
    rejected(input, "DUPLICATE_ID", "/selections/1")
    input.selections = [select()]
    input.bindings[0].sourceEntityId = "1251"
    rejected(input, "CONTEXT_MISMATCH", "/bindings/0")
    const external = fresh()
    external.selections = [select(0)]
    external.inputs = [
      {
        bindingId: "binding:roxy",
        name: roxyWeatheredInput,
        value: { unit: "count", value: 0 },
      },
    ]
    rejected(external, "DUPLICATE_ID", "/inputs/0")
  })
  it("does not substitute C3 persistent buff elements for current target windswept", () => {
    const input = fresh()
    input.selections = [
      {
        optionId: "nanoka:agents:1621:core-element-critical-damage",
        bindingId: "binding:roxy",
        layers: 1,
        activeBuffElements: ["fire"],
      },
      select(),
    ]
    input.inputs = [
      {
        bindingId: "binding:roxy",
        name: "roxy:core:external-critical-rate",
        value: { unit: "ratio", value: 0.5 },
      },
    ]
    delete input.targetWindswept
    rejected(input, "MISSING_FACT", "/targetWindswept")
    input.targetWindswept = { status: "absent", targetId: "entity:enemy" }
    input.hit.element = "fire"
    expect(
      calculate(input).factors.nonCritical.windsweptDirectDamage,
    ).toBeUndefined()
    input.selections[0] = {
      optionId: "nanoka:agents:1621:core-element-critical-damage",
      bindingId: "binding:roxy",
      layers: 1,
    }
    input.targetWindswept = fresh().targetWindswept
    rejected(input, "MISSING_FACT", "/selections/0/activeBuffElements")
  })
})

describe("independent damage item classifications", () => {
  it("does not infer Cannon Rotor's tag from its regular formula", () => {
    rejected(
      makeWindsweptCannonRotorRequest(definitions, catalog),
      "MISSING_FACT",
      "/hit/directAttack",
    )
  })
  it.each([
    [false, false, 2000, 3000, 2250],
    [true, false, 2200, 3300, 2475],
    [true, true, 2360, 3540, 2655],
  ] as const)(
    "Cannon Rotor direct %s / Roxy %s",
    (directAttack, on, n, c, e) => {
      const input: any = makeWindsweptCannonRotorRequest(definitions, catalog)
      input.hit.directAttack = directAttack
      if (on) input.selections.push(select())
      const result = calculate(input)
      expect(result.nonCritical).toBeCloseTo(n, 8)
      expect(result.critical).toBeCloseTo(c, 8)
      expect(result.expected).toBeCloseTo(e, 8)
    },
  )
  it("does not synthesize Cannon Rotor from a primary true hit", () => {
    const input: any = makeWindsweptCannonRotorRequest(definitions, catalog)
    input.hit = {
      ...input.hit,
      directAttack: true,
      damageItems: [
        { ...input.hit.damageItems[0], itemId: "primary", damageMultiplier: 2 },
      ],
    }
    rejected(input, "MISSING_REFERENCE", "/selections/0")
  })
  it.each(["lucy", "astra"])(
    "explicitly rejects unsupported %s opt-in",
    (kind) => {
      const input: any =
        kind === "lucy"
          ? makeLucyGuardBoarRequest(definitions, catalog)
          : makeAstraYaoM4Request(definitions, catalog)
      input.targetWindswept = fresh().targetWindswept
      rejected(input, "INVALID_INPUT", "/targetWindswept")
    },
  )
  it("low-level supplied calls consume the named channel without hardcoding Roxy in core", () => {
    const input = fresh()
    const { catalog: _catalog, actorSources: _actors, ...low } = input
    delete low.hit.skillTargetIds
    low.hit.damageItems = low.hit.damageItems.map(
      ({ role: _role, mode: _mode, ...item }: any) => item,
    )
    low.selections = [
      {
        effectId: "agent:1621:nanoka:additional-weathered-direct-damage",
        bindingId: "binding:roxy",
        layers: 1,
      },
    ]
    low.inputs = [
      {
        bindingId: "binding:roxy",
        name: roxyWeatheredInput,
        value: { unit: "count", value: 1 },
      },
    ]
    const result = calculateStaticDamage(low as StaticDamageInput)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) expect(result.value.nonCritical).toBeCloseTo(2761.2, 8)
  })
})

describe("metadata-driven catalog boundaries", () => {
  it.each([
    [
      "missing count consumer",
      (v: any, r: any): void => {
        r.operation.value = { kind: "literal", unit: "ratio", value: 0.08 }
      },
    ],
    [
      "wrong channel",
      (_v: any, r: any): void => {
        r.operation.channel = "damage-bonus"
      },
    ],
    [
      "layer count",
      (v: any): void => {
        v.maximumLayers = 2
      },
    ],
    [
      "external input collision",
      (v: any): void => {
        v.inputs = [
          { name: roxyWeatheredInput, unit: "count", description: "collision" },
        ]
      },
    ],
    [
      "C3 state collision",
      (v: any): void => {
        v.elementBuffInputs = [
          { element: "fire", inputName: roxyWeatheredInput },
        ]
      },
    ],
    [
      "applier team",
      (v: any): void => {
        v.windsweptDirectDamage.applierTeam = "any"
      },
    ],
  ] as const)("rejects %s", (_label, mutate) => {
    const input = fresh()
    const option = input.catalog.options.find(
      (o: any) => o.optionId === roxyWeatheredOption,
    )
    const rule = input.definitions.effects.find(
      (r: any) =>
        r.effectId === "agent:1621:nanoka:additional-weathered-direct-damage",
    )
    mutate(option.variants[0], rule)
    const result = calculateStaticDamageFromCatalog(input)
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (i) =>
            i.code === "INVALID_DEFINITION" &&
            i.pointer.includes("/windsweptDirectDamage"),
        ),
      ).toBe(true)
  })
  it("keeps base windswept but excludes Roxy when another team applied it", () => {
    const input = fresh()
    input.selections = [select()]
    input.world.entities.push({
      ...structuredClone(input.world.entities[0]),
      entityId: "entity:applier",
      teamId: "team:others",
    })
    input.actorSources.push({
      entityId: "entity:applier",
      agentEntityId: "1621",
    })
    input.targetWindswept.applierActorId = "entity:applier"
    expect(calculate(input).nonCritical).toBeCloseTo(2574, 8)
  })
})

it.each(["anomaly", "luminize"] as const)(
  "known excluded %s settlement remains complete without a direct classification",
  (kind) => {
    const input = fresh()
    const { catalog: _catalog, actorSources: _actors, ...low } = input
    delete low.hit.skillTargetIds
    delete low.hit.directAttack
    low.hit.damageItems = low.hit.damageItems.map(
      ({ role: _role, mode: _mode, ...item }: any) => item,
    )
    low.damage.kind = kind
    low.damage.anomalyDamageBonus = []
    low.damage.refringe = { settledMultiplier: 1 }
    if (kind === "anomaly") {
      low.damage.anomalyCriticalRate = 0
      low.damage.anomalyCriticalDamage = []
    } else
      low.damage.luminizeMultiplier = {
        baseLuminizeMultiplier: 1,
        multiplicativeLuminizeMultiplierAdjustments: [],
        remielleAnomalyProficiency: 300,
        anomalyProficiencyConversionRate: 0,
      }
    const active = calculateStaticDamage(low as StaticDamageInput)
    delete low.targetWindswept
    const baseline = calculateStaticDamage(low as StaticDamageInput)
    expect(active.ok, JSON.stringify(active)).toBe(true)
    expect(active).toEqual(baseline)
    if (active.ok) {
      expect(
        active.value.factors.nonCritical.windsweptDirectDamage,
      ).toBeUndefined()
      if (kind === "luminize") expect(active.value.critical).toBeNull()
    }
  },
)
