import type { SourceSemantics } from "./semantics.ts"

/**
 * 开发者修订导出的纯核对逻辑：输入已解析的固定来源实体与冻结导出文档，
 * 不读取文件系统。整文件摘要与 exportedAt 的字节级核对由生成入口完成；
 * 本模块负责"按 ID 定位、指针目标身份、仅登记差异"三项结构化核对，
 * 可在离线测试中用合成输入复验。
 */

export interface DeveloperRevisionEntry {
  /** 语义登记键：category/entityId/rankKind/rank/blockId/effectId。 */
  readonly key: string
  readonly category: string
  readonly entityId: string
  readonly effectId: string
  readonly originalStat: string
  readonly revisedStat: string
  readonly revisedValue: number
  /** 指向导出文档中 effectBlocks 表示下该记录的 JSON Pointer。 */
  readonly pointer: string
}

/** 只提取 developer-revised-stat 登记；其他类别或范围暂不支持，遇到即拒绝。 */
export function developerRevisionEntries(
  semantics: Readonly<Record<string, SourceSemantics>>,
): readonly DeveloperRevisionEntry[] {
  const entries: DeveloperRevisionEntry[] = []
  for (const [key, value] of Object.entries(semantics)) {
    if (value.kind !== "developer-revised-stat") continue
    const segments = key.split("/")
    if (segments.length !== 6)
      throw new Error(`Invalid developer revision key: ${key}`)
    const [category, entityId, rankKind, rank, , effectId] = segments as [
      string,
      string,
      string,
      string,
      string,
      string,
    ]
    if (category !== "w-engines" || rankKind !== "refinement")
      throw new Error(
        `Unsupported developer revision scope: ${key}（当前只支持音擎精炼记录）`,
      )
    if (!/^[2-5]$/.test(rank))
      throw new Error(
        `Developer revision expects refinements 2–5: ${key}（精炼 1 保持原始 anomalyDmgBonus 记录）`,
      )
    for (const evidence of value.evidence)
      if (
        evidence.pointer !==
        `/wengines/0/refinementBuffs/${Number(rank) - 1}/effectBlocks/0/effects/2`
      )
        throw new Error(
          `Unreviewed developer revision pointer: ${key} ${evidence.pointer}`,
        )
    entries.push({
      key,
      category,
      entityId,
      effectId,
      originalStat: value.originalStat,
      revisedStat: value.revisedStat,
      revisedValue: value.revisedValue,
      pointer: value.evidence[0]!.pointer,
    })
  }
  return entries
}

const collectionFor = (category: string): string => {
  if (category !== "w-engines")
    throw new Error(`Unsupported developer revision category: ${category}`)
  return "wengines"
}

function resolveJsonPointer(
  document: unknown,
  pointer: string,
): { exists: boolean; value: unknown } {
  let current: unknown = document
  if (pointer === "") return { exists: true, value: current }
  for (const raw of pointer.split("/").slice(1)) {
    const token = raw.replaceAll("~1", "/").replaceAll("~0", "~")
    if (Array.isArray(current)) {
      const index = Number(token)
      if (!Number.isInteger(index) || index < 0 || index >= current.length)
        return { exists: false, value: undefined }
      current = current[index]
      continue
    }
    if (current !== null && typeof current === "object") {
      if (!Object.hasOwn(current as Record<string, unknown>, token))
        return { exists: false, value: undefined }
      current = (current as Record<string, unknown>)[token]
      continue
    }
    return { exists: false, value: undefined }
  }
  return { exists: true, value: current }
}

interface JsonValueDiff {
  readonly path: string
  readonly before: unknown
  readonly after: unknown
}

