import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
  prepareEffects,
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
import source from "../../../data/test/fixtures/roxy-core-wind-source.json" with { type: "json" }
import {
  makeRoxyCoreWindRequest,
  roxyCoreWindOptions as options,
  roxyCoreExternalCriticalRate as inputName,
} from "../../../data/test/fixtures/roxy-core-wind-consumer.ts"

const parsed = parseEffectRuleSet(rawDefinitions)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = rawCatalog as unknown as StaticEffectCatalog
const fresh = (armorer = false, sourceCR = 0.5, rank = 7): any =>
  structuredClone(
    makeRoxyCoreWindRequest(definitions, catalog, armorer, sourceCR, rank as 7),
  )
const calculate = (input: StaticCatalogDamageInput): StaticDamageResult => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  expect(result.value.nonCritical).toBeGreaterThan(0)
  return result.value
}
const reject = (input: any, code: string) => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (!result.ok)
    expect(result.issues.some((issue) => issue.code === code)).toBe(true)
}
const effectId = (id: string) =>
  id.replace("nanoka:agents:1621:", "agent:1621:nanoka:")
const own = (result: StaticDamageResult) =>
  result.evaluation.contributions.filter((entry) =>
    options.some((id) => effectId(id) === entry.origin.effectId),
  )

describe("Roxy one active attribute state on wind damage", () => {
  it("validates definitions, preparation, catalog and nonzero unselected baseline", () => {
    const request = fresh()
    expect(request.inputs[0].name).toBe(inputName)
    expect(prepareEffects(definitions, request.bindings).ok).toBe(true)
    expect(validateStaticCatalog(catalog, definitions).ok).toBe(true)
    request.selections = []
    request.inputs = []
    const result = calculate(request)
    expect(result.nonCritical).toBe(2100)
    expect(result.critical).toBe(3150)
    expect(result.expected).toBe(2362.5)
    request.selections = [
      { optionId: "missing:option", bindingId: "binding:roxy", layers: 1 },
    ]
    reject(request, "MISSING_REFERENCE")
  })
  const cases = source.independentExpectations.flatMap((row) =>
    [false, true].flatMap((armorer) => {
      const coefficient = armorer ? 0.2 : 0.4
      const cap = armorer ? row.sharpCriticalDamageCap : row.criticalDamageCap
      return [
        -0.5,
        0,
        0.123,
        0.5,
        cap / coefficient,
        cap / coefficient + 0.031,
        1.4,
      ].map((sourceCR) => ({
        rank: row.coreSkillLevel,
        armorer,
        sourceCR,
        coefficient,
        cap,
      }))
    }),
  )
  it.each(cases)(
    "core $rank armorer=$armorer externalCR=$sourceCR cap=$cap",
    ({ rank, armorer, sourceCR, coefficient, cap }) => {
      const result = calculate(fresh(armorer, sourceCR, rank))
      const base = armorer ? 3570 : 2100
      const probability = armorer ? 0.35 : 0.25
      const addition = Math.min(cap, coefficient * Math.max(0, sourceCR))
      expect(result.nonCritical).toBeCloseTo(base, 9)
      expect(result.critical).toBeCloseTo(base * (1.5 + addition), 9)
      expect(result.expected).toBeCloseTo(
        base * (1 + probability * (0.5 + addition)),
        9,
      )
      expect(own(result)).toHaveLength(1)
      expect(own(result)[0]!.address).toMatchObject({
        stat: armorer ? "sharpCriticalDamage" : "criticalDamage",
        entityId: armorer ? "entity:other" : "entity:roxy",
      })
      expect(own(result)[0]!.value.value).toBeCloseTo(addition, 12)
    },
  )
  it.each([0, 0.25, 1])(
    "separates external .5 from current hit CR %s",
    (current) => {
      const request = fresh()
      request.world.entities[0].directStats.criticalRate.baseValue = current
      const result = calculate(request)
      expect(result.criticalRate).toBe(current)
      expect(result.expected).toBeCloseTo(2100 * (1 + current * 0.7), 9)
      expect(own(result)[0]!.value.value).toBe(0.2)
    },
  )
  it.each([0, 0.35, 1])(
    "retains sharp critical probability %s without changing external input",
    (probability) => {
      const request = fresh(true)
      request.world.entities[1].directStats.criticalRate.baseValue = probability
      const result = calculate(request)
      expect(result.nonCritical).toBe(3570)
      expect(result.expected).toBeCloseTo(3570 * (1 + probability * 0.6), 9)
    },
  )
  it.each([false, true])(
    "keeps missing/closed/active states separate for armorer=%s",
    (armorer) => {
      const request = fresh(armorer)
      const closed = request.selections.map((s: any) => ({ ...s, layers: 0 }))
      for (const selections of [[], closed]) {
        const result = calculate({ ...request, selections, inputs: [] })
        expect(own(result)).toEqual([])
        expect(result.critical).toBeCloseTo((armorer ? 3570 : 2100) * 1.5, 9)
      }
      reject({ ...request, inputs: [] }, "MISSING_FACT")
    },
  )
  it.each([NaN, Infinity, -Infinity])(
    "rejects nonfinite source CR %s",
    (value) => {
      const request = fresh()
      request.inputs[0].value.value = value
      reject(request, "INVALID_INPUT")
    },
  )
  it.each([-1, 0.5, 2, Infinity])(
    "rejects catalog state layers %s",
    (layers) => {
      const request = fresh()
      request.selections[0].layers = layers
      reject(request, "INVALID_INPUT")
    },
  )
  it.each([
    "duplicate selection",
    "duplicate input",
    "wrong binding",
    "wrong unit",
  ])("rejects %s", (mode) => {
    const request = fresh()
    if (mode === "duplicate selection")
      request.selections.push(request.selections[0])
    if (mode === "duplicate input") request.inputs.push(request.inputs[0])
    if (mode === "wrong binding")
      request.inputs[0].bindingId = "binding:missing"
    if (mode === "wrong unit") request.inputs[0].value.unit = "count"
    const result = calculateStaticDamageFromCatalog(request)
    expect(result.ok).toBe(false)
  })
  it.each(["fire", "physical", "electric"])(
    "does not affect non-wind hit %s",
    (element) => {
      const request = fresh()
      request.hit.element = element
      const result = calculate(request)
      expect(own(result)).toEqual([])
      expect(result.expected).toBe(2362.5)
    },
  )
  it("applies to a real electric non-armorer teammate dealing wind, without PR24 qualification", () => {
    const request = fresh()
    request.hit.actorId = "entity:other"
    request.hit.damageItems[0].statSource.entityId = "entity:other"
    const result = calculate(request)
    // Qingyi is Stun/electric, CD .7 and CR .35; current hit is wind.
    expect(result.expected).toBeCloseTo(3570 * (1 + 0.35 * 0.9), 9)
    expect(own(result)[0]!.origin.beneficiaryId).toBe("entity:other")
    request.world.entities[1].teamId = "team:elsewhere"
    expect(own(calculate(request))).toEqual([])
  })
  it.each([false, true])(
    "excludes the other profession before formula demand armorer=%s",
    (armorer) => {
      const request = fresh(armorer)
      const wrong = effectId(options[armorer ? 0 : 1])
      // The same legal applicability probe makes an otherwise unconsumed CD visible.
      request.definitions.effects.find(
        (r: any) => r.effectId === wrong,
      ).operation = {
        kind: "factor-contribution",
        channel: "damage-bonus",
        value: { kind: "literal", unit: "ratio", value: 0.2 },
      }
      const result = calculate(request)
      expect(result.factors.nonCritical.damageBonus).toBe(1)
      expect(
        result.evaluation.contributions.some(
          (row) => row.origin.effectId === wrong,
        ),
      ).toBe(false)
    },
  )
  it.each(["default", "entity", "snapshot"])(
    "preserves legal %s CD source and its existing hit scope",
    (mode) => {
      const request = fresh()
      if (mode === "entity")
        request.hit.attributeSources = {
          criticalDamage: { entityId: "entity:other" },
        }
      if (mode === "snapshot") {
        request.snapshots = [
          {
            snapshotId: "snapshot:cd",
            atSeconds: 0,
            world: request.world,
            attributes: [
              {
                entityId: "entity:roxy",
                stat: "criticalDamage",
                stage: "current",
                value: { unit: "ratio", value: 0.9 },
              },
            ],
          },
        ]
        request.hit.attributeSources = {
          criticalDamage: {
            entityId: "entity:roxy",
            snapshotId: "snapshot:cd",
          },
        }
      }
      const result = calculate(request)
      expect(result.expected).toBeCloseTo(
        2100 *
          (1 +
            0.25 * (mode === "default" ? 0.7 : mode === "entity" ? 0.7 : 0.9)),
        9,
      )
    },
  )
  it("keeps independent ordinary and sharp CD additions additive", () => {
    for (const armorer of [false, true]) {
      const request = fresh(armorer)
      request.world.entities[armorer ? 1 : 0].directStats[
        armorer ? "sharpCriticalDamage" : "criticalDamage"
      ].additions = [0.3]
      const result = calculate(request)
      expect(result.critical).toBeCloseTo(
        (armorer ? 3570 : 2100) * (armorer ? 1.9 : 2),
        9,
      )
    }
  })
  it.each([0, 1, 2])(
    "low-level supplied keeps positive layer contract %s",
    (layers) => {
      const request = fresh()
      const { skillTargetIds: _targets, ...hit } = request.hit
      const result = calculateStaticDamage({
        definitions,
        bindings: request.bindings,
        inputs: request.inputs,
        world: request.world,
        hit: {
          ...hit,
          damageItems: request.hit.damageItems.map(
            ({ mode: _mode, role: _role, ...item }: any) => item,
          ),
        },
        damage: request.damage,
        selections: [
          { effectId: effectId(options[0]), bindingId: "binding:roxy", layers },
        ],
      } as StaticDamageInput)
      expect(result.ok, JSON.stringify(result)).toBe(layers === 1)
      if (result.ok) expect(result.value.expected).toBeCloseTo(2467.5, 9)
    },
  )
})

