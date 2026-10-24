import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import { validateStaticCatalog } from "../../src/effects/internal/static-catalog.ts"
import type {
  StaticCatalogDamageInput,
  StaticDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/types.ts"
import rawDefinitions from "../../../data/definitions/effects/static.json" with { type: "json" }
import rawCatalog from "../../../data/definitions/effects/static-catalog.json" with { type: "json" }
import { makeLucyGuardBoarRequest } from "../../../data/test/fixtures/lucy-guard-boar-consumer.ts"
import { makeAstraYaoM4Request } from "../../../data/test/fixtures/astra-yao-m4-consumer.ts"
import {
  makeRoxyAdditionalRequest,
  roxyAdditionalLevelOption as levelOption,
  roxyAdditionalStunOption as stunOption,
  roxyAdditionalLevelInput as levelInput,
} from "../../../data/test/fixtures/roxy-additional-consumer.ts"

const parsed = parseEffectRuleSet(rawDefinitions)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = rawCatalog as unknown as StaticEffectCatalog
const m2 = "nanoka:agents:1621:m2-stun-damage"
const effectId = (id: string) =>
  id.replace("nanoka:agents:1621:", "agent:1621:nanoka:") as `agent:${string}`
const selection = (
  optionId: string,
  layers = 1,
  bindingId = "binding:roxy",
) => ({ optionId, layers, bindingId })
const fresh = (level: number | null = 60): any =>
  structuredClone(makeRoxyAdditionalRequest(definitions, catalog, level))
const calculate = (input: StaticCatalogDamageInput): StaticDamageResult => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  expect(result.value.nonCritical).toBeGreaterThan(0)
  return result.value
}
const rejected = (
  input: StaticCatalogDamageInput,
  code: string,
  pointer?: string,
) => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (result.ok) throw new Error("expected structured rejection")
  expect(result.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code,
        ...(pointer === undefined ? {} : { pointer }),
      }),
    ]),
  )
}
const contribution = (result: StaticDamageResult, optionId: string) =>
  result.evaluation.contributions.filter(
    (entry) => entry.origin.effectId === effectId(optionId),
  )
const variant = (input: any, id = levelOption) =>
  input.catalog.options.find((entry: any) => entry.optionId === id).variants[0]
const rule = (input: any, id = levelOption) =>
  input.definitions.effects.find(
    (entry: any) => entry.effectId === effectId(id),
  )
const variantPointer = (input: any, field: string) =>
  `/catalog/options/${input.catalog.options.findIndex((entry: any) => entry.optionId === levelOption)}/variants/0/${field}`

