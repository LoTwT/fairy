import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import type { AgentDetails } from "../src/integration/agent-types.ts"
import type { AgentActions, SkillLevelInput } from "../src/skills/types.ts"
import {
  resolveAgentAction,
  resolveAgentSkillLevel,
} from "../src/skills/resolve.ts"
import { convertAgentActions } from "../scripts/skills/convert.ts"
import { parseSkillExpression } from "../scripts/skills/expression.ts"
import type { ActionRegistryEntry } from "../scripts/skills/registry.ts"
import registryData from "../scripts/skills/registry.json" with { type: "json" }
import { calculateTotalDisplayedDamage } from "../../core/src/damage.ts"
import {
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  defenseFactor,
} from "../../core/src/factors/defense.ts"

const registry = registryData as readonly ActionRegistryEntry[]
const json = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"))
const agent = (id: string) =>
  json<AgentActions>(`../.generated/definitions/skills/agents/${id}.json`)
const details = (id: string) =>
  json<AgentDetails>(`../.generated/integrated/agents/${id}/details.zh.json`)

describe("skill level selection", () => {
  it.each([
    [0, 0, 12],
    [2, 0, 12],
    [3, 2, 14],
    [4, 2, 14],
    [5, 4, 16],
    [6, 4, 16],
  ])(
    "resolves training at M%i with bonus %i to %i",
    async (rank, bonus, effective) => {
      const data = await agent("1031")
      expect(
        resolveAgentSkillLevel({
          agent: data,
          group: "basic",
          mindscapeRank: rank,
          level: { mode: "trained", value: 12 },
        }),
      ).toEqual({ trained: 12, bonus, effective })
      expect(
        resolveAgentSkillLevel({
          agent: data,
          group: "basic",
          mindscapeRank: rank,
          level: { mode: "effective", value: effective },
        }),
      ).toEqual({ trained: 12, bonus, effective })
    },
  )
  it("keeps effective 12 at M5 as 12, rejects invalid modes and does not clamp", async () => {
    const data = await agent("1031")
    const base = { agent: data, group: "basic" as const, mindscapeRank: 5 }
    expect(
      resolveAgentSkillLevel({
        ...base,
        level: { mode: "effective", value: 12 },
      }),
    ).toEqual({ trained: 8, bonus: 4, effective: 12 })
    for (const value of [0, 4, 17, 5.5, NaN, Infinity, "12"])
      expect(() =>
        resolveAgentSkillLevel({
          ...base,
          level: { mode: "effective", value } as SkillLevelInput,
        }),
      ).toThrow()
    expect(() =>
      resolveAgentSkillLevel({
        ...base,
        level: { value: 12 } as SkillLevelInput,
      }),
    ).toThrow(/mode/)
    expect(() =>
      resolveAgentSkillLevel({
        ...base,
        mindscapeRank: 7,
        level: { mode: "trained", value: 1 },
      }),
    ).toThrow(/Mindscape/)
    expect(() =>
      resolveAgentSkillLevel({
        ...base,
        mindscapeRank: 0,
        level: { mode: "effective", value: 13 },
      }),
    ).toThrow(/Skill level/)
  })
})

