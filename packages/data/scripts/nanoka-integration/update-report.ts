import type {
  DetailLocale,
  HistoricalIntegratedIndex,
} from "../../src/integration/agent-types.ts"
import type {
  HistoricalIntegratedSnapshotIndex,
  IntegratedSnapshotSourceInput,
} from "../../src/integration/snapshot-types.ts"
import { compareJsonKeys } from "../../src/integration/serialize-json.ts"
import { equalJson, sortedIds } from "../../src/integration/source-json.ts"
import type {
  JsonObject,
  SourceLocation,
} from "../../src/integration/source-json.ts"
import { parseBytes, readBytes } from "./files.ts"
import { compareJsonValues } from "./snapshot-diff.ts"
import type { DiffRecord } from "./snapshot-diff.ts"

/**
 * 更新差异报告版本；与索引外壳版本、管理记录协议、类别规则版本互相独立。
 *
 * 报告是制品之外的维护材料：只描述本次已完整验证的旧基线与候选之间的差异，
 * 不进入 v3 索引，也不作为制品验证依据。
 */
export const updateReportVersion = "fairy-nanoka-update-report/1"

/** 类别本次检查的结论；覆盖成员集合、实体文件与来源记录，不含规则版本与快照来源变化。 */
export type EntityUpdateResult = "unchanged" | "format-only" | "changed"

/** 差异归因：两侧都未变化时也不臆断原因。 */
export type ChangeAttribution = "source" | "rules" | "undetermined" | "neither"

/** 侧存在状态：present 两侧都有，added 只在候选，removed 只在基线。 */
export type CategoryPresence = "present" | "added" | "removed"

/** 一类差异归因依据；来源与规则同时变化时为 undetermined。 */
export interface UpdateCause {
  /** 快照来源版本、该类别来源输入或该类别来源记录发生变化。 */
  sourceChanged: boolean

  /** 该类别整合规则版本发生变化。 */
  rulesChanged: boolean

  /** 归因结论；undetermined 表示两侧同时变化，字段差异不能唯一归因。 */
  attributedTo: ChangeAttribution
}

/** 来源输入资源的新增、删除或摘要变化；resource 是来源相对资源名。 */
export interface UpdateReportInputChange {
  /** 所属范围；null 表示快照级输入（当前只有 manifest.json）。 */
  category: string | null

  resource: string

  change: "added" | "removed" | "changed"

  /** 基线一侧原始字节摘要；change 为 added 时不写入。 */
  beforeSha256?: string

  /** 候选一侧原始字节摘要；change 为 removed 时不写入。 */
  afterSha256?: string
}

/** 一个成员文件与基线相比的字段差异。 */
export interface UpdateReportFileChange {
  /** 相对于 integrated/ 的成员文件路径。 */
  path: string

  memberId: string

  changes: DiffRecord[]
}

/** 一个成员 sourceRecord 与基线相比的字段差异。 */
export interface UpdateReportSourceRecordChange {
  memberId: string

  changes: DiffRecord[]
}

/** 需要重点审查的既有内容摘要；由同一比较结果派生，不新增独立判定。 */
export interface UpdateReportReview {
  /** 存在既有内容的修改或删除：删除的成员/文件，或既有文件、来源记录发生语义变化。 */
  required: boolean

  removedMembers: number

  removedFiles: number

  semanticChangedFiles: number

  changedSourceRecords: number

  /** 差异条目中 change 为 removed 的数量，含容器与叶子条目。 */
  removedFields: number

  /** 差异条目中 change 为 changed 的数量。 */
  changedFields: number

  /** 差异条目中 change 为 added 的数量。 */
  addedFields: number
}

/** 一个已接入类别本次检查的结果。 */
export interface UpdateReportCategory {
  name: string

  /** 该类别的候选已按本次明确来源版本完整读取、构建并验证。 */
  checked: boolean

  presence: CategoryPresence

