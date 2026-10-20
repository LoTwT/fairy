import type { SourceJson } from "../../src/integration/agent-types.ts"
import {
  escapePointer,
  isObject,
  put,
} from "../../src/integration/source-json.ts"
import type { JsonObject } from "../../src/integration/source-json.ts"
import {
  integratedSnapshotFormat,
  publishedIntegratedSnapshotFormat,
} from "../../src/integration/snapshot-types.ts"
import type { PublishedIntegratedSnapshotIndex } from "../../src/integration/snapshot-types.ts"

/**
 * 把已验证的归档 v3 索引派生为公开发布 v4 索引。
 *
 * 根与类别字段、值和键顺序保持不变，只把 `format` 替换为 v4，并把每个成员从
 * `{ files, sourceRecord }` 收缩为 `{ files }`。归档索引本身不被修改，返回值持有
 * 独立副本。只接受严格归档外壳：已是 v4、成员缺少 `sourceRecord` 或多出字段都拒绝，
 * 避免发布侧静默裁剪或错误输入。
 */
export function derivePublishedIndex(
  archive: unknown,
): PublishedIntegratedSnapshotIndex {
  const index = requireObject(archive, "index.json")
  if (index.format !== integratedSnapshotFormat) {
    if (index.format === publishedIntegratedSnapshotFormat)
      throw new Error("/format: 不接受公开 v4 索引作为归档输入")
    throw new Error(`/format: 归档索引格式必须是 ${integratedSnapshotFormat}`)
  }
  if (!Object.hasOwn(index, "entities")) throw new Error("/entities: 缺失")
  const derived: JsonObject = {}
  for (const [key, value] of Object.entries(index)) {
    if (key === "format") {
      put(derived, key, publishedIntegratedSnapshotFormat)
      continue
    }
    if (key === "entities") {
      put(derived, key, deriveEntities(value))
      continue
    }
    put(derived, key, cloneJsonValue(value, `/${escapePointer(key)}`))
  }
  return derived as unknown as PublishedIntegratedSnapshotIndex
}

/**
 * 从归档索引的实际字节派生发布索引字节。
 *
 * 输入必须是有效 UTF-8、不含 BOM 的归档 v3 JSON。输出是发布对象的紧凑 JSON，
 * 不添加换行；键顺序与对象遍历顺序一致，整数形式的成员 key 按 JavaScript 规范顺序排列。
 */
export function derivePublishedIndexBytes(
  archiveBytes: Uint8Array,
): Uint8Array {
  if (
    archiveBytes[0] === 0xef &&
    archiveBytes[1] === 0xbb &&
    archiveBytes[2] === 0xbf
  )
    throw new Error("JSON 不得包含 BOM")
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(archiveBytes)
  } catch (error) {
    throw new Error("不是有效 UTF-8", { cause: error })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch (error) {
    throw new Error("不是有效 JSON", { cause: error })
  }
  return Buffer.from(JSON.stringify(derivePublishedIndex(parsed)), "utf8")
}

function deriveEntities(value: unknown): JsonObject {
  const entities = requireObject(value, "/entities")
  const derived: JsonObject = {}
  for (const [name, entity] of Object.entries(entities))
    put(derived, name, deriveEntity(entity, `/entities/${escapePointer(name)}`))
  return derived
}

function deriveEntity(value: unknown, path: string): JsonObject {
  const entity = requireObject(value, path)
  if (!Object.hasOwn(entity, "members"))
    throw new Error(`${path}/members: 缺失`)
  const derived: JsonObject = {}
  for (const [key, nested] of Object.entries(entity)) {
    if (key === "members") {
      put(derived, key, deriveMembers(nested, `${path}/members`))
      continue
    }
    put(derived, key, cloneJsonValue(nested, `${path}/${escapePointer(key)}`))
  }
  return derived
}

function deriveMembers(value: unknown, path: string): JsonObject {
  const members = requireObject(value, path)
  const derived: JsonObject = {}
  for (const [memberId, valueOfMember] of Object.entries(members)) {
    const memberPath = `${path}/${escapePointer(memberId)}`
    const member = requireObject(valueOfMember, memberPath)
    const keys = Object.keys(member).toSorted()
    if (keys.length !== 2 || keys[0] !== "files" || keys[1] !== "sourceRecord")
      throw new Error(`${memberPath}: 成员字段必须恰好为 files 与 sourceRecord`)
    requireObject(member.sourceRecord, `${memberPath}/sourceRecord`)
    const publishedMember: JsonObject = {}
    put(
      publishedMember,
      "files",
      cloneJsonValue(member.files, `${memberPath}/files`),
    )
    put(derived, memberId, publishedMember)
  }
  return derived
}

function requireObject(value: unknown, path: string): JsonObject {
  if (!isObject(value)) throw new Error(`${path}: 必须是普通对象`)
  return value
}

/** 保持键顺序地复制 JSON 值，避免发布对象与归档对象共享可变引用。 */
function cloneJsonValue(
  value: unknown,
  path: string,
  ancestors = new Set<object>(),
): SourceJson {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value
  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
      Object.is(value, -0)
    )
      throw new Error(`${path}: 非法数值，不能无损往返 JSON`)
    return value
  }
  if (ancestors.has(value as object))
    throw new Error(`${path}: JSON 值不能循环引用`)
  ancestors.add(value as object)
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype)
        throw new Error(`${path}: JSON 数组不能使用自定义原型`)
      return value.map((item, index) =>
        cloneJsonValue(item, `${path}/${index}`, ancestors),
      )
    }
    if (!isObject(value))
      throw new Error(`${path}: 要求普通 JSON 对象或可往返的 JSON 值`)
    const result: JsonObject = {}
    for (const [key, nested] of Object.entries(value))
      put(
        result,
        key,
        cloneJsonValue(nested, `${path}/${escapePointer(key)}`, ancestors),
      )
    return result
  } finally {
    ancestors.delete(value as object)
  }
}
