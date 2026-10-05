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
      expect(result.resolutionContext).toEqual({
        agentEntityId: "1011",
        mindscapeRank: rank,
      })
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

  it("keeps unresolved classifications and special expressions unavailable", async () => {
    const data = await agent("1621")
    const unresolved = data.actions.find(
      (a) => a.actionId === "action:agent:1621:action:0022",
    )!
    expect(unresolved.damageCoefficient).not.toBeNull()
    expect(
      resolveAgentAction({
        agent: data,
        actionId: unresolved.actionId,
        mindscapeRank: 0,
        levels: {},
      }),
    ).toMatchObject({ ok: false, issues: [{ code: "unknown-category" }] })
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

  it("opens Claret's sharpen actions on defense scaling with reviewed target identities", async () => {
    const data = await agent("1611")
    const sharpen = data.actions.filter((a) => a.calculation.kind === "damage")
    expect(sharpen).toHaveLength(25)
    expect(
      data.actions.filter((a) => a.calculation.kind === "unavailable"),
    ).toHaveLength(0)
    expect(
      data.actions.filter((a) => a.calculation.kind === "daze-only"),
    ).toHaveLength(3)
    for (const action of sharpen) {
      expect(action.skillCategory).not.toBeNull()
      expect(action.calculation.kind).toBe("damage")
      if (action.calculation.kind !== "damage") continue
      for (const segment of action.calculation.segments) {
        expect(segment.damageKind).toBe("sharpen")
        expect(segment.element).toBe("electric")
        expect(segment.granularity).toBe("aggregate")
        expect(segment.items).toHaveLength(1)
        expect(segment.items[0]!.stat).toBe("defense")
      }
    }
    // 反制支援是 3.2 新支援分类；增益匹配归入支援别名组。
    const counter = data.actions.find((a) =>
      a.actionId.endsWith(":action:0007"),
    )!
    expect(counter.skillCategory).toBe("counter-assist")
    // 上游固定技能行的 12 级倍率（万分比原值 / 100）作为独立参考。
    for (const [suffix, multiplier] of [
      [":action:0019", 45.048],
      [":action:0015", 9.042],
      [":action:0027", 16.256],
      [":action:0007", 23.069],
    ] as const) {
      const action = data.actions.find((a) => a.actionId.endsWith(suffix))!
      const resolved = resolveAgentAction({
        agent: data,
        actionId: action.actionId,
        mindscapeRank: 6,
        levels: { [action.levelGroup]: { mode: "effective", value: 12 } },
      })
      expect(resolved.ok, action.actionId).toBe(true)
      if (!resolved.ok || resolved.calculation.kind !== "damage") continue
      expect(
        resolved.calculation.segments[0]!.damageItems[0]!.damageMultiplier,
      ).toBeCloseTo(multiplier, 12)
    }
    // 目标绑定与效果目录身份一一对应；锻星第三段同时保留通用与第三段目标。
    const expectedTargets: Record<string, string[]> = {
      ":action:0013": ["zzz-hp:skill:claret-basic-mtskq8rr"],
      ":action:0015": [
        "zzz-hp:skill:claret-basic-mtskq8rr",
        "zzz-hp:skill:claret-basic-mtsef46o",
      ],
      ":action:0016": [
        "zzz-hp:skill:claret-basic-mtskq8rr",
        "zzz-hp:skill:claret-basic-mtsef46o",
      ],
      ":action:0017": ["zzz-hp:skill:claret-basic-mtskqn2n"],
      ":action:0018": ["zzz-hp:skill:claret-chain-mtsefivk"],
      ":action:0019": ["zzz-hp:skill:claret-ultimate-mtsefude"],
      ":action:0027": ["zzz-hp:skill:claret-special-mtsecz30"],
    }
    for (const [suffix, targets] of Object.entries(expectedTargets)) {
      const action = data.actions.find((a) => a.actionId.endsWith(suffix))!
      expect(action.skillTargetIds, suffix).toEqual(targets)
    }
    expect(
      data.actions
        .filter((a) => a.actionId.endsWith(":action:0009"))
        .flatMap((a) => a.skillTargetIds),
    ).toEqual([])
  })

  it("rebuilds all 60 catalogs without dropped source rows and rejects semantic or level-bonus drift", async () => {
    const ids = [...new Set(registry.map((entry) => entry.entityId))]
    expect(ids).toHaveLength(60)
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

describe("potential-level action catalogue", () => {
  const anyLevels = {
    basic: { mode: "trained", value: 12 },
    dodge: { mode: "trained", value: 12 },
    assist: { mode: "trained", value: 12 },
    special: { mode: "trained", value: 12 },
    chain: { mode: "trained", value: 12 },
  } as const
  const potentialRows = [
    ["1021", "0016", [1, 2, 3, 4, 5, 6]],
    ["1041", "0014", [1, 2, 3, 4, 5, 6]],
    ["1041", "0015", [1, 2, 3, 4, 5, 6]],
    ["1041", "0016", [1, 2, 3, 4, 5, 6]],
    ["1041", "0017", [1, 2, 3, 4, 5, 6]],
    ["1141", "0006", [1, 2, 3, 4, 5, 6]],
    ["1171", "0023", [1, 2, 3, 4, 5, 6]],
    ["1181", "0014", [1, 2, 3, 4, 5, 6]],
    ["1181", "0015", [1, 2, 3, 4, 5, 6]],
    ["1181", "0016", [1, 2, 3, 4, 5, 6]],
    ["1191", "0012", [1, 2, 3, 4, 5, 6]],
    ["1191", "0013", [1, 2, 3, 4, 5, 6]],
    ["1191", "0014", [1, 2, 3, 4, 5, 6]],
    ["1191", "0015", [1, 2, 3, 4, 5, 6]],
    ["1191", "0016", [1, 2, 3, 4, 5, 6]],
    ["1201", "0016", [1, 2, 3, 4, 5, 6]],
    ["1201", "0022", [1, 2, 3, 4, 5, 6]],
    ["1201", "0025", [1, 2, 3, 4, 5, 6]],
    ["1211", "0008", [1, 2, 3, 4, 5, 6]],
    ["1211", "0009", [1, 2, 3, 4, 5, 6]],
    ["1211", "0010", [1, 2, 3, 4, 5, 6]],
    ["1211", "0011", [1, 2, 3, 4, 5, 6]],
    ["1261", "0014", [1, 2, 3, 4, 5, 6]],
    ["1261", "0027", [1, 2, 3, 4, 5, 6]],
    ["1381", "0009", [1, 2, 3, 4, 5, 6]],
    ["1381", "0022", [1, 2, 3, 4, 5, 6]],
    ["1261", "0013", [0]],
    ["1381", "0008", [0]],
  ] as const

  it("opens the reviewed potential rows with explicit availability sets", async () => {
    for (const [entityId, suffix, levels] of potentialRows) {
      const data = await agent(entityId)
      const action = data.actions.find(
        (entry) =>
          entry.actionId === `action:agent:${entityId}:action:${suffix}`,
      )!
      expect(action.potentialLevels, action.actionId).toEqual(levels)
      expect(action.calculation.kind, action.actionId).toBe("damage")
      for (const potentialLevel of levels) {
        const resolved = resolveAgentAction({
          agent: data,
          actionId: action.actionId,
          mindscapeRank: 0,
          levels: anyLevels,
          potentialLevel,
        })
        expect(resolved.ok, `${action.actionId}@P${potentialLevel}`).toBe(true)
        if (resolved.ok)
          expect(
            resolved.resolutionContext.potentialLevel,
            action.actionId,
          ).toBe(potentialLevel)
        else
          expect(
            resolved.issues.some(
              (issue) =>
                issue.code.startsWith("mixed-") ||
                issue.code === "unknown-element",
            ),
          ).toBe(false)
      }
    }
  })

  it("rejects unavailable, non-integral and out-of-domain potential levels", async () => {
    const data = await agent("1021")
    const actionId = "action:agent:1021:action:0016"
    for (const potentialLevel of [
      -1,
      7,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])
      expect(() =>
        resolveAgentAction({
          agent: data,
          actionId,
          mindscapeRank: 0,
          levels: anyLevels,
          potentialLevel,
        }),
      ).toThrow(RangeError)
    // P0 未解锁；省略潜能按 0 处理，同样拒绝
    for (const input of [
      {
        agent: data,
        actionId,
        mindscapeRank: 0,
        levels: anyLevels,
        potentialLevel: 0,
      },
      { agent: data, actionId, mindscapeRank: 0, levels: anyLevels },
    ])
      expect(() => resolveAgentAction(input)).toThrow(/not available/)
    // 普通分支动作只允许潜能 0
    const jane = await agent("1261")
    expect(() =>
      resolveAgentAction({
        agent: jane,
        actionId: "action:agent:1261:action:0013",
        mindscapeRank: 0,
        levels: anyLevels,
        potentialLevel: 1,
      }),
    ).toThrow(/not available/)
    expect(
      resolveAgentAction({
        agent: jane,
        actionId: "action:agent:1261:action:0013",
        mindscapeRank: 0,
        levels: anyLevels,
      }).ok,
    ).toBe(true)
  })

  it("conditions S0 Anby's follow-up identity on potential and the explicit fact", async () => {
    const data = await agent("1381")
    for (const [suffix, target] of [
      ["0014", "zzz-hp:follow-up-rule:fu-s0anby-chain-whole-ms0bpedc"],
      ["0015", "zzz-hp:follow-up-rule:fu-s0anby-ultimate-whole-ms0bpbx8"],
    ] as const) {
      const actionId = `action:agent:1381:action:${suffix}`
      const base = resolveAgentAction({
        agent: data,
        actionId,
        mindscapeRank: 0,
        levels: anyLevels,
        potentialLevel: 0,
      })
      expect(base.ok).toBe(true)
      if (base.ok) {
        expect(base.skillTargetIds).toEqual([])
        expect(base.skillTags).toEqual([])
        expect(base.resolutionContext).toEqual({
          agentEntityId: "1381",
          mindscapeRank: 0,
          potentialLevel: 0,
        })
      }
      // P1—6 缺事实或事实非法时拒绝
      expect(() =>
        resolveAgentAction({
          agent: data,
          actionId,
          mindscapeRank: 0,
          levels: anyLevels,
          potentialLevel: 6,
        }),
      ).toThrow(TypeError)
      expect(() =>
        resolveAgentAction({
          agent: data,
          actionId,
          mindscapeRank: 0,
          levels: anyLevels,
          potentialLevel: 6,
          additionalAbilityActive: "yes" as unknown as boolean,
        }),
      ).toThrow(TypeError)
      const inactive = resolveAgentAction({
        agent: data,
        actionId,
        mindscapeRank: 0,
        levels: anyLevels,
        potentialLevel: 6,
        additionalAbilityActive: false,
      })
      expect(inactive.ok).toBe(true)
      if (inactive.ok) {
        expect(inactive.skillTargetIds).toEqual([])
        expect(inactive.skillTags).toEqual([])
        expect(inactive.resolutionContext.additionalAbilityActive).toBe(false)
      }
      const active = resolveAgentAction({
        agent: data,
        actionId,
        mindscapeRank: 0,
        levels: anyLevels,
        potentialLevel: 6,
        additionalAbilityActive: true,
      })
      expect(active.ok).toBe(true)
      if (active.ok) {
        expect(active.skillTargetIds).toEqual([target])
        expect(active.skillTags).toEqual(["zzz-hp:follow-up"])
        expect(active.resolutionContext.additionalAbilityActive).toBe(true)
      }
    }
    // 逐雷按通用 dodge 分类，不借用 follow-up 身份
    const harumasa = await agent("1201")
    const dodge = harumasa.actions.find(
      (entry) => entry.actionId === "action:agent:1201:action:0022",
    )!
    expect(dodge.skillCategory).toBe("dodge")
    const resolved = resolveAgentAction({
      agent: harumasa,
      actionId: dodge.actionId,
      mindscapeRank: 0,
      levels: anyLevels,
      potentialLevel: 1,
    })
    expect(resolved.ok).toBe(true)
    if (resolved.ok) expect(resolved.skillCategory).toBe("dodge")
  })

  it("keeps the reviewed element conventions and aggregate assumptions explicit", async () => {
    const burnice = await agent("1171")
    expect(
      burnice.actions.find(
        (entry) => entry.actionId === "action:agent:1171:action:0023",
      )!.calculation,
    ).toMatchObject({ kind: "damage", segments: [{ element: "fire" }] })
    const rina = await agent("1211")
    for (const suffix of ["0008", "0009", "0010", "0011"] as const)
      expect(
        rina.actions.find(
          (entry) => entry.actionId === `action:agent:1211:action:${suffix}`,
        )!.calculation,
      ).toMatchObject({ kind: "damage", segments: [{ element: "electric" }] })
    const soldier = await agent("1041")
    const enhanced = soldier.actions.find(
      (entry) => entry.actionId === "action:agent:1041:action:0015",
    )!
    const extra = soldier.actions.find(
      (entry) => entry.actionId === "action:agent:1041:action:0016",
    )!
    // 主伤与“每消耗一次火力镇压”的额外伤害分别选择，保持 aggregate 且不新增次数输入
    for (const action of [enhanced, extra]) {
      expect(action.calculation).toMatchObject({
        kind: "damage",
        segments: [{ granularity: "aggregate", repeat: 1 }],
      })
      expect(action.inputs).toEqual([])
    }
    expect(enhanced.rowName).toBe("强化普攻第五段伤害倍率")
    expect(extra.rowName).toContain("额外伤害")
  })

  it("reproduces the reviewed level-12 reference coefficients", async () => {
    const rows = [
      ["1041", "0015", 8.839],
      ["1041", "0016", 1.664],
      ["1171", "0023", 4.001],
      ["1181", "0015", 0.3888620689655172],
      ["1201", "0022", 0.83],
      ["1211", "0008", 1.053],
      ["1211", "0009", 1.053],
      ["1211", "0010", 1.053],
      ["1211", "0011", 4.201],
      ["1261", "0014", 9.65],
      ["1381", "0009", 2.002],
      ["1191", "0014", 3.627],
      ["1191", "0015", 4.413],
      ["1191", "0016", 5.199],
    ] as const
    for (const [entityId, suffix, expected] of rows) {
      const data = await agent(entityId)
      const action = data.actions.find(
        (entry) =>
          entry.actionId === `action:agent:${entityId}:action:${suffix}`,
      )!
      const resolved = resolveAgentAction({
        agent: data,
        actionId: action.actionId,
        mindscapeRank: 0,
        levels: anyLevels,
        potentialLevel: 1,
      })
      expect(resolved.ok, action.actionId).toBe(true)
      if (resolved.ok)
        expect(resolved.sourceDamageMultiplier, action.actionId).toBeCloseTo(
          expected,
          9,
        )
    }
  })
})

describe("Velina Condensed Cyclone convention", () => {
  // 固定来源注记：微域/广域气旋只是方便处理列入特殊技大类，实则不属于任何类型；
  // 消散爆炸的 145%/255% 风属性异放是独立结算。期望倍率直接取 Nanoka 万分比曲线。
  const actionId = "action:agent:1561:action:0021"
  const microTarget = "zzz-hp:skill:velina-special-ms4tnsha"

  it("opens the micro-domain cyclone as one wind aggregate row with its own target and boundaries", async () => {
    const data = await agent("1561")
    const action = data.actions.find((entry) => entry.actionId === actionId)!
    expect(action.name).toBe("微域气旋")
    expect(action.rowName).toBe("伤害倍率")
    expect(action.branchId).toBe("agent:1561:branch:special-10")
    expect(action.levelGroup).toBe("special")
    expect(action.skillCategory).toBe("uncategorized")
    expect(action.skillTargetIds).toEqual([microTarget])
    expect(action.skillTags).toEqual([])
    expect(action.inputs).toEqual([])
    expect(action.potentialLevels).toBeUndefined()
    expect(action.conditionalIdentity).toBeUndefined()
    expect(action.source).toEqual({
      path: "agents/1561/details.zh.json",
      pointer: "/skill/special/description/9/param/0",
    })
    expect(action.descriptionSources).toEqual([])
    expect(action.parameterIds).toEqual(["1561021"])
    expect(action.sourceExpression).toBe("{Skill:1561021, Prop:1001}")
    expect(action.damageCoefficient).toEqual({
      levelGroup: "special",
      base: 0.325,
      growth: 0.03,
    })
    expect(action.dazeCoefficient).toEqual({
      levelGroup: "special",
      base: 1.375,
      growth: 0.063,
    })
    expect(action.upstreamSkillId).toBe("sk-velina-nk-1561021-main")
    expect(action.calculation).toEqual({
      kind: "damage",
      segments: [
        {
          segmentId: `${actionId}:total`,
          damageKind: "regular",
          element: "wind",
          granularity: "aggregate",
          repeat: 1,
          items: [
            {
              itemId: `${actionId}:base`,
              stat: "attack",
              coefficient: {
                levelGroup: "special",
                base: 0.325,
                growth: 0.03,
              },
            },
          ],
        },
      ],
    })
    const limitations = action.limitations.join("\n")
    expect(limitations).toContain("维琳娜气旋直伤约定")
    expect(limitations).toContain("不自动追加消散异放")
    expect(limitations).toContain(microTarget)
    expect(limitations).toContain("不附加 special 大类条件")
    expect(limitations).toContain("通用与元素增益仍按既有规则求值")
    expect(limitations).toContain("内部命中数尚未核实")
  })

  it("resolves levels 1/12/16 with the documented training and mindscape semantics", async () => {
    const data = await agent("1561")
    const resolve = (
      mindscapeRank: number,
      level: SkillLevelInput,
      requireIndividualHits?: boolean,
    ) =>
      resolveAgentAction({
        agent: data,
        actionId,
        mindscapeRank,
        levels: { special: level },
        ...(requireIndividualHits === undefined
          ? {}
          : { requireIndividualHits }),
      })
    for (const [level, rank, damage, daze] of [
      [1, 0, 0.325, 1.375],
      [12, 0, 0.655, 2.068],
      [16, 5, 0.775, 2.32],
      [16, 6, 0.775, 2.32],
    ] as const) {
      const resolved = resolve(rank, { mode: "effective", value: level })
      expect(resolved.ok, `L${level}@M${rank}`).toBe(true)
      if (!resolved.ok) throw new Error("fixture")
      expect(resolved.resolutionContext).toEqual({
        agentEntityId: "1561",
        mindscapeRank: rank,
      })
      expect(resolved.sourceDamageMultiplier).toBeCloseTo(damage, 12)
      expect(resolved.dazeMultiplier).toBeCloseTo(daze, 12)
      expect(resolved.skillCategory).toBe("uncategorized")
      expect(resolved.skillTargetIds).toEqual([microTarget])
    }
    // M3 训练 12 → 最终 14；M5 最终 12 保持 12（训练 8）。
    const m3 = resolve(3, { mode: "trained", value: 12 })
    expect(m3.ok).toBe(true)
    if (!m3.ok) throw new Error("fixture")
    expect(m3.levels.special).toEqual({ trained: 12, bonus: 2, effective: 14 })
    expect(m3.sourceDamageMultiplier).toBeCloseTo(0.325 + 0.03 * 13, 12)
    const m5Trained = resolve(5, { mode: "trained", value: 12 })
    expect(m5Trained.ok).toBe(true)
    if (!m5Trained.ok) throw new Error("fixture")
    expect(m5Trained.levels.special).toEqual({
      trained: 12,
      bonus: 4,
      effective: 16,
    })
    expect(m5Trained.sourceDamageMultiplier).toBeCloseTo(0.775, 12)
    const m5Effective = resolve(5, { mode: "effective", value: 12 })
    expect(m5Effective.ok).toBe(true)
    if (!m5Effective.ok) throw new Error("fixture")
    expect(m5Effective.levels.special).toEqual({
      trained: 8,
      bonus: 4,
      effective: 12,
    })
    expect(m5Effective.sourceDamageMultiplier).toBeCloseTo(0.655, 12)
    // 未核实档位、越界、非整数与缺失培养等级照旧拒绝，不补档、不截断。
    for (const resolution of [
      () => resolve(0, { mode: "effective", value: 16 }),
      () => resolve(0, { mode: "trained", value: 13 }),
      () => resolve(0, { mode: "effective", value: 12.5 }),
      () => resolve(5, { mode: "trained", value: 13 }),
      () =>
        resolveAgentAction({
          agent: data,
          actionId,
          mindscapeRank: 0,
          levels: {},
        }),
    ])
      expect(resolution).toThrow()
    expect(resolve(0, { mode: "effective", value: 12 }, true)).toMatchObject({
      ok: false,
      issues: [{ code: "individual-hits-required" }],
    })
  })

  it("keeps the wide-domain row available and the dyed or deferred rows closed", async () => {
    const data = await agent("1561")
    const wide = data.actions.find(
      (entry) => entry.actionId === "action:agent:1561:action:0019",
    )!
    expect(wide.name).toBe("广域气旋")
    expect(wide.skillCategory).toBe("uncategorized")
    expect(wide.skillTargetIds).toEqual([
      "zzz-hp:skill:velina-special-ms4tnzvq",
    ])
    expect(wide.calculation).toMatchObject({
      kind: "damage",
      segments: [{ element: "wind", granularity: "aggregate", repeat: 1 }],
    })
    const dyed = data.actions.find(
      (entry) => entry.actionId === "action:agent:1561:action:0020",
    )!
    expect(dyed.calculation).toMatchObject({
      kind: "unavailable",
      issues: [{ code: "unknown-element" }],
    })
    for (const [id, suffix] of [
      ["1221", "0018"],
      ["1221", "0024"],
      ["1451", "0025"],
    ] as const) {
      const other = await agent(id)
      expect(
        other.actions.find(
          (entry) => entry.actionId === `action:agent:${id}:action:${suffix}`,
        )!.calculation.kind,
      ).toBe("unavailable")
    }
  })
})

describe("generic assist entry-action convention", () => {
  // 具名通用 assist 登场技直伤约定：照的霜迸、叶瞬光的照影按 generic assist 只计算
  // 所选招式的直接攻击力伤害。期望倍率直接取 Nanoka 万分比曲线在 1/12/16 级的独立取值：
  // 照 (68030 + 6190 × (L − 1)) / 10000、失衡 (23020 + 1050 × (L − 1)) / 10000；
  // 叶瞬光 (40040 + 3640 × (L − 1)) / 10000、失衡 (12100 + 550 × (L − 1)) / 10000。
  const rows = [
    {
      entityId: "1341",
      suffix: "0001",
      name: "登场技：霜迸",
      branchId: "agent:1341:branch:assist-5",
      element: "ice",
      upstreamSkillId: "sk-zhao-nk-1341015-main",
      damageBase: 6.803,
      damageGrowth: 0.619,
      dazeBase: 23020 / 10000,
      dazeGrowth: 0.105,
      level16Damage: 16.088,
      level16Daze: 3.877,
    },
    {
      entityId: "1431",
      suffix: "0001",
      name: "登场技：照影",
      branchId: "agent:1431:branch:assist-7",
      element: "physical",
      upstreamSkillId: "sk-yeshunguang-direct-mtsgty6b",
      damageBase: 4.004,
      damageGrowth: 0.364,
      dazeBase: 1.21,
      dazeGrowth: 0.055,
      level16Damage: 9.464,
      level16Daze: 2.035,
    },
  ] as const

  it.each(rows)(
    "opens $name as one generic assist aggregate without subcategory identity",
    async (row) => {
      const data = await agent(row.entityId)
      const actionId = `action:agent:${row.entityId}:action:${row.suffix}`
      const action = data.actions.find((a) => a.actionId === actionId)!
      expect(action.name).toBe(row.name)
      expect(action.rowName).toBe("伤害倍率")
      expect(action.branchId).toBe(row.branchId)
      expect(action.levelGroup).toBe("assist")
      expect(action.skillCategory).toBe("assist")
      expect(action.skillTargetIds).toEqual([])
      expect(action.skillTags).toEqual([])
      expect(action.inputs).toEqual([])
      expect(action.potentialLevels).toBeUndefined()
      expect(action.conditionalIdentity).toBeUndefined()
      expect(action.upstreamSkillId).toBe(row.upstreamSkillId)
      expect(action.damageCoefficient).toEqual({
        levelGroup: "assist",
        base: row.damageBase,
        growth: row.damageGrowth,
      })
      expect(action.dazeCoefficient).toEqual({
        levelGroup: "assist",
        base: row.dazeBase,
        growth: row.dazeGrowth,
      })
      expect(action.calculation).toEqual({
        kind: "damage",
        segments: [
          {
            segmentId: `${actionId}:total`,
            damageKind: "regular",
            element: row.element,
            granularity: "aggregate",
            repeat: 1,
            items: [
              {
                itemId: `${actionId}:base`,
                stat: "attack",
                coefficient: {
                  levelGroup: "assist",
                  base: row.damageBase,
                  growth: row.damageGrowth,
                },
              },
            ],
          },
        ],
      })
      const limitations = action.limitations.join("\n")
      expect(limitations).toContain("通用 assist 登场技直伤约定")
      expect(limitations).toContain("不获得 quick-assist 等具体支援子类身份")
      expect(limitations).toContain("内部命中数尚未核实")
    },
  )

  it.each(rows)(
    "resolves $name at levels 1/12/16 with the documented mindscape semantics",
    async (row) => {
      const data = await agent(row.entityId)
      const actionId = `action:agent:${row.entityId}:action:${row.suffix}`
      const resolve = (
        mindscapeRank: number,
        level: SkillLevelInput,
        requireIndividualHits?: boolean,
      ) =>
        resolveAgentAction({
          agent: data,
          actionId,
          mindscapeRank,
          levels: { assist: level },
          ...(requireIndividualHits === undefined
            ? {}
            : { requireIndividualHits }),
        })
      for (const [level, rank, damage, daze] of [
        [1, 0, row.damageBase, row.dazeBase],
        [
          12,
          0,
          row.damageBase + 11 * row.damageGrowth,
          row.dazeBase + 11 * row.dazeGrowth,
        ],
        [16, 5, row.level16Damage, row.level16Daze],
        [16, 6, row.level16Damage, row.level16Daze],
      ] as const) {
        const resolved = resolve(rank, { mode: "effective", value: level })
        expect(resolved.ok, `L${level}@M${rank}`).toBe(true)
        if (!resolved.ok) throw new Error("fixture")
        expect(resolved.resolutionContext).toEqual({
          agentEntityId: row.entityId,
          mindscapeRank: rank,
        })
        expect(resolved.sourceDamageMultiplier).toBeCloseTo(damage, 12)
        expect(resolved.dazeMultiplier).toBeCloseTo(daze, 12)
        expect(resolved.skillCategory).toBe("assist")
        expect(resolved.skillTargetIds).toEqual([])
      }
      // M5 最终 12 保持训练 8、提升 4，不再叠加；M5 训练 12 才是最终 16。
      const m5Effective = resolve(5, { mode: "effective", value: 12 })
      expect(m5Effective.ok).toBe(true)
      if (!m5Effective.ok) throw new Error("fixture")
      expect(m5Effective.levels.assist).toEqual({
        trained: 8,
        bonus: 4,
        effective: 12,
      })
      expect(m5Effective.sourceDamageMultiplier).toBeCloseTo(
        row.damageBase + 11 * row.damageGrowth,
        12,
      )
      // M0 拒绝合法范围外的最终 16；未核实档位、越界、小数与缺失培养等级照旧拒绝。
      for (const resolution of [
        () => resolve(0, { mode: "effective", value: 16 }),
        () => resolve(0, { mode: "trained", value: 13 }),
        () => resolve(0, { mode: "effective", value: 12.5 }),
        () => resolve(5, { mode: "trained", value: 13 }),
        () =>
          resolveAgentAction({
            agent: data,
            actionId,
            mindscapeRank: 0,
            levels: {},
          }),
      ])
        expect(resolution).toThrow()
      expect(resolve(0, { mode: "effective", value: 12 }, true)).toMatchObject({
        ok: false,
        issues: [{ code: "individual-hits-required" }],
      })
    },
  )
})

const guardPigActionId = (suffix: string) =>
  `action:agent:1151:action:${suffix}` as const

describe("Lucy guard-pig panel proxy convention", () => {
  // 固定 ZZZ-HP 露西面板代算约定：四条独立倍率行，登记火属性、合计一次。
  // 期望倍率直接取 Nanoka 万分比曲线在 1/12/16 级的独立取值。
  const rows = [
    {
      suffix: "0011",
      name: "亲卫队小猪：抄家伙！",
      weapon: "棒球棍",
      skillPointer: "/skill/basic/description/4/param/0",
      descriptionPointer: "/skill/basic/description/1/desc",
      parameterId: "1151023",
      upstreamSkillId: "sk-lucy-nk-1151023-棒球棍",
      upstreamPointer: "/skills/492",
      level1: 0.925,
      level12: 1.86,
      level16: 2.2,
      dazeBase: 0.155,
      dazeGrowth: 0.008,
    },
    {
      suffix: "0012",
      name: "亲卫队小猪：抄家伙！",
      weapon: "拳套",
      skillPointer: "/skill/basic/description/4/param/1",
      descriptionPointer: "/skill/basic/description/1/desc",
      parameterId: "1151024",
      upstreamSkillId: "sk-lucy-nk-1151024-拳套",
      upstreamPointer: "/skills/491",
      level1: 1.275,
      level12: 2.551,
      level16: 3.015,
      dazeBase: 0.213,
      dazeGrowth: 0.01,
    },
    {
      suffix: "0013",
      name: "亲卫队小猪：抄家伙！",
      weapon: "弹弓",
      skillPointer: "/skill/basic/description/4/param/2",
      descriptionPointer: "/skill/basic/description/1/desc",
      parameterId: "1151025",
      upstreamSkillId: "sk-lucy-nk-1151025-弹弓",
      upstreamPointer: "/skills/490",
      level1: 1.75,
      level12: 3.51,
      level16: 4.15,
      dazeBase: 0.292,
      dazeGrowth: 0.014,
    },
    {
      suffix: "0014",
      name: "亲卫队小猪：回旋挥击！",
      weapon: "回旋挥击",
      skillPointer: "/skill/basic/description/5/param/0",
      descriptionPointer: "/skill/basic/description/2/desc",
      parameterId: "1151026",
      upstreamSkillId: "sk-lucy-nk-1151026-回旋挥击",
      upstreamPointer: "/skills/489",
      level1: 2.5,
      level12: 5.008,
      level16: 5.92,
      dazeBase: 0.2,
      dazeGrowth: 0.01,
    },
  ] as const

  it.each(rows)(
    "keeps $suffix ($weapon) a single fire aggregate row with its own source identity",
    async (row) => {
      const data = await agent("1151")
      const action = data.actions.find(
        (entry) => entry.actionId === guardPigActionId(row.suffix),
      )!
      expect(action.name).toBe(row.name)
      expect(action.levelGroup).toBe("basic")
      expect(action.skillCategory).toBe("basic")
      expect(action.source).toEqual({
        path: "agents/1151/details.zh.json",
        pointer: row.skillPointer,
      })
      expect(action.descriptionSources).toEqual([
        {
          path: "agents/1151/details.zh.json",
          pointer: row.descriptionPointer,
        },
      ])
      expect(action.parameterIds).toEqual([row.parameterId])
      expect(action.sourceExpression).toBe(
        `{Skill:${row.parameterId}, Prop:1001}`,
      )
      expect(action.damageCoefficient).toMatchObject({
        levelGroup: "basic",
        base: row.level1,
      })
      expect(action.damageCoefficient!.growth).toBeCloseTo(
        (row.level12 - row.level1) / 11,
        12,
      )
      // 失衡曲线独立于伤害，取自 Nanoka 同参数行的 Prop:1002。
      expect(action.dazeCoefficient).toMatchObject({
        levelGroup: "basic",
        base: row.dazeBase,
      })
      expect(action.dazeCoefficient!.growth).toBeCloseTo(row.dazeGrowth, 12)
      expect(action.upstreamSkillId).toBe(row.upstreamSkillId)
      expect(action.skillTargetIds).toEqual([])
      expect(action.skillTags).toEqual([])
      expect(action.inputs).toEqual([])
      expect(action.potentialLevels).toBeUndefined()
      expect(action.conditionalIdentity).toBeUndefined()
      // Nanoka 中文正文写为物理伤害；约定据此不采用，但保留冲突记录。
      expect(action.description).toContain("物理伤害")
      const limitations = action.limitations.join("\n")
      expect(limitations).toContain("ZZZ-HP 露西面板代算约定")
      expect(limitations).toContain(row.upstreamPointer)
      expect(limitations).toContain("Nanoka 中文正文写为物理伤害")
      expect(limitations).toContain("repeat: 1 不代表已确认内部仅一次命中")
      expect(action.calculation).toMatchObject({
        kind: "damage",
        segments: [
          {
            segmentId: `${guardPigActionId(row.suffix)}:total`,
            damageKind: "regular",
            element: "fire",
            granularity: "aggregate",
            repeat: 1,
            items: [
              {
                itemId: `${guardPigActionId(row.suffix)}:base`,
                stat: "attack",
              },
            ],
          },
        ],
      })
    },
  )

  it("resolves each weapon row independently at levels 1, 12 and 16", async () => {
    const data = await agent("1151")
    const branches = new Set<string>()
    for (const row of rows) {
      const action = data.actions.find(
        (entry) => entry.actionId === guardPigActionId(row.suffix),
      )!
      branches.add(action.branchId)
      for (const [level, rank, expected] of [
        [1, 0, row.level1],
        [12, 0, row.level12],
        [16, 6, row.level16],
      ] as const) {
        const resolved = resolveAgentAction({
          agent: data,
          actionId: action.actionId,
          mindscapeRank: rank,
          levels: { basic: { mode: "effective", value: level } },
        })
        expect(resolved.ok, `${row.suffix}@${level}`).toBe(true)
        if (!resolved.ok || resolved.calculation.kind !== "damage")
          throw new Error("fixture")
        expect(resolved.sourceDamageMultiplier).toBeCloseTo(expected, 12)
        expect(resolved.skillCategory).toBe("basic")
        expect(resolved.skillTargetIds).toEqual([])
        expect(resolved.skillTags).toEqual([])
        // 三种武器与回旋挥击各自一整行，不把相邻行相加成三段。
        expect(resolved.calculation.segments).toHaveLength(1)
        expect(resolved.calculation.segments[0]!.repeat).toBe(1)
        expect(resolved.calculation.segments[0]!.granularity).toBe("aggregate")
      }
      expect(
        resolveAgentAction({
          agent: data,
          actionId: action.actionId,
          mindscapeRank: 0,
          levels: { basic: { mode: "effective", value: 12 } },
          requireIndividualHits: true,
        }),
      ).toMatchObject({
        ok: false,
        issues: [{ code: "individual-hits-required" }],
      })
      expect(() =>
        resolveAgentAction({
          agent: data,
          actionId: action.actionId,
          mindscapeRank: 0,
          levels: { basic: { mode: "effective", value: 17 } },
        }),
      ).toThrow()
    }
    // 球棍、拳套、弹弓属于同一说明分支；回旋挥击独立分支。
    expect(branches.size).toBe(2)
  })
})