  /** 成员集合、实体文件与来源记录的结论；不含规则版本与快照来源变化。 */
  result: EntityUpdateResult

  rulesVersion: {
    before: string | null
    after: string | null
    /** 两侧都存在且版本不同。 */
    changed: boolean
  }

  members: {
    beforeCount: number
    afterCount: number
    added: string[]
    removed: string[]
    /** 两侧都存在，且任一成员文件或 sourceRecord 变化。 */
    changed: string[]
    /** 两侧都存在，且文件集合、全部文件字节与 sourceRecord 都相同。 */
    unchanged: string[]
  }

  files: {
    beforeCount: number
    afterCount: number
    added: string[]
    removed: string[]
    /** 两侧都存在、字节不同且 JSON 值不同。 */
    semanticChanged: string[]
    /** 两侧都存在、字节不同但 JSON 值相同。 */
    formatOnlyChanged: string[]
    /** 两侧都存在且字节相同。 */
    unchangedCount: number
  }

  sourceRecords: {
    /** sourceRecord JSON 值不同的成员 ID，按数值升序。 */
    changed: string[]
    /** 两侧都存在且 sourceRecord JSON 值相同的成员数。 */
    unchangedCount: number
    changes: UpdateReportSourceRecordChange[]
  }

  fileChanges: UpdateReportFileChange[]

  review: UpdateReportReview

  cause: UpdateCause
}

/** 一次整库更新的差异报告；首次生成时 baseline.kind 为 none。 */
export interface UpdateReport {
  reportVersion: typeof updateReportVersion

  baseline:
    | { kind: "none" }
    | { kind: "snapshot"; format: string; sourceVersion: string }

  candidate: { format: string; sourceVersion: string }

  /** 候选已按本次明确来源版本完整读取、构建并验证全部已接入类别。 */
  checked: boolean

  /** 全部类别的结论：存在 changed 取 changed，否则存在 format-only 取 format-only，否则 unchanged。 */
  result: EntityUpdateResult

  source: {
    version: { before: string | null; after: string; changed: boolean }
    /** 只有新增、删除或摘要变化的资源；顺序为先候选顺序，再仅基线存在的资源。 */
    inputs: UpdateReportInputChange[]
    unchangedInputCount: number

    /**
     * 相对旧基线，来源版本号、任一已登记资源的摘要或任一成员 sourceRecord 发生变化。
     * 只新增或移除资源属于类别或成员覆盖变化，由类别条目与 inputs 列表表达。
     */
    changed: boolean
  }

  rules: {
    categories: {
      name: string
      before: string | null
      after: string | null
      changed: boolean
    }[]
    changed: boolean
  }

  /** 按类别名代码单元顺序排列，与登记表顺序和对象遍历顺序无关。 */
  categories: UpdateReportCategory[]

  changeCause: UpdateCause
}

/** 成员文件引用；两侧视图共用同一形状，不区分基准与候选。 */
interface ComparisonFileReference {
  path: string
  sha256: string
}

/** 来源输入资源与摘要；不含可执行地址。 */
export interface ComparisonSourceInput {
  resource: string
  sha256: string
}

interface ComparisonMember {
  files: {
    data: ComparisonFileReference
    details: Map<DetailLocale, ComparisonFileReference>
  }
  sourceRecord: JsonObject
}

/** 已完整验证、可直接比较的一个类别；成员与语言顺序取自索引。 */
export interface ComparisonEntity {
  name: string
  rulesVersion: string
  detailLocales: DetailLocale[]
  memberIds: string[]
  inputs: ComparisonSourceInput[]
  members: Map<string, ComparisonMember>
}

/** 已完整验证、可直接比较的一份快照视图；两种索引外壳都归一到这一形状。 */
export interface ComparisonSnapshot {
  format: string
  sourceVersion: string
  /** 快照级来源输入；当前只有 manifest.json。 */
  inputs: ComparisonSourceInput[]
  entities: Map<string, ComparisonEntity>
}

