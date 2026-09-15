import { describe, expect, it } from "vitest"
import { agentSchema } from "../src/integration/agent-schema.ts"
import type { Schema } from "../src/integration/agent-schema.ts"
import { integrateAgent } from "../src/integration/integrate-agent.ts"
import { agentInput } from "./fixtures/agent-source.ts"

describe("共享结构登记约束", () => {
  it.each<{ schema: Schema; pointer: string }>([
    {
      schema: {
        kind: "array",
        item: {
          kind: "object",
          empty: false,
          fields: { value: { kind: "number", shared: true } },
        },
      },
      pointer: "/item/fields/value",
    },
    {
      schema: {
        kind: "array",
        shared: true,
        item: { kind: "number", shared: true },
      },
      pointer: "/item",
    },
    ...(["number", "array", "object"] as const).map((kind) => ({
      schema: {
        kind: "dictionary",
        ids: false,
        item: {
          ...(kind === "array"
            ? { kind, item: { kind: "number" as const } }
            : kind === "object"
              ? { kind, fields: {}, empty: false }
              : { kind }),
          shared: true,
        },
      } satisfies Schema,
      pointer: "/item",
    })),
  ])("拒绝不支持的共享登记，即使可选来源字段缺失 %#", ({ schema, pointer }) => {
    if (agentSchema.kind !== "object") throw new Error("代理人登记根必须是对象")
    const input = agentInput()
    const before = structuredClone(input)
    // 仅在当前测试内模拟维护者新增登记；不并发执行，finally 恢复模块状态。
    agentSchema.fields["future/~"] = { ...schema, optional: true }
    try {
      expect(() => integrateAgent(input)).toThrow(
        `不支持的共享结构登记 /fields/future~1~0${pointer}`,
      )
      expect(input).toEqual(before)
    } finally {
      delete agentSchema.fields["future/~"]
    }
  })

  it("当前登记允许整块共享数组和按 key 拆分对象", () => {
    const result = integrateAgent(agentInput())
    expect(result.data.levelExp).toEqual([10, 0])
    expect(result.data.skillPriority[0].firstPriority).toEqual([2, 1, 2])
    expect(result.data.skin["1"]).toEqual({ image: "original_image" })
    expect(result.details.zh!.skin["1"]).toEqual({ name: "", desc: "" })
  })
})
