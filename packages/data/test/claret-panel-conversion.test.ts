import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { claretPanelConversion } from "../scripts/claret-panel-conversion.ts"
import { staticPanelRules } from "../.generated/calculation-data.ts"
import type { AgentData } from "../src/integration/agent-types.ts"
import type { RuleSet, StaticEffectCatalog } from "@randomplay/shared"

const read = (path: string) =>
  readFile(new URL(`../.generated/${path}`, import.meta.url))
const details = await read("integrated/agents/1611/details.zh.json")
const data = JSON.parse(
  (await read("integrated/agents/1611/data.json")).toString(),
) as AgentData
const definitions = JSON.parse(
  (await read("definitions/effects/static.json")).toString(),
) as RuleSet
const catalog = JSON.parse(
  (await read("definitions/effects/static-catalog.json")).toString(),
) as StaticEffectCatalog
const effectId =
  "agent:1611:zzz-hp:eff-mtskqyss-1toefw:blk-mtrf598z-wr4jqt:mindscape:0"

describe("Claret initial conversion source verification", () => {
  it("prepares the verified seven-rank rule with the same effect identity and parameters", () => {
    const result = claretPanelConversion(
      details,
      data,
      definitions,
      catalog,
      "3.3.12+19634983",
    )
    expect(staticPanelRules.agents["1611"]!.initialConversions).toEqual([
      result,
    ])
    expect(result.activation.kind).toBe("continuous")
    const source = definitions.effects.find((r) => r.effectId === effectId)!
    expect(result.parameters).toEqual(source.parameters)
    expect(
      result.source.references.filter(
        (r) => r.sourceId === "nanoka-integrated",
      ),
    ).toHaveLength(7)
  })

  it.each(["changed-text", "missing-row"] as const)(
    "rejects %s evidence instead of omitting the permanent rule",
    (kind) => {
      const changed = JSON.parse(details.toString())
      if (kind === "missing-row") delete changed.passive.level["1611504"]
      else
        changed.passive.level["1611504"].desc[0] = changed.passive.level[
          "1611504"
        ].desc[0].replace("0.35%", "0.36%")
      expect(() =>
        claretPanelConversion(
          Buffer.from(JSON.stringify(changed)),
          data,
          definitions,
          catalog,
          "3.3.12+19634983",
        ),
      ).toThrow(
        /Claret initial conversion (evidence changed|requires all seven core rows)/u,
      )
    },
  )

  it.each([1, 2, 3, 4, 5, 6, 7])(
    "rejects core %s rank metadata drift",
    (rank) => {
      const changed = structuredClone(data)
      changed.passive.level[`161150${rank}`]!.level = 0
      expect(() =>
        claretPanelConversion(
          details,
          changed,
          definitions,
          catalog,
          "3.3.12+19634983",
        ),
      ).toThrow(/evidence\/rank mismatch/u)
    },
  )

  it.each([
    "missing-rule",
    "source-identity",
    "rate",
    "condition",
    "source-input",
    "missing-option",
    "catalog-input",
    "catalog-ranks",
    "version",
  ] as const)("rejects %s drift in the reused explicit definition", (kind) => {
    const rules = structuredClone(definitions)
    const options = structuredClone(catalog)
    // JSON mutations model a stale or mismatched generated artifact at the I/O boundary.
    const mutableRules = rules as any
    const mutableCatalog = options as any
    const rule = mutableRules.effects.find((r: any) => r.effectId === effectId)
    const option = mutableCatalog.options.find((o: any) =>
      o.variants.some((v: any) => v.effectIds?.includes(effectId)),
    )
    if (kind === "missing-rule")
      mutableRules.effects = mutableRules.effects.filter(
        (r: any) => r.effectId !== effectId,
      )
    if (kind === "source-identity") rule.source.identity.entityId = "1121"
    if (kind === "rate") rule.parameters.rate.value = 0.36
    if (kind === "condition") rule.when = { kind: "constant", value: false }
    if (kind === "source-input")
      rule.operation.value.input.operands[1].operands[0].name = "other-source"
    if (kind === "missing-option")
      mutableCatalog.options = mutableCatalog.options.filter(
        (o: any) => o !== option,
      )
    if (kind === "catalog-input") option.variants[0].inputs = []
    if (kind === "catalog-ranks")
      option.variants[0].configuration.coreSkillLevels = [7]
    expect(() =>
      claretPanelConversion(
        details,
        data,
        rules,
        options,
        kind === "version" ? "3.1" : "3.3.12+19634983",
      ),
    ).toThrow(/catalog\/rule drift/u)
  })
})