describe("catalog profession exclusion definition and intersection", () => {
  const variant = (request: any) =>
    request.catalog.options.find((row: any) => row.optionId === options[0])
      .variants[0]
  it.each(
    [undefined, 0, 1].flatMap((layers) =>
      [null, "", 4, [], {}, true, "same"].map((value) => ({ layers, value })),
    ),
  )(
    "rejects exclusion $value even with selection layers $layers",
    ({ layers, value }) => {
      const request = fresh()
      request.selections =
        layers === undefined ? [] : [{ ...request.selections[0], layers }]
      variant(request).applicability.excludedBeneficiaryProfession =
        value === "same" ? "锋御" : value
      if (value === "same")
        variant(request).applicability.beneficiaryProfession = "锋御"
      const result = calculateStaticDamageFromCatalog(request)
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: value === "same" ? "INVALID_DEFINITION" : "INVALID_INPUT",
            pointer: `/catalog/options/${request.catalog.options.findIndex((row: any) => row.optionId === options[0])}/variants/0/applicability/excludedBeneficiaryProfession`,
          }),
        )
    },
  )
  it.each(["击破", "强攻"])(
    "intersects included profession %s with excluded Armorer",
    (profession) => {
      const request = fresh()
      variant(request).applicability.beneficiaryProfession = profession
      expect(own(calculate(request))).toHaveLength(
        profession === "击破" ? 1 : 0,
      )
    },
  )
  it("keeps omitted exclusion semantics and rejects unknown fields", () => {
    const request = fresh(true)
    delete variant(request).applicability.excludedBeneficiaryProfession
    const rule = request.definitions.effects.find(
      (r: any) => r.effectId === effectId(options[0]),
    )
    rule.operation = {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "literal", unit: "ratio", value: 0.2 },
    }
    expect(calculate(request).factors.nonCritical.damageBonus).toBe(1.2)
    variant(request).applicability.excludedBeneficiaryProfessions = ["锋御"]
    reject(request, "INVALID_INPUT")
  })
  it("does not treat unknown profession as known non-Armorer", () => {
    const request = fresh()
    request.catalog.entities.find(
      (row: any) => row.catalogEntityId === "nanoka:agents:1621",
    ).profession = null
    expect(own(calculate(request))).toHaveLength(0)
  })
  it.each(["wind", "fire"])(
    "retains existing beneficiary element intersection %s",
    (element) => {
      const request = fresh()
      variant(request).applicability.beneficiaryElements = [element]
      expect(own(calculate(request))).toHaveLength(element === "wind" ? 1 : 0)
    },
  )
})

