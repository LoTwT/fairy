import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const RAW_DIR = path.resolve(__dirname, "../../data/raw")
export const XLSX_DIR = path.resolve(__dirname, "../../data/xlsx")
export const OUT_DIR = path.resolve(__dirname, "../../data")
export const I18N_DIR = path.resolve(__dirname, "../../i18n")

export type MergeRawRelativePath = string

export type MergeXlsxFileName = string

export type MergeOutputLocale = string

export type MergeOutputJsonName = string

export type MergeI18nFileName = string

export type MergeOutputData = unknown

export function readRaw<T>(relPath: MergeRawRelativePath): T {
  return JSON.parse(fs.readFileSync(path.join(RAW_DIR, relPath), "utf-8")) as T
}

export function readXlsx<T>(name: MergeXlsxFileName): T {
  return JSON.parse(fs.readFileSync(path.join(XLSX_DIR, name), "utf-8")) as T
}

export function writeOut(
  locale: MergeOutputLocale,
  name: MergeOutputJsonName,
  data: MergeOutputData,
): void {
  const outPath = path.join(OUT_DIR, locale, `${name}.json`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8")
  console.log(`  → ${outPath}`)
}

export function writeI18n(
  name: MergeI18nFileName,
  data: MergeOutputData,
): void {
  const outPath = path.join(I18N_DIR, name)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8")
  console.log(`  → ${outPath}`)
}
