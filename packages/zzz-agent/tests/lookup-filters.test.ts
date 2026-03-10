import { expect, it } from "vitest"
import { lookupAgent } from "../src/mastra/tools/zzz/lookup-agent"
import { lookupWEngine } from "../src/mastra/tools/zzz/lookup-w-engine"
import { runTool } from "./shared"

it("accepts English aliases under zh-CN locale", async () => {
  const agents = await runTool(lookupAgent, {
    specialty: "Attack",
    attribute: "Electric",
    locale: "zh-CN",
  })
  const wEngines = await runTool(lookupWEngine, {
    specialty: "Stun",
    locale: "zh-CN",
  })

  expect((agents as any).found).toBe(true)
  expect((agents as any).total).toBeGreaterThan(0)
  expect((wEngines as any).found).toBe(true)
  expect((wEngines as any).total).toBeGreaterThan(0)
})

it("supports compact lookup responses for agent and w-engine", async () => {
  const agent = await runTool(lookupAgent, {
    name: "仪玄",
    level: 60,
    promotion: 6,
    coreSkillLevel: 7,
    compact: true,
    skillTypes: ["普通攻击", "特殊技"],
    locale: "zh-CN",
  })
  const wEngine = await runTool(lookupWEngine, {
    name: "牺牲洁纯",
    refinement: 1,
    compact: true,
    locale: "zh-CN",
  })

  expect((agent as any).found).toBe(true)
  expect((agent as any).agent.skills).toHaveLength(2)
  expect((agent as any).agent.stats).toBeUndefined()
  expect((agent as any).agent.promotions).toBeUndefined()
  expect((wEngine as any).found).toBe(true)
  expect((wEngine as any).wEngine.baseStat).toBeUndefined()
  expect((wEngine as any).wEngine.advancedStat).toBeUndefined()
})