function collectJsonValueDiffs(
  before: unknown,
  after: unknown,
  path: string,
  diffs: JsonValueDiff[],
): void {
  if (
    before === null ||
    after === null ||
    typeof before !== "object" ||
    typeof after !== "object" ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    if (before !== after) diffs.push({ path, before, after })
    return
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    for (let index = 0; index < Math.max(before.length, after.length); index++)
      collectJsonValueDiffs(
        before[index],
        after[index],
        `${path}/${index}`,
        diffs,
      )
    return
  }
  const left = before as Record<string, unknown>
  const right = after as Record<string, unknown>
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)]))
    collectJsonValueDiffs(
      left[key],
      right[key],
      `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
      diffs,
    )
}

const describeValue = (value: unknown): string =>
  typeof value === "string" ? JSON.stringify(value) : String(value)

const sameDiff = (a: JsonValueDiff, b: JsonValueDiff): boolean =>
  a.path === b.path && a.before === b.before && a.after === b.after

interface DeveloperRevisionEntityGroup {
  readonly category: string
  readonly entityId: string
  readonly pointerPrefix: string
  readonly exportEntity: unknown
  readonly fixedEntity: unknown
  readonly expected: JsonValueDiff[]
  readonly entries: DeveloperRevisionEntry[]
}

/**
 * 核对冻结导出与固定来源实体：除已登记记录的 stat 改名（effectBlocks 与
 * effects 两个表示）和 selfMods 数值迁移外，任何其他逐字段差异都拒绝。
 * 两侧实体都按 ID 定位且必须唯一；指针目标须为登记的效果身份、修订字段
 * 与数值，且不得自带 appliesToAnomaly（跨精炼继承是上游归并行为，不是
 * 附件原始字段）。
 */
export function verifyDeveloperRevisionExport(
  fixedWengines: readonly unknown[],
  exportDocument: unknown,
  entries: readonly DeveloperRevisionEntry[],
): void {
  if (entries.length === 0)
    throw new Error("Developer revision verification requires entries")
  // 每个实体一次整体逐字段比较：全部登记条目的期望差异取并集后核对。
  const entities = new Map<string, DeveloperRevisionEntityGroup>()
  for (const entry of entries) {
    const fixedMatches = fixedWengines.filter(
      (member) =>
        member !== null &&
        typeof member === "object" &&
        (member as Record<string, unknown>).id === entry.entityId,
    )
    if (fixedMatches.length !== 1)
      throw new Error(
        `Developer revision fixed source must locate exactly one ${entry.entityId} entity by ID, found ${fixedMatches.length}`,
      )
    const collection = exportDocument as Record<string, unknown>
    const members = collection[collectionFor(entry.category)]
    if (!Array.isArray(members))
      throw new Error(
        `Developer revision export has no ${collectionFor(entry.category)} collection`,
      )
    const matches = members.filter(
      (member) =>
        member !== null &&
        typeof member === "object" &&
        (member as Record<string, unknown>).id === entry.entityId,
    )
    if (matches.length !== 1)
      throw new Error(
        `Developer revision export must locate exactly one ${entry.entityId} entity by ID, found ${matches.length}`,
      )
    const entityIndex = members.indexOf(matches[0])
    const entityPrefix = `/${collectionFor(entry.category)}/${entityIndex}`
    if (!entry.pointer.startsWith(entityPrefix))
      throw new Error(
        `Developer revision pointer is outside the located entity: ${entry.key} ${entry.pointer}`,
      )
    // 指针目标身份：登记的效果 ID、修订字段与数值，且无原始异常标记。
    const target = resolveJsonPointer(exportDocument, entry.pointer)
    if (
      !target.exists ||
      typeof target.value !== "object" ||
      target.value === null
    )
      throw new Error(
        `Developer revision pointer missing: ${entry.key} ${entry.pointer}`,
      )
    const record = target.value as Record<string, unknown>
    if (record.id !== entry.effectId)
      throw new Error(
        `Developer revision pointer targets ${describeValue(record.id)}, expected ${entry.effectId}: ${entry.key}`,
      )
    if (record.stat !== entry.revisedStat)
      throw new Error(
        `Developer revision stat is ${describeValue(record.stat)}, expected ${entry.revisedStat}: ${entry.key}`,
      )
    if (record.value !== entry.revisedValue)
      throw new Error(
        `Developer revision value is ${describeValue(record.value)}, expected ${entry.revisedValue}: ${entry.key}`,
      )
    if ("appliesToAnomaly" in record)
      throw new Error(
        `Developer revision export must not carry appliesToAnomaly as an original field: ${entry.key}`,
      )
    let group = entities.get(entry.entityId)
    if (!group) {
      group = {
        category: entry.category,
        entityId: entry.entityId,
        pointerPrefix: entityPrefix,
        exportEntity: matches[0],
        fixedEntity: fixedMatches[0],
        expected: [],
        entries: [],
      }
      entities.set(entry.entityId, group)
    }
    group.entries.push(entry)
  }
  for (const group of entities.values()) {
    for (const entry of group.entries) {
      const relative = entry.pointer.slice(group.pointerPrefix.length)
      const packPointer = /^(\/refinementBuffs\/\d+)(?:\/|$)/.exec(
        relative,
      )?.[1]
      if (!packPointer)
        throw new Error(
          `Developer revision pointer is not inside a refinement pack: ${entry.key} ${entry.pointer}`,
        )
      const flatEffects = resolveJsonPointer(
        group.exportEntity,
        `${packPointer}/effects`,
      )
      if (!flatEffects.exists || !Array.isArray(flatEffects.value))
        throw new Error(
          `Developer revision export pack has no effects array: ${entry.key} ${packPointer}/effects`,
        )
      const flatIndex = flatEffects.value.findIndex(
        (effect) =>
          effect !== null &&
          typeof effect === "object" &&
          (effect as Record<string, unknown>).id === entry.effectId,
      )
      if (flatIndex < 0)
        throw new Error(
          `Developer revision export pack has no ${entry.effectId} flat effect: ${entry.key}`,
        )
      group.expected.push(
        {
          path: `${relative}/stat`,
          before: entry.originalStat,
          after: entry.revisedStat,
        },
        {
          path: `${packPointer}/effects/${flatIndex}/stat`,
          before: entry.originalStat,
          after: entry.revisedStat,
        },
        {
          path: `${packPointer}/selfMods/${entry.originalStat}`,
          before: entry.revisedValue,
          after: 0,
        },
        {
          path: `${packPointer}/selfMods/${entry.revisedStat}`,
          before: 0,
          after: entry.revisedValue,
        },
      )
    }
    const actual: JsonValueDiff[] = []
    collectJsonValueDiffs(group.fixedEntity, group.exportEntity, "", actual)
    const unexpected = actual.filter(
      (diff) => !group.expected.some((candidate) => sameDiff(candidate, diff)),
    )
    const missing = group.expected.filter(
      (diff) => !actual.some((candidate) => sameDiff(candidate, diff)),
    )
    if (unexpected.length || missing.length) {
      const render = (diffs: readonly JsonValueDiff[]) =>
        diffs
          .map(
            (diff) =>
              `${diff.path}: ${describeValue(diff.before)} -> ${describeValue(diff.after)}`,
          )
          .join("; ")
      throw new Error(
        `Developer revision export differs from the fixed source beyond the registered changes: ${group.entityId}` +
          (unexpected.length ? `；未登记差异 [${render(unexpected)}]` : "") +
          (missing.length ? `；登记差异未逐字出现 [${render(missing)}]` : ""),
      )
    }
  }
}
