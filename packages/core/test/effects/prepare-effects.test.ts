import { describe, expect, it } from "vitest"
import { parseEffectRuleSet, prepareEffects } from "../../src/effects/index.ts"
import type { RuleSet, SourceBinding, Unit } from "../../src/effects/index.ts"
import { readPreparedInternal } from "../../src/effects/internal/prepare.ts"
import {
  asLooseRuleSet,
  astraBindingAt,
  cloneRuleSet,
  starterRuleSet,
  syntheticBinding,
  woodpeckerBindingAt,
} from "./fixtures.ts"
import type { LooseRuleSet } from "./fixtures.ts"

function deepFreezeValue(value: unknown): void {
  if (typeof value !== "object" || value === null) {
    return
  }
  Object.freeze(value)
  for (const nested of Object.values(value)) {
    deepFreezeValue(nested)
  }
}

function readAstraCoreRatio(internal: {
  readonly contributions: readonly {
    readonly rule: { readonly effectId: string }
    readonly foldedParameters: ReadonlyMap<string, { readonly value: number }>
  }[]
}): number {
  return internal.contributions
    .find(
      (contribution) =>
        contribution.rule.effectId === "agent:1311:core:attack-conversion",
    )!
    .foldedParameters.get("ratio")!.value
}

const ratioLiteral = (value: number) => ({
  kind: "literal",
  unit: "ratio",
  value,
})

function prepareWith(
  mutate: (ruleSet: LooseRuleSet) => void,
  bindings: readonly SourceBinding[],
): ReturnType<typeof prepareEffects> {
  const ruleSet = asLooseRuleSet(starterRuleSet)
  mutate(ruleSet)
  return prepareEffects(ruleSet as unknown as RuleSet, bindings)
}

function readFoldedAstraParameters(
  bindings: readonly SourceBinding[],
): ReadonlyMap<string, { unit: Unit; value: number }> {
  const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
  expect(parse.ok).toBe(true)
  if (!parse.ok) {
    throw new Error("fixture rule set must parse")
  }
  const prepared = prepareEffects(parse.value, bindings)
  expect(prepared.ok).toBe(true)
  if (!prepared.ok) {
    throw new Error("prepare must succeed")
  }
  const internal = readPreparedInternal(prepared.value)
  expect(internal).toBeDefined()
  const entry = internal!.contributions.find(
    (contribution) =>
      contribution.rule.effectId === "agent:1311:core:attack-conversion",
  )
  expect(entry).toBeDefined()
  return entry!.foldedParameters
}

describe("prepareEffects folds configuration modifications", () => {
  it("folds the Astra Yao M2 enhancement onto the core parameters", () => {
    const folded = readFoldedAstraParameters([astraBindingAt(2)])
    expect(folded.get("ratio")?.value).toBeCloseTo(0.54, 12)
    expect(folded.get("cap")?.value).toBeCloseTo(1600, 12)
  })

  it("keeps the base parameters below mindscape rank 2", () => {
    for (const rank of [0, 1]) {
      const folded = readFoldedAstraParameters([astraBindingAt(rank)])
      expect(folded.get("ratio")?.value).toBeCloseTo(0.35, 12)
      expect(folded.get("cap")?.value).toBeCloseTo(1200, 12)
    }
  })

  it("repeated preparation never accumulates the modification", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const bindings = [astraBindingAt(2)]
    const first = prepareEffects(parse.value, bindings)
    const second = prepareEffects(parse.value, bindings)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) {
      throw new Error("prepare must succeed")
    }
    const firstInternal = readPreparedInternal(first.value)!
    const secondInternal = readPreparedInternal(second.value)!
    expect(readAstraCoreRatio(firstInternal)).toBeCloseTo(0.54, 12)
    expect(readAstraCoreRatio(secondInternal)).toBeCloseTo(0.54, 12)
  })

  it("applies set, add, and scale in the documented order", () => {
    const result = prepareWith(
      (ruleSet) => {
        const modification = ruleSet.effects[1]! as {
          modifications: {
            field: string
            name: string
            unit: string
            change: { operator: string; value: unknown }
          }[]
        }
        modification.modifications = [
          {
            field: "parameter",
            name: "ratio",
            unit: "ratio",
            change: { operator: "set", value: ratioLiteral(0.4) },
          },
        ]
        ruleSet.effects.push(
          {
            kind: "modification",
            effectId: "agent:1311:test:add",
            source: ruleSet.effects[1]!.source,
            config: { kind: "constant", value: true },
            parameters: {},
            phase: "configuration",
            target: {
              kind: "effect",
              effectId: "agent:1311:core:attack-conversion",
            },
            modifications: [
              {
                field: "parameter",
                name: "ratio",
                unit: "ratio",
                change: { operator: "add", value: ratioLiteral(0.1) },
              },
            ],
          },
          {
            kind: "modification",
            effectId: "agent:1311:test:scale",
            source: ruleSet.effects[1]!.source,
            config: { kind: "constant", value: true },
            parameters: {},
            phase: "configuration",
            target: {
              kind: "effect",
              effectId: "agent:1311:core:attack-conversion",
            },
            modifications: [
              {
                field: "parameter",
                name: "ratio",
                unit: "ratio",
                change: {
                  operator: "scale",
                  value: { kind: "literal", unit: "multiplier", value: 2 },
                },
              },
            ],
          } as never,
        )
      },
      [astraBindingAt(2)],
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("prepare must succeed")
    }
    const internal = readPreparedInternal(result.value)!
    const entry = internal.contributions.find(
      (contribution) =>
        contribution.rule.effectId === "agent:1311:core:attack-conversion",
    )!
    expect(entry.foldedParameters.get("ratio")?.value).toBeCloseTo(1.0, 12)
    expect(entry.appliedModificationIds).toHaveLength(3)
  })

  it("rejects conflicting effective set values", () => {
    const result = prepareWith(
      (ruleSet) => {
        const modification = ruleSet.effects[1]! as {
          effectId: string
          source: {
            identity: { kind: string; entityId: string }
            section: string
            references: readonly unknown[]
          }
          modifications: { change: { operator: string; value: unknown } }[]
        }
        modification.modifications[0]!.change = {
          operator: "set",
          value: ratioLiteral(0.4),
        }
        ruleSet.effects.push({
          ...modification,
          effectId: "agent:1311:test:conflicting-set",
          modifications: [
            {
              field: "parameter",
              name: "ratio",
              unit: "ratio",
              change: { operator: "set", value: ratioLiteral(0.5) },
            },
          ],
        } as never)
      },
      [astraBindingAt(2)],
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "MODIFICATION_CONFLICT"),
      ).toBe(true)
    }
  })

  it("merges equal set values", () => {
    const result = prepareWith(
      (ruleSet) => {
        const modification = ruleSet.effects[1]! as {
          effectId: string
          source: {
            identity: { kind: string; entityId: string }
            section: string
            references: readonly unknown[]
          }
          modifications: { change: { operator: string; value: unknown } }[]
        }
        modification.modifications[0]!.change = {
          operator: "set",
          value: ratioLiteral(0.5),
        }
        ruleSet.effects.push({
          ...modification,
          effectId: "agent:1311:test:equal-set",
          modifications: [
            {
              field: "parameter",
              name: "ratio",
              unit: "ratio",
              change: { operator: "set", value: ratioLiteral(0.5) },
            },
          ],
        } as never)
      },
      [astraBindingAt(2)],
    )
    expect(result.ok).toBe(true)
  })
})

