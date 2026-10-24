import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  ContributionRule,
  EffectRule,
  Result,
  StaticCatalogDamageInput,
  StaticCatalogVariant,
} from "../../src/effects/index.ts"
import { always, inputFor, literal, rule } from "./static-fixtures.ts"
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
const trigger = {
  eventId: "event:entry",
  actorId: "entity:enemy",
  activationSnapshotId: "snapshot:entry",
} as const
const ordinary = rule("ordinary", {
  kind: "factor-contribution",
  channel: "stun-damage-adjustment",
  value: { kind: "input", unit: "multiplier", name: "discarded" },
})
const veil = rule("veil", {
  kind: "stun-damage-replacement",
  bonus: { kind: "input", unit: "ratio", name: "entryBonus" },
  maximumBonus: literal("ratio", 1.1),
})
const retained = rule("retained", {
  kind: "factor-contribution",
  channel: "damage-bonus",
  value: { kind: "input", unit: "ratio", name: "retained" },
})
function fixture(): Mutable<StaticCatalogDamageInput> {
  const base = inputFor([ordinary, veil, retained])
  if (base.damage.kind !== "regular") throw new Error("fixture")
  const effects = base.definitions.effects.map((r) => ({
    ...r,
    source: {
      ...r.source,
      identity: { kind: "agent" as const, entityId: "1431" },
    },
  }))
  const catalog = {
    schemaVersion: 2 as const,
    ruleSetId: base.definitions.ruleSetId,
    revision: base.definitions.revision,
    source: { repository: "test", commit: "1", files: [] },
    entities: [
      {
        catalogEntityId: "test:ye",
        upstreamId: "yeshunguang",
        name: "Ye",
        identity: { kind: "agent" as const, entityId: "1431" },
        status: "mapped" as const,
        profession: "强攻",
        element: "physical" as const,
      },
    ],
    skillTargets: [],
    differences: [],
    options: effects.map((r, index) => ({
      optionId: `option:${index}`,
      catalogEntityId: "test:ye",
      name: String(index),
      conditionDescription: "caller declared",
      target: "self" as const,
      variants: [
        {
          configuration: {},
          status: "converted" as const,
          references: r.source.references,
          effectIds: [r.effectId],
          maximumLayers: 1,
          inputs: [
            {
              name: ["discarded", "entryBonus", "retained"][index]!,
              unit: index === 0 ? ("multiplier" as const) : ("ratio" as const),
              description: "required",
            },
          ],
          applicability: {},
          differences: [],
        },
      ] as [StaticCatalogVariant],
    })),
  }
  const input: StaticCatalogDamageInput = {
    ...base,
    definitions: { ...base.definitions, effects },
    catalog,
    bindings: [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: "1431",
        eligible: true,
        configuration: { coreSkillLevel: 7, mindscapeRank: 0 },
      },
    ],
    actorSources: [{ entityId: "entity:attacker", agentEntityId: "1431" }],
    selections: [
      { optionId: "option:0", bindingId: "binding:static", layers: 1 },
      { optionId: "option:1", bindingId: "binding:static", layers: 1, trigger },
    ],
    hit: {
      ...base.hit,
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "attack",
          stat: "attack",
          damageMultiplier: 2,
          statSource: { entityId: "entity:attacker" },
        },
      ],
    },
    damage: { ...base.damage, kind: "regular" },
    atSeconds: 5,
    snapshots: [
      {
        snapshotId: trigger.activationSnapshotId,
        atSeconds: 2,
        attributes: [],
        world: base.world,
      },
    ],
    inputs: [
      {
        bindingId: "binding:static",
        name: "entryBonus",
        value: { unit: "ratio", value: 0.85 },
      },
    ],
  }
  return structuredClone(input) as Mutable<StaticCatalogDamageInput>
}
function ok<T>(r: Result<T>): T {
  expect(r.ok, JSON.stringify(r)).toBe(true)
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r.value
}
function missing(i: StaticCatalogDamageInput) {
  const r = calculateStaticDamageFromCatalog(i)
  expect(r.ok, JSON.stringify(r)).toBe(false)
  if (!r.ok) expect(r.issues.map((x) => x.code)).toContain("MISSING_FACT")
}
const first = (i: Mutable<StaticCatalogDamageInput>) =>
  i.definitions.effects[0]! as Mutable<ContributionRule>

