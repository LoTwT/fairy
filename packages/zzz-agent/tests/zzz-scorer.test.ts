import { expect, it } from "vitest"
import {
  getOutputFormatMatches,
  multiplierAccuracyScorer,
  scoreOutputFormat,
} from "../src/mastra/scorers/zzz-scorer"

it("requires markdown tables after section headings", () => {
  const response = `## 队伍配置说明
这里只是说明文字

## 仪玄增益清单
仍然没有表格`

  expect(scoreOutputFormat(response, ["calcDamage"])).toBe(0)
  expect(
    getOutputFormatMatches(`## 队伍配置
| 代理人 | 音擎 |
|---|---|`).find((item) => item.name === "队伍配置")?.matched,
  ).toBe(true)
})

it("skips format scoring when no damage calculation happened", () => {
  expect(scoreOutputFormat("## 队伍配置\n无表格", ["lookupAgent"])).toBe(1)
})

it("uses the same default judge model as the agent", () => {
  expect((multiplierAccuracyScorer as any).config.judge.model).toBe(
    "zhipuai/glm-4.6v",
  )
})