describe("prepareEffects resolves configuration and bindings", () => {
  it("does not activate rules whose configuration condition fails", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const prepared = prepareEffects(parse.value, [woodpeckerBindingAt(1)])
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    const internal = readPreparedInternal(prepared.value)!
    expect(
      internal.contributions.filter(
        (contribution) =>
          contribution.rule.effectId === "disc:31000:two-piece:critical-rate",
      ),
    ).toHaveLength(0)
  })

  it("activates the two-piece rule at and above two pieces exactly once", () => {
    for (const pieces of [2, 4]) {
      const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
      expect(parse.ok).toBe(true)
      if (!parse.ok) {
        throw new Error("fixture rule set must parse")
      }
      const prepared = prepareEffects(parse.value, [
        woodpeckerBindingAt(pieces),
      ])
      expect(prepared.ok).toBe(true)
      if (!prepared.ok) {
        throw new Error("prepare must succeed")
      }
      const internal = readPreparedInternal(prepared.value)!
      expect(
        internal.contributions.filter(
          (contribution) =>
            contribution.rule.effectId === "disc:31000:two-piece:critical-rate",
        ),
      ).toHaveLength(1)
    }
  })

  it("skips ineligible bindings without error", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const ineligible: SourceBinding = {
      ...astraBindingAt(2),
      eligible: false,
    }
    const prepared = prepareEffects(parse.value, [ineligible])
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    expect(readPreparedInternal(prepared.value)!.contributions).toHaveLength(0)
  })

  it("rejects duplicate binding identities", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const result = prepareEffects(parse.value, [
      astraBindingAt(2),
      astraBindingAt(3),
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "DUPLICATE_ID")).toBe(
        true,
      )
    }
  })

  it("rejects the same holder binding the same source twice", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const first = astraBindingAt(2)
    const second: SourceBinding = {
      ...first,
      bindingId: "binding:astra-duplicate",
    }
    const result = prepareEffects(parse.value, [first, second])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "DUPLICATE_ID")).toBe(
        true,
      )
    }
  })

  it("rejects a modification whose target is not bound for the same holder", () => {
    const result = prepareWith(
      (ruleSet) => {
        const modification = ruleSet.effects[1]! as {
          source: {
            identity: { kind: string; entityId: string }
            references: readonly unknown[]
          }
        }
        ruleSet.effects.push({
          kind: "modification",
          effectId: "environment:test:cross-holder",
          source: {
            identity: { kind: "environment", entityId: "cross-source-test" },
            section: "test",
            references: modification.source.references,
          },
          config: { kind: "constant", value: true },
          parameters: {},
          phase: "configuration",
          target: {
            kind: "effect",
            effectId: "agent:1311:core:attack-conversion",
          },
          modifications: [
            {
              field: "parameter",
              name: "ratio",
              unit: "ratio",
              change: { operator: "add", value: ratioLiteral(0.1) },
            },
          ],
        } as never)
      },
      [
        {
          kind: "environment",
          bindingId: "binding:cross",
          holderId: "entity:other",
          sourceEntityId: "cross-source-test",
          eligible: true,
          configuration: {},
        } as SourceBinding,
      ],
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_MODIFICATION"),
      ).toBe(true)
    }
  })

  it("reports invalid definitions even when nothing is bound", () => {
    const result = prepareWith((ruleSet) => {
      const modification = ruleSet.effects[1]! as {
        target: { effectId: string }
      }
      modification.target.effectId = "agent:9999:missing"
    }, [])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "MISSING_REFERENCE"),
      ).toBe(true)
    }
  })

  it("rejects malformed binding input", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const result = prepareEffects(parse.value, [
      {
        kind: "w-engine",
        bindingId: "binding:bad",
        holderId: "entity:any",
        sourceEntityId: "14131",
        eligible: true,
        configuration: { mindscapeRank: 2 },
      } as never,
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_INPUT"),
      ).toBe(true)
    }
  })
})

