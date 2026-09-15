import { lstat, mkdir, readFile, writeFile } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import type { IntegratedIndex } from "../src/integration/agent-types.ts"
import { withNanokaCurrentDataset } from "./nanoka-integration/current.ts"
import { directoryRoot, readBytes } from "./nanoka-integration/files.ts"
import {
  outputExpansionLimit,
  verifyNanokaAgentArtifact,
} from "./nanoka-integration/verify.ts"
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

/** 成员与文件引用以完整验证后的索引为准，不扫描目录推导成员。 */
export function publicationFiles(index: IntegratedIndex): string[] {
  return [
    "index.json",
    ...index.scope.agentIds.flatMap((id) => {
      const files = index.agents[id].files
      return [files.stats.path, files.content.zh.path, files.content.en.path]
    }),
  ]
}

/** 从已验证副本的英文顶层 name 生成精确类型、冻结名称/映射及显式懒加载表。 */
export async function generateCatalog(
  snapshot: string,
  index: IntegratedIndex,
  importAttributes = true,
): Promise<string> {
  const names: string[] = []
  for (const id of index.scope.agentIds) {
    const path = index.agents[id].files.content.en.path
    const { name } = JSON.parse(await readFile(join(snapshot, path), "utf8"))
    if (typeof name !== "string" || name.length === 0)
      throw new Error(`${path}: name must be a non-empty string`)
    if (names.includes(name))
      throw new Error(`${path}: duplicate English name ${JSON.stringify(name)}`)
    names.push(name)
  }
  const json = JSON.stringify
  const lazy = (path: string, type: string) =>
    `() => import(${json(`@randomplay/data/integrated/${path}`)}${importAttributes ? ', { with: { type: "json" } }' : ""}).then(module => module.default as unknown as ${type})`
  return `// Generated from the verified publication snapshot. Do not edit.
import type { AgentData, AgentDetails, IntegratedIndex } from "../src/integration/agent-types.ts"
/** 本次发布全部代理人的英文详情顶层 name 原值。 */
export type AgentName = ${names.map((name) => json(name)).join(" | ")}
/** 按来源 ID 数值升序排列的完整英文名称列表；运行时冻结。 */
export const agentNames: readonly AgentName[] = Object.freeze(${json(names)})
export const agentSourceIds: Readonly<Record<AgentName, string>> = Object.freeze(Object.fromEntries(${json(names.map((name, i) => [name, index.scope.agentIds[i]]))})) as Readonly<Record<AgentName, string>>
export const indexLoader = ${lazy("index.json", "IntegratedIndex")}
export const agentLoaders: Record<string, { data: () => Promise<AgentData>; zh: () => Promise<AgentDetails>; en: () => Promise<AgentDetails> }> = {
${index.scope.agentIds
  .map(
    (id) => `${json(id)}: {
data: ${lazy(index.agents[id].files.stats.path, "AgentData")},
zh: ${lazy(index.agents[id].files.content.zh.path, "AgentDetails")},
en: ${lazy(index.agents[id].files.content.en.path, "AgentDetails")},
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
): Promise<IntegratedIndex> {
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
    const index = await verifyNanokaAgentArtifact({ artifactDirectory, policy })
    const root = await directoryRoot(artifactDirectory)
    for (const path of publicationFiles(index)) {
      const bytes = await readBytes(root, path, maximumBytes)
      const destination = join(snapshot, path)
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, bytes, { flag: "wx" })
    }
    return verifyNanokaAgentArtifact({
      artifactDirectory: snapshot,
      policy,
      expectedIndex: index,
    })
  }
  const managed = await exists(control)
  const index = managed
    ? await withNanokaCurrentDataset(target, copyVerifiedBytes)
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
