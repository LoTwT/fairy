import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import { validateStaticCatalog } from "../../src/effects/internal/static-catalog.ts"
import type {
  StaticDamageInput,
  StaticEffectCatalog,
} from "../../src/effects/types.ts"
import rawDefinitions from "../../../data/definitions/effects/static.json" with { type: "json" }
import rawCatalog from "../../../data/definitions/effects/static-catalog.json" with { type: "json" }
import { makeRoxyCoreWindRequest } from "../../../data/test/fixtures/roxy-core-wind-consumer.ts"

const parsed = parseEffectRuleSet(rawDefinitions)
if (!parsed.ok) throw new Error(JSON.stringify(parsed))
const definitions = parsed.value
const catalog = rawCatalog as unknown as StaticEffectCatalog
const optionId = "nanoka:agents:1621:core-element-critical-damage"
const effectId = "agent:1621:nanoka:core-element-critical-damage"

describe("element buff state bridge and supplied-rule boundary", () => {
  it("uses the existing numeric rule without assuming every elemental state is active in supplied calls", () => {
    const request = makeRoxyCoreWindRequest(definitions, catalog)
    const { skillTargetIds: _targets, ...hit } = request.hit
    const item = hit.damageItems[0]
    if (
      request.damage.kind !== "regular" ||
      hit.damageItems.length !== 1 ||
      item.mode !== "direct"
    )
      throw new Error(
        "Expected the fixture's single direct regular damage item",
      )
    const selected: StaticDamageInput = {
      definitions,
      bindings: request.bindings,
      world: request.world,
      inputs: request.inputs!,
      damage: request.damage,
      hit: {
        ...hit,
        damageItems: [
          {
            itemId: item.itemId,
            stat: item.stat,
            damageMultiplier: item.damageMultiplier,
            statSource: item.statSource,
          },
        ],
      },
      selections: [{ effectId, bindingId: "binding:roxy", layers: 1 }],
    }
    const missing = calculateStaticDamage(selected)
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(
        missing.issues.some((i) => i.code === "MISSING_FACT"),
        JSON.stringify(missing),
      ).toBe(true)
    const flags = ["physical", "fire", "ice", "electric", "ether"].map(
      (element) => ({
        bindingId: "binding:roxy" as const,
        name: `roxy:core:active-buff:${element}`,
        value: {
          unit: "count" as const,
          value: element === "ice" || element === "fire" ? 1 : 0,
        },
      }),
    )
    const supplied = calculateStaticDamage({
      ...selected,
      inputs: [...request.inputs!, ...flags],
    })
    const fromCatalog = calculateStaticDamageFromCatalog({
      ...request,
      selections: [
        {
          optionId,
          bindingId: "binding:roxy",
          layers: 1,
          activeBuffElements: ["fire", "ice"],
        },
      ],
    })
    expect(
      supplied.ok && fromCatalog.ok,
      JSON.stringify({ supplied, fromCatalog }),
    ).toBe(true)
    if (supplied.ok && fromCatalog.ok) {
      expect(supplied.value.expected).toBeCloseTo(2467.5, 8)
      expect(fromCatalog.value.expected).toBe(supplied.value.expected)
      expect(fromCatalog.value.evaluation.contributions).toHaveLength(1)
    }
  })

  it.each([
    [
      "empty mapping",
      (v: any) => {
        v.elementBuffInputs = []
      },
    ],
    [
      "unknown element",
      (v: any) => {
        v.elementBuffInputs[0].element = "invalid"
      },
    ],
    [
      "duplicate element",
      (v: any) => {
        v.elementBuffInputs[1].element = v.elementBuffInputs[0].element
      },
    ],
    [
      "duplicate input",
      (v: any) => {
        v.elementBuffInputs[1].inputName = v.elementBuffInputs[0].inputName
      },
    ],
    [
      "unused input",
      (v: any) => {
        v.elementBuffInputs[0].inputName = "not-consumed"
      },
    ],
    [
      "external input collision",
      (v: any) => {
        v.inputs.push({
          name: v.elementBuffInputs[0].inputName,
          unit: "count",
          description: "collision",
        })
      },
    ],
    [
      "layers used as state count",
      (v: any) => {
        v.maximumLayers = 5
      },
    ],
    [
      "second contribution",
      (v: any) => {
        v.effectIds.push("agent:1621:nanoka:core-wind-critical-damage")
      },
    ],
  ] as const)("rejects malformed catalog declaration: %s", (_name, mutate) => {
    const changed: any = structuredClone(catalog)
    mutate(
      changed.options.find((o: any) => o.optionId === optionId).variants[0],
    )
    expect(validateStaticCatalog(changed, definitions).ok).toBe(false)
  })
})