describe("one effective Roxy core source per consumed output", () => {
  const two = (armorer = false) => {
    const request = fresh(armorer)
    request.world.entities.push({
      ...structuredClone(request.world.entities[0]),
      entityId: "entity:roxy2",
    })
    request.actorSources.push({
      entityId: "entity:roxy2",
      agentEntityId: "1621",
    })
    request.bindings.push({
      ...request.bindings[0],
      bindingId: "binding:roxy2",
      holderId: "entity:roxy2",
    })
    request.inputs.push({
      ...structuredClone(request.inputs[0]),
      bindingId: "binding:roxy2",
      value: { unit: "ratio", value: 0.9 },
    })
    request.selections.push(
      ...request.selections.map((s: any) => ({
        ...s,
        bindingId: "binding:roxy2",
      })),
    )
    return request
  }
  it.each(
    [false, true].flatMap((armorer) =>
      [0, 0.5, 0.9].map((sourceCR) => ({ armorer, sourceCR })),
    ),
  )(
    "rejects active same-output sources armorer=$armorer value=$sourceCR",
    ({ armorer, sourceCR }) => {
      const request = two(armorer)
      request.inputs.forEach((input: any) => {
        input.value.value = sourceCR
      })
      reject(request, "UNIQUENESS_CONFLICT")
    },
  )
  it.each(
    [false, true].flatMap((armorer) =>
      ["non-wind", "ineligible", "other-team", "closed", "opposite-branch"].map(
        (mode) => ({ armorer, mode }),
      ),
    ),
  )("isolates $mode sources for armorer=$armorer", ({ armorer, mode }) => {
    const request = two(armorer)
    if (mode === "non-wind") request.hit.element = "fire"
    if (mode === "ineligible") request.bindings[1].eligible = false
    if (mode === "other-team")
      request.world.entities.at(-1).teamId = "team:elsewhere"
    if (mode === "closed")
      request.selections.slice(2).forEach((s: any) => {
        s.layers = 0
      })
    if (mode === "opposite-branch")
      request.selections = [
        request.selections[armorer ? 1 : 0],
        request.selections[armorer ? 2 : 3],
      ]
    const result = calculate(request)
    expect(own(result)).toHaveLength(mode === "non-wind" ? 0 : 1)
    expect(result.critical).toBeCloseTo(
      (armorer ? 3570 : 2100) *
        (mode === "non-wind" ? 1.5 : armorer ? 1.6 : 1.7),
      9,
    )
  })
  it.each([false, true])(
    "does not conflict when only both non-applicable branches are selected, armorer=%s",
    (armorer) => {
      const request = two(armorer)
      request.selections = request.selections.filter(
        (s: any) => s.optionId === options[armorer ? 0 : 1],
      )
      expect(own(calculate(request))).toEqual([])
    },
  )
  it.each(
    [false, true].flatMap((armorer) =>
      [false, true].map((reverse) => ({ armorer, reverse })),
    ),
  )(
    "keeps holder CR bound under reorder=$reverse armorer=$armorer",
    ({ armorer, reverse }) => {
      const request = two(armorer)
      request.selections = request.selections.filter(
        (s: any) => s.bindingId === "binding:roxy2",
      )
      if (reverse) {
        request.bindings.reverse()
        request.inputs.reverse()
        request.actorSources.reverse()
        request.selections.reverse()
      }
      const result = calculate(request)
      expect(own(result)[0]!.origin.bindingId).toBe("binding:roxy2")
      expect(own(result)[0]!.value.value).toBeCloseTo(armorer ? 0.18 : 0.36, 12)
      request.inputs = request.inputs.filter(
        (i: any) => i.bindingId === "binding:roxy",
      )
      reject(request, "MISSING_FACT")
    },
  )
  it.each(["fire", "wind"])(
    "keeps selected input required for %s even on an inapplicable branch",
    (element) => {
      const request = fresh()
      request.hit.element = element
      request.selections = [request.selections[1]]
      request.inputs = []
      reject(request, "MISSING_FACT")
    },
  )
  it.each([false, true])(
    "keeps independent %s CD rule additions outside PR26 uniqueness",
    (armorer) => {
      const request = fresh(armorer)
      const rule = structuredClone(
        request.definitions.effects.find(
          (r: any) => r.effectId === effectId(options[armorer ? 1 : 0]),
        ),
      )
      rule.effectId = "agent:1621:fixture:independent-cd"
      delete rule.uniqueness
      rule.operation.value = { kind: "literal", unit: "ratio", value: 0.3 }
      request.definitions.effects.push(rule)
      const option = structuredClone(
        request.catalog.options.find(
          (o: any) => o.optionId === options[armorer ? 1 : 0],
        ),
      )
      option.optionId = "fixture:independent-cd"
      option.variants[0].effectIds = [rule.effectId]
      request.catalog.options.push(option)
      request.selections.push({
        optionId: option.optionId,
        bindingId: "binding:roxy",
        layers: 1,
      })
      const result = calculate(request)
      expect(result.critical).toBeCloseTo(
        (armorer ? 3570 : 2100) * (armorer ? 1.9 : 2),
        9,
      )
    },
  )
})

