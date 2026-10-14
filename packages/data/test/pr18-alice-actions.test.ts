import { describe, expect, it } from "vitest"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import type { AgentActions } from "../src/skills/types.ts"
import source from "../definitions/skills/agents/1401.json" with { type: "json" }

// 固定技能版本的 21 个正式身份，期望分类独立于待测周期补充登记。
const identities = [
  ["0001", "damage"],
  ["0002", "daze-only"],
  ["0003", "daze-only"],
  ["0004", "daze-only"],
  ["0005", "damage"],
  ["0006", "damage"],
  ["0007", "damage"],
  ["0008", "damage"],
  ["0009", "damage"],
  ["0010", "damage"],
  ["0011", "damage"],
  ["0012", "damage"],
  ["0013", "damage"],
  ["0014", "damage"],
  ["0015", "damage"],
  ["0016", "damage"],
  ["0017", "damage"],
  ["0018", "damage"],
  ["0019", "damage"],
  ["0020", "damage"],
  ["0021", "damage"],
] as const

describe("Alice formal actions stay independent of the declared core period", () => {
  it("retains all 21 fixed action identities", () => {
    expect(source.actions.map((a) => a.actionId)).toEqual(
      identities.map(([id]) => `action:agent:1401:action:${id}`),
    )
  })

  it.each(identities)("action %s resolves as %s", (id, kind) => {
    const resolved = resolveAgentAction({
      agent: source as AgentActions,
      actionId: `action:agent:1401:action:${id}`,
      mindscapeRank: 6,
      levels: {
        basic: { mode: "trained", value: 12 },
        dodge: { mode: "trained", value: 12 },
        assist: { mode: "trained", value: 12 },
        special: { mode: "trained", value: 12 },
        chain: { mode: "trained", value: 12 },
      },
    })
    expect(resolved.ok, JSON.stringify(resolved)).toBe(true)
    if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
    expect(resolved.calculation.kind).toBe(kind)
    if (resolved.calculation.kind === "damage") {
      expect(resolved.calculation.segments.length).toBeGreaterThan(0)
      for (const segment of resolved.calculation.segments) {
        expect(segment.damageItems.length).toBeGreaterThan(0)
        for (const item of segment.damageItems)
          expect(item.itemId).not.toContain("core-periodic")
      }
    }
    for (const target of resolved.skillTargetIds)
      expect(target).not.toContain("core-periodic")
  })
})
