#!/usr/bin/env node
import { spawnSync } from "node:child_process"

async function isCoreDistFresh() {
  try {
    const { parseGameData } = await import("../packages/core/dist/index.mjs")
    parseGameData({
      schemaVersion: "game-data-v1",
      gameVersion: "ZZZ-2.8",
      dataVersion: "freshness-check",
      sourceVersion: "nanoka-zzz@2.8",
      generatedAt: "2026-05-16T02:20:56+08:00",
      sources: [],
      agents: {},
      skills: {},
      bangboos: {},
      bangbooSkills: {},
      wEngines: {},
      driveDiscs: {},
      enemies: {},
      deadlyAssaultPeriods: {},
      historicalDAPeriods: {},
      resonium: {},
      modifiers: {},
      rules: {},
      aliases: {
        fields: {},
        enumValues: {},
        sourceTerms: {},
      },
    })
    return true
  }
  catch {
    return false
  }
}

if (!(await isCoreDistFresh())) {
  const result = spawnSync("pnpm", ["--filter", "@randomplay/core", "build"], {
    stdio: "inherit",
  })
  if (result.status !== 0)
    process.exit(result.status ?? 1)
}
