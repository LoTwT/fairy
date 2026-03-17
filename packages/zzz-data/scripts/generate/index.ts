import type {
  ColumnDef,
  DerivedField,
  GenerateDataRow,
  WorksheetConfig,
} from "./config"
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

function isNullableType(type: string): boolean {
  return type.includes("null")
}

function readWorksheetRows(
  worksheet: ExcelJS.Worksheet,
  config: WorksheetConfig,
): {
  missingHeaders: string[]
  rows: GenerateDataRow[]
} {
  const headerRow = worksheet.getRow(1)
  const colMap = new Map<number, ColumnDef>()

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = extractCellValue(cell.value, {
      worksheet,
      address: cell.address,
    })
    if (typeof raw !== "string") return
    const normalized = normalizeHeader(raw)
    const colDef = config.columns[normalized]
    if (colDef) {
      colMap.set(colNumber, colDef)
    }
  })

  const foundFields = new Set(
    [...colMap.values()].map((column) => column.field),
  )
  const missingHeaders = Object.entries(config.columns)
    .filter(([, colDef]) => !foundFields.has(colDef.field))
    .map(([header, colDef]) => `${header} (${colDef.field})`)

  if (missingHeaders.length > 0) {
    return { missingHeaders, rows: [] }
  }

  const rows: GenerateDataRow[] = []
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum)
    let hasValue = false
    const obj: GenerateDataRow = {}

    for (const [colIdx, colDef] of colMap) {
      const cell = row.getCell(colIdx)
      let val = extractCellValue(cell.value, {
        worksheet,
        address: cell.address,
      })

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

      if (isNullableType(colDef.type) && (val === "" || val === undefined)) {
        val = null
      }

      obj[colDef.field] = val ?? null
      if (val !== null) hasValue = true
    }

    if (hasValue) {
      rows.push(obj)
    }
  }

  return { missingHeaders: [], rows }
}

function groupSourceRowsByField(
  sourceRows: GenerateDataRow[],
  field: string,
): Map<unknown, GenerateDataRow[]> {
  const groupedRows = new Map<unknown, GenerateDataRow[]>()

  for (const sourceRow of sourceRows) {
    const key = sourceRow[field]
    if (key == null) continue
    const rows = groupedRows.get(key) ?? []
    rows.push(sourceRow)
    groupedRows.set(key, rows)
  }

  return groupedRows
}

function selectDerivedSourceRow(
  derivedField: DerivedField,
  sourceRows: GenerateDataRow[],
  matchValue: unknown,
): GenerateDataRow | undefined {
  if (sourceRows.length === 0) {
    return undefined
  }

  if (sourceRows.length === 1) {
    return sourceRows[0]
  }

  if (derivedField.resolveSourceRow) {
    return derivedField.resolveSourceRow(sourceRows, matchValue)
  }

  throw new Error(
    `Multiple source rows matched "${String(matchValue)}" for derived field "${derivedField.field}".`,
  )
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
  const allData = new Map<string, GenerateDataRow[]>()
  const typeGroups = new Map<string, WorksheetConfig[]>()
  const validationErrors: string[] = []

  for (const config of worksheetConfigs) {
    const group = typeGroups.get(config.typeGroup) || []
    group.push(config)
    typeGroups.set(config.typeGroup, group)

    const worksheet = workbook.getWorksheet(config.sheetName)
    if (!worksheet) {
      validationErrors.push(`Worksheet "${config.sheetName}" not found.`)
      continue
    }

    const { missingHeaders, rows } = readWorksheetRows(worksheet, config)
    if (missingHeaders.length > 0) {
      validationErrors.push(
        `[${config.sheetName}] Missing columns: ${missingHeaders.join(", ")}`,
      )
      continue
    }

    allData.set(config.jsonFileName, rows)
    console.log(`  read ${config.sheetName} — ${rows.length} rows`)
  }

  if (validationErrors.length > 0) {
    throw new Error(
      `Workbook validation failed:\n${validationErrors.map((error) => `- ${error}`).join("\n")}`,
    )
  }

  // Pass 2: Inject derived fields
  const derivedFieldErrors: string[] = []
  for (const config of worksheetConfigs) {
    if (!config.derivedFields) continue
    const rows = allData.get(config.jsonFileName)
    if (!rows?.length) continue

    for (const df of config.derivedFields) {
      const sourceRows = allData.get(df.sourceJson)
      if (!sourceRows) {
        derivedFieldErrors.push(
          `Source "${df.sourceJson}" not found for derived field "${df.field}".`,
        )
        continue
      }

      const sourceRowsByKey = groupSourceRowsByField(
        sourceRows,
        df.sourceMatchField,
      )
      let injected = 0

      for (const row of rows) {
        const matchVal = row[df.matchField]
        const matchingSourceRows = sourceRowsByKey.get(matchVal) ?? []

        let sourceRow: GenerateDataRow | undefined
        try {
          sourceRow = selectDerivedSourceRow(df, matchingSourceRows, matchVal)
        } catch (error) {
          derivedFieldErrors.push(
            `[${config.jsonFileName}.${df.field}] ${error instanceof Error ? error.message : String(error)}`,
          )
          continue
        }

        if (!sourceRow) {
          const message = `[${config.jsonFileName}.${df.field}] No source row matched "${String(matchVal)}".`
          if (isNullableType(df.type)) {
            row[df.field] = null
            continue
          }
          derivedFieldErrors.push(message)
          continue
        }

        const derived = sourceRow[df.sourceValueField]
        if (derived === undefined || derived === null) {
          const message = `[${config.jsonFileName}.${df.field}] Source field "${df.sourceValueField}" is empty for "${String(matchVal)}".`
          if (isNullableType(df.type)) {
            row[df.field] = null
            continue
          }
          derivedFieldErrors.push(message)
          continue
        }

        row[df.field] = derived
        injected++
      }

      console.log(
        `  inject ${df.field} into ${config.jsonFileName} — ${injected}/${rows.length} matched`,
      )
    }
  }

  if (derivedFieldErrors.length > 0) {
    throw new Error(
      `Derived field resolution failed:\n${derivedFieldErrors.map((error) => `- ${error}`).join("\n")}`,
    )
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