function modifiedOrdinaryFixture(
  field: "output" | "parameter",
  placement: "same option" | "separate option",
): Mutable<StaticCatalogDamageInput> {
  const i = fixture(),
    target = first(i),
    ordinaryOption = i.catalog.options[0]!
  target.operation = {
    kind: "factor-contribution",
    channel: "stun-damage-adjustment",
    value:
      field === "output"
        ? literal("multiplier", 0.25)
        : { kind: "parameter", unit: "multiplier", name: "amount" },
  }
  if (field === "parameter") {
    target.parameters = {
      amount: { kind: "constant", unit: "multiplier", value: 0.4 },
    }
    if (i.damage.kind !== "regular") throw new Error("fixture")
    i.damage.stunDamage = {
      isTargetStunned: true,
      targetBaseStunDamageMultiplier: 1.5,
      targetStunDamageMultiplierAdjustments: [0.1],
    }
  }
  ordinaryOption.variants[0].inputs = []
  const modification: EffectRule = {
    kind: "modification",
    effectId: "environment:static:discarded-modifier",
    source: target.source,
    config: always,
    parameters: {},
    phase: "contribution",
    target: { kind: "effect", effectId: target.effectId },
    when: always,
    modifications: [
      {
        ...(field === "output"
          ? { field: "output" as const }
          : { field: "parameter" as const, name: "amount" }),
        unit: "multiplier",
        change: {
          operator: "add",
          value: {
            kind: "input",
            unit: "multiplier",
            name: "discardedModification",
          },
        },
      },
    ],
  }
  i.definitions.effects.push(modification as Mutable<EffectRule>)
  const modifierOption =
    placement === "same option"
      ? ordinaryOption
      : {
          ...structuredClone(ordinaryOption),
          optionId: "option:modifier",
          name: "ordinary output modifier",
        }
  if (placement === "separate option") {
    modifierOption.variants[0].effectIds = []
    i.catalog.options.push(modifierOption)
    i.selections.push({
      optionId: modifierOption.optionId,
      bindingId: "binding:static",
      layers: 1,
    })
  }
  modifierOption.variants[0].effectIds.push(modification.effectId)
  modifierOption.variants[0].inputs.push({
    name: "discardedModification",
    unit: "multiplier",
    description: "operand used only by the ordinary output modifier",
  })
  return i
}

function provideModifierInput(
  i: Mutable<StaticCatalogDamageInput>,
  field: "output" | "parameter",
) {
  i.inputs!.push({
    bindingId: "binding:static",
    name: "discardedModification",
    value: { unit: "multiplier", value: field === "output" ? 0.4 : 0.2 },
  })
}