function sortedNames(names: Iterable<string>): string[] {
  return [...new Set(names)].toSorted(compareJsonKeys)
}

/** 两个有序语言列表的并集；首次出现顺序优先，不按字典序重排配置顺序。 */
function localeOrder(
  before: readonly DetailLocale[],
  after: readonly DetailLocale[],
): DetailLocale[] {
  const locales: DetailLocale[] = []
  for (const locale of [...before, ...after])
    if (!locales.includes(locale)) locales.push(locale)
  return locales
}

function comparisonInputs(
  inputs: readonly IntegratedSnapshotSourceInput[],
): ComparisonSourceInput[] {
  return inputs.map((input) => ({
    resource: input.resource,
    sha256: input.sha256,
  }))
}

/** v3 索引 → 比较视图；索引已完整验证，缺失成员或引用在此明确失败而不是跳过。 */
export function comparedSnapshotFromIndex(
  index: HistoricalIntegratedSnapshotIndex,
): ComparisonSnapshot {
  const entities = new Map<string, ComparisonEntity>()
  for (const name of sortedNames(Object.keys(index.entities))) {
    const entity = index.entities[name]!
    const memberIds = sortedIds(entity.memberIds)
    const members = new Map<string, ComparisonMember>()
    for (const memberId of memberIds) {
      const member = entity.members[memberId]
      if (!member) throw new Error(`${name}/${memberId}: 索引缺少成员`)
      const details = new Map<DetailLocale, ComparisonFileReference>()
      for (const locale of entity.detailLocales) {
        const reference = member.files.details[locale]
        if (!reference)
          throw new Error(`${name}/${memberId}: 索引缺少 ${locale} 详情引用`)
        details.set(locale, reference)
      }
      members.set(memberId, {
        files: { data: member.files.data, details },
        sourceRecord: member.sourceRecord,
      })
    }
    entities.set(name, {
      name,
      rulesVersion: entity.rulesVersion,
      detailLocales: [...entity.detailLocales],
      memberIds,
      inputs: comparisonInputs(entity.inputs),
      members,
    })
  }
  return {
    format: index.format,
    sourceVersion: index.source.version,
    inputs: comparisonInputs(index.source.inputs),
    entities,
  }
}

/**
 * v2 单实体索引 → 比较视图。
 *
 * 只用于把受管理 v2 旧基线纳入同一比较口径：该外壳只描述 `agents` 一个类别，
 * 其输入清单已按 manifest、实体索引、详情顺序排列，因此快照级输入取 manifest，
 * 其余全部归属该类别。v2 的摘录 Pointer 不在完整索引中出现，验证器已经拒绝。
 */
export function comparedSnapshotFromLegacyIndex(
  index: HistoricalIntegratedIndex,
): ComparisonSnapshot {
  const inputs = comparisonInputs(index.source.inputs)
  const members = new Map<string, ComparisonMember>()
  for (const memberId of sortedIds(index.scope.agentIds)) {
    const member = index.agents[memberId]
    if (!member) throw new Error(`agents/${memberId}: v2 索引缺少成员`)
    const details = new Map<DetailLocale, ComparisonFileReference>()
    for (const locale of index.source.detailLocales) {
      const reference = member.files.content[locale]
      if (!reference)
        throw new Error(`agents/${memberId}: 缺少 ${locale} 详情引用`)
      details.set(locale, reference)
    }
    members.set(memberId, {
      files: { data: member.files.stats, details },
      sourceRecord: member.sourceRecord,
    })
  }
  const entities = new Map<string, ComparisonEntity>([
    [
      "agents",
      {
        name: "agents",
        rulesVersion: index.rulesVersion,
        detailLocales: [...index.source.detailLocales],
        memberIds: sortedIds(index.scope.agentIds),
        inputs: inputs.filter((input) => input.resource !== "manifest.json"),
        members,
      },
    ],
  ])
  return {
    format: index.format,
    sourceVersion: index.source.version,
    inputs: inputs.filter((input) => input.resource === "manifest.json"),
    entities,
  }
}

