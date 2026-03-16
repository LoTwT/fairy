import { expect, it } from "vitest"
import { lookupGameMode } from "../src/mastra/tools/zzz/lookup-game-mode"
import { readJson, runTool } from "./shared"

it("returns newest game mode entries by default", async () => {
  const da = await runTool(lookupGameMode, { mode: "DA", locale: "zh-CN" })
  const sd = await runTool(lookupGameMode, {
    mode: "SD",
    difficulty: "Critical",
    locale: "zh-CN",
  })
  const ts = await runTool(lookupGameMode, {
    mode: "TS",
    difficulty: "Hard",
    locale: "zh-CN",
  })

  const daData = readJson<Array<{ versionKey: string }>>("deadly-assault.json")
  const sdData =
    readJson<Array<{ name: string; versions: Array<{ versionKey: string }> }>>(
      "shiyu-defense.json",
    )
  const tsData = readJson<
    Array<{ name: string; versions: Array<{ versionKey: string }> }>
  >("threshold-simulation.json")

  const critical = sdData.find((item) => item.name === "Critical Node")
  const hard = tsData.find((item) => item.name === "Hard Mode")

  expect((da as any).data.versionKey).toBe(daData[0]?.versionKey)
  expect((sd as any).difficulty).toBe("Critical Node")
  expect((sd as any).data.versionKey).toBe(critical?.versions[0]?.versionKey)
  expect((ts as any).difficulty).toBe("Hard Mode")
  expect((ts as any).data.versionKey).toBe(hard?.versions[0]?.versionKey)
})

it("returns normalized damageContext for game mode enemies", async () => {
  const da = await runTool(lookupGameMode, {
    mode: "DA",
    version: "2.7.3",
    enemyName: "太初梦魇",
    attribute: "玄墨",
    locale: "zh-CN",
  })
  const sd = await runTool(lookupGameMode, {
    mode: "SD",
    difficulty: "Critical",
    node: 1,
    side: 1,
    enemyName: "Bulky Intimidator",
    attribute: "冰属性",
    locale: "zh-CN",
  })
  const sdAmbiguous = await runTool(lookupGameMode, {
    mode: "SD",
    difficulty: "Critical",
    node: 1,
    side: 1,
    enemyName: "Raider",
    locale: "zh-CN",
  })
  const ts = await runTool(lookupGameMode, {
    mode: "TS",
    difficulty: "Hard",
    node: 1,
    side: 2,
    enemyName: "秉火领颂",
    attribute: "以太",
    locale: "zh-CN",
  })
  const tsSideThree = await runTool(lookupGameMode, {
    mode: "TS",
    difficulty: "Hard",
    node: 1,
    side: 3,
    enemyName: "秽息原牲",
    locale: "zh-CN",
  })

  expect((da as any).damageContext.enemyName).toBe("太初梦魇")
  expect((da as any).damageContext.attribute).toBe("ether")
  expect((da as any).damageContext.defenderBaseDefense).toBe(476)
  expect((da as any).damageContext.elementMultiplier).toBe(1.2)
  expect((da as any).damageContext.recommendedDefenderResistance).toBe(-0.2)
  expect((sd as any).damageContext.attribute).toBe("ice")
  expect((sd as any).damageContext.enemyName).toBe("Bulky Intimidator")
  expect((sd as any).damageContext.node).toBe(1)
  expect((sd as any).damageContext.side).toBe(1)
  expect((sdAmbiguous as any).selectedEnemy).toBeUndefined()
  expect((sdAmbiguous as any).enemyCandidates).toHaveLength(2)
  expect((sdAmbiguous as any).enemyCandidates[0]?.name).toBe("Raider")
  expect((ts as any).damageContext.attribute).toBe("ether")
  expect((ts as any).damageContext.enemyName).toBe("秉火领颂")
  expect((ts as any).damageContext.elementMultiplier).toBe(1)
  expect((ts as any).damageContext.sideElementMultiplier).toBe(1.2)
  expect((tsSideThree as any).selectedEnemy.side).toBe(3)
})

it("returns structured DA enemy candidates for ambiguous searches", async () => {
  const daAmbiguous = await runTool(lookupGameMode, {
    mode: "DA",
    version: "2.7.3",
    enemyName: "e",
    locale: "en",
  })

  expect((daAmbiguous as any).selectedEnemy).toBeUndefined()
  expect((daAmbiguous as any).enemyCandidates.length).toBeGreaterThan(1)
  expect((daAmbiguous as any).enemyCandidates[0]?.name).toBeTypeOf("string")
  expect((daAmbiguous as any).enemyCandidates[0]?.node).toBeUndefined()
})