describe("catalog defers only proven discarded ordinary-output requirements", () => {
  it("consumes real entry context and exempts a missing pure output requirement", () => {
    const i = fixture()
    const result = ok(calculateStaticDamageFromCatalog(i))
    expect(result.factors.nonCritical["stunDamage"]).toBe(1.85)
    expect(
      result.evaluation.contributions.map((c) => c.origin.effectId),
    ).toEqual([veil.effectId])
  })
  it.each([
    "zero",
    "absent",
    "false replacement when",
    "different beneficiary",
  ])("does not exempt if replacement is %s", (off) => {
    const i = fixture()
    if (off === "zero") i.selections[1]!.layers = 0
    if (off === "absent") i.selections.pop()
    const v = i.definitions.effects[1]! as Mutable<ContributionRule>
    if (off === "false replacement when")
      v.when = { kind: "constant", value: false }
    if (off === "different beneficiary")
      v.beneficiary = { kind: "team-except-holder" }
    missing(i)
  })
  it("keeps a missing input also read by the ordinary when", () => {
    const i = fixture()
    first(i).when = {
      kind: "compare-number",
      unit: "multiplier",
      operator: "gt",
      left: { kind: "input", unit: "multiplier", name: "discarded" },
      right: literal("multiplier", 0),
    }
    missing(i)
  })
  it("requires a declared premise not proved to serve any discarded output", () => {
    const i = fixture()
    i.catalog.options[0]!.variants[0].inputs.push({
      name: "independent-premise",
      unit: "ratio",
      description: "independent caller premise",
    })
    missing(i)
  })
  it("does not waive a false ordinary rule's independently declared requirement", () => {
    const i = fixture()
    first(i).when = { kind: "constant", value: false }
    missing(i)
  })
  it("allows a mixed option's missing discarded dependency while preserving its retained dependency", () => {
    const i = fixture(),
      variant = i.catalog.options[0]!.variants[0]
    variant.effectIds.push(retained.effectId)
    variant.inputs.push({
      name: "retained",
      unit: "ratio",
      description: "retained channel",
    })
    missing(i)
    i.inputs!.push({
      bindingId: "binding:static",
      name: "retained",
      value: { unit: "ratio", value: 0.3 },
    })
    const r = ok(calculateStaticDamageFromCatalog(i))
    expect(r.factors.nonCritical["stunDamage"]).toBe(1.85)
    expect(r.factors.nonCritical["damageBonus"]).toBe(1.3)
  })
  it("keeps same-name requirements in another channel or an independent option", () => {
    const i = fixture()
    const other = i.definitions.effects[2]! as Mutable<ContributionRule>
    other.operation = {
      kind: "factor-contribution",
      channel: "base-multiplier-addition",
      value: { kind: "input", unit: "multiplier", name: "discarded" },
    }
    i.catalog.options[2]!.variants[0].inputs = [
      { name: "discarded", unit: "multiplier", description: "not discarded" },
    ]
    i.selections.push({
      optionId: "option:2",
      bindingId: "binding:static",
      layers: 1,
    })
    missing(i)
    other.operation = {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: literal("ratio", 0.2),
    }
    missing(i)
  })
  it("also defers inputs used solely by a discarded contribution-phase output modification", () => {
    const i = fixture()
    const o = first(i)
    const mod: EffectRule = {
      kind: "modification",
      effectId: "environment:static:mod",
      source: o.source,
      config: always,
      parameters: {},
      phase: "contribution",
      target: { kind: "effect", effectId: o.effectId },
      when: always,
      modifications: [
        {
          field: "output",
          unit: "multiplier",
          change: {
            operator: "add",
            value: { kind: "input", unit: "multiplier", name: "discardedMod" },
          },
        },
      ],
    }
    i.definitions.effects.push(mod as Mutable<EffectRule>)
    i.catalog.options[0]!.variants[0].effectIds.push(mod.effectId)
    i.catalog.options[0]!.variants[0].inputs.push({
      name: "discardedMod",
      unit: "multiplier",
      description: "discarded modification",
    })
    expect(
      ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical["stunDamage"],
    ).toBe(1.85)
  })
  it.each([Infinity, NaN, "wrong unit", "invalid structure"])(
    "never washes away a provided invalid discarded input: %s",
    (value) => {
      const i = fixture()
      i.inputs!.push({
        bindingId: "binding:static",
        name: "discarded",
        value: {
          unit: value === "wrong unit" ? "ratio" : "multiplier",
          value: typeof value === "number" ? value : 1,
          ...(value === "invalid structure" ? { extra: 1 } : {}),
        },
      })
      const r = calculateStaticDamageFromCatalog(i)
      expect(r.ok, JSON.stringify(r)).toBe(false)
    },
  )
})

