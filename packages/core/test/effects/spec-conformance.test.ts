import { readFileSync } from "node:fs"
import type {
  RuleSet as LucyRuleSet,
  StaticEffectCatalog as LucyCatalog,
} from "../../src/effects/types.ts"
import { makeLucyGuardBoarRequest } from "../../../data/test/fixtures/lucy-guard-boar-consumer.ts"
import {
  calculateDeclaredLucyGuardBoar,
  rejectHistoricalLucyOwner,
} from "../../../../docs/specs/effects/contract-examples.ts"
import { describe, expect, it } from "vitest"
import { parseEffectRuleSet, prepareEffects } from "../../src/effects/index.ts"
import { readPreparedInternal } from "../../src/effects/internal/prepare.ts"
import {
  exampleBindings,
  exampleRuleSet,
  syntheticBinding,
  syntheticRuleSet,
} from "../../../../docs/specs/effects/contract-examples.ts"

describe("spec contract examples conform to the runtime validator", () => {
  it("parses the documented example rule set", () => {
    const result = parseEffectRuleSet(exampleRuleSet)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.effects).toHaveLength(13)
      expect(result.value.states).toHaveLength(1)
      expect(result.value.actions).toHaveLength(3)
    }
  })

  it("parses the synthetic rule set", () => {
    const result = parseEffectRuleSet(syntheticRuleSet)
    expect(result.ok).toBe(true)
  })

  it("prepares the documented examples with the documented bindings", () => {
    const parse = parseEffectRuleSet(exampleRuleSet)
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("example rule set must parse")
    }
    const prepared = prepareEffects(parse.value, [...exampleBindings] as never)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    const internal = readPreparedInternal(prepared.value)!
    const astraCore = internal.contributions.find(
      (contribution) =>
        contribution.rule.effectId === "agent:1311:core:attack-conversion",
    )
    expect(astraCore).toBeDefined()
    expect(astraCore!.foldedParameters.get("ratio")?.value).toBeCloseTo(
      0.54,
      12,
    )
    expect(astraCore!.foldedParameters.get("cap")?.value).toBeCloseTo(1600, 12)
    expect(astraCore!.appliedModificationIds).toEqual([
      "agent:1311:mindscape-2:core-enhancement",
    ])
    const rinaCore = internal.contributions.find(
      (contribution) =>
        contribution.rule.effectId === "agent:1211:core:penetration-conversion",
    )
    expect(rinaCore).toBeDefined()
    expect(rinaCore!.resolvedParameters.get("flat")?.value).toBeCloseTo(
      0.12,
      12,
    )
    const elegantVanity = internal.instants.find(
      (instant) => instant.rule.effectId === "w-engine:14131:energy-on-entry",
    )
    expect(elegantVanity).toBeDefined()
    expect(elegantVanity!.resolvedParameters.get("energy")?.value).toBe(5)
  })

  it("folds the synthetic state modification to 7.5 seconds", () => {
    const parse = parseEffectRuleSet(syntheticRuleSet)
    expect(parse.ok).toBe(true)
    if (!parse.ok) {
      throw new Error("synthetic rule set must parse")
    }
    const prepared = prepareEffects(parse.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    expect(prepared.value.stateParameters).toHaveLength(1)
    expect(
      prepared.value.stateParameters[0]!.parameters["lingerSeconds"]?.value,
    ).toBeCloseTo(7.5, 12)
  })
})

it("executes Lucy's documented inheritance/M6 example and current-only counterexample", () => {
  const definitions = JSON.parse(
    readFileSync(
      new URL("../../../data/definitions/effects/static.json", import.meta.url),
      "utf8",
    ),
  ) as LucyRuleSet
  const catalog = JSON.parse(
    readFileSync(
      new URL(
        "../../../data/definitions/effects/static-catalog.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as LucyCatalog
  const request = makeLucyGuardBoarRequest(definitions, catalog)
  if (request.settlement.kind !== "m6-explosion")
    throw new Error("Expected the explicit M6 fixture")
  const result = calculateDeclaredLucyGuardBoar(
    definitions,
    catalog,
    request.world,
    request.boar.ownStats,
    request.settlement.damage,
  )
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (result.ok)
    expect(result.value.settlement!.expected).toBeCloseTo(9298.411222531886, 8)
  let rejected: ReturnType<typeof rejectHistoricalLucyOwner> | undefined
  expect(() => {
    rejected = rejectHistoricalLucyOwner(request)
  }).not.toThrow()
  expect(rejected?.ok).toBe(false)
  if (rejected && !rejected.ok)
    expect(
      rejected.issues.some(
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.pointer === "/boar/ownerSource/snapshotId",
      ),
    ).toBe(true)
})