describe("Roxy independent additional clauses on the formal catalog", () => {
  it.each([
    [1, 0.092, 2293.2, 2579.85],
    [30, 0.44, 3024, 3402],
    [60, 0.8, 3780, 4252.5],
  ])(
    "uses holder L%s with bonus %s, independently calculated damage %s / %s",
    (level, bonus, nonCritical, expected) => {
      const input = fresh(level)
      input.selections = [selection(levelOption)]
      const result = calculate(input)
      expect(result.nonCritical).toBeCloseTo(nonCritical!, 9)
      expect(result.expected).toBeCloseTo(expected!, 9)
      expect(contribution(result, levelOption)).toHaveLength(1)
      expect(contribution(result, levelOption)[0]!.value.value).toBeCloseTo(
        bonus!,
        12,
      )
      expect(
        definitions.effects.find(
          (entry) =>
            entry.effectId ===
            contribution(result, levelOption)[0]!.origin.effectId,
        )!.source.references,
      ).toHaveLength(14)
    },
  )
  it("adds the fixed eight percent and level conversion to an existing bonus", () => {
    const input = fresh()
    input.damage.damageBonus = [0.3]
    input.selections = [selection(levelOption)]
    const result = calculate(input)
    expect(result.factors.nonCritical.damageBonus).toBeCloseTo(2.1, 12)
    expect(result.nonCritical).toBeCloseTo(4410, 9)
    expect(result.expected).toBeCloseTo(4961.25, 9)
  })
  it.each(
    Array.from({ length: 7 }, (_coreValue, c) =>
      Array.from({ length: 7 }, (_mindscapeValue, m) => [c + 1, m]),
    ).flat(),
  )("supports both clauses at core %s / M%s", (core, mindscape) => {
    const input = fresh()
    input.bindings[0].configuration = {
      coreSkillLevel: core,
      mindscapeRank: mindscape,
    }
    input.selections = [selection(levelOption), selection(stunOption)]
    const result = calculate(input)
    expect(result.nonCritical).toBeCloseTo(4536, 9)
    expect(contribution(result, levelOption)).toHaveLength(1)
    expect(contribution(result, stunOption)).toHaveLength(1)
  })
  it.each(
    [levelOption, stunOption].flatMap((id) =>
      [undefined, 0, 1].map((layers) => [id, layers] as const),
    ),
  )("keeps %s at selection %s independent", (id, layers) => {
    const input = fresh(id === stunOption || layers !== 1 ? null : 60)
    input.selections = layers === undefined ? [] : [selection(id, layers)]
    expect(calculate(input).nonCritical).toBeCloseTo(
      layers === 1 ? (id === levelOption ? 3780 : 2520) : 2100,
      9,
    )
  })
  it.each([
    [0, 0, 2100],
    [1, 0, 3780],
    [0, 1, 2520],
    [1, 1, 4536],
  ])(
    "keeps level=%s / team-hit=%s switches independent",
    (level, hit, expected) => {
      const input = fresh()
      input.selections = [
        selection(levelOption, level),
        selection(stunOption, hit),
      ]
      expect(calculate(input).nonCritical).toBeCloseTo(expected!, 9)
    },
  )
  it.each([
    [m2, 1.8, 2520],
    [stunOption, 1.8, 2520],
    ["both", 2.1, 2940],
  ])("uses ordinary stun addition for %s", (id, multiplier, expected) => {
    const input = fresh(null)
    input.selections = (id === "both" ? [m2, stunOption] : [id]).map((option) =>
      selection(String(option)),
    )
    const result = calculate(input)
    expect(result.nonCritical).toBeCloseTo(Number(expected), 9)
    expect(result.factors.nonCritical.stunDamage).toBeCloseTo(
      Number(multiplier),
      12,
    )
    for (const option of id === "both" ? [m2, stunOption] : [String(id)])
      expect(contribution(result, option)[0]!.value.value).toBe(0.3)
  })
  it.each([stunOption, m2])(
    "does not apply %s to an unstunned target",
    (id) => {
      const input = fresh(null)
      input.damage.stunDamage.isTargetStunned = false
      input.damage.stunDamage.targetBaseStunDamageMultiplier = 1
      input.selections = [selection(id)]
      const result = calculate(input)
      expect(result.nonCritical).toBe(1400)
      expect(contribution(result, id)).toHaveLength(0)
    },
  )
  it("requires the caller to redeclare the state when changing the current enemy", () => {
    const input = fresh(null)
    input.hit.targetId = "entity:enemy2"
    expect(calculate(input).nonCritical).toBe(2100)
    input.selections = [selection(stunOption)]
    expect(calculate(input).nonCritical).toBe(2520)
  })
  it.each(
    [levelOption, stunOption].flatMap((id) =>
      [-1, 0.5, 2, NaN, Infinity].map((layers) => [id, layers] as const),
    ),
  )("rejects %s invalid layers %s", (id, layers) => {
    const input = fresh()
    input.selections = [selection(id, layers)]
    rejected(input, "INVALID_INPUT", "/selections/0/layers")
  })
  it.each([levelOption, stunOption])(
    "rejects duplicate or wrongly bound %s",
    (id) => {
      const input = fresh()
      input.selections = [selection(id), selection(id)]
      rejected(input, "DUPLICATE_ID", "/selections/1")
      input.selections = [selection(id, 1, "binding:missing")]
      rejected(input, "MISSING_REFERENCE", "/selections/0")
      input.selections = [selection(id)]
      input.bindings[0].holderId = "entity:other"
      rejected(input, "CONTEXT_MISMATCH")
    },
  )
})

