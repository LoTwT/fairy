import { lstat, mkdir, readFile, writeFile } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import type { ExportFileReference } from "../src/integration/agent-types.ts"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"
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

/** 从已验证副本的英文顶层 name 生成精确类型、冻结名称/映射及显式懒加载表。 */
export async function generateCatalog(
  snapshot: string,
  index: IntegratedSnapshotIndex,
  importAttributes = true,
): Promise<string> {
  const agents = index.entities["agents"]
  if (!agents) throw new Error("The published snapshot has no agents category")
  for (const locale of ["zh", "en"] as const)
    if (!agents.detailLocales.includes(locale))
      throw new Error(
        `The published agents category is missing ${locale} details`,
      )
  const names: string[] = []
  for (const id of agents.memberIds) {
    const reference: ExportFileReference = agents.members[id].files.details.en
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
  const json = JSON.stringify
  const lazy = (path: string, type: string) =>
    `() => import(${json(`@randomplay/data/integrated/${path}`)}${importAttributes ? ', { with: { type: "json" } }' : ""}).then(module => module.default as unknown as ${type})`
  return `// Generated from the verified publication snapshot. Do not edit.
import type { AgentData, AgentDetails } from "../src/integration/agent-types.ts"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"
/** 本次发布全部代理人的英文详情顶层 name 原值。 */
export type AgentName = ${names.map((name) => json(name)).join(" | ")}
/** 按来源 ID 数值升序排列的完整英文名称列表；运行时冻结。 */
export const agentNames: readonly AgentName[] = Object.freeze(${json(names)})
export const agentSourceIds: Readonly<Record<AgentName, string>> = Object.freeze(Object.fromEntries(${json(names.map((name, i) => [name, agents.memberIds[i]]))})) as Readonly<Record<AgentName, string>>
export const indexLoader = ${lazy("index.json", "IntegratedSnapshotIndex")}
export const agentLoaders: Record<string, { data: () => Promise<AgentData>; zh: () => Promise<AgentDetails>; en: () => Promise<AgentDetails> }> = {
${agents.memberIds
  .map(
    (id) => `${json(id)}: {
data: ${lazy(agents.members[id].files.data.path, "AgentData")},
zh: ${lazy(agents.members[id].files.details.zh.path, "AgentDetails")},
en: ${lazy(agents.members[id].files.details.en.path, "AgentDetails")},
}`,
  )
  .join(",\n")}
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
