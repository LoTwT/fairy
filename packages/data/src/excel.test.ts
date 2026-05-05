import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const auditPath = join(repoRoot, "data/source/excel/workbook-audit.json")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

describe("lo-user Excel workbook source audit", () => {
  it("passes offline workbook hash and sheet-shape verification", () => {
    execFileSync(
      "node",
      ["scripts/excel-source.mjs", "verify"],
      {
        cwd: join(repoRoot, "packages/data"),
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
  })

  it("records the V1 narrowed candidate and deferred sheet boundaries", () => {
    const audit = readJson<{
      workbook: {
        version: string
        sheetCount: number
      }
      missingRequiredCandidateSheets: string[]
      v1CandidateSheets: string[]
      deferredSheets: string[]
      sheets: Array<{
        name: string
        visibility: string
        group: string
        v1Scope: string
        cleanedTarget?: string
        rowCount: number
        columnCount: number
        nonEmptyRowCount: number
        headers: string[]
      }>
    }>(auditPath)

    expect(audit.workbook).toMatchObject({
      version: "2.6.0_R14028417",
      sheetCount: 31,
    })
    expect(audit.missingRequiredCandidateSheets).toEqual([])
    expect(audit.v1CandidateSheets).toEqual(
      expect.arrayContaining([
        "代理人属性",
        "代理人技能数据",
        "代理人核心技描述",
        "代理人强化",
        "代理人觉醒",
        "代理人影画描述",
        "音擎属性",
        "音擎描述",
        "驱动盘描述",
      ]),
    )
    expect(audit.deferredSheets).toEqual(
      expect.arrayContaining(["敌人属性", "邦布属性", "邦布技能"]),
    )

    const enemySheet = audit.sheets.find(sheet => sheet.name === "敌人属性")
    expect(enemySheet).toMatchObject({
      group: "enemies",
      v1Scope: "deferred",
      cleanedTarget: "enemies",
      rowCount: 437,
      columnCount: 47,
      nonEmptyRowCount: 437,
    })
    const agentSheet = audit.sheets.find(sheet => sheet.name === "代理人属性")
    expect(agentSheet).toMatchObject({
      rowCount: 137,
      columnCount: 32,
      nonEmptyRowCount: 52,
    })
    const wEngineUpgradeSheet = audit.sheets.find(sheet => sheet.name === "音擎升级表")
    expect(wEngineUpgradeSheet).toMatchObject({
      visibility: "hidden",
      group: "wEngines",
      v1Scope: "candidate",
    })
  })
})