describe("Roxy actual squad qualification and per-holder level facts", () => {
  it.each([
    ["Attack", "1111"],
    ["Rupture", "1471"],
    ["Armorer", "1611"],
  ])("qualifies through the real %s catalog identity %s", (_name, id) => {
    const input = fresh()
    input.actorSources[2].agentEntityId = id
    input.selections = [selection(levelOption), selection(stunOption)]
    expect(calculate(input).nonCritical).toBeCloseTo(4536, 9)
  })
  it("counts two qualified actors once and allows a nonqualifying Stun teammate to benefit", () => {
    const input = fresh()
    input.world.entities.push({
      ...input.world.entities[4],
      entityId: "entity:qualifier2",
    })
    input.actorSources.push({
      entityId: "entity:qualifier2",
      agentEntityId: "1471",
    })
    input.selections = [
      selection(levelOption),
      selection(stunOption),
      selection(m2),
    ]
    const own = calculate(input)
    expect(own.nonCritical).toBeCloseTo(5292, 9)
    expect(contribution(own, levelOption)).toHaveLength(1)
    input.hit.actorId = "entity:other"
    input.hit.damageItems[0].statSource.entityId = "entity:other"
    const teammate = calculate(input)
    expect(teammate.nonCritical).toBeCloseTo(4998, 9)
    expect(contribution(teammate, levelOption)).toHaveLength(0)
    expect(contribution(teammate, stunOption)).toHaveLength(1)
  })
  it.each([
    "no qualifying profession",
    "other team",
    "enemy",
    "history only",
    "summon",
    "holder alone",
    "null profession",
  ])("excludes %s from the other teammate qualification", (mode) => {
    const input = fresh()
    if (mode === "no qualifying profession" || mode === "holder alone")
      input.actorSources[2].agentEntityId = "1251"
    if (mode === "holder alone")
      input.catalog.entities.find(
        (entry: any) => entry.catalogEntityId === "agents:Roxy",
      ).profession = "强攻"
    if (mode === "other team" || mode === "enemy")
      input.world.entities[4].teamId =
        mode === "enemy" ? "team:enemies" : "team:other"
    if (mode === "history only") {
      input.snapshots = [
        {
          snapshotId: "snapshot:old",
          atSeconds: 0,
          attributes: [],
          world: structuredClone(input.world),
        },
      ]
      input.world.entities.pop()
    }
    if (mode === "summon") {
      input.world.entities[4] = {
        kind: "summon",
        entityId: "entity:qualifier",
        teamId: "team:players",
        ownerId: "entity:roxy",
        summonKind: "test",
        deployed: true,
      }
      input.actorSources.pop()
    }
    if (mode === "null profession")
      input.catalog.entities.find(
        (entry: any) => entry.identity?.entityId === "1111",
      ).profession = null
    input.selections = [selection(levelOption), selection(stunOption)]
    const result = calculate(input)
    expect(result.nonCritical).toBe(2100)
    expect(contribution(result, levelOption)).toHaveLength(0)
    expect(contribution(result, stunOption)).toHaveLength(0)
  })
  it("rejects missing or nonexistent squad identity rather than treating it as a false gate", () => {
    const input = fresh()
    input.selections = [selection(stunOption)]
    input.actorSources.pop()
    rejected(input, "MISSING_FACT", "/actorSources")
    input.actorSources.push({
      entityId: "entity:qualifier",
      agentEntityId: "missing",
    })
    rejected(input, "CONTEXT_MISMATCH", "/actorSources/2")
  })
  it.each([
    "qualification false",
    "ineligible binding",
    "nonbeneficiary hit",
    "when false",
  ])("requires enabled holder level even with %s", (mode) => {
    const input = fresh(null)
    input.selections = [selection(levelOption)]
    if (mode === "qualification false")
      input.actorSources[2].agentEntityId = "1251"
    if (mode === "ineligible binding") input.bindings[0].eligible = false
    if (mode === "nonbeneficiary hit") input.hit.actorId = "entity:other"
    if (mode === "when false")
      rule(input).when = { kind: "constant", value: false }
    rejected(input, "MISSING_FACT", "/actorSources/0/level")
    input.actorSources[0].level = 60
    expect(calculate(input).nonCritical).toBe(2100)
  })
  it.each(
    [null, "60", NaN, Infinity, -Infinity, 0, -1, 1.5, 61].flatMap((level) =>
      [undefined, 0, 1].map(
        (layers) => [String(level), level, layers] as const,
      ),
    ),
  )(
    "rejects explicit level %s with selection %s / %s",
    (_label, level, layers) => {
      const input = fresh()
      input.actorSources[0].level = level
      input.selections =
        layers === undefined ? [] : [selection(levelOption, layers)]
      rejected(input, "INVALID_INPUT", "/actorSources/0/level")
    },
  )
  it("checks the actual level value even when it is not enumerable", () => {
    const input = fresh(null)
    Object.defineProperty(input.actorSources[0], "level", {
      value: 1.5,
      enumerable: false,
    })
    rejected(input, "INVALID_INPUT", "/actorSources/0/level")
  })
  it("does not borrow the hit actor or another Roxy instance's level", () => {
    const input = fresh(1)
    input.world.entities.push({
      ...input.world.entities[0],
      entityId: "entity:roxy2",
    })
    input.actorSources.push({
      entityId: "entity:roxy2",
      agentEntityId: "1621",
      level: 30,
    })
    input.bindings.push({
      ...input.bindings[0],
      bindingId: "binding:roxy2",
      holderId: "entity:roxy2",
    })
    input.selections = [
      selection(levelOption),
      selection(levelOption, 1, "binding:roxy2"),
    ]
    expect(calculate(input).nonCritical).toBeCloseTo(2293.2, 9)
    input.hit.actorId = "entity:roxy2"
    input.hit.damageItems[0].statSource.entityId = "entity:roxy2"
    expect(calculate(input).nonCritical).toBeCloseTo(3024, 9)
    delete input.actorSources[0].level
    rejected(input, "MISSING_FACT", "/actorSources/0/level")
    input.selections = [selection(levelOption, 1, "binding:roxy2")]
    expect(calculate(input).nonCritical).toBeCloseTo(3024, 9)
  })
  it.each([60, 30])(
    "rejects external level override %s even for the same validated value",
    (value) => {
      const input = fresh()
      input.selections = [selection(levelOption)]
      input.inputs = [
        {
          bindingId: "binding:roxy",
          name: levelInput,
          value: { unit: "count", value },
        },
      ]
      rejected(input, "CONTEXT_MISMATCH", "/inputs/0")
    },
  )
  it("retains the low-level explicit-instance and generic count boundary", () => {
    const input = fresh()
    const { skillTargetIds: _targets, ...hit } = input.hit
    const low: StaticDamageInput = {
      definitions,
      bindings: input.bindings,
      world: input.world,
      hit: {
        ...hit,
        damageItems: hit.damageItems.map(
          ({ mode: _mode, role: _role, ...item }: any) => item,
        ),
      },
      damage: input.damage,
      selections: [
        {
          effectId: effectId(levelOption),
          bindingId: "binding:roxy",
          layers: 1,
        },
      ],
      inputs: [
        {
          bindingId: "binding:roxy",
          name: levelInput,
          value: { unit: "count", value: 30 },
        },
      ],
    }
    const result = calculateStaticDamage(low)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.value.nonCritical).toBeCloseTo(3024, 9)
    for (const value of [-1, 1.5, 61]) {
      const generic = calculateStaticDamage({
        ...low,
        inputs: [{ ...low.inputs![0]!, value: { unit: "count", value } }],
      } as StaticDamageInput)
      expect(generic.ok).toBe(true)
    }
    const closed = calculateStaticDamage({
      ...low,
      selections: [{ ...low.selections[0], layers: 0 }],
    } as StaticDamageInput)
    expect(closed.ok).toBe(false)
    if (!closed.ok)
      expect(closed.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "INVALID_INPUT" }),
        ]),
      )
  })
})

