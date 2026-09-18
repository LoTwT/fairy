import { lstat, mkdir, readFile, writeFile } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import type { ExportFileReference } from "../src/integration/agent-types.ts"
import type {
  IntegratedSnapshotEntity,
  IntegratedSnapshotIndex,
} from "../src/integration/snapshot-types.ts"
import { outputExpansionLimit } from "./nanoka-integration/artifact-files.ts"
import { withCurrentDataset } from "./nanoka-integration/current.ts"
import { directoryRoot, readBytes } from "./nanoka-integration/files.ts"
import { verifyIntegratedSnapshot } from "./nanoka-integration/snapshot-verify.ts"
import { loadSourcePolicy } from "./nanoka/policy.ts"

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
    throw error
  }
}

/** 发布清单只包含全部登记类别的完整成员文件；成员或语言引用缺失即失败。 */
export function publicationFiles(index: IntegratedSnapshotIndex): string[] {
  const files = ["index.json"]
  for (const [name, entity] of Object.entries(index.entities))
    for (const memberId of entity.memberIds) {
      const member = entity.members[memberId]
      if (!member)
        throw new Error(`/entities/${name}/${memberId}: missing member`)
      files.push(member.files.data.path)
      for (const locale of entity.detailLocales) {
        const reference = member.files.details[locale]
        if (!reference)
          throw new Error(`/entities/${name}/${memberId}: missing ${locale}`)
        files.push(reference.path)
      }
    }
  return files
}

/** 公开 API 当前覆盖的类别必须进入发布副本，且各类别的公开语言完整；缺失即拒绝发布。 */
function requirePublishedEntity(
  index: IntegratedSnapshotIndex,
  name: string,
): IntegratedSnapshotEntity {
  const entity = index.entities[name]
  if (!entity) throw new Error(`The published snapshot has no ${name} category`)
  for (const locale of ["zh", "en"] as const)
    if (!entity.detailLocales.includes(locale))
      throw new Error(
        `The published ${name} category is missing ${locale} details`,
      )
  return entity
}

/** 按成员 ID 升序读取各类别英文详情顶层 name 原值；缺失、空值或类内重名给出可定位文件。 */
async function englishDetailNames(
  snapshot: string,
  entity: IntegratedSnapshotEntity,
): Promise<string[]> {
  const names: string[] = []
  for (const id of entity.memberIds) {
    const reference: ExportFileReference = entity.members[id].files.details.en
    const { name } = JSON.parse(
      await readFile(join(snapshot, reference.path), "utf8"),
    )
    if (typeof name !== "string" || name.length === 0)
      throw new Error(`${reference.path}: name must be a non-empty string`)
    if (names.includes(name))
      throw new Error(
        `${reference.path}: duplicate English name ${JSON.stringify(name)}`,
      )
    names.push(name)
  }
  return names
}