/** 已完整验证的一侧：制品根目录、比较视图与单文件读取上限。 */
export interface ComparedSnapshotSide {
  /** 这是基线还是候选；只用于读取实体文件时的错误定位。 */
  side: "baseline" | "candidate"
  root: string
  snapshot: ComparisonSnapshot
  maximumBytes: number
}

export interface CompareSnapshotUpdateOptions {
  /** 已完整验证的旧基线；首次生成时为 null，报告明确记录没有旧基线。 */
  baseline: ComparedSnapshotSide | null

  /** 本次已完整验证并经过 oxfmt 的候选。 */
  candidate: ComparedSnapshotSide
}

function compareInputs(
  category: string | null,
  before: readonly ComparisonSourceInput[],
  after: readonly ComparisonSourceInput[],
): { changes: UpdateReportInputChange[]; unchanged: number } {
  const changes: UpdateReportInputChange[] = []
  const beforeByResource = new Map(
    before.map((input) => [input.resource, input]),
  )
  const afterResources = new Set(after.map((input) => input.resource))
  let unchanged = 0
  for (const input of after) {
    const previous = beforeByResource.get(input.resource)
    if (!previous) {
      changes.push({
        category,
        resource: input.resource,
        change: "added",
        afterSha256: input.sha256,
      })
      continue
    }
    if (previous.sha256 === input.sha256) {
      unchanged++
      continue
    }
    changes.push({
      category,
      resource: input.resource,
      change: "changed",
      beforeSha256: previous.sha256,
      afterSha256: input.sha256,
    })
  }
  for (const input of before)
    if (!afterResources.has(input.resource))
      changes.push({
        category,
        resource: input.resource,
        change: "removed",
        beforeSha256: input.sha256,
      })
  return { changes, unchanged }
}

/**
 * 两侧都存在时读取一个成员文件；内容相同的文件不会进入这里。
 * 读取失败时标明是旧基线还是候选，便于保留现场排查。
 */