describe("agent action semantics", () => {
  it.each([
    ["1031", "dodge", 1],
    ["1221", "basic", 0],
    ["1391", "dodge", 2],
    ["1461", "basic", 2],
    ["1591", "basic", 1],
  ] as const)(
    "guards related descriptions for %s/%s/%i and publishes their pointers",
    async (id, group, index) => {
      const raw = await details(id)
      const data = await agent(id)
      const related = registry.filter(
        (entry) =>
          entry.entityId === id &&
          entry.levelGroup === group &&
          entry.additionalDescriptionIndices?.includes(index),
      )
      expect(related.length).toBeGreaterThan(0)
      for (const entry of related)
        expect(
          data.actions.find((action) => action.actionId === entry.actionId)
            ?.descriptionSources,
        ).toContainEqual({
          path: `agents/${id}/details.zh.json`,
          pointer: `/skill/${group}/description/${index}/desc`,
        })
      for (const field of ["name", "desc", "potential"] as const) {
        const changed = structuredClone(raw)
        const description = changed.skill[group]!.description[index]!
        if (field === "potential") description.potential = [999]
        else description[field] += " changed source semantics"
        expect(() => convertAgentActions(id, changed, registry)).toThrow(
          /semantic signature changed/,
        )
      }
      for (const indices of [[-1], [0.5], [999], [index, index]])
        expect(() =>
          convertAgentActions(
            id,
            raw,
            registry.map((entry) =>
              entry.actionId === related[0]!.actionId
                ? { ...entry, additionalDescriptionIndices: indices }
                : entry,
            ),
          ),
        ).toThrow(/Invalid related action description/)
    },
  )

  it.each([
    ["0002", "assist"],
    ["0003", "assist"],
    ["0021", "dodge"],
    ["0022", "dodge"],
  ] as const)(
    "keeps Hugo %s training independent of its basic damage category",
    async (suffix, group) => {
      const data = await agent("1291")
      const result = resolveAgentAction({
        agent: data,
        actionId: `action:agent:1291:action:${suffix}`,
        mindscapeRank: 0,
        levels: { [group]: { mode: "trained", value: 12 } },
      })
      expect(result).toMatchObject({
        ok: true,
        skillCategory: "basic",
        skillTargetIds: [],
        levels: { [group]: { trained: 12, effective: 12 } },
      })
    },
  )

  it("keeps enhanced variants' target identities separate and reports partial-target limits", async () => {
    const zhuYuan = await agent("1241")
    for (const action of zhuYuan.actions.filter(
      (entry) => entry.name === "普通攻击：请勿抵抗",
    ))
      expect(
        action.skillTargetIds.includes("zzz-hp:skill:zhuyuan-basic-ms4hd701"),
      ).toBe(action.rowName.includes("以太"))
    const soukaku = await agent("1131")
    for (const action of soukaku.actions.filter((entry) =>
      entry.name.startsWith("普通攻击：打年糕"),
    ))
      expect(
        action.skillTargetIds.includes("zzz-hp:skill:soukaku-basic-ms38ejmz"),
      ).toBe(action.name.includes("霜染刃旗"))
    const anton = await agent("1111")
    const assist = anton.actions.find(
      (entry) => entry.name === "支援突击：极限突进",
    )!
    expect(assist.skillTargetIds).toEqual([])
    expect(assist.limitations.join()).toContain("电钻攻击与打桩攻击")
    expect(
      resolveAgentAction({
        agent: anton,
        actionId: assist.actionId,
        mindscapeRank: 0,
        levels: { assist: { mode: "trained", value: 12 } },
        requireIndividualHits: true,
      }),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "individual-hits-required" }],
    })
  })

  it("keeps Anby's physical stages, electric fourth hit, independent daze and explicit buff target", async () => {
    const data = await agent("1011")
    const first = data.actions.find(
      (a) => a.name === "普通攻击：伏特速攻" && a.rowName === "一段伤害倍率",
    )!
    expect(first.damageCoefficient).toEqual({
      levelGroup: "basic",
      base: 0.312,
      growth: 0.029,
    })
    expect(first.dazeCoefficient).toEqual({
      levelGroup: "basic",
      base: 0.156,
      growth: 0.008,
    })
    for (const [value, rank, expected] of [
      [1, 0, 0.312],
      [12, 0, 0.631],
      [14, 3, 0.689],
      [16, 5, 0.747],
    ]) {
      const result = resolveAgentAction({
        agent: data,
        actionId: first.actionId,
        mindscapeRank: rank!,
        levels: { basic: { mode: "effective", value: value! } },
      })
      expect(result.ok).toBe(true)
      if (!result.ok || result.calculation.kind !== "damage")
        throw new Error("fixture")
      expect(result.sourceDamageMultiplier).toBeCloseTo(expected!, 12)
      expect(result.calculation.segments[0]!.element).toBe("physical")
    }
    const fourth = data.actions.find(
      (a) => a.name === first.name && a.rowName === "四段伤害倍率",
    )!
    expect(fourth.calculation).toMatchObject({
      segments: [{ element: "electric" }],
    })
    const fall = data.actions.find((a) => a.name === "普通攻击：落雷")!
    expect(fall.parameterIds).toEqual(["1011005"])
    expect(fall.actionId).not.toContain("1011005")
    expect(fall.skillTargetIds).toEqual(["zzz-hp:skill:anby-basic-ms47yaat"])
    expect(
      resolveAgentAction({
        agent: data,
        actionId: first.actionId,
        mindscapeRank: 0,
        levels: { basic: { mode: "trained", value: 12 } },
        requireIndividualHits: true,
      }),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "individual-hits-required" }],
    })
  })

  it("reproduces Nicole's observed 342 + 144 × 3 with 40% defense reduction", async () => {
    const data = await agent("1031")
    const result = resolveAgentAction({
      agent: data,
      actionId: "action:agent:1031:basic-enhanced-1",
      mindscapeRank: 6,
      levels: { basic: { mode: "effective", value: 15 } },
      requireIndividualHits: true,
    })
    if (!result.ok || result.calculation.kind !== "damage")
      throw new Error("fixture")
    expect(result.levels.basic).toEqual({
      trained: 11,
      bonus: 4,
      effective: 15,
    })
    expect(result.sourceDamageMultiplier).toBeCloseTo(2.017, 12)
    expect(
      result.calculation.segments.map((segment) => segment.repeat),
    ).toEqual([1, 3])
    const targetBaseDefense = calculateTargetBaseDefense({
      targetLevelBase: calculateDefenseLevelBase(70),
      targetLevelOneBaseDefense: 58,
    })
    expect(targetBaseDefense).toBe(921.04)
    const values = (reduction: number) => {
      const factor = defenseFactor.calculate({
        attackerLevelBase: calculateDefenseLevelBase(60),
        targetEffectiveDefense: calculateTargetEffectiveDefense({
          targetBaseDefense,
          defensePercentageAdjustments: [-reduction],
          penetrationRatios: [],
          penetrationValues: [],
        }),
      })
      return result.calculation.kind === "damage"
        ? result.calculation.segments.flatMap((segment) =>
            Array<number>(segment.repeat).fill(
              segment.damageItems.reduce(
                (sum, item) => sum + item.damageMultiplier * 649.1691,
                0,
              ) * factor,
            ),
          )
        : []
    }
    expect(values(0.4).map(Math.ceil)).toEqual([342, 144, 144, 144])
    expect(calculateTotalDisplayedDamage(values(0.4))).toBe(774)
    expect(values(0).map(Math.ceil)).toEqual([269, 113, 113, 113])
    const normal = data.actions.find(
      (a) => a.name === "普通攻击：狡兔连打" && a.rowName === "一段伤害倍率",
    )!
    const normalResult = resolveAgentAction({
      agent: data,
      actionId: normal.actionId,
      mindscapeRank: 6,
      levels: { basic: { mode: "effective", value: 15 } },
    })
    expect(normalResult).toMatchObject({
      ok: true,
      sourceDamageMultiplier: 1.514,
    })
    expect(normal.actionId).not.toBe(result.actionId)
  })

  it("reads Zhao's health contribution from basic level even on a chain, requiring explicit stored charge", async () => {
    const data = await agent("1341")
    const action = data.actions.find((a) => a.name === "连携技：临时合作")!
    const input = {
      agent: data,
      actionId: action.actionId,
      mindscapeRank: 5,
      levels: {
        basic: { mode: "effective", value: 12 },
        chain: { mode: "effective", value: 8 },
      },
    } as const
    expect(() => resolveAgentAction(input)).toThrow(/chargeSeconds/)
    expect(() =>
      resolveAgentAction({ ...input, inputs: { chargeSeconds: 6 } }),
    ).toThrow(/chargeSeconds/)
    const result = resolveAgentAction({
      ...input,
      inputs: { chargeSeconds: 5 },
    })
    if (!result.ok || result.calculation.kind !== "damage")
      throw new Error("fixture")
    expect(result.calculation.segments[0]!.damageItems).toEqual([
      expect.objectContaining({ stat: "attack", damageMultiplier: 12.615 }),
      expect.objectContaining({ stat: "health", damageMultiplier: 1.2 }),
    ])
    expect(result.levels.basic!.effective).toBe(12)
    expect(result.levels.chain!.effective).toBe(8)
    expect(() =>
      resolveAgentAction({
        ...input,
        levels: { chain: input.levels.chain },
        inputs: { chargeSeconds: 0 },
      }),
    ).toThrow(/basic/)
  })

  it("keeps frost, sheer-force and luminize semantics separate without summing mutually exclusive charge stages", async () => {
    const miyabi = await agent("1091")
    const variants = miyabi.actions.filter((a) => a.name === "普通攻击：霜月")
    expect(variants).toHaveLength(3)
    expect(new Set(variants.map((a) => a.actionId)).size).toBe(3)
    expect(new Set(variants.map((a) => a.branchId)).size).toBe(1)
    expect(
      variants.every(
        (a) =>
          a.calculation.kind === "damage" &&
          a.calculation.segments[0]!.element === "frost",
      ),
    ).toBe(true)
    const yixuan = await agent("1371")
    expect(
      yixuan.actions.find((a) => a.name === "普通攻击：霄云劲")!.calculation,
    ).toMatchObject({
      kind: "damage",
      segments: [
        {
          damageKind: "sheer",
          element: "auric-ink",
          items: [{ stat: "sheerForce" }],
        },
      ],
    })
    const remiel = await agent("1581")
    const action = remiel.actions.find(
      (a) => a.name === "终结技：缭乱终幕" && a.calculation.kind === "luminize",
    )!
    const result = resolveAgentAction({
      agent: remiel,
      actionId: action.actionId,
      mindscapeRank: 0,
      levels: { chain: { mode: "effective", value: 12 } },
    })
    expect(result).toMatchObject({
      ok: true,
      skillCategory: "uncategorized",
      sourceDamageMultiplier: null,
      calculation: { kind: "luminize" },
    })
    if (!result.ok || result.calculation.kind !== "luminize")
      throw new Error("fixture")
    expect(result.calculation.multiplier).toBeCloseTo(3.36, 12)
    expect(action.skillTargetIds).toContain(
      "zzz-hp:skill:remiel-ultimate-mswz1sen",
    )
  })

  it("reports unresolved mixed attributes and special expressions, while preserving source coefficients", async () => {
    const data = await agent("1341")
    const dash = data.actions.find((a) => a.name === "冲刺攻击：弹跳冲刺")!
    expect(dash.damageCoefficient).not.toBeNull()
    expect(
      resolveAgentAction({
        agent: data,
        actionId: dash.actionId,
        mindscapeRank: 0,
        levels: {},
      }),
    ).toMatchObject({ ok: false, issues: [{ code: "mixed-elements" }] })
    expect(() =>
      resolveAgentAction({
        agent: data,
        actionId: "unknown",
        mindscapeRank: 0,
        levels: {},
      }),
    ).toThrow(/Unknown action/)
    const yanagi = await agent("1221")
    expect(
      yanagi.actions
        .filter((a) => a.rowName === "额外附加伤害倍率")
        .every(
          (a) =>
            a.calculation.kind === "unavailable" &&
            a.damageCoefficient === null,
        ),
    ).toBe(true)
  })

  it("rebuilds all 58 catalogs without dropped source rows and rejects semantic or level-bonus drift", async () => {
    const ids = [...new Set(registry.map((entry) => entry.entityId))]
    expect(ids).toHaveLength(58)
    for (const id of ids)
      expect(convertAgentActions(id, await details(id), registry)).toEqual(
        await agent(id),
      )
    const raw = await details("1031")
    raw.skill.basic!.description[3]!.param![0]!.desc =
      "{Skill:1031001, Prop:1001}"
    expect(() => convertAgentActions("1031", raw, registry)).toThrow(
      /signature/,
    )
    const changedBonus = await details("1031")
    changedBonus.talent["3"]!.desc = "技能等级+3"
    expect(() => convertAgentActions("1031", changedBonus, registry)).toThrow(
      /skill level bonus/,
    )
  })
})

