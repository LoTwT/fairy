import type {
  DeadlyAssaultJson,
  ShiyuDefenseJson,
  ThresholdSimulationJson,
} from "../../src"

import { describe, expect, it } from "vitest"
import {
  analyzeVersionPeriod,
  findDAVersion,
  findSDMode,
  findSDVersion,
  findTSMode,
  findTSVersion,
  getDefaultSDMode,
  getDefaultTSMode,
  getLatestDAVersion,
  getLatestSDVersion,
  getLatestTSVersion,
  resolveSDModeName,
  resolveTSModeName,
  selectSDMode,
  selectTSMode,
} from "../../src"

describe("cleaned version helpers", () => {
  it("analyzes display-only version periods", () => {
    expect(analyzeVersionPeriod("04/07/2024 - PRESENT")).toEqual({
      raw: "04/07/2024 - PRESENT",
      startLabel: "04/07/2024",
      endLabel: "PRESENT",
      isRange: true,
      isOngoing: true,
      isPlaceholder: false,
    })

    expect(analyzeVersionPeriod("xx/xx/20xx - xx/xx/20xx")).toEqual({
      raw: "xx/xx/20xx - xx/xx/20xx",
      startLabel: "xx/xx/20xx",
      endLabel: "xx/xx/20xx",
      isRange: true,
      isOngoing: false,
      isPlaceholder: true,
    })
  })

  it("returns the leading published version as the latest DA version", () => {
    const data: DeadlyAssaultJson = [
      {
        versionKey: "2.7.3",
        versionName: "2.7 Phase 3",
        versionTime: "xx/xx/20xx - xx/xx/20xx",
        versionDazeMult: 100,
        versionAnomMult: 100,
        buffs: [],
        versionEnemies: [],
      },
      {
        versionKey: "1.4.1",
        versionName: "1.4 Phase 1",
        versionTime: "xx/xx/20xx - xx/xx/20xx",
        versionDazeMult: 100,
        versionAnomMult: 100,
        buffs: [],
        versionEnemies: [],
      },
    ]

    expect(getLatestDAVersion(data)?.versionKey).toBe("2.7.3")
  })

  it("finds SD/TS modes by normalized names and returns their leading versions", () => {
    const sd: ShiyuDefenseJson = [
      {
        name: "Stable Node",
        versions: [],
      },
      {
        name: "Critical Node",
        versions: [
          {
            versionKey: "2.7.3",
            versionName: "2.7.3",
            versionTime: "04/07/2024 - PRESENT",
            versionDazeMult: 100,
            versionAnomMult: 100,
            nodes: [],
          },
        ],
      },
    ]
    const ts: ThresholdSimulationJson = [
      {
        name: "Easy Mode",
        versions: [],
      },
      {
        name: "Hard Mode",
        versions: [
          {
            versionKey: "2.7.0",
            versionName: "2.7.0",
            versionTime: "14/10/2025 - PRESENT",
            versionBossDazeMult: 100,
            versionEnemyDazeMult: 100,
            versionBossAnomMult: 110,
            versionEnemyAnomMult: 100,
            nodes: [],
          },
        ],
      },
    ]

    expect(findSDMode(sd, "critical-node")?.name).toBe("Critical Node")
    expect(resolveSDModeName(sd, "critical")).toBe("Critical Node")
    expect(getDefaultSDMode(sd)?.name).toBe("Critical Node")
    expect(selectSDMode(sd)?.name).toBe("Critical Node")
    expect(getLatestSDVersion(sd, "Critical Node")?.versionKey).toBe("2.7.3")
    expect(
      findSDVersion(sd, { modeName: "critical", versionKey: "2.7.3" })
        ?.versionKey,
    ).toBe("2.7.3")
    expect(findTSMode(ts, "hard-mode")?.name).toBe("Hard Mode")
    expect(resolveTSModeName(ts, "hard")).toBe("Hard Mode")
    expect(getDefaultTSMode(ts)?.name).toBe("Hard Mode")
    expect(selectTSMode(ts)?.name).toBe("Hard Mode")
    expect(getLatestTSVersion(ts, "Hard Mode")?.versionKey).toBe("2.7.0")
    expect(
      findTSVersion(ts, { modeName: "hard", versionKey: "2.7.0" })?.versionKey,
    ).toBe("2.7.0")
  })

  it("finds DA versions by key or falls back to the leading version", () => {
    const data: DeadlyAssaultJson = [
      {
        versionKey: "2.7.3",
        versionName: "2.7 Phase 3",
        versionTime: "xx/xx/20xx - xx/xx/20xx",
        versionDazeMult: 100,
        versionAnomMult: 100,
        buffs: [],
        versionEnemies: [],
      },
      {
        versionKey: "1.4.1",
        versionName: "1.4 Phase 1",
        versionTime: "xx/xx/20xx - xx/xx/20xx",
        versionDazeMult: 100,
        versionAnomMult: 100,
        buffs: [],
        versionEnemies: [],
      },
    ]

    expect(findDAVersion(data)?.versionKey).toBe("2.7.3")
    expect(findDAVersion(data, "1.4.1")?.versionKey).toBe("1.4.1")
  })
})
