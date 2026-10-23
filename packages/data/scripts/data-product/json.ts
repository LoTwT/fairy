import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

export interface JsonFile {
  readonly value: unknown
  readonly bytes: number
  readonly sha256: string
}

/** 读取一个 JSON 文件，并返回解析值及其字节摘要；只读。 */
export function readJsonFile(path: string, label: string): JsonFile {
  let bytes: Buffer
  try {
    bytes = readFileSync(path)
  } catch (error) {
    throw new Error(`${label}: cannot read ${path}`, { cause: error })
  }

  let value: unknown
  try {
    value = JSON.parse(bytes.toString("utf8")) as unknown
  } catch (error) {
    throw new Error(`${label}: invalid JSON in ${path}`, { cause: error })
  }

  return {
    value,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  }
}

export function expectRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label}: expected an object`)
  return value as Record<string, unknown>
}

export function expectField(
  record: Readonly<Record<string, unknown>>,
  key: string,
  label: string,
): unknown {
  if (!Object.hasOwn(record, key))
    throw new Error(`${label}: missing required field "${key}"`)
  return record[key]
}

export function expectArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label}: expected an array`)
  return value
}

export function expectString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label}: expected a string`)
  return value
}

export function expectInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value))
    throw new Error(`${label}: expected an integer`)
  return value
}

export function expectNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`${label}: expected a finite number`)
  return value
}

export function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean")
    throw new Error(`${label}: expected a boolean`)
  return value
}

export function nullableString(
  record: Readonly<Record<string, unknown>>,
  key: string,
  label: string,
): string | null {
  const value = expectField(record, key, label)
  if (value === null) return null
  return expectString(value, `${label}.${key}`)
}

export function expectStringArray(
  value: unknown,
  label: string,
): readonly string[] {
  return expectArray(value, label).map((entry, index) =>
    expectString(entry, `${label}[${index}]`),
  )
}

export function expectIntegerArray(
  value: unknown,
  label: string,
): readonly number[] {
  return expectArray(value, label).map((entry, index) =>
    expectInteger(entry, `${label}[${index}]`),
  )
}

export function expectSha256(value: unknown, label: string): string {
  const digest = expectString(value, label)
  if (!/^[0-9a-f]{64}$/u.test(digest))
    throw new Error(`${label}: expected a lowercase SHA-256 digest`)
  return digest
}

export function optionalString(
  record: Readonly<Record<string, unknown>>,
  key: string,
  label: string,
): string | undefined {
  if (!Object.hasOwn(record, key)) return undefined
  return expectString(record[key], `${label}.${key}`)
}

/** 拒绝未经本模块建模的字段，避免静默忽略清单结构变化。 */
export function assertKnownKeys(
  record: Readonly<Record<string, unknown>>,
  knownKeys: readonly string[],
  label: string,
): void {
  const known = new Set(knownKeys)
  const unknown = Object.keys(record).filter((key) => !known.has(key))
  if (unknown.length > 0)
    throw new Error(
      `${label}: unknown field(s) ${unknown.map((key) => `"${key}"`).join(", ")}`,
    )
}