describe("bounded linear expression parser", () => {
  it("retains sums, divisions and repeated terms without using attackData length", () => {
    expect(
      parseSkillExpression(
        "{Skill:1, Prop:1001} + {{Skill:2, Prop:1001}/3}*3",
        "1001",
      ),
    ).toEqual([
      { parameterId: "1", scale: 1 },
      { parameterId: "2", scale: 1 },
    ])
    expect(
      parseSkillExpression(
        "{{Skill:1, Prop:1001}*3+{Skill:2, Prop:1001}*6}",
        "1001",
      ),
    ).toEqual([
      { parameterId: "1", scale: 3 },
      { parameterId: "2", scale: 6 },
    ])
    expect(parseSkillExpression("{{Skill:1, Prop:1002}/7}", "1002")).toEqual([
      { parameterId: "1", scale: 1 / 7 },
    ])
  })
  it.each([
    "{Skill:1, Prop:1001}/0",
    "{Skill:1, Prop:1001}*{Skill:2, Prop:1001}",
    "{Skill:1, Prop:1001}+7",
    "{Skill:1, Prop:1002}",
    "globalThis.process.exit()",
    "{Skill:1, Prop:1001}}",
    "0",
    "{CAL:200+AvatarSkillLevel(0)*10,1,2}%",
  ])("rejects unverified expression %s", (expression) => {
    expect(() => parseSkillExpression(expression, "1001")).toThrow()
  })
})
