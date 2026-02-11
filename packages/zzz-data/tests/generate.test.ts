import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ExcelJS from "exceljs"
import { beforeAll, describe, expect, it } from "vitest"
import {
  extractCellValue,
  normalizeHeader,
  worksheetConfigs,
} from "../scripts/generate/config"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const XLSX_PATH = resolve(ROOT, "source.xlsx")
const DATA_DIR = resolve(ROOT, "data/xlsx")

let workbook: ExcelJS.Workbook

beforeAll(async () => {
  workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(XLSX_PATH)
})

describe("worksheetConfigs 与 xlsx 结构一致性", () => {
  it("config 中的所有工作表都存在于 xlsx 中", () => {
    const xlsxSheetNames = workbook.worksheets.map((ws) => ws.name)
    for (const config of worksheetConfigs) {
      expect(
        xlsxSheetNames,
        `工作表 "${config.sheetName}" 不存在于 xlsx 中`,
      ).toContain(config.sheetName)
    }
  })

  it("每个工作表的 config 列头都能在 xlsx 中匹配到", () => {
    for (const config of worksheetConfigs) {
      const worksheet = workbook.getWorksheet(config.sheetName)
      if (!worksheet) continue

      const headerRow = worksheet.getRow(1)
      const xlsxHeaders = new Set<string>()
      headerRow.eachCell({ includeEmpty: false }, (cell) => {
        const raw = extractCellValue(cell.value)
        if (typeof raw === "string") {
          xlsxHeaders.add(normalizeHeader(raw))
        }
      })

      const configHeaders = Object.keys(config.columns)
      for (const header of configHeaders) {
        expect(
          xlsxHeaders,
          `[${config.sheetName}] 列头 "${header}" 在 xlsx 中未找到`,
        ).toContain(header)
      }
    }
  })

  it("xlsx 中没有未映射的列头", () => {
    for (const config of worksheetConfigs) {
      const worksheet = workbook.getWorksheet(config.sheetName)
      if (!worksheet) continue

      const headerRow = worksheet.getRow(1)
      const xlsxHeaders: string[] = []
      headerRow.eachCell({ includeEmpty: false }, (cell) => {
        const raw = extractCellValue(cell.value)
        if (typeof raw === "string") {
          xlsxHeaders.push(normalizeHeader(raw))
        }
      })

      const configHeaders = new Set(Object.keys(config.columns))
      for (const header of xlsxHeaders) {
        expect(
          configHeaders,
          `[${config.sheetName}] xlsx 中的列头 "${header}" 未在 config 中映射`,
        ).toContain(header)
      }
    }
  })
})

describe("生成的 JSON 数据完整性", () => {
  it("每个 config 对应的 JSON 文件存在且包含数据", () => {
    for (const config of worksheetConfigs) {
      const jsonPath = resolve(DATA_DIR, `${config.jsonFileName}.json`)
      const content = readFileSync(jsonPath, "utf-8")
      const rows = JSON.parse(content) as Record<string, unknown>[]
      expect(
        rows.length,
        `${config.jsonFileName}.json 不应为空`,
      ).toBeGreaterThan(0)
    }
  })

  it("jSON 中每条记录的字段集合与 config 一致", () => {
    for (const config of worksheetConfigs) {
      const jsonPath = resolve(DATA_DIR, `${config.jsonFileName}.json`)
      const rows = JSON.parse(readFileSync(jsonPath, "utf-8")) as Record<
        string,
        unknown
      >[]
      if (rows.length === 0) continue

      const expectedFields = new Set(
        Object.values(config.columns).map((c) => c.field),
      )
      // Add derived fields
      if (config.derivedFields) {
        for (const df of config.derivedFields) {
          expectedFields.add(df.field)
        }
      }

      const firstRow = rows[0]
      const actualFields = new Set(Object.keys(firstRow))

      expect(
        actualFields,
        `${config.jsonFileName}.json 字段集合不匹配`,
      ).toEqual(expectedFields)
    }
  })

  it("jSON 中不包含 formula/richText 等原始对象", () => {
    for (const config of worksheetConfigs) {
      const jsonPath = resolve(DATA_DIR, `${config.jsonFileName}.json`)
      const rows = JSON.parse(readFileSync(jsonPath, "utf-8")) as Record<
        string,
        unknown
      >[]

      for (const row of rows) {
        for (const [field, value] of Object.entries(row)) {
          if (value !== null && typeof value === "object") {
            expect.unreachable(
              `${config.jsonFileName}.json 字段 "${field}" 包含对象值: ${JSON.stringify(value)}`,
            )
          }
        }
      }
    }
  })
})

describe("derivedFields 注入", () => {
  it("agentId 在目标表中全部注入成功", () => {
    const configsWithDerived = worksheetConfigs.filter(
      (c) => c.derivedFields?.length,
    )
    expect(configsWithDerived.length).toBeGreaterThan(0)

    for (const config of configsWithDerived) {
      const jsonPath = resolve(DATA_DIR, `${config.jsonFileName}.json`)
      const rows = JSON.parse(readFileSync(jsonPath, "utf-8")) as Record<
        string,
        unknown
      >[]

      for (const df of config.derivedFields!) {
        const nullCount = rows.filter((r) => r[df.field] === null).length
        expect(
          nullCount,
          `${config.jsonFileName}.json 中 ${df.field} 有 ${nullCount} 条为 null`,
        ).toBe(0)
      }
    }
  })
})

describe("jSON 行数与 xlsx 一致", () => {
  it("每个 JSON 的行数与 xlsx 数据行数匹配", () => {
    for (const config of worksheetConfigs) {
      const worksheet = workbook.getWorksheet(config.sheetName)
      if (!worksheet) continue

      // Count non-empty data rows in xlsx (row 2 onwards)
      let xlsxDataRows = 0
      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum)
        let hasValue = false
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (extractCellValue(cell.value) !== null) hasValue = true
        })
        if (hasValue) xlsxDataRows++
      }

      const jsonPath = resolve(DATA_DIR, `${config.jsonFileName}.json`)
      const rows = JSON.parse(readFileSync(jsonPath, "utf-8")) as unknown[]

      expect(
        rows.length,
        `${config.jsonFileName}.json 行数 (${rows.length}) 与 xlsx (${xlsxDataRows}) 不一致`,
      ).toBe(xlsxDataRows)
    }
  })
})
