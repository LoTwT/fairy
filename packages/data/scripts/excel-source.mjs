import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as XLSX from "xlsx"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")
const workbookPath = join(repoRoot, "data/source/excel/data.xlsx")
const sourceManifestPath = join(repoRoot, "data/source/source-manifest.json")
const auditPath = join(repoRoot, "data/source/excel/workbook-audit.json")

const sourceId = "lo-user-excel"
const parserVersion = "excel-source-v0.1.0"

const v1SheetRoles = {
  "代理人技能数据": {
    group: "agents",
    v1Scope: "candidate",
    cleanedTarget: "skills",
  },
  "代理人属性": {
    group: "agents",
    v1Scope: "candidate",
    cleanedTarget: "agents",
  },
  "代理人技能描述": {
    group: "agents",
    v1Scope: "candidate",
    cleanedTarget: "skills.localizedText",
  },
  "代理人核心技描述": {
    group: "agents",
    v1Scope: "candidate",
    cleanedTarget: "agents.corePassiveModifiers",
  },
  "代理人强化": {
    group: "agents",
    v1Scope: "candidate",
    cleanedTarget: "agents.potentialActivation",
  },
  "代理人觉醒": {
    group: "agents",
    v1Scope: "candidate",
    cleanedTarget: "agents.potentialActivation",
  },
  "代理人影画描述": {
    group: "agents",
    v1Scope: "candidate",
    cleanedTarget: "agents.mindscapeCinema",
  },
  "代理人晋升属性": {
    group: "agents",
    v1Scope: "candidate",
    cleanedTarget: "agents.baseStatsByLevel",
  },
  "音擎属性": {
    group: "wEngines",
    v1Scope: "candidate",
    cleanedTarget: "wEngines.baseStatsByLevel",
  },
  "音擎描述": {
    group: "wEngines",
    v1Scope: "candidate",
    cleanedTarget: "wEngines.passiveModifiers",
  },
  "音擎升级表": {
    group: "wEngines",
    v1Scope: "candidate",
    cleanedTarget: "wEngines.levelScaling",
  },
  "驱动盘描述": {
    group: "driveDiscs",
    v1Scope: "candidate",
    cleanedTarget: "driveDiscs.twoPieceModifiers/fourPieceModifiers",
  },
  "驱动盘升级表": {
    group: "driveDiscs",
    v1Scope: "candidate",
    cleanedTarget: "driveDiscs.levelScaling",
  },
  "敌人属性": {
    group: "enemies",
    v1Scope: "deferred",
    cleanedTarget: "enemies",
  },
  "敌人属性（1.3版本）": {
    group: "enemies",
    v1Scope: "archiveOnly",
    cleanedTarget: "enemies.history",
  },
  "邦布属性": {
    group: "bangboo",
    v1Scope: "deferred",
    cleanedTarget: "bangboo",
  },
  "邦布技能": {
    group: "bangboo",
    v1Scope: "deferred",
    cleanedTarget: "bangboo.skills",
  },
}

const requiredCandidateSheets = [
  "代理人技能数据",
  "代理人属性",
  "代理人技能描述",
  "代理人核心技描述",
  "代理人强化",
  "代理人觉醒",
  "代理人影画描述",
  "代理人晋升属性",
  "音擎属性",
  "音擎描述",
  "音擎升级表",
  "驱动盘描述",
  "驱动盘升级表",
]

function sha256(bufferOrString) {
  return createHash("sha256").update(bufferOrString).digest("hex")
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const flags = {}

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]
    if (!token.startsWith("--"))
      throw new Error(`Unexpected positional argument: ${token}`)
    const key = token.slice(2)
    const next = rest[i + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true
    }
    else {
      flags[key] = next
      i += 1
    }
  }

  return { command: command ?? "verify", flags }
}

function rowsForSheet(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  })
}

function isNonEmpty(value) {
  return value !== null && value !== undefined && String(value).trim().length > 0
}

function firstNonEmptyRow(rows) {
  return rows.find(row => row.some(isNonEmpty)) ?? []
}

function normalizeHeader(row) {
  return row
    .map(value => (isNonEmpty(value) ? String(value).trim() : ""))
    .filter(Boolean)
}

