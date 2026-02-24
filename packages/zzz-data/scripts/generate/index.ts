import type { ColumnDef, WorksheetConfig } from "./config"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import ExcelJS from "exceljs"
import { extractCellValue, normalizeHeader, worksheetConfigs } from "./config"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "../..")
const XLSX_PATH = resolve(ROOT, "source.xlsx")
const DATA_DIR = resolve(ROOT, "data/xlsx")
const TYPES_DIR = resolve(__dirname, "types")

// ---------------------------------------------------------------------------
// Type generation helpers
// ---------------------------------------------------------------------------

function tsTypeFromConfig(type: string): string {
  return type
}

function generateInterface(config: WorksheetConfig): string {
  const lines: string[] = []
  lines.push(`/** ${config.sheetName} */`)
  lines.push(`export interface ${config.typeName} {`)
  // Derived fields first (like agentId)
  if (config.derivedFields) {
    for (const df of config.derivedFields) {
      lines.push(`  /** 派生字段，从 ${df.sourceJson} 注入 */`)
      lines.push(`  ${df.field}: ${tsTypeFromConfig(df.type)}`)
    }
  }
  for (const [header, colDef] of Object.entries(config.columns)) {
    lines.push(`  /** ${header} */`)
    lines.push(`  ${colDef.field}: ${tsTypeFromConfig(colDef.type)}`)
  }
  lines.push(`}`)
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(XLSX_PATH)

  mkdirSync(DATA_DIR, { recursive: true })
  mkdirSync(TYPES_DIR, { recursive: true })

  // Pass 1: Read all worksheets into memory
  const allData = new Map<string, Record<string, unknown>[]>()
  const typeGroups = new Map<string, WorksheetConfig[]>()

  for (const config of worksheetConfigs) {
    const group = typeGroups.get(config.typeGroup) || []
    group.push(config)
    typeGroups.set(config.typeGroup, group)

    const worksheet = workbook.getWorksheet(config.sheetName)
    if (!worksheet) {
      console.warn(`⚠ Worksheet "${config.sheetName}" not found, skipping.`)
      allData.set(config.jsonFileName, [])
      continue
    }

    // Read header row (row 1)
    const headerRow = worksheet.getRow(1)
    const colMap = new Map<number, ColumnDef>()

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const raw = extractCellValue(cell.value)
      if (typeof raw !== "string") return
      const normalized = normalizeHeader(raw)
      const colDef = config.columns[normalized]
      if (colDef) {
        colMap.set(colNumber, colDef)
      }
    })

    // Validate all columns found
    const foundFields = new Set([...colMap.values()].map((c) => c.field))
    for (const [header, colDef] of Object.entries(config.columns)) {
      if (!foundFields.has(colDef.field)) {
        console.warn(
          `⚠ [${config.sheetName}] Column "${header}" (${colDef.field}) not found in worksheet.`,
        )
      }
    }

    // Read data rows
    const rows: Record<string, unknown>[] = []
    const rowCount = worksheet.rowCount
    for (let rowNum = 2; rowNum <= rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum)
      let hasValue = false
      const obj: Record<string, unknown> = {}
      for (const [colIdx, colDef] of colMap) {
        let val = extractCellValue(row.getCell(colIdx).value)
        if (colDef.type === "boolean") {
          val = Boolean(val)
        } else if (colDef.type === "number" && val !== null) {
          const num = Number(val)
          val = Number.isNaN(num) ? null : num
        } else if (
          colDef.type.startsWith("number") &&
          val !== null &&
          val !== ""
        ) {
          const num = Number(val)
          val = Number.isNaN(num) ? null : num
        } else if (colDef.type === "string" && val !== null) {
          val = String(val)
        } else if (
          colDef.type.startsWith("string") &&
          val !== null &&
          val !== ""
        ) {
          val = String(val)
        }
        if (colDef.type.includes("null") && (val === "" || val === undefined)) {
          val = null
        }
        obj[colDef.field] = val ?? null
        if (val !== null) hasValue = true
      }
      if (hasValue) rows.push(obj)
    }

    allData.set(config.jsonFileName, rows)
    console.log(`  read ${config.sheetName} — ${rows.length} rows`)
  }

  // Pass 2: Inject derived fields
  for (const config of worksheetConfigs) {
    if (!config.derivedFields) continue
    const rows = allData.get(config.jsonFileName)
    if (!rows?.length) continue

    for (const df of config.derivedFields) {
      const sourceRows = allData.get(df.sourceJson)
      if (!sourceRows) {
        console.warn(
          `⚠ Source "${df.sourceJson}" not found for derived field "${df.field}"`,
        )
        continue
      }
      // Build lookup map: sourceMatchField value -> sourceValueField value
      // Only use the first match (for agent-stat, filter to playable agents with id < 2000)
      const lookup = new Map<unknown, unknown>()
      for (const sr of sourceRows) {
        const key = sr[df.sourceMatchField]
        if (key != null && !lookup.has(key)) {
          lookup.set(key, sr[df.sourceValueField])
        }
      }
      // Inject
      let injected = 0
      for (const row of rows) {
        const matchVal = row[df.matchField]
        const derived = lookup.get(matchVal)
        if (derived !== undefined) {
          row[df.field] = derived
          injected++
        } else {
          row[df.field] = null
        }
      }
      console.log(
        `  inject ${df.field} into ${config.jsonFileName} — ${injected}/${rows.length} matched`,
      )
    }
  }

  // Pass 3: Write JSON files
  for (const config of worksheetConfigs) {
    const rows = allData.get(config.jsonFileName) || []
    const jsonPath = resolve(DATA_DIR, `${config.jsonFileName}.json`)
    writeFileSync(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, "utf-8")
    console.log(`✓ ${config.jsonFileName}.json — ${rows.length} rows`)
  }

  // Generate type files per group
  for (const [group, configs] of typeGroups) {
    const interfaces = configs.map(generateInterface).join("\n\n")
    const typePath = resolve(TYPES_DIR, `${group}.ts`)
    writeFileSync(typePath, `${interfaces}\n`, "utf-8")
    console.log(`✓ types/${group}.ts — ${configs.length} interface(s)`)
  }

  // Generate types/index.ts barrel
  const typeGroupNames = [...typeGroups.keys()].sort()
  const barrelLines = typeGroupNames.map((g) => `export type * from "./${g}"`)
  writeFileSync(
    resolve(TYPES_DIR, "index.ts"),
    `${barrelLines.join("\n")}\n`,
    "utf-8",
  )
  console.log(`✓ types/index.ts`)

  console.log("\nDone!")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
