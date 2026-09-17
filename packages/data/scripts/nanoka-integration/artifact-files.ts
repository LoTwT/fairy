import { opendir } from "node:fs/promises"
import type { DetailLocale } from "../../src/integration/agent-types.ts"
import { equalJson, isObject } from "../../src/integration/source-json.ts"
import type {
  JsonObject,
  SourceLocation,
} from "../../src/integration/source-json.ts"
import { supportedLanguages } from "../../src/nanoka-identity.ts"
import type { SourcePolicy } from "../nanoka/policy.ts"
import { checkedPath, parseBytes, readBytes, sha256 } from "./files.ts"

/** 排版、导航与索引元数据的有界膨胀预算；只约束字节，不用作文件数量倍率。 */
export const outputExpansionLimit = 16

/**
 * 制品文件数量上限。
 *
 * 成员总数受 `maximumAssetsPerRun` 约束（每个成员至少读取每种语言一个详情资源），
 * 每个成员最多产生 1 个公共文件和每种支持语言 1 个详情文件；因此文件总数有一个与字节膨胀无关的结构上限。
 */
export function maximumArtifactFileCount(policy: SourcePolicy): number {
  return (
    1 + policy.fetchLimits.maximumAssetsPerRun * (1 + supportedLanguages.length)
  )
}

/** 成员公共文件的固定布局；构建器与验证器共用这一处定义。 */
export function integratedMemberDataPath(
  entityName: string,
  memberId: string,
): string {
  return `${entityName}/${memberId}/data.json`
}

/** 成员详情文件的固定布局；locale 取自已登记语言。 */
export function integratedMemberDetailsPath(
  entityName: string,
  memberId: string,
  locale: DetailLocale,
): string {
  return `${entityName}/${memberId}/details.${locale}.json`
}

/** 逐语言结果整理为完整语言记录；来源配置已校验覆盖全部支持语言，缺失即明确失败。 */
export function completeLocaleRecord<T>(
  entries: ReadonlyMap<DetailLocale, T>,
  description: string,
): Record<DetailLocale, T> {
  const record = {} as Record<DetailLocale, T>
  for (const locale of supportedLanguages) {
    const value = entries.get(locale)
    if (value === undefined) throw new Error(`${description}: 缺少 ${locale}`)
    record[locale] = value
  }
  return record
}

export function requireValue(
  condition: unknown,
  path: string,
  reason: string,
): asserts condition {
  if (!condition) throw new Error(`${path}: ${reason}`)
}

export function object(value: unknown, path: string): JsonObject {
  requireValue(isObject(value), path, "必须是普通对象")
  return value
}

export function exactKeys(
  value: unknown,
  keys: string[],
  path: string,
): JsonObject {
  const record = object(value, path)
  requireValue(
    equalJson(Object.keys(record).toSorted(), [...keys].toSorted()),
    path,
    "字段集合不一致",
  )
  return record
}

/** 清单必须与磁盘目录和普通文件精确对应；包含空的额外目录也失败。 */
export async function verifyFileSet(
  root: string,
  files: string[],
): Promise<void> {
  const directories = new Map<string, Set<string>>([["", new Set()]])
  for (const file of files) {
    const parts = file.split("/")
    for (let index = 0; index < parts.length; index++) {
      const parent = parts.slice(0, index).join("/")
      if (!directories.has(parent)) directories.set(parent, new Set())
      directories.get(parent)!.add(parts[index])
    }
  }
  for (const [path, names] of directories) {
    const target = path ? await checkedPath(root, path) : root
    const found = new Set<string>()
    for await (const entry of await opendir(target)) {
      const child = path ? `${path}/${entry.name}` : entry.name
      requireValue(names.has(entry.name), child, "未登记的文件或目录")
      requireValue(
        directories.has(child) ? entry.isDirectory() : entry.isFile(),
        child,
        "必须是对应目录或普通文件，不能是符号链接",
      )
      found.add(entry.name)
    }
    requireValue(found.size === names.size, path || "/", "文件或目录缺失")
  }
}

/** 单个输出文件的解码结果；字节数用于累计预算。 */
export interface VerifiedArtifactFile {
  /** 已通过普通对象校验的顶层值。 */
  value: JsonObject

  /** 本次实际读取的 UTF-8 字节数。 */
  byteLength: number
}

/**
 * 核对单个输出文件引用与磁盘字节：字段集合、固定路径、摘要格式、读取预算、实际字节摘要与对象结构。
 * 解码与身份检查使用摘要核对过的同一批重新读取的字节；不读取 raw，也不比较原制品排版。
 */
export async function readVerifiedArtifactFile(
  root: string,
  reference: unknown,
  expectedPath: string,
  location: SourceLocation,
  maximumBytes: number,
): Promise<VerifiedArtifactFile> {
  const entry = exactKeys(reference, ["path", "sha256"], expectedPath)
  requireValue(entry.path === expectedPath, expectedPath, "文件路径错误")
  requireValue(
    typeof entry.sha256 === "string" && /^[0-9a-f]{64}$/u.test(entry.sha256),
    expectedPath,
    "SHA-256 格式错误",
  )
  const bytes = await readBytes(root, expectedPath, maximumBytes)
  requireValue(sha256(bytes) === entry.sha256, expectedPath, "摘要不一致")
  const value = object(parseBytes(bytes, expectedPath, location), expectedPath)
  return { value, byteLength: bytes.byteLength }
}