describe.each(["output", "parameter"] as const)(
  "discarded contribution/%s modification dependencies",
  (field) => {
    it.each([
      ["same option", false, false],
      ["separate option", false, false],
      ["separate option", true, false],
      ["separate option", false, true],
      ["separate option", true, true],
    ] as const)(
      "omits only the discarded operand in %s, reversed definitions %s / selections %s",
      (placement, reverseDefinitions, reverseSelections) => {
        const i = modifiedOrdinaryFixture(field, placement)
        if (reverseDefinitions) i.definitions.effects.reverse()
        if (reverseSelections) i.selections.reverse()
        ok(parseEffectRuleSet(i.definitions))
        const result = ok(calculateStaticDamageFromCatalog(i))
        expect(result.factors.nonCritical["stunDamage"]).toBe(1.85)
        expect(result.evaluation.contributions.map((c) => c.origin)).toEqual([
          expect.objectContaining({
            effectId: veil.effectId,
            bindingId: "binding:static",
          }),
        ])
        expect(
          result.evaluation.contributions.flatMap(
            (c) => c.appliedModifications,
          ),
        ).toEqual([])
      },
    )

    it.each(["same option", "separate option"] as const)(
      "preserves supplied operands and real modification attribution in %s",
      (placement) => {
        const i = modifiedOrdinaryFixture(field, placement)
        provideModifierInput(i, field)
        expect(
          ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
            "stunDamage"
          ],
        ).toBe(1.85)
        i.selections[1]!.layers = 0
        const ordinaryResult = ok(calculateStaticDamageFromCatalog(i))
        expect(ordinaryResult.factors.nonCritical["stunDamage"]).toBeCloseTo(
          field === "output" ? 1.65 : 2.2,
          12,
        )
        expect(ordinaryResult.evaluation.contributions).toEqual([
          expect.objectContaining({
            origin: expect.objectContaining({
              effectId: ordinary.effectId,
              bindingId: "binding:static",
            }),
            appliedModifications: ["environment:static:discarded-modifier"],
          }),
        ])
      },
    )

    it.each(["zero", "absent", "false when"])(
      "requires the operand when replacement is %s",
      (off) => {
        const i = modifiedOrdinaryFixture(field, "separate option")
        if (off === "zero") i.selections[1]!.layers = 0
        if (off === "absent") i.selections.splice(1, 1)
        if (off === "false when")
          (i.definitions.effects[1]! as Mutable<ContributionRule>).when = {
            kind: "constant",
            value: false,
          }
        missing(i)
        provideModifierInput(i, field)
        expect(
          ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
            "stunDamage"
          ],
        ).toBeCloseTo(field === "output" ? 1.65 : 2.2, 12)
      },
    )

    it.each(["unselected", "zero layers", "false when"])(
      "keeps the requirement when the defined target is %s",
      (inactive) => {
        const i = modifiedOrdinaryFixture(field, "separate option")
        if (inactive === "unselected") i.selections.shift()
        if (inactive === "zero layers") i.selections[0]!.layers = 0
        if (inactive === "false when")
          first(i).when = { kind: "constant", value: false }
        missing(i)
        provideModifierInput(i, field)
        expect(
          ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
            "stunDamage"
          ],
        ).toBe(1.85)
      },
    )

    it.each(["target", "modifier"])(
      "does not borrow a target replacement from another binding for %s",
      (moved) => {
        const i = modifiedOrdinaryFixture(field, "separate option")
        const actor = i.world.entities[0]!
        if (actor.kind !== "actor") throw new Error("fixture")
        const other = {
          ...structuredClone(actor),
          entityId: "entity:other" as const,
        }
        i.world.entities.push(other)
        i.bindings.push({
          ...i.bindings[0]!,
          bindingId: "binding:other",
          holderId: other.entityId,
        })
        i.actorSources.push({ entityId: other.entityId, agentEntityId: "1431" })
        i.selections[moved === "target" ? 0 : 2]!.bindingId = "binding:other"
        missing(i)
        provideModifierInput(i, field)
        if (moved === "modifier") i.inputs!.at(-1)!.bindingId = "binding:other"
        expect(
          ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
            "stunDamage"
          ],
        ).toBe(1.85)
      },
    )

    it.each(["ordinary when", "retained channel", "independent premise"])(
      "keeps the same-name input required by %s",
      (consumer) => {
        const i = modifiedOrdinaryFixture(field, "separate option")
        const read = {
          kind: "input",
          unit: "multiplier",
          name: "discardedModification",
        } as const
        if (consumer === "ordinary when")
          first(i).when = {
            kind: "compare-number",
            unit: "multiplier",
            operator: "gt",
            left: read,
            right: literal("multiplier", 0),
          }
        else {
          const other = i.definitions.effects[2]! as Mutable<ContributionRule>
          other.operation = {
            kind: "factor-contribution",
            channel: "base-multiplier-addition",
            value:
              consumer === "retained channel"
                ? read
                : literal("multiplier", 0.3),
          }
          const option = i.catalog.options[2]!
          option.variants[0].inputs = [
            {
              name: "discardedModification",
              unit: "multiplier",
              description: "required retained input or independent premise",
            },
          ]
          i.selections.push({
            optionId: option.optionId,
            bindingId: "binding:static",
            layers: 1,
          })
        }
        missing(i)
        provideModifierInput(i, field)
        const result = ok(calculateStaticDamageFromCatalog(i))
        expect(result.factors.nonCritical["stunDamage"]).toBe(1.85)
        if (consumer === "retained channel")
          expect(
            result.evaluation.hit?.damageItems[0]?.damageMultiplier,
          ).toBeCloseTo(field === "output" ? 2.4 : 2.2, 12)
      },
    )
  },
)

it.each(["same option", "separate option"] as const)(
  "reads the original folded parameter in ordinary when before the discarded modifier in %s",
  (placement) => {
    const i = modifiedOrdinaryFixture("parameter", placement)
    first(i).when = {
      kind: "compare-number",
      unit: "multiplier",
      operator: "gt",
      left: { kind: "parameter", unit: "multiplier", name: "amount" },
      right: literal("multiplier", 0),
    }
    expect(
      ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical["stunDamage"],
    ).toBe(1.85)
  },
)
