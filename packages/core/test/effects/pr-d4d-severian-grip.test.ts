import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { inputFor } from "./static-fixtures.ts"

/**
 * D4-3：赛维里安与禁罪囚笼没有可执行规则；目录入口必须对两个具名缺口
 * 返回 formula-out-of-scope，而不是零贡献或近似通道。
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = read(
  "../../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog

function request(options: {
  optionId: string
  kind: "agent" | "w-engine"
  sourceEntityId: string
}): StaticCatalogDamageInput {
  const base = inputFor()
  const binding =
    options.kind === "agent"
      ? {
          bindingId: "binding:gap" as const,
          kind: "agent" as const,
          holderId: "entity:attacker" as const,
          sourceEntityId: options.sourceEntityId,
          eligible: true,
          configuration: {
            mindscapeRank: 0 as const,
            coreSkillLevel: 7 as const,
          },
        }
      : {
          bindingId: "binding:gap" as const,
          kind: "w-engine" as const,
          holderId: "entity:attacker" as const,
          sourceEntityId: options.sourceEntityId,
          eligible: true,
          configuration: { refinement: 1 as const },
        }
  return {
    ...base,
    definitions,
    catalog,
    damage: base.damage as unknown as StaticCatalogDamageInput["damage"],
    actorSources: [{ entityId: "entity:attacker", agentEntityId: "1631" }],
    bindings: [binding],
    selections: [
      { optionId: options.optionId, bindingId: "binding:gap", layers: 1 },
    ],
    hit: {
      ...base.hit,
      actorId: "entity:attacker",
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "attack",
          stat: "attack",
          statSource: { entityId: "entity:attacker" },
          damageMultiplier: 1,
        },
      ],
    },
  }
}

describe("D4 Severian and Incarcerating Grip catalog gaps", () => {
  it("keeps both supplemental entities in the catalog", () => {
    for (const [entityId, kind] of [
      ["agents:severian", "agent"],
      ["w-engines:Incarcerating_Grip", "w-engine"],
    ] as const) {
      const entity = catalog.entities.find(
        (candidate) => candidate.catalogEntityId === entityId,
      )
      expect(entity, entityId).toBeDefined()
      expect(entity?.identity?.kind).toBe(kind)
    }
  })

  it.each([
    ["nanoka:agents:1631:unregistered-buffs", "agent", "1631"],
    ["nanoka:w-engines:14163:passive", "w-engine", "14163"],
  ] as const)(
    "rejects %s with formula-out-of-scope",
    (optionId, kind, sourceEntityId) => {
      const result = calculateStaticDamageFromCatalog(
        request({ optionId, kind, sourceEntityId }),
      )
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.message.includes("formula-out-of-scope"),
          ),
        ).toBe(true)
      }
    },
  )
})
