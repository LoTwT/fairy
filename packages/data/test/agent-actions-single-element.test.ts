import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import type { AgentActions } from "../src/skills/types.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import evidence from "../scripts/skills/evidence.json" with { type: "json" }
import reference from "./fixtures/zzz-hp-single-element-actions.json" with { type: "json" }

const sourceElements: Readonly<Record<string, string>> = {
  火: "fire",
  电: "electric",
  以太: "ether",
  冰: "ice",
}
const physicalException = "action:agent:1181:action:0007"
const namedSkillTargets: Readonly<Record<string, readonly string[]>> = {
  "action:agent:1161:action:0021": ["zzz-hp:skill:lighter-basic-ms4azczu"],
  "action:agent:1301:action:0011": ["zzz-hp:skill:orphie&magus-basic-ms0bu5ij"],
}

describe("fixed ZZZ-HP single-element aggregate conventions", () => {
  it("retains the independent source identity and the complete reviewed group", () => {
    expect(reference.source.commit).toBe(evidence.zzzHpCommit)
    expect(evidence.resources).toContainEqual({
      resource: reference.source.resource,
      sha256: reference.source.sha256,
      purpose: reference.source.purpose,
    })
    expect(reference.references).toHaveLength(89)
    expect(new Set(reference.references.map((row) => row.actionId)).size).toBe(
      89,
    )
    expect(new Set(reference.references.map((row) => row.pointer)).size).toBe(
      89,
    )
    expect(
      new Set(reference.references.map((row) => row.actionId.split(":")[2]))
        .size,
    ).toBe(15)
  })

  it.each(reference.references)(
    "$actionId preserves the reference curve and refuses unknown individual hits",
    async (row) => {
      const entityId = row.actionId.split(":")[2]!
      const agent: AgentActions = JSON.parse(
        await readFile(
          new URL(
            `../.generated/definitions/skills/agents/${entityId}.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      )
      const action = agent.actions.find(
        (entry) => entry.actionId === row.actionId,
      )!
      expect(action.upstreamSkillId).toBe(row.upstreamSkillId)
      expect(action.damageCoefficient).toEqual({
        levelGroup: action.levelGroup,
        base: row.damagePercentage / 10000,
        growth: row.damagePercentageGrowth / 10000,
      })
      expect(action.inputs).toEqual([])
      expect(action.potentialLevels).toBeUndefined()
      expect(action.conditionalIdentity).toBeUndefined()
      expect(action.skillTags).toEqual([])
      expect(action.skillTargetIds).toEqual(
        namedSkillTargets[action.actionId] ??
          (action.skillCategory === "dodge-counter"
            ? ["zzz-hp:skill:all-dodge-ms4e5xea"]
            : action.skillCategory === "dash"
              ? ["zzz-hp:skill:all-dodge-ms0dnpmr"]
              : []),
      )
      if (row.actionId === physicalException) {
        expect(row.element).toBe("电")
        expect(action.description).toContain(
          "可以发动垫步射击，调整身位并造成物理伤害",
        )
        expect(action.limitations.join("\n")).not.toContain(
          "整条单属性合计约定",
        )
      } else {
        expect(action.limitations.join("\n")).toContain("整条单属性合计约定")
      }

      for (const [mindscapeRank, level] of [
        [0, 1],
        [0, 12],
        [6, 16],
      ] as const) {
        const input = {
          agent,
          actionId: action.actionId,
          mindscapeRank,
          levels: {
            [action.levelGroup]: { mode: "effective" as const, value: level },
          },
        }
        const resolved = resolveAgentAction(input)
        if (!resolved.ok || resolved.calculation.kind !== "damage")
          throw new Error(`Expected damage action: ${row.actionId}`)
        // 直接使用冻结的上游万分比整数，与生产转换器独立计算期望。
        const expected =
          (row.damagePercentage + (level - 1) * row.damagePercentageGrowth) /
          10000
        expect(resolved.sourceDamageMultiplier).toBeCloseTo(expected, 12)
        if (level === 12)
          expect(resolved.sourceDamageMultiplier).toBeCloseTo(
            row.level12Percentage / 100,
            12,
          )
        expect(resolved.calculation.segments).toHaveLength(1)
        const segment = resolved.calculation.segments[0]!
        expect(segment).toMatchObject({
          damageKind: "regular",
          element:
            row.actionId === physicalException
              ? "physical"
              : sourceElements[row.element],
          granularity: "aggregate",
          repeat: 1,
        })
        expect(segment.damageItems).toHaveLength(1)
        expect(segment.damageItems[0]!.stat).toBe("attack")
        expect(segment.damageItems[0]!.damageMultiplier).toBeCloseTo(
          expected,
          12,
        )
        expect(resolved.resolutionContext).toEqual({
          agentEntityId: entityId,
          mindscapeRank,
        })
        expect(
          resolveAgentAction({ ...input, requireIndividualHits: true }),
        ).toMatchObject({
          ok: false,
          issues: [{ code: "individual-hits-required" }],
        })
      }
    },
  )
})