describe("holder level bridge definition and derivation boundaries", () => {
  it.each([
    ["Lucy", makeLucyGuardBoarRequest],
    ["Astra Yao", makeAstraYaoM4Request],
  ] as const)(
    "shares optional actor level validation with the %s named catalog entry",
    (_name, make) => {
      const input: any = make(definitions, catalog)
      const baseline = calculateStaticDamageFromCatalog(input)
      expect(baseline.ok, JSON.stringify(baseline)).toBe(true)
      input.actorSources[0].level = 60
      expect(calculateStaticDamageFromCatalog(input)).toEqual(baseline)
      input.actorSources[0].level = 1.5
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: "INVALID_INPUT",
              pointer: "/actorSources/0/level",
            }),
          ]),
        )
    },
  )
  const mutations: readonly [string, (input: any) => void][] = [
    [
      "empty name",
      (input) => {
        variant(input).mechanism = {
          kind: "holder-level",
          holderLevelInputName: "",
        }
      },
    ],
    [
      "no consumed input",
      (input) => {
        variant(input).mechanism = {
          kind: "holder-level",
          holderLevelInputName: "unused",
        }
      },
    ],
    [
      "wrong input unit",
      (input) => {
        rule(input).operation.value.operands[1].operands[1].input.unit = "ratio"
      },
    ],
    [
      "wrong activation",
      (input) => {
        rule(input).activation = { kind: "continuous" }
      },
    ],
    [
      "rule maximum",
      (input) => {
        rule(input).activation.maximumLayers.value = 2
      },
    ],
    [
      "variant maximum",
      (input) => {
        variant(input).maximumLayers = 2
      },
    ],
    [
      "multiple contributions",
      (input) => {
        variant(input).effectIds.push(effectId(stunOption))
      },
    ],
    [
      "no contributions",
      (input) => {
        variant(input).effectIds = []
      },
    ],
    [
      "when-only consumer",
      (input) => {
        rule(input).operation.value = {
          kind: "literal",
          unit: "ratio",
          value: 0.2,
        }
        rule(input).when = {
          kind: "compare-number",
          unit: "count",
          operator: "gte",
          left: { kind: "input", unit: "count", name: levelInput },
          right: { kind: "literal", unit: "count", value: 1 },
        }
      },
    ],
    [
      "nonliteral maximum",
      (input) => {
        rule(input).activation.maximumLayers = {
          kind: "add",
          unit: "count",
          operands: [{ kind: "literal", unit: "count", value: 1 }],
        }
      },
    ],
    [
      "external requirement",
      (input) => {
        variant(input).inputs.push({
          name: levelInput,
          unit: "count",
          description: "conflicting",
        })
      },
    ],
  ]
  it.each(
    mutations.flatMap(([name, mutate]) =>
      [undefined, 0, 1].map((layers) => [name, layers, mutate] as const),
    ),
  )("rejects %s at selection %s", (_name, layers, mutate) => {
    const input = fresh()
    mutate(input)
    input.selections =
      layers === undefined ? [] : [selection(levelOption, layers)]
    rejected(input, "INVALID_DEFINITION", variantPointer(input, "mechanism"))
  })
  it("rejects the removed sibling mechanism fields instead of reading them", () => {
    const input = fresh()
    variant(input).layerCountInputName = levelInput
    rejected(
      input,
      "INVALID_INPUT",
      variantPointer(input, "layerCountInputName"),
    )
  })
  it.each([[], ["强攻", "强攻"], [""]].map((professions) => ({ professions })))(
    "rejects malformed profession OR $professions before selection",
    ({ professions }) => {
      const input = fresh()
      variant(input).applicability.otherTeammateProfessions = professions
      const pointer =
        variantPointer(input, "applicability/otherTeammateProfessions") +
        (professions[0] === "" ? "/0" : "")
      rejected(input, "INVALID_INPUT", pointer)
    },
  )
  function alternate(input: any, kind: "holder" | "layers") {
    const option = structuredClone(
      input.catalog.options.find(
        (entry: any) => entry.optionId === levelOption,
      ),
    )
    option.optionId = "fixture:second-bridge"
    const nextRule = structuredClone(rule(input))
    nextRule.effectId = "agent:1621:fixture:second-bridge"
    option.variants[0].effectIds = [nextRule.effectId]
    if (kind === "layers") {
      option.variants[0].mechanism = {
        kind: "complete-state",
        layerCountInputName: levelInput,
      }
    }
    input.definitions.effects.push(nextRule)
    input.catalog.options.push(option)
    input.selections = [selection(levelOption), selection(option.optionId)]
  }
  it.each([false, true])(
    "reuses an identical holder level across valid options, reversed=%s",
    (reverse) => {
      const input = fresh(30)
      alternate(input, "holder")
      if (reverse) {
        input.selections.reverse()
        input.catalog.options.reverse()
        input.definitions.effects.reverse()
      }
      const result = calculate(input)
      expect(result.nonCritical).toBeCloseTo(3948, 9)
      expect(result.factors.nonCritical.damageBonus).toBeCloseTo(1.88, 12)
    },
  )
  it.each([false, true])(
    "rejects mixed derived sources independently of order, reversed=%s",
    (reverse) => {
      const input = fresh(1)
      alternate(input, "layers")
      if (reverse) input.selections.reverse()
      rejected(input, "CONTEXT_MISMATCH", "/selections/1")
    },
  )
  it("leaves inputs, definitions, catalog and world unchanged", () => {
    const input = fresh()
    input.selections = [selection(levelOption), selection(stunOption)]
    const before = structuredClone(input)
    calculate(input)
    expect(input).toEqual(before)
  })
  it("allows an external input with the same name on another binding", () => {
    const input = fresh()
    input.world.entities.push({
      ...input.world.entities[0],
      entityId: "entity:roxy2",
    })
    input.actorSources.push({ entityId: "entity:roxy2", agentEntityId: "1621" })
    input.bindings.push({
      ...input.bindings[0],
      bindingId: "binding:roxy2",
      holderId: "entity:roxy2",
    })
    input.selections = [selection(levelOption)]
    input.inputs = [
      {
        bindingId: "binding:roxy2",
        name: levelInput,
        value: { unit: "count", value: 30 },
      },
    ]
    expect(calculate(input).nonCritical).toBeCloseTo(3780, 9)
  })
  it("intersects existing beneficiary and profession-count filters with the OR gate", () => {
    const input = fresh()
    input.selections = [selection(stunOption)]
    variant(input, stunOption).applicability.beneficiaryProfession = "击破"
    variant(input, stunOption).applicability.beneficiaryElements = ["wind"]
    variant(input, stunOption).applicability.teamProfession = {
      profession: "强攻",
      counts: [1],
    }
    expect(calculate(input).nonCritical).toBe(2520)
    variant(input, stunOption).applicability.beneficiaryProfession = "命破"
    expect(calculate(input).nonCritical).toBe(2100)
    variant(input, stunOption).applicability.beneficiaryProfession = "击破"
    variant(input, stunOption).applicability.teamProfession.counts = [2]
    expect(calculate(input).nonCritical).toBe(2100)
  })
})

