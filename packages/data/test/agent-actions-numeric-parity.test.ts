import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  numericLeafParityDrift,
  numericLeafPaths,
} from "../scripts/generate-agent-actions.ts"

describe("numeric leaf projection", () => {
  it("collects every number with a stable path and ignores localized text", () => {
    const value = {
      id: 1031,
      locale: "zh",
      name: "妮可",
      skill: {
        basic: {
          description: [
            { name: "一段", desc: "文本", potential: [1, 2] },
            {
              name: "参数行",
              param: { "1151023": { main: 92.5, growth: 0.5 } },
            },
          ],
        },
      },
    }
    expect(numericLeafPaths(value)).toEqual([
      "/id=1031",
      "/skill/basic/description/0/potential/0=1",
      "/skill/basic/description/0/potential/1=2",
      "/skill/basic/description/1/param/1151023/growth=0.5",
      "/skill/basic/description/1/param/1151023/main=92.5",
    ])
  })

  it("reports value and position differences, not localized text", () => {
    const zh = { a: { value: 1, text: "中文" }, list: [1, 2] }
    const en = { a: { value: 2, text: "English" }, list: [1, 3] }
    expect(numericLeafParityDrift(zh, en)).toEqual([
      "/a/value=1",
      "/a/value=2",
      "/list/1=2",
      "/list/1=3",
    ])
  })

  it("reports leaves present on only one side", () => {
    const zh = { shared: 1, zhOnly: 5 }
    const en = { shared: 1, enOnly: 7 }
    expect(numericLeafParityDrift(zh, en)).toEqual(["/enOnly=7", "/zhOnly=5"])
  })

  it("accepts structurally identical trees with equal numbers", () => {
    const zh = { id: 1, nested: { deep: [0, 1.5] } }
    const en = { id: 1, nested: { deep: [0, 1.5] } }
    expect(numericLeafParityDrift(zh, en)).toEqual([])
  })
})

describe("zh/en numeric parity of the published agent details", () => {
  it("keeps every agent's numeric leaves identical across zh and en", () => {
    // 与 generate-agent-actions 的生成期校验同一规则：动作目录只读 zh 数值，
    // 输入契约同时钉住 en 摘要；任何一侧数值漂移都必须先暴露在这里。
    const root = new URL("../integrated/agents", import.meta.url)
    const members = readdirSync(root)
    expect(members.length).toBeGreaterThan(0)
    for (const id of members) {
      const zh = JSON.parse(
        readFileSync(join(root.pathname, id, "details.zh.json"), "utf8"),
      )
      const en = JSON.parse(
        readFileSync(join(root.pathname, id, "details.en.json"), "utf8"),
      )
      const drift = numericLeafParityDrift(zh, en)
      expect(drift, `agents/${id}`).toEqual([])
    }
  })
})
