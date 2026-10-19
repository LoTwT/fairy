import { lstat, mkdir, readFile } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import type { ExportFileReference } from "../src/integration/agent-types.ts"
import type {
  IntegratedSnapshotEntity,
  IntegratedSnapshotIndex,
} from "../src/integration/snapshot-types.ts"
import { writeFileAtomically } from "./atomic-write.ts"
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

/**
 * 按成员 ID 升序读取来源索引 en 名称原值（data.json 的 names.en）。
 * 四个名称类别统一以索引名称为稳定来源，与英文详情显示名解耦；
 * 缺失、空值或类内重名给出可定位文件。
 */
async function sourceIndexEnglishNames(
  snapshot: string,
  entity: IntegratedSnapshotEntity,
): Promise<string[]> {
  const names: string[] = []
  for (const id of entity.memberIds) {
    const reference: ExportFileReference = entity.members[id].files.data
    const { names: memberNames } = JSON.parse(
      await readFile(join(snapshot, reference.path), "utf8"),
    )
    const name = memberNames?.en
    if (typeof name !== "string" || name.length === 0)
      throw new Error(`${reference.path}: names.en must be a non-empty string`)
    if (names.includes(name))
      throw new Error(
        `${reference.path}: duplicate English index name ${JSON.stringify(name)}`,
      )
    names.push(name)
  }
  return names
}

/** 从已验证副本生成全部已登记实体的精确类型、冻结名称/映射及显式懒加载表；四个名称类别统一读来源索引 en 名（data.names.en）。 */
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
  const boss = requirePublishedEntity(index, "boss")
  const simul = requirePublishedEntity(index, "simul")
  const agentNames = await sourceIndexEnglishNames(snapshot, agents)
  const driveDiscNames = await sourceIndexEnglishNames(snapshot, driveDiscs)
  const wEngineNames = await sourceIndexEnglishNames(snapshot, wEngines)
  const bangbooNames = await sourceIndexEnglishNames(snapshot, bangboos)
  const monsterIds = [...monsters.memberIds]
  const shiyuIds = [...shiyu.memberIds]
  const bossIds = [...boss.memberIds]
  const simulIds = [...simul.memberIds]
  const json = JSON.stringify
  const lazy = (path: string, type: string) =>
    `() => import(${json(`@randomplay/data/integrated/${path}`)}${importAttributes ? ', { with: { type: "json" } }' : ""}).then(module => module.default as unknown as ${type})`
  const lazyAttribute = (path: string, type: string) =>
    `() => import(${json(`@randomplay/data/definitions/attributes/${path}`)}${importAttributes ? ', { with: { type: "json" } }' : ""}).then(module => module.default as unknown as ${type})`
  const lazyActions = (id: string) =>
    `() => import(${json(`@randomplay/data/definitions/skills/agents/${id}.json`)}${importAttributes ? ', { with: { type: "json" } }' : ""}).then(module => module.default as unknown as AgentActions)`
  const lazyEffect = (path: string, type: string) =>
    `() => import(${json(`@randomplay/data/definitions/effects/${path}`)}${importAttributes ? ', { with: { type: "json" } }' : ""}).then(module => module.default as unknown as ${type})`
  const sourceIds = (names: string[], entity: IntegratedSnapshotEntity) =>
    `Object.freeze(Object.fromEntries(${json(names.map((name, i) => [name, entity.memberIds[i]]))}))`
  const namesBySourceId = (names: string[], entity: IntegratedSnapshotEntity) =>
    `Object.freeze(Object.fromEntries(${json(names.map((name, i) => [entity.memberIds[i], name]))}))`
  const snapshotInfoValue = {
    format: index.format,
    source: { id: index.source.id, version: index.source.version },
    entities: Object.fromEntries(
      Object.entries(index.entities).map(([name, entity]) => [
        name,
        {
          rulesVersion: entity.rulesVersion,
          detailLocales: entity.detailLocales,
          memberIds: entity.memberIds,
        },
      ]),
    ),
  }
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
import type { BossData, BossDetails } from "../src/integration/boss-types.ts"
import type { SimulData, SimulDetails } from "../src/integration/simul-types.ts"
import type { IntegratedSnapshotIndex, IntegratedSnapshotInfo } from "../src/integration/snapshot-types.ts"
import type { AgentLevel60Attributes, WEngineLevel60Attributes, SDriveDiscMaxLevelAffixes } from "../src/attributes/types.ts"
import type { AgentActions } from "../src/skills/types.ts"
import type { RuleSet, StaticEffectCatalog } from "@randomplay/shared"
/** 本次发布全部代理人的来源索引 en 名称原值（AgentData.names.en，稳定来源，与英文详情显示名解耦）。 */
export type AgentName = ${agentNames.map((name) => json(name)).join(" | ")}
/** 本次发布全部驱动盘的来源索引 en 名称原值（DriveDiscData.names.en）。 */
export type DriveDiscName = ${driveDiscNames.map((name) => json(name)).join(" | ")}
/** 本次发布全部 WEngine 的来源索引 en 名称原值（WEngineData.names.en）。 */
export type WEngineName = ${wEngineNames.map((name) => json(name)).join(" | ")}
/** 本次发布全部邦布的来源索引 en 名称原值（BangbooData.names.en）。 */
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
/**
 * 本次发布全部 Boss 试炼的来源索引顶层 ID（规范十进制字符串）。
 * Boss 类内完全同名（本地 3.1 全部记录同名），公开身份是来源 ID 本身，不是名称。
 */