/** 从已验证副本的英文顶层 name 生成全部已登记实体的精确类型、冻结名称/映射及显式懒加载表。 */
export async function generateCatalog(
  snapshot: string,
  index: IntegratedSnapshotIndex,
  importAttributes = true,
): Promise<string> {
  const agents = requirePublishedEntity(index, "agents")
  const driveDiscs = requirePublishedEntity(index, "drive-discs")
  const wEngines = requirePublishedEntity(index, "w-engines")
  const bangboos = requirePublishedEntity(index, "bangboos")
  const monsters = requirePublishedEntity(index, "monsters")
  const shiyu = requirePublishedEntity(index, "shiyu")
  const agentNames = await englishDetailNames(snapshot, agents)
  const driveDiscNames = await englishDetailNames(snapshot, driveDiscs)
  const wEngineNames = await englishDetailNames(snapshot, wEngines)
  const bangbooNames = await englishDetailNames(snapshot, bangboos)
  const monsterIds = [...monsters.memberIds]
  const shiyuIds = [...shiyu.memberIds]
  const json = JSON.stringify
  const lazy = (path: string, type: string) =>
    `() => import(${json(`@randomplay/data/integrated/${path}`)}${importAttributes ? ', { with: { type: "json" } }' : ""}).then(module => module.default as unknown as ${type})`
  const sourceIds = (names: string[], entity: IntegratedSnapshotEntity) =>
    `Object.freeze(Object.fromEntries(${json(names.map((name, i) => [name, entity.memberIds[i]]))}))`
  const loaderTable = (
    entity: IntegratedSnapshotEntity,
    data: string,
    details: string,
  ) =>
    entity.memberIds
      .map(
        (id) => `${json(id)}: {
data: ${lazy(entity.members[id].files.data.path, data)},
zh: ${lazy(entity.members[id].files.details.zh.path, details)},
en: ${lazy(entity.members[id].files.details.en.path, details)},
}`,
      )
      .join(",\n")
  return `// Generated from the verified publication snapshot. Do not edit.
import type { AgentData, AgentDetails } from "../src/integration/agent-types.ts"
import type { DriveDiscData, DriveDiscDetails } from "../src/integration/drive-disc-types.ts"
import type { WEngineData, WEngineDetails } from "../src/integration/w-engine-types.ts"
import type { BangbooData, BangbooDetails } from "../src/integration/bangboo-types.ts"
import type { MonsterData, MonsterDetails } from "../src/integration/monster-types.ts"
import type { ShiyuData, ShiyuDetails } from "../src/integration/shiyu-types.ts"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"
/** 本次发布全部代理人的英文详情顶层 name 原值。 */
export type AgentName = ${agentNames.map((name) => json(name)).join(" | ")}
/** 本次发布全部驱动盘套装的英文详情顶层 name 原值。 */
export type DriveDiscName = ${driveDiscNames.map((name) => json(name)).join(" | ")}
/** 本次发布全部 WEngine 的英文详情顶层 name 原值。 */
export type WEngineName = ${wEngineNames.map((name) => json(name)).join(" | ")}
/** 本次发布全部邦布的英文详情顶层 name 原值。 */
export type BangbooName = ${bangbooNames.map((name) => json(name)).join(" | ")}
/**
 * 本次发布全部怪物的来源索引顶层 ID（规范十进制字符串）。
 * Monster 类内允许重名与占位名称，公开身份是来源 ID 本身，不是名称。
 */
export type MonsterId = ${monsterIds.map((id) => json(id)).join(" | ")}
/**
 * 本次发布全部 Shiyu 区域的来源索引顶层 ID（规范十进制字符串）。
 * Shiyu 类内大量重名（本地 3.1 的剧变节点类记录），公开身份是来源 ID 本身，不是名称。
 */
export type ShiyuId = ${shiyuIds.map((id) => json(id)).join(" | ")}
/** 按来源 ID 数值升序排列的完整代理人英文名称列表；运行时冻结。 */
export const agentNames: readonly AgentName[] = Object.freeze(${json(agentNames)})
/** 按来源 ID 数值升序排列的完整驱动盘英文名称列表；运行时冻结。 */
export const driveDiscNames: readonly DriveDiscName[] = Object.freeze(${json(driveDiscNames)})
/** 按来源 ID 数值升序排列的完整 WEngine 英文名称列表；运行时冻结。 */
export const wEngineNames: readonly WEngineName[] = Object.freeze(${json(wEngineNames)})
/** 按来源 ID 数值升序排列的完整邦布英文名称列表；运行时冻结。 */
export const bangbooNames: readonly BangbooName[] = Object.freeze(${json(bangbooNames)})
/** 按来源 ID 数值升序排列的完整怪物来源 ID 列表；运行时冻结。 */
export const monsterIds: readonly MonsterId[] = Object.freeze(${json(monsterIds)})
/** 按来源 ID 数值升序排列的完整 Shiyu 来源 ID 列表；运行时冻结。 */
export const shiyuIds: readonly ShiyuId[] = Object.freeze(${json(shiyuIds)})
export const agentSourceIds: Readonly<Record<AgentName, string>> = ${sourceIds(agentNames, agents)} as Readonly<Record<AgentName, string>>
export const driveDiscSourceIds: Readonly<Record<DriveDiscName, string>> = ${sourceIds(driveDiscNames, driveDiscs)} as Readonly<Record<DriveDiscName, string>>
export const wEngineSourceIds: Readonly<Record<WEngineName, string>> = ${sourceIds(wEngineNames, wEngines)} as Readonly<Record<WEngineName, string>>
export const bangbooSourceIds: Readonly<Record<BangbooName, string>> = ${sourceIds(bangbooNames, bangboos)} as Readonly<Record<BangbooName, string>>
export const indexLoader = ${lazy("index.json", "IntegratedSnapshotIndex")}
export const agentLoaders: Record<string, { data: () => Promise<AgentData>; zh: () => Promise<AgentDetails>; en: () => Promise<AgentDetails> }> = {
${loaderTable(agents, "AgentData", "AgentDetails")}
}
export const driveDiscLoaders: Record<string, { data: () => Promise<DriveDiscData>; zh: () => Promise<DriveDiscDetails>; en: () => Promise<DriveDiscDetails> }> = {
${loaderTable(driveDiscs, "DriveDiscData", "DriveDiscDetails")}
}
export const wEngineLoaders: Record<string, { data: () => Promise<WEngineData>; zh: () => Promise<WEngineDetails>; en: () => Promise<WEngineDetails> }> = {
${loaderTable(wEngines, "WEngineData", "WEngineDetails")}
}
export const bangbooLoaders: Record<string, { data: () => Promise<BangbooData>; zh: () => Promise<BangbooDetails>; en: () => Promise<BangbooDetails> }> = {
${loaderTable(bangboos, "BangbooData", "BangbooDetails")}
}
export const monsterLoaders: Record<string, { data: () => Promise<MonsterData>; zh: () => Promise<MonsterDetails>; en: () => Promise<MonsterDetails> }> = {
${loaderTable(monsters, "MonsterData", "MonsterDetails")}
}
export const shiyuLoaders: Record<string, { data: () => Promise<ShiyuData>; zh: () => Promise<ShiyuDetails>; en: () => Promise<ShiyuDetails> }> = {
${loaderTable(shiyu, "ShiyuData", "ShiyuDetails")}
}
`
}