describe("prepareEffects state parameters", () => {
  it("folds configuration parameter changes onto state parameters", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const prepared = prepareEffects(parse.value, [
      syntheticBinding as unknown as SourceBinding,
    ])
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    expect(prepared.value.stateParameters).toHaveLength(1)
    const entry = prepared.value.stateParameters[0]!
    expect(entry.stateId).toBe("state:spec:linger")
    expect(entry.bindingId).toBe("binding:spec")
    expect(entry.parameters["lingerSeconds"]?.value).toBeCloseTo(7.5, 12)
    expect(entry.parameters["lingerSeconds"]?.unit).toBe("seconds")
  })
})

describe("prepareEffects immutability", () => {
  it("does not modify the input definitions or bindings", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const definitionsBefore = structuredClone(parse.value)
    const bindings = [astraBindingAt(2)]
    const bindingsBefore = structuredClone(bindings)
    const prepared = prepareEffects(parse.value, bindings)
    expect(prepared.ok).toBe(true)
    expect(parse.value).toEqual(definitionsBefore)
    expect(bindings).toEqual(bindingsBefore)
  })

  it("works with deeply frozen inputs", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    deepFreezeValue(parse.value)
    const bindings = [astraBindingAt(2)]
    deepFreezeValue(bindings)
    const prepared = prepareEffects(parse.value, bindings)
    expect(prepared.ok).toBe(true)
  })

  it("returns frozen prepared results", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const prepared = prepareEffects(parse.value, [astraBindingAt(2)])
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    expect(Object.isFrozen(prepared.value)).toBe(true)
    expect(Object.isFrozen(prepared.value.stateParameters)).toBe(true)
    expect(Object.isFrozen(prepared.value.stateParameters[0])).toBe(true)
  })

  it("leaves caller definitions and binding configuration unfrozen", () => {
    const parse = parseEffectRuleSet(cloneRuleSet(starterRuleSet))
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("fixture rule set must parse")
    }
    const definitions = parse.value as unknown as {
      readonly effects: readonly Record<string, unknown>[]
    }
    const binding = astraBindingAt(2)
    const prepared = prepareEffects(parse.value, [binding])
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    expect(
      readAstraCoreRatio(readPreparedInternal(prepared.value)!),
    ).toBeCloseTo(0.54, 12)
    expect(Object.isFrozen(parse.value)).toBe(false)
    expect(Object.isFrozen(definitions.effects)).toBe(false)
    expect(Object.isFrozen(definitions.effects[0])).toBe(false)
    expect(Object.isFrozen(binding)).toBe(false)
    expect(Object.isFrozen(binding.configuration)).toBe(false)

    // 调用方随后调整原始培养配置，可以创建新的准备结果。
    const configuration = binding.configuration as unknown as {
      mindscapeRank: number
    }
    configuration.mindscapeRank = 1
    const reprepared = prepareEffects(parse.value, [binding])
    expect(reprepared.ok).toBe(true)
    if (!reprepared.ok) {
      throw new Error("prepare must succeed")
    }
    expect(
      readAstraCoreRatio(readPreparedInternal(reprepared.value)!),
    ).toBeCloseTo(0.35, 12)

    // 修改原始定义不会改变已经生成的准备结果。
    const core = definitions.effects.find(
      (effect) => effect["effectId"] === "agent:1311:core:attack-conversion",
    )!
    const parameters = core["parameters"] as {
      ratio: { values: Record<string, number> }
    }
    parameters.ratio.values["7"] = 0.9
    expect(
      readAstraCoreRatio(readPreparedInternal(prepared.value)!),
    ).toBeCloseTo(0.54, 12)
  })
})
