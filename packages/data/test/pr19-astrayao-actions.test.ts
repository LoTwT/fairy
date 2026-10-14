import { describe, expect, it } from "vitest"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import type { AgentActions } from "../src/skills/types.ts"
import astra from "../definitions/skills/agents/1311.json" with { type: "json" }
import nekomata from "../definitions/skills/agents/1021.json" with { type: "json" }
import soldier11 from "../definitions/skills/agents/1041.json" with { type: "json" }

// 固定来源逐身份审读的 21 个伤害行；该集合没有纯失衡行。
const identities = [
  "0001",
  "0002",
  "0003",
  "0004",
  "0005",
  "0006",
  "0007",
  "0008",
  "0009",
  "0010",
  "0011",
  "0012",
  "0013",
  "0014",
  "0015",
  "0016",
  "0017",
  "0018",
  "0019",
  "0020",
  "0021",
] as const

describe("Astra M4 remains separate from formal skill actions", () => {
  it("retains every independently audited Astra action identity", () => {
    expect(astra.actions.map((action) => action.actionId)).toEqual(
      identities.map((id) => `action:agent:1311:action:${id}`),
    )
  })

  it.each(identities)("Astra action %s resolves nonempty damage", (id) => {
    const resolved = resolveAgentAction({
      agent: astra as AgentActions,
      actionId: `action:agent:1311:action:${id}`,
      mindscapeRank: 6,
      levels: {
        basic: { mode: "trained", value: 12 },
        dodge: { mode: "trained", value: 7 },
        assist: { mode: "trained", value: 4 },
        special: { mode: "trained", value: 9 },
        chain: { mode: "trained", value: 1 },
      },
    })
    expect(resolved.ok, JSON.stringify(resolved)).toBe(true)
    if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
    expect(resolved.calculation.kind).toBe("damage")
    if (resolved.calculation.kind !== "damage")
      throw new Error("An audited damage action became non-damaging")
    expect(resolved.calculation.segments.length).toBeGreaterThan(0)
    for (const segment of resolved.calculation.segments) {
      expect(segment.damageKind).toBe("regular")
      expect(segment.damageItems.length).toBeGreaterThan(0)
      for (const item of segment.damageItems) {
        expect(item.itemId).toContain(`action:agent:1311:action:${id}`)
        expect(item.itemId).not.toContain("m4-quick-assist")
      }
    }
  })

  it.each([
    ["nekomata", nekomata, "1021", "physical"],
    ["soldier11", soldier11, "1041", "fire"],
  ] as const)(
    "%s quick assist keeps its ordinary independent action",
    (_, agent, id, element) => {
      const resolved = resolveAgentAction({
        agent: agent as AgentActions,
        actionId: `action:agent:${id}:action:0001`,
        mindscapeRank: 4,
        levels: { assist: { mode: "trained", value: 8 } },
      })
      expect(resolved.ok, JSON.stringify(resolved)).toBe(true)
      if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
      expect(resolved.skillCategory).toBe("quick-assist")
      expect(resolved.calculation.kind).toBe("damage")
      if (resolved.calculation.kind !== "damage")
        throw new Error("Quick assist requires a damage calculation")
      expect(resolved.calculation.segments).toHaveLength(1)
      expect(resolved.calculation.segments[0]!.element).toBe(element)
      expect(resolved.calculation.segments[0]!.damageItems).toHaveLength(1)
      expect(resolved.calculation.segments[0]!.damageItems[0]!.itemId).toBe(
        `action:agent:${id}:action:0001:base`,
      )
      expect(resolved.skillTargetIds).toEqual([])
    },
  )
})