/**
 * 创建独占发布输入目录。受管理源在既有租约内验证并读完字节；静态源无需管理记录或 raw。
 * 生成与后续打包只读此副本，绝不在释放租约后重新读取来源目录。
 */
export async function preparePublication(
  targetDirectory: string,
  outputDirectory: string,
): Promise<IntegratedSnapshotIndex> {
  const target = resolve(targetDirectory)
  if ((await lstat(target)).isSymbolicLink())
    throw new Error("Publication source must not be a symbolic link")
  const parent = await directoryRoot(dirname(target))
  const control = join(parent, `.${basename(target)}.fairy-state`)
  await mkdir(outputDirectory)
  const snapshot = join(outputDirectory, "integrated")
  await mkdir(snapshot)
  const policy = await loadSourcePolicy()
  const maximumBytes =
    policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
  async function copyVerifiedBytes(artifactDirectory: string) {
    const index = await verifyIntegratedSnapshot({
      artifactDirectory,
      policy,
    })
    const root = await directoryRoot(artifactDirectory)
    for (const path of publicationFiles(index)) {
      const bytes = await readBytes(root, path, maximumBytes)
      const destination = join(snapshot, path)
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, bytes, { flag: "wx" })
    }
    return verifyIntegratedSnapshot({
      artifactDirectory: snapshot,
      policy,
      expectedIndex: index,
    })
  }
  const managed = await exists(control)
  const index = managed
    ? await withCurrentDataset(target, copyVerifiedBytes)
    : await copyVerifiedBytes(target)
  if (!managed && (await exists(control)))
    throw new Error(
      "Static publication source became managed during copying; retry under its lock",
    )
  await writeFile(
    join(outputDirectory, "catalog.ts"),
    await generateCatalog(snapshot, index),
    { flag: "wx" },
  )
  return index
}