describe("holder level operation consumption follows executed numeric fields", () => {
  function request(level: number | null = 30) {
    const input = fresh(level)
    input.world.entities[0].generalStats.attack.baseValue = 1200
    input.damage.resistance.targetResistance = 0.25
    return input
  }
  const count = () => ({ kind: "input", unit: "count", name: levelInput })
  const literal = (unit: string, value: number) => ({
    kind: "literal",
    unit,
    value,
  })
  const converted = (unit = "ratio") => ({
    kind: "convert",
    unit,
    input: count(),
    rate: literal("multiplier", 0.02),
  })
  function requireParsed(input: any) {
    const result = parseEffectRuleSet(input.definitions)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    return result.value
  }
  const states = [
    { state: "unselected", layers: undefined },
    { state: "zero", layers: 0 },
    { state: "positive", layers: 1 },
  ] as const
  const storageKinds = ["non-enumerable", "inherited"] as const
  function attach(
    object: any,
    key: string,
    value: unknown,
    storage: (typeof storageKinds)[number],
  ) {
    if (storage === "non-enumerable")
      Object.defineProperty(object, key, { value, enumerable: false })
    else Object.setPrototypeOf(object, { [key]: value })
  }
  function selectState(input: any, layers: number | undefined) {
    input.selections =
      layers === undefined ? [] : [selection(levelOption, layers)]
  }

  it("retains independent nonzero base, formal L30 and constant-operation controls", () => {
    const input = request()
    // 1200 × 2 × .75 × 1.5; L30 adds .08 + .012 × 30.
    expect(calculate(input).nonCritical).toBeCloseTo(2700, 9)
    input.selections = [selection(levelOption)]
    expect(calculate(input).nonCritical).toBeCloseTo(3888, 9)
    delete variant(input).mechanism
    rule(input).operation.value = literal("ratio", 0.2)
    requireParsed(input)
    expect(calculate(input).nonCritical).toBeCloseTo(3240, 9)
  })

  it.each(
    ["operation", "literal", "parameter", "stat", "other input"].flatMap(
      (location) =>
        storageKinds.flatMap((storage) =>
          states.map((state) => ({ location, storage, ...state })),
        ),
    ),
  )(
    "rejects $storage bypass on $location at $state",
    ({ location, storage, layers }) => {
      const input = request()
      const operation = rule(input).operation
      operation.value = literal("ratio", 0.2)
      if (location === "parameter") {
        rule(input).parameters.amount = {
          kind: "constant",
          unit: "ratio",
          value: 0.2,
        }
        operation.value = { kind: "parameter", unit: "ratio", name: "amount" }
      } else if (location === "stat") {
        operation.value = {
          kind: "stat",
          unit: "ratio",
          stat: "criticalDamage",
          stage: "current",
          at: "evaluation",
          entity: { role: "holder" },
        }
      } else if (location === "other input") {
        operation.value = { kind: "input", unit: "ratio", name: "other" }
        input.inputs = [
          {
            bindingId: "binding:roxy",
            name: "other",
            value: { unit: "ratio", value: 0.2 },
          },
        ]
      }
      attach(
        location === "operation" ? operation : operation.value,
        "input",
        count(),
        storage,
      )
      selectState(input, layers)
      requireParsed(input)
      rejected(input, "INVALID_DEFINITION", variantPointer(input, "mechanism"))
    },
  )

  it.each(states)(
    "rejects a plain nonconsumer at $state after successful rule parsing",
    ({ layers }) => {
      const input = request()
      rule(input).operation.value = literal("ratio", 0.2)
      selectState(input, layers)
      requireParsed(input)
      rejected(input, "INVALID_DEFINITION", variantPointer(input, "mechanism"))
    },
  )

  it.each(["operation", "literal"])(
    "separately rejects an enumerable unknown field on %s in the parser",
    (location) => {
      const input = request()
      const operation = rule(input).operation
      operation.value = literal("ratio", 0.2)
      const target = location === "operation" ? operation : operation.value
      target.input = count()
      const parsed = parseEffectRuleSet(input.definitions)
      expect(parsed.ok).toBe(false)
      if (parsed.ok) throw new Error("expected parser rejection")
      const index = input.definitions.effects.findIndex(
        (entry: any) => entry.effectId === effectId(levelOption),
      )
      expect(parsed.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_DEFINITION",
          pointer:
            "/effects/" +
            index +
            "/operation/" +
            (location === "literal" ? "value/" : "") +
            "input",
        }),
      )
    },
  )

  function replacement(field: "bonus" | "maximumBonus", level: number | null) {
    const input = request(level)
    rule(input).operation = {
      kind: "stun-damage-replacement",
      bonus: literal("ratio", 0.8),
      maximumBonus: literal("ratio", 2),
      [field]: converted(),
    }
    input.selections = [
      {
        ...selection(levelOption),
        trigger: {
          eventId: "event:entry",
          actorId: "entity:enemy",
          activationSnapshotId: "snapshot:entry",
        },
      },
    ]
    input.atSeconds = 4
    input.snapshots = [
      {
        snapshotId: "snapshot:entry",
        atSeconds: 2,
        attributes: [],
        world: structuredClone(input.world),
      },
    ]
    return input
  }
  it.each(["bonus", "maximumBonus"] as const)(
    "executes the explicit count30 %s positive control",
    (field) => {
      const input = replacement(field, null)
      delete variant(input).mechanism
      variant(input).inputs = [
        {
          name: levelInput,
          unit: "count",
          description: "Explicit count control",
        },
      ]
      input.inputs = [
        {
          bindingId: "binding:roxy",
          name: levelInput,
          value: { unit: "count", value: 30 },
        },
      ]
      requireParsed(input)
      const result = calculate(input)
      // 1200 × 2 × .75 × (1 + min(.6, 2)) or (1 + min(.8, .6)).
      expect(result.nonCritical).toBeCloseTo(2880, 9)
      expect(result.factors.nonCritical.stunDamage).toBeCloseTo(1.6, 12)
    },
  )
  it.each(
    (["bonus", "maximumBonus"] as const).flatMap((field) =>
      states.map((state) => ({ field, ...state })),
    ),
  )(
    "accepts real $field consumption at $state without level for closed selections",
    ({ field, layers }) => {
      const input = replacement(field, layers === 1 ? 30 : null)
      if (layers === undefined) input.selections = []
      else input.selections[0].layers = layers
      requireParsed(input)
      const result = calculate(input)
      expect(result.nonCritical).toBeCloseTo(layers === 1 ? 2880 : 2700, 9)
      expect(result.factors.nonCritical.stunDamage).toBeCloseTo(
        layers === 1 ? 1.6 : 1.5,
        12,
      )
    },
  )

  it.each(
    ["operation value", "conversion input"].flatMap((field) =>
      storageKinds.map((storage) => ({ field, storage })),
    ),
  )(
    "recognizes the $storage $field in definitions and executes its materialized value",
    ({ field, storage }) => {
      const input = request()
      const operation = rule(input).operation
      operation.value = converted()
      const target = field === "operation value" ? operation : operation.value
      const key = field === "operation value" ? "value" : "input"
      const value = target[key]
      delete target[key]
      attach(target, key, value, storage)
      input.selections = [selection(levelOption)]
      expect(Object.hasOwn(target, key)).toBe(storage === "non-enumerable")
      expect(Object.prototype.propertyIsEnumerable.call(target, key)).toBe(
        false,
      )
      expect(target[key]).toBe(value)
      const parsed = requireParsed(input)
      const validated = validateStaticCatalog(input.catalog, parsed)
      expect(validated.ok, JSON.stringify(validated)).toBe(true)
      const materialized = { ...target, [key]: value }
      expect(Object.hasOwn(materialized, key)).toBe(true)
      expect(
        Object.prototype.propertyIsEnumerable.call(materialized, key),
      ).toBe(true)
      expect(materialized[key]).toBe(value)
      if (field === "operation value") rule(input).operation = materialized
      else operation.value = materialized
      expect(calculate(input).nonCritical).toBeCloseTo(4320, 9)
    },
  )

  function nested(unit: string) {
    return {
      kind: "convert",
      unit,
      input: {
        kind: "maximum",
        unit: "count",
        operands: [
          literal("count", 1),
          {
            kind: "minimum",
            unit: "count",
            operands: [literal("count", 60), count()],
          },
        ],
      },
      rate: {
        kind: "multiply",
        unit: "multiplier",
        value: literal("multiplier", 0.01),
        coefficient: {
          kind: "add",
          unit: "ratio",
          operands: [literal("ratio", 1), literal("ratio", 1)],
        },
      },
    }
  }
  it.each([
    { operation: "factor", expected: 4320 },
    { operation: "stat", expected: 4320 },
    { operation: "hit", expected: 3510 },
  ])(
    "executes nested count expressions in the $operation operation",
    ({ operation, expected }) => {
      const input = request()
      rule(input).operation =
        operation === "stat"
          ? {
              kind: "stat-adjustment",
              stat: "attack",
              stage: "final-percentage",
              value: nested("ratio"),
            }
          : operation === "hit"
            ? {
                kind: "hit-adjustment",
                field: "damageMultiplier",
                operator: "add",
                value: nested("multiplier"),
              }
            : {
                kind: "factor-contribution",
                channel: "damage-bonus",
                value: nested("ratio"),
              }
      input.selections = [selection(levelOption)]
      requireParsed(input)
      // At L30 the expression is .6: ATK/bonus ×1.6, or multiplier 2+.6.
      expect(calculate(input).nonCritical).toBeCloseTo(expected, 9)
    },
  )
  it.each(["conversion rate", "multiply coefficient"])(
    "reads level through the %s numeric subtree",
    (location) => {
      const input = request()
      rule(input).operation.value =
        location === "conversion rate"
          ? {
              kind: "convert",
              unit: "ratio",
              input: literal("count", 1),
              rate: converted("multiplier"),
            }
          : {
              kind: "multiply",
              unit: "ratio",
              value: literal("ratio", 1),
              coefficient: converted("multiplier"),
            }
      input.selections = [selection(levelOption)]
      requireParsed(input)
      expect(calculate(input).nonCritical).toBeCloseTo(4320, 9)
    },
  )
  it("retains the existing complete-state layer bridge without requiring holder level", () => {
    const input = request(null)
    variant(input).mechanism = {
      kind: "complete-state",
      layerCountInputName: levelInput,
    }
    variant(input).maximumLayers = 30
    rule(input).operation.value = nested("ratio")
    input.selections = [selection(levelOption, 30)]
    requireParsed(input)
    const result = calculate(input)
    expect(result.nonCritical).toBeCloseTo(4320, 9)
    expect(contribution(result, levelOption)).toHaveLength(1)
  })
})

