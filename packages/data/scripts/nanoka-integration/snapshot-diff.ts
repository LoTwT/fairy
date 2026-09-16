import type { SourceJson } from "../../src/integration/agent-types.ts"
import { compareJsonKeys } from "../../src/integration/serialize-json.ts"
import {
  equalJson,
  escapePointer,
  isObject,
} from "../../src/integration/source-json.ts"
import type { JsonObject } from "../../src/integration/source-json.ts"

/**
 * 差异记录中的单侧取值：标量保留原值与类型，容器只记录形状。
 *
 * 字段缺失不在这里表达：差异记录缺少 `before` 或 `after` 才表示该侧缺失，
 * 因此 `null`、`0`、`false`、空字符串与缺失彼此不混淆。容器的键与元素内容
 * 由同一次遍历的条目逐条表达，不整块复制文件。
 */
export type DiffValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" }
  | { kind: "array"; length: number }
  | { kind: "object"; size: number }

/** 一条字段差异；`pointer` 是相对比较根的 JSON Pointer（根为空字符串）。 */
export interface DiffRecord {
  /** JSON Pointer，如 `/skill/g~1~0/description/0/name`；数组下标为十进制字符串。 */
  pointer: string

  /** removed 表示既有内容被删除，changed 表示既有内容被改写，added 表示新增内容。 */
  change: "added" | "removed" | "changed"

  /** 基线一侧的取值；缺失时为 undefined，且不写入序列化结果。 */
  before?: DiffValue

  /** 候选一侧的取值；缺失时为 undefined，且不写入序列化结果。 */
  after?: DiffValue
}

/** 缺失哨兵；与值为 null 的成员区分。 */
const missing = Symbol("missing")
type MaybeValue = SourceJson | typeof missing

function summarize(value: SourceJson): DiffValue {
  if (value === null) return { kind: "null" }
  if (Array.isArray(value)) return { kind: "array", length: value.length }
  if (isObject(value))
    return { kind: "object", size: Object.keys(value).length }
  if (typeof value === "string") return { kind: "string", value }
  if (typeof value === "number") return { kind: "number", value }
  return { kind: "boolean", value }
}

function sortedKeys(value: JsonObject): string[] {
  return Object.keys(value).toSorted(compareJsonKeys)
}

function unionKeys(before: JsonObject, after: JsonObject): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys].toSorted(compareJsonKeys)
}

/** 对象成员读取只认自有成员，`__proto__` 等特殊 key 也按数据读取。 */
function member(value: JsonObject, key: string): MaybeValue {
  return Object.hasOwn(value, key) ? value[key] : missing
}

/**
 * 展开单侧存在或类型被替换的一侧容器：键按序列化同一比较规则、数组按下标升序逐条记录其内容。
 * 只展开传入的一侧，因此子树新增/删除的每个字段都带准确 Pointer。
 */
function descend(
  value: SourceJson,
  pointer: string,
  records: DiffRecord[],
  side: "added" | "removed",
) {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries())
      compareNode(
        side === "added" ? missing : item,
        side === "added" ? item : missing,
        `${pointer}/${index}`,
        records,
      )
    return
  }
  if (!isObject(value)) return
  for (const key of sortedKeys(value))
    compareNode(
      side === "added" ? missing : value[key],
      side === "added" ? value[key] : missing,
      `${pointer}/${escapePointer(key)}`,
      records,
    )
}

function compareNode(
  before: MaybeValue,
  after: MaybeValue,
  pointer: string,
  records: DiffRecord[],
) {
  if (before === missing && after === missing) return
  if (before !== missing && after !== missing) {
    if (isObject(before) && isObject(after)) {
      for (const key of unionKeys(before, after))
        compareNode(
          member(before, key),
          member(after, key),
          `${pointer}/${escapePointer(key)}`,
          records,
        )
      return
    }
    if (Array.isArray(before) && Array.isArray(after)) {
      // 长度变化单独记录一条，元素仍按下标逐条比较，顺序变化因此不会被掩盖。
      if (before.length !== after.length)
        records.push({
          pointer,
          change: "changed",
          before: summarize(before),
          after: summarize(after),
        })
      const length = Math.max(before.length, after.length)
      for (let index = 0; index < length; index++)
        compareNode(
          index < before.length ? before[index]! : missing,
          index < after.length ? after[index]! : missing,
          `${pointer}/${index}`,
          records,
        )
      return
    }
    if (equalJson(before, after)) return
    records.push({
      pointer,
      change: "changed",
      before: summarize(before),
      after: summarize(after),
    })
    // 类型替换不配对两侧成员：旧容器的内容按删除、新容器的内容按新增逐条记录。
    // 因此数字对象键与数组下标得到相同 Pointer 时仍分属两侧结构，不会被合并或抵消。
    descend(before, pointer, records, "removed")
    descend(after, pointer, records, "added")
    return
  }
  if (before === missing) {
    records.push({
      pointer,
      change: "added",
      after: summarize(after as SourceJson),
    })
    descend(after as SourceJson, pointer, records, "added")
    return
  }
  records.push({
    pointer,
    change: "removed",
    before: summarize(before as SourceJson),
  })
  descend(before as SourceJson, pointer, records, "removed")
}

/**
 * 比较两个已解析 JSON 值，按确定顺序返回字段差异；相等时返回空数组。
 *
 * 对象按 key 的序列化顺序、数组按下标升序深度优先遍历，结果不受输入对象成员排列影响。
 * 数组始终按下标比较，不排序、不做相似度匹配，顺序变化保留为对应下标的差异。
 * 容器被另一种类型替换时，父节点记录两侧形状，旧内容按删除、新内容按新增逐条展开。
 */
export function compareJsonValues(
  before: SourceJson,
  after: SourceJson,
): DiffRecord[] {
  const records: DiffRecord[] = []
  compareNode(before, after, "", records)
  return records
}