async function readComparedFile(
  side: ComparedSnapshotSide,
  path: string,
  location: SourceLocation,
) {
  try {
    return parseBytes(
      await readBytes(side.root, path, side.maximumBytes),
      path,
      location,
    )
  } catch (error) {
    throw new Error(
      `${side.side === "baseline" ? "旧基线" : "候选"} ${path}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
}

function attribution(
  sourceChanged: boolean,
  rulesChanged: boolean,
): ChangeAttribution {
  if (sourceChanged && rulesChanged) return "undetermined"
  if (sourceChanged) return "source"
  if (rulesChanged) return "rules"
  return "neither"
}

/** 一批差异记录按 change 计数；只统计条目，不做额外的字段树推断。 */
function countChanges(records: readonly DiffRecord[]) {
  let removed = 0
  let changed = 0
  let added = 0
  for (const record of records) {
    if (record.change === "removed") removed++
    else if (record.change === "changed") changed++
    else added++
  }
  return { removed, changed, added }
}

async function compareCategory(options: {
  name: string
  before: ComparisonEntity | undefined
  after: ComparisonEntity | undefined
  versionChanged: boolean
  categoryInputsChanged: boolean
  baseline: ComparedSnapshotSide | null
  candidate: ComparedSnapshotSide
}): Promise<UpdateReportCategory> {
  const { name, before, after } = options
  const presence: CategoryPresence = !before
    ? "added"
    : !after
      ? "removed"
      : "present"
  const rulesVersion = {
    before: before?.rulesVersion ?? null,
    after: after?.rulesVersion ?? null,
    changed:
      before !== undefined &&
      after !== undefined &&
      before.rulesVersion !== after.rulesVersion,
  }
  const addedMembers = after
    ? after.memberIds.filter((memberId) => !before?.members.has(memberId))
    : []
  const removedMembers = before
    ? before.memberIds.filter((memberId) => !after?.members.has(memberId))
    : []
  const changedMembers: string[] = []
  const unchangedMembers: string[] = []
  const addedFiles: string[] = []
  const removedFiles: string[] = []
  const semanticChangedFiles: string[] = []
  const formatOnlyChangedFiles: string[] = []
  const fileChanges: UpdateReportFileChange[] = []
  const changedSourceRecords: string[] = []
  const sourceRecordChanges: UpdateReportSourceRecordChange[] = []
  let fileUnchangedCount = 0
  let fileBeforeCount = 0
  let fileAfterCount = 0
  let sourceRecordUnchangedCount = 0
  let removedFields = 0
  let changedFields = 0
  let addedFields = 0

  const memberIds = sortedIds([
    ...new Set([...(before?.memberIds ?? []), ...(after?.memberIds ?? [])]),
  ])
  const locales = localeOrder(
    before?.detailLocales ?? [],
    after?.detailLocales ?? [],
  )
  for (const memberId of memberIds) {
    const previous = before?.members.get(memberId)
    const current = after?.members.get(memberId)
    let memberChanged = false
    if (previous && current) {
      const changes = compareJsonValues(
        previous.sourceRecord,
        current.sourceRecord,
      )
      if (changes.length) {
        memberChanged = true
        changedSourceRecords.push(memberId)
        sourceRecordChanges.push({ memberId, changes })
        const counts = countChanges(changes)
        removedFields += counts.removed
        changedFields += counts.changed
        addedFields += counts.added
      } else sourceRecordUnchangedCount++
    }
    const slots: (
      | { file: "data" }
      | { file: "details"; locale: DetailLocale }
    )[] = [
      { file: "data" },
      ...locales.map((locale) => ({ file: "details" as const, locale })),
    ]
    for (const slot of slots) {
      const beforeReference =
        slot.file === "data"
          ? previous?.files.data
          : previous?.files.details.get(slot.locale)
      const afterReference =
        slot.file === "data"
          ? current?.files.data
          : current?.files.details.get(slot.locale)
      if (!beforeReference && !afterReference) continue
      if (beforeReference) fileBeforeCount++
      if (afterReference) fileAfterCount++
      const path = afterReference?.path ?? beforeReference!.path
      if (!beforeReference) {
        addedFiles.push(path)
        memberChanged = true
        continue
      }
      if (!afterReference) {
        removedFiles.push(path)
        memberChanged = true
        continue
      }
      if (beforeReference.sha256 === afterReference.sha256) {
        fileUnchangedCount++
        continue
      }
      if (!options.baseline) throw new Error(`${path}: 缺少旧基线制品目录`)
      const location: SourceLocation = {
        entityId: memberId,
        locale: slot.file === "data" ? "input" : slot.locale,
        pointer: "",
      }
      const beforeValue = await readComparedFile(
        options.baseline,
        beforeReference.path,
        location,
      )
      const afterValue = await readComparedFile(
        options.candidate,
        afterReference.path,
        location,
      )
      memberChanged = true
      // 字节不同但 JSON 值相同属于纯排版变化，不产生字段差异条目。
      if (equalJson(beforeValue, afterValue)) {
        formatOnlyChangedFiles.push(path)
        continue
      }
      semanticChangedFiles.push(path)
      const changes = compareJsonValues(beforeValue, afterValue)
      if (!changes.length) throw new Error(`${path}: 字节与 JSON 值判断不一致`)
      fileChanges.push({ path, memberId, changes })
      const counts = countChanges(changes)
      removedFields += counts.removed
      changedFields += counts.changed
      addedFields += counts.added
    }
    if (previous && current) {
      if (memberChanged) changedMembers.push(memberId)
      else unchangedMembers.push(memberId)
    }
  }
  const sourceChanged =
    presence === "present" &&
    (options.versionChanged ||
      options.categoryInputsChanged ||
      changedSourceRecords.length > 0)
  const review = {
    required:
      removedMembers.length > 0 ||
      removedFiles.length > 0 ||
      semanticChangedFiles.length > 0 ||
      changedSourceRecords.length > 0,
    removedMembers: removedMembers.length,
    removedFiles: removedFiles.length,
    semanticChangedFiles: semanticChangedFiles.length,
    changedSourceRecords: changedSourceRecords.length,
    removedFields,
    changedFields,
    addedFields,
  }
  const result: EntityUpdateResult =
    addedMembers.length ||
    removedMembers.length ||
    addedFiles.length ||
    removedFiles.length ||
    semanticChangedFiles.length ||
    changedSourceRecords.length
      ? "changed"
      : formatOnlyChangedFiles.length
        ? "format-only"
        : "unchanged"
  return {
    name,
    checked: after !== undefined,
    presence,
    result,
    rulesVersion,
    members: {
      beforeCount: before?.memberIds.length ?? 0,
      afterCount: after?.memberIds.length ?? 0,
      added: addedMembers,
      removed: removedMembers,
      changed: changedMembers,
      unchanged: unchangedMembers,
    },
    files: {
      beforeCount: fileBeforeCount,
      afterCount: fileAfterCount,
      added: addedFiles,
      removed: removedFiles,
      semanticChanged: semanticChangedFiles,
      formatOnlyChanged: formatOnlyChangedFiles,
      unchangedCount: fileUnchangedCount,
    },
    sourceRecords: {
      changed: changedSourceRecords,
      unchangedCount: sourceRecordUnchangedCount,
      changes: sourceRecordChanges,
    },
    fileChanges,
    review,
    cause: {
      sourceChanged,
      rulesChanged: rulesVersion.changed,
      attributedTo: attribution(sourceChanged, rulesVersion.changed),
    },
  }
}

/**
 * 比较已完整验证的旧基线与候选，生成本次更新报告。
 *
 * 只读取两侧索引登记的成员文件，且仅在字节摘要不同时读取：摘要相同即无变化，
 * 因此未变化文件不会被重新解析。候选缺失基线时记录为首次生成，不伪装成普通版本更新。
 * 两侧读取都使用各自记录的预算，顺序执行，结果与并发完成顺序无关。
 */
export async function compareSnapshotUpdate(
  options: CompareSnapshotUpdateOptions,
): Promise<UpdateReport> {
  const { baseline, candidate } = options
  const version = {
    before: baseline?.snapshot.sourceVersion ?? null,
    after: candidate.snapshot.sourceVersion,
    changed:
      baseline !== null &&
      baseline.snapshot.sourceVersion !== candidate.snapshot.sourceVersion,
  }
  const names = sortedNames([
    ...(baseline?.snapshot.entities.keys() ?? []),
    ...candidate.snapshot.entities.keys(),
  ])
  const inputs: UpdateReportInputChange[] = []
  let unchangedInputCount = 0
  const snapshotInputs = compareInputs(
    null,
    baseline?.snapshot.inputs ?? [],
    candidate.snapshot.inputs,
  )
  inputs.push(...snapshotInputs.changes)
  unchangedInputCount += snapshotInputs.unchanged
  const categories: UpdateReportCategory[] = []
  for (const name of names) {
    const before = baseline?.snapshot.entities.get(name)
    const after = candidate.snapshot.entities.get(name)
    const categoryInputs = compareInputs(
      name,
      before?.inputs ?? [],
      after?.inputs ?? [],
    )
    inputs.push(...categoryInputs.changes)
    unchangedInputCount += categoryInputs.unchanged
    categories.push(
      await compareCategory({
        name,
        before,
        after,
        versionChanged: version.changed,
        categoryInputsChanged: categoryInputs.changes.length > 0,
        baseline,
        candidate,
      }),
    )
  }
  const recordsChanged = categories.some(
    (category) => category.sourceRecords.changed.length > 0,
  )
  // 来源材料本身是否变化：只新增或移除资源属于类别/成员覆盖变化，
  // 已由类别条目表达，不在此重复置位。
  const sourceChanged =
    version.changed ||
    inputs.some((input) => input.change === "changed") ||
    recordsChanged
  const rulesChanged = categories.some(
    (category) => category.rulesVersion.changed,
  )
  return {
    reportVersion: updateReportVersion,
    baseline: baseline
      ? {
          kind: "snapshot",
          format: baseline.snapshot.format,
          sourceVersion: baseline.snapshot.sourceVersion,
        }
      : { kind: "none" },
    candidate: {
      format: candidate.snapshot.format,
      sourceVersion: candidate.snapshot.sourceVersion,
    },
    checked: categories
      .filter((category) => category.presence !== "removed")
      .every((category) => category.checked),
    result: categories.some((category) => category.result === "changed")
      ? "changed"
      : categories.some((category) => category.result === "format-only")
        ? "format-only"
        : "unchanged",
    source: {
      version,
      inputs,
      unchangedInputCount,
      changed: sourceChanged,
    },
    rules: {
      categories: categories.map((category) => ({
        name: category.name,
        before: category.rulesVersion.before,
        after: category.rulesVersion.after,
        changed: category.rulesVersion.changed,
      })),
      changed: rulesChanged,
    },
    categories,
    changeCause: {
      sourceChanged,
      rulesChanged,
      attributedTo: attribution(sourceChanged, rulesChanged),
    },
  }
}

/** 回执用的按类别摘要；完整条目只保存在制品外的报告中。 */
export interface CategoryUpdateSummary {
  checked: boolean
  presence: CategoryPresence
  result: EntityUpdateResult
  members: {
    before: number
    after: number
    added: number
    removed: number
    changed: number
    unchanged: number
  }
  files: {
    before: number
    after: number
    added: number
    removed: number
    semanticChanged: number
    formatOnlyChanged: number
    unchanged: number
  }
  sourceRecordsChanged: number
  rulesVersionChanged: boolean
  reviewRequired: boolean
}

/** 回执摘要与报告由同一次比较结果派生，不重复判定状态。 */
export interface UpdateReportSummary {
  reportVersion: string
  firstGeneration: boolean
  sourceVersion: { before: string | null; after: string; changed: boolean }
  sourceChanged: boolean
  rulesChanged: boolean
  result: EntityUpdateResult
  reviewRequired: boolean
  categories: Record<string, CategoryUpdateSummary>
}

export function summarizeUpdateReport(
  report: UpdateReport,
): UpdateReportSummary {
  const categories: Record<string, CategoryUpdateSummary> = {}
  for (const category of report.categories)
    categories[category.name] = {
      checked: category.checked,
      presence: category.presence,
      result: category.result,
      members: {
        before: category.members.beforeCount,
        after: category.members.afterCount,
        added: category.members.added.length,
        removed: category.members.removed.length,
        changed: category.members.changed.length,
        unchanged: category.members.unchanged.length,
      },
      files: {
        before: category.files.beforeCount,
        after: category.files.afterCount,
        added: category.files.added.length,
        removed: category.files.removed.length,
        semanticChanged: category.files.semanticChanged.length,
        formatOnlyChanged: category.files.formatOnlyChanged.length,
        unchanged: category.files.unchangedCount,
      },
      sourceRecordsChanged: category.sourceRecords.changed.length,
      rulesVersionChanged: category.rulesVersion.changed,
      reviewRequired: category.review.required,
    }
  return {
    reportVersion: report.reportVersion,
    firstGeneration: report.baseline.kind === "none",
    sourceVersion: report.source.version,
    sourceChanged: report.source.changed,
    rulesChanged: report.rules.changed,
    result: report.result,
    reviewRequired: report.categories.some(
      (category) => category.review.required,
    ),
    categories,
  }
}