export type BossId = ${bossIds.map((id) => json(id)).join(" | ")}
/**
 * 本次发布全部 Simul 模拟战的来源索引顶层 ID（规范十进制字符串）。
 * Simul 无顶层 name，公开身份是来源 ID 本身。
 */
export type SimulId = ${simulIds.map((id) => json(id)).join(" | ")}
/** 本次发布全部代理人的来源索引顶层 ID（规范十进制字符串），与目录、索引成员的身份一致。 */
export type AgentSourceId = ${agents.memberIds.map((id) => json(id)).join(" | ")}
/** 本次发布全部驱动盘套装的来源索引顶层 ID（规范十进制字符串）。 */
export type DriveDiscSourceId = ${driveDiscs.memberIds.map((id) => json(id)).join(" | ")}
/** 本次发布全部 WEngine 的来源索引顶层 ID（规范十进制字符串）。 */
export type WEngineSourceId = ${wEngines.memberIds.map((id) => json(id)).join(" | ")}
/** 本次发布全部邦布的来源索引顶层 ID（规范十进制字符串）。 */
export type BangbooSourceId = ${bangboos.memberIds.map((id) => json(id)).join(" | ")}
/** 按来源 ID 数值升序排列的完整代理人来源索引 en 名称列表；运行时冻结。 */
export const agentNames: readonly AgentName[] = Object.freeze(${json(agentNames)})
/** 按来源 ID 数值升序排列的完整驱动盘来源索引 en 名称列表；运行时冻结。 */
export const driveDiscNames: readonly DriveDiscName[] = Object.freeze(${json(driveDiscNames)})
/** 按来源 ID 数值升序排列的完整 WEngine 来源索引 en 名称列表；运行时冻结。 */
export const wEngineNames: readonly WEngineName[] = Object.freeze(${json(wEngineNames)})
/** 按来源 ID 数值升序排列的完整邦布来源索引 en 名称列表；运行时冻结。 */
export const bangbooNames: readonly BangbooName[] = Object.freeze(${json(bangbooNames)})
/** 按来源 ID 数值升序排列的完整怪物来源 ID 列表；运行时冻结。 */
export const monsterIds: readonly MonsterId[] = Object.freeze(${json(monsterIds)})
/** 按来源 ID 数值升序排列的完整 Shiyu 来源 ID 列表；运行时冻结。 */
export const shiyuIds: readonly ShiyuId[] = Object.freeze(${json(shiyuIds)})
/** 按来源 ID 数值升序排列的完整 Boss 来源 ID 列表；运行时冻结。 */
export const bossIds: readonly BossId[] = Object.freeze(${json(bossIds)})
/** 按来源 ID 数值升序排列的完整 Simul 来源 ID 列表；运行时冻结。 */
export const simulIds: readonly SimulId[] = Object.freeze(${json(simulIds)})
export const agentSourceIds: Readonly<Record<AgentName, AgentSourceId>> = ${sourceIds(agentNames, agents)} as Readonly<Record<AgentName, AgentSourceId>>
export const driveDiscSourceIds: Readonly<Record<DriveDiscName, DriveDiscSourceId>> = ${sourceIds(driveDiscNames, driveDiscs)} as Readonly<Record<DriveDiscName, DriveDiscSourceId>>
export const wEngineSourceIds: Readonly<Record<WEngineName, WEngineSourceId>> = ${sourceIds(wEngineNames, wEngines)} as Readonly<Record<WEngineName, WEngineSourceId>>
export const bangbooSourceIds: Readonly<Record<BangbooName, BangbooSourceId>> = ${sourceIds(bangbooNames, bangboos)} as Readonly<Record<BangbooName, BangbooSourceId>>
/** 代理人来源 ID → 来源索引 en 名称；与 agentSourceIds 互为反向，运行时冻结。 */
export const agentNamesBySourceId: Readonly<Record<AgentSourceId, AgentName>> = ${namesBySourceId(agentNames, agents)} as Readonly<Record<AgentSourceId, AgentName>>
/** 驱动盘来源 ID → 来源索引 en 名称；与 driveDiscSourceIds 互为反向，运行时冻结。 */
export const driveDiscNamesBySourceId: Readonly<Record<DriveDiscSourceId, DriveDiscName>> = ${namesBySourceId(driveDiscNames, driveDiscs)} as Readonly<Record<DriveDiscSourceId, DriveDiscName>>
/** WEngine 来源 ID → 来源索引 en 名称；与 wEngineSourceIds 互为反向，运行时冻结。 */
export const wEngineNamesBySourceId: Readonly<Record<WEngineSourceId, WEngineName>> = ${namesBySourceId(wEngineNames, wEngines)} as Readonly<Record<WEngineSourceId, WEngineName>>
/** 邦布来源 ID → 来源索引 en 名称；与 bangbooSourceIds 互为反向，运行时冻结。 */
export const bangbooNamesBySourceId: Readonly<Record<BangbooSourceId, BangbooName>> = ${namesBySourceId(bangbooNames, bangboos)} as Readonly<Record<BangbooSourceId, BangbooName>>
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested)
    Object.freeze(value)
  }
  return value
}
/** 完整索引的轻量信息：来源版本与各类别的规则版本、语言、成员清单；运行时深冻结。 */
export const snapshotInfo: IntegratedSnapshotInfo = deepFreeze(${json(snapshotInfoValue)})
export const indexLoader = ${lazy("index.json", "IntegratedSnapshotIndex")}
export const staticEffectDefinitionsLoader = ${lazyEffect("static.json", "RuleSet")}
export const staticEffectCatalogLoader = ${lazyEffect("static-catalog.json", "StaticEffectCatalog")}
export const agentAttributeLoaders: Record<string, () => Promise<AgentLevel60Attributes>> = {
${agents.memberIds.map((id) => `${json(id)}: ${lazyAttribute(`agents/${id}.json`, "AgentLevel60Attributes")}`).join(",\n")}
}
export const wEngineAttributeLoaders: Record<string, () => Promise<WEngineLevel60Attributes>> = {
${wEngines.memberIds.map((id) => `${json(id)}: ${lazyAttribute(`w-engines/${id}.json`, "WEngineLevel60Attributes")}`).join(",\n")}
}
export const driveDiscAffixesLoader = ${lazyAttribute("drive-disc-affixes.json", "SDriveDiscMaxLevelAffixes")}
export const agentActionLoaders: Record<string, () => Promise<AgentActions>> = {
${agents.memberIds.map((id) => `${json(id)}: ${lazyActions(id)}`).join(",\n")}
}
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
export const bossLoaders: Record<string, { data: () => Promise<BossData>; zh: () => Promise<BossDetails>; en: () => Promise<BossDetails> }> = {
${loaderTable(boss, "BossData", "BossDetails")}
}
export const simulLoaders: Record<string, { data: () => Promise<SimulData>; zh: () => Promise<SimulDetails>; en: () => Promise<SimulDetails> }> = {
${loaderTable(simul, "SimulData", "SimulDetails")}
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
      await writeFileAtomically(join(snapshot, path), bytes, {
        exclusive: true,
      })
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
  await writeFileAtomically(
    join(outputDirectory, "catalog.ts"),
    await generateCatalog(snapshot, index),
    { exclusive: true },
  )
  return index
}