function sheetSummary(workbook, sheetName, index) {
  const sheet = workbook.Sheets[sheetName]
  const rows = rowsForSheet(sheet)
  const range = sheet["!ref"] ?? ""
  const decodedRange = range.length > 0 ? XLSX.utils.decode_range(range) : undefined
  const rangeRowCount = decodedRange === undefined
    ? 0
    : decodedRange.e.r - decodedRange.s.r + 1
  const rangeColumnCount = decodedRange === undefined
    ? 0
    : decodedRange.e.c - decodedRange.s.c + 1
  const role = v1SheetRoles[sheetName] ?? {
    group: "reference",
    v1Scope: "archiveOnly",
    cleanedTarget: undefined,
  }

  return {
    name: sheetName,
    index,
    visibility: workbook.Workbook?.Sheets?.[index]?.Hidden ? "hidden" : "visible",
    range,
    rowCount: rangeRowCount,
    columnCount: rangeColumnCount,
    nonEmptyRowCount: rows.length,
    headers: normalizeHeader(firstNonEmptyRow(rows)),
    group: role.group,
    v1Scope: role.v1Scope,
    cleanedTarget: role.cleanedTarget,
  }
}

function buildAudit(generatedAt) {
  const workbookBytes = readFileSync(workbookPath)
  const sourceManifest = readJson(sourceManifestPath)
  const manifestSource = sourceManifest.sources.find(source => source.id === sourceId)
  if (manifestSource === undefined)
    throw new Error(`Missing ${sourceId} in data/source/source-manifest.json`)

  const workbookSha256 = sha256(workbookBytes)
  if (workbookSha256 !== manifestSource.sha256) {
    throw new Error(
      `Workbook hash mismatch: manifest=${manifestSource.sha256}, actual=${workbookSha256}`,
    )
  }

  const workbook = XLSX.read(workbookBytes, {
    type: "buffer",
    cellDates: false,
    cellFormula: false,
    cellNF: false,
    cellStyles: false,
  })
  const home = workbook.Sheets["首页"]
  const workbookVersion = home?.A1?.v === undefined ? undefined : String(home.A1.v)
  const sheets = workbook.SheetNames.map((sheetName, index) =>
    sheetSummary(workbook, sheetName, index))

  const missingRequiredCandidateSheets = requiredCandidateSheets.filter(
    sheetName => !workbook.SheetNames.includes(sheetName),
  )
  const v1CandidateSheets = sheets
    .filter(sheet => sheet.v1Scope === "candidate")
    .map(sheet => sheet.name)
  const deferredSheets = sheets
    .filter(sheet => sheet.v1Scope === "deferred")
    .map(sheet => sheet.name)

  return {
    schemaVersion: "excel-workbook-audit-v1",
    sourceId,
    parserVersion,
    generatedAt,
    workbook: {
      path: "data/source/excel/data.xlsx",
      sha256: workbookSha256,
      bytes: workbookBytes.length,
      version: workbookVersion,
      sheetCount: workbook.SheetNames.length,
    },
    policy: {
      v1Scope:
        "V1 candidate sheets cover agents, W-Engines, Drive Discs, mindscape cinema, and potential activation. Full cleaned/enemies is deferred by D-13 unless a V1 golden anchor requires a minimal subset.",
      formalDataPolicy:
        "This audit records sheet and column shape only. It does not publish formal cleaned game rows or infer typed modifiers.",
      parserDependencyPolicy:
        "The XLSX parser is a repository devDependency for source verification and generation; it must not become an @fairy/data runtime dependency.",
    },
    missingRequiredCandidateSheets,
    v1CandidateSheets,
    deferredSheets,
    sheets,
  }
}

function auditCommand(flags) {
  const generatedAt = String(flags["generated-at"] ?? new Date().toISOString())
  const audit = buildAudit(generatedAt)
  writeJson(auditPath, audit)
}

function verifyCommand() {
  if (!existsSync(auditPath))
    throw new Error("Missing data/source/excel/workbook-audit.json; run audit first")

  const expected = buildAudit(readJson(auditPath).generatedAt)
  const actual = readJson(auditPath)
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("Excel workbook audit is stale; rerun pnpm --filter @fairy/data audit:excel")
  if (actual.workbook.version !== "2.6.0_R14028417")
    throw new Error(`Unexpected workbook version: ${actual.workbook.version}`)
  if (actual.workbook.sheetCount !== 31)
    throw new Error(`Expected 31 workbook sheets, got ${actual.workbook.sheetCount}`)
  if (actual.missingRequiredCandidateSheets.length > 0) {
    throw new Error(
      `Missing V1 candidate sheets: ${actual.missingRequiredCandidateSheets.join(", ")}`,
    )
  }
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2))

  if (command === "audit")
    auditCommand(flags)
  else if (command === "verify")
    verifyCommand()
  else
    throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