describe("Roxy core wind composition preserves existing mechanisms", () => {
  it.each([
    {
      name: "ultimate",
      action: "0013",
      category: "ultimate",
      target: "roxy-requiem-for-the-night-burial",
      multiplier: 42.633,
      nonCritical: 226509.129,
      expected: 288799.139475,
    },
    {
      name: "M6 giant windstorm",
      action: "0024",
      category: "special",
      target: "roxy-giant-windstorm",
      multiplier: 4.174,
      nonCritical: 50620.185,
      expected: 64540.735875,
    },
  ])("combines core energy, M1/M2/M4/M6 and PR24 on $name", (row) => {
    const request = fresh()
    request.world.entities.push({
      ...structuredClone(request.world.entities[1]),
      entityId: "entity:qualifier",
    })
    request.actorSources.push({
      entityId: "entity:qualifier",
      agentEntityId: "1111",
    })
    request.actorSources[0].level = 60
    request.hit.actionId = `action:agent:1621:action:${row.action}`
    request.hit.skillCategory = row.category
    request.hit.skillTargetIds = [`zzz-hp:skill:${row.target}`]
    request.hit.damageItems[0].itemId = `action:agent:1621:action:${row.action}:base`
    request.hit.damageItems[0].damageMultiplier = row.multiplier
    request.damage.damageBonus = [0.3]
    request.inputs.push({
      bindingId: "binding:roxy",
      name: "roxy:initial-energy-regen:source",
      value: { unit: "energy-per-second", value: 1.4 },
    })
    request.selections.push(
      ...[
        "initial-energy-regen-conversion",
        "m1-hit-resistance-reduction",
        "m1-critical-damage",
        "m2-stun-damage",
        "m4-ultimate-damage",
        "m6-wind-resistance-ignore",
        "additional-level-damage",
        "additional-hit-stun-damage",
        ...(row.action === "0024" ? ["m6-giant-windstorm"] : []),
      ].map((slug) => ({
        optionId: `nanoka:agents:1621:${slug}`,
        bindingId: "binding:roxy",
        layers: 1,
      })),
    )
    const result = calculate(request)
    expect(result.nonCritical).toBeCloseTo(row.nonCritical, 8)
    expect(result.expected).toBeCloseTo(row.expected, 8)
    expect(result.factors.nonCritical.stunDamage).toBeCloseTo(2.1, 12)
    expect(result.factors.nonCritical.resistance).toBe(1)
    expect(own(result)).toHaveLength(1)
  })
  it("does not grant critical ability to an ordinary wind anomaly", () => {
    const request = fresh()
    request.damage = {
      ...request.damage,
      kind: "anomaly",
      anomalySource: { entityId: "entity:roxy", level: 60 },
      anomalyDamageBonus: [],
      refringe: { mode: "settled", multiplier: 1 },
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
    }
    const base = calculate({ ...request, selections: [] })
    const result = calculate(request)
    expect(result.nonCritical).toBe(base.nonCritical)
    expect(result.expected).toBe(base.expected)
    expect(result.critical).toBe(base.critical)
    expect(own(result)).toHaveLength(0)
  })
})
