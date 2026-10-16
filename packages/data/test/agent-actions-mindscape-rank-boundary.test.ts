import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import type { AgentActions } from "../src/skills/types.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"

const json = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"))
const agent = (id: string) =>
  json<AgentActions>(`../.generated/definitions/skills/agents/${id}.json`)

describe("resolveAgentAction mindscape rank boundary", () => {
  // 入口把 mindscapeRank 限定在 0—6。unavailable 动作在曲线求值前提前返回，
  // 不会经过共享层的等级校验，越界影画等级只能由入口校验拒绝。
  it("rejects out-of-range mindscape ranks on every unavailable action", async () => {
    const unavailableByAgent = [
      ["1221", 2],
      ["1451", 1],
      ["1561", 1],
    ] as const
    for (const [id, expectedCount] of unavailableByAgent) {
      const data = await agent(id)
      const unavailable = data.actions.filter(
        (action) => action.calculation.kind === "unavailable",
      )
      expect(unavailable, id).toHaveLength(expectedCount)
      for (const action of unavailable) {
        for (const mindscapeRank of [7, -1])
          expect(() =>
            resolveAgentAction({
              agent: data,
              actionId: action.actionId,
              mindscapeRank,
              levels: {},
            }),
          ).toThrow(/Mindscape/)
        // 合法边界 6 仍照常返回 unavailable 的不可用结论，拒绝只针对越界等级。
        expect(
          resolveAgentAction({
            agent: data,
            actionId: action.actionId,
            mindscapeRank: 6,
            levels: {},
          }),
        ).toMatchObject({ ok: false })
      }
    }
  })

  it("rejects out-of-range mindscape ranks on daze-only actions", async () => {
    const anby = await agent("1011")
    const dazeOnly = anby.actions.filter(
      (action) => action.calculation.kind === "daze-only",
    )
    expect(dazeOnly).toHaveLength(3)
    for (const action of dazeOnly)
      for (const mindscapeRank of [7, -1])
        expect(() =>
          resolveAgentAction({
            agent: anby,
            actionId: action.actionId,
            mindscapeRank,
            levels: { assist: { mode: "trained", value: 12 } },
          }),
        ).toThrow(/Mindscape/)
    expect(
      resolveAgentAction({
        agent: anby,
        actionId: dazeOnly[0]!.actionId,
        mindscapeRank: 6,
        levels: { assist: { mode: "trained", value: 12 } },
      }),
    ).toMatchObject({ ok: true, calculation: { kind: "daze-only" } })
  })

  // 无任何系数的 daze-only 动作不求值曲线，共享层校验同样不会执行；生成数据
  // 里所有 daze-only 动作都带失衡曲线，因此用去除系数的合成动作覆盖这条
  // 不依赖共享层兜底的路径。
  it("rejects out-of-range mindscape ranks on daze-only actions without coefficients", async () => {
    const anby = await agent("1011")
    const target = anby.actions.find(
      (action) => action.calculation.kind === "daze-only",
    )!
    const coefficientless = {
      ...anby,
      actions: anby.actions.map((action) =>
        action.actionId === target.actionId
          ? { ...action, dazeCoefficient: null }
          : action,
      ),
    }
    expect(
      resolveAgentAction({
        agent: coefficientless,
        actionId: target.actionId,
        mindscapeRank: 6,
        levels: {},
      }),
    ).toMatchObject({ ok: true, calculation: { kind: "daze-only" } })
    for (const mindscapeRank of [7, -1])
      expect(() =>
        resolveAgentAction({
          agent: coefficientless,
          actionId: target.actionId,
          mindscapeRank,
          levels: {},
        }),
      ).toThrow(/Mindscape/)
  })
})