describe("additional clauses coexist with existing Roxy mechanisms", () => {
  it("combines nonzero energy conversion, M1, M2, M4 and actual M6 owner output", () => {
    const input = fresh()
    input.hit.damageItems[0].damageMultiplier = 42.633
    input.hit.skillTargetIds = [
      "zzz-hp:skill:roxy-requiem-for-the-night-burial",
    ]
    input.damage.damageBonus = [0.3]
    input.inputs = [
      {
        bindingId: "binding:roxy",
        name: "roxy:initial-energy-regen:source",
        value: { unit: "energy-per-second", value: 1.4 },
      },
    ]
    input.selections = [
      levelOption,
      stunOption,
      m2,
      "nanoka:agents:1621:initial-energy-regen-conversion",
      "nanoka:agents:1621:m1-hit-resistance-reduction",
      "nanoka:agents:1621:m1-critical-damage",
      "nanoka:agents:1621:m4-ultimate-damage",
      "nanoka:agents:1621:m6-wind-resistance-ignore",
    ].map((id) => selection(id))
    const result = calculate(input)
    // ATK 1100, impact 178; ×42.633×(1+.3+.8+.2)×1×2.1; CR .25, CD .9.
    expect(result.nonCritical).toBeCloseTo(226509.129, 8)
    expect(result.expected).toBeCloseTo(277473.683025, 8)
    expect(
      result.evaluation.attributes.find(
        (entry) => entry.stat === "attack" && entry.entityId === "entity:roxy",
      )!.value.value,
    ).toBeCloseTo(1100, 10)
    // 合法合成属性探针增加非零 impact 基础项，真实消费另一条转化。
    input.hit.damageItems.push({
      mode: "direct",
      role: "base",
      itemId: "impact-probe",
      stat: "impact",
      statSource: { entityId: "entity:roxy" },
      damageMultiplier: 1,
    })
    const impact = calculate(input)
    expect(
      impact.evaluation.attributes.find(
        (entry) => entry.stat === "impact" && entry.entityId === "entity:roxy",
      )!.value.value,
    ).toBeCloseTo(178, 10)
    expect(impact.nonCritical - result.nonCritical).toBeCloseTo(859.74, 8)
    expect(result.factors.nonCritical.stunDamage).toBeCloseTo(2.1, 12)
    expect(result.factors.nonCritical.resistance).toBe(1)
    expect(
      contribution(result, "nanoka:agents:1621:m6-wind-resistance-ignore")[0]!
        .origin.bindingId,
    ).toBe("binding:roxy")
  })
  it.each([0, 1])(
    "continues rejecting the old wind resource option with layers %s",
    (layers) => {
      const input = fresh()
      input.selections = [
        selection("nanoka:agents:1621:wind-energy-acquisition", layers),
      ]
      rejected(input, "INVALID_INPUT", "/selections/0")
    },
  )
  function veilRequest() {
    const input = fresh(null)
    input.actorSources[2].agentEntityId = "1431"
    input.bindings.push({
      ...input.bindings[0],
      bindingId: "binding:ye",
      holderId: "entity:qualifier",
      sourceEntityId: "1431",
    })
    input.hit.actorId = "entity:qualifier"
    input.hit.damageItems[0].statSource.entityId = "entity:qualifier"
    input.hit.actionId = "action:veil-probe"
    input.selections = [
      selection(stunOption),
      selection(m2),
      {
        ...selection(
          "nanoka:agents:yeshunguang:veil-vulnerability",
          1,
          "binding:ye",
        ),
        trigger: {
          eventId: "event:veil",
          actorId: "entity:enemy",
          activationSnapshotId: "snapshot:veil",
        },
      },
    ]
    input.inputs = [
      {
        bindingId: "binding:ye",
        name: "veilVulnerabilityBonusAtEntry",
        value: { unit: "ratio", value: 0.85 },
      },
    ]
    input.atSeconds = 5
    input.snapshots = [
      {
        snapshotId: "snapshot:veil",
        atSeconds: 2,
        attributes: [],
        world: structuredClone(input.world),
      },
    ]
    return input
  }
  it("replaces both ordinary stun additions under the existing legal veil", () => {
    const input = veilRequest()
    const result = calculate(input)
    expect(result.factors.nonCritical.stunDamage).toBeCloseTo(1.85, 12)
    expect(result.nonCritical).toBeCloseTo(4403, 9)
    expect(contribution(result, stunOption)).toHaveLength(0)
    expect(contribution(result, m2)).toHaveLength(0)
    input.selections.push(selection(levelOption))
    rejected(input, "MISSING_FACT", "/actorSources/0/level")
  })
  it("retains true when and squad identity dependencies despite ordinary-output replacement", () => {
    const input = veilRequest()
    rule(input, stunOption).when = {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: { kind: "input", unit: "count", name: "when-fact" },
      right: { kind: "literal", unit: "count", value: 1 },
    }
    rejected(input, "MISSING_FACT")
    input.inputs.push({
      bindingId: "binding:roxy",
      name: "when-fact",
      value: { unit: "count", value: 1 },
    })
    expect(calculate(input).nonCritical).toBeCloseTo(4403, 9)
    input.actorSources.splice(1, 1)
    rejected(input, "MISSING_FACT", "/actorSources")
  })
})
