import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import {
  directoryRoot,
  sha256,
} from "../../scripts/nanoka-integration/files.ts"
import { buildIntegratedSnapshot } from "../../scripts/nanoka-integration/snapshot-build.ts"
import { loadSourcePolicy } from "../../scripts/nanoka/policy.ts"
import { agentInput } from "./agent-source.ts"
import { rewriteAsLegacyV2Artifact } from "./synthetic-dataset.ts"

/** 合成双语制品；不同英文展示名、codeName 和索引名称用于捕获错误取值来源。 */
export async function publicationFixture(root: string) {
  const rawRoot = join(root, "raw")
  const version = "synthetic-publication"
  async function write(path: string, value: unknown) {
    const destination = join(rawRoot, version, path)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, JSON.stringify(value))
  }
  const input = agentInput()
  await write("manifest.json", {
    zzz: { live: version, latest: version, available: [version] },
  })
  await write("character.json", {
    "10": input.sourceRecord,
    "2": input.sourceRecord,
  })
  for (const [id, name] of [
    ["10", "Soldier 0 - Anby"],
    ["2", "Astra Yao"],
  ]) {
    for (const locale of ["zh", "en"] as const) {
      await write(`${locale}/character/${id}.json`, {
        ...input.details[locale],
        id: Number(id),
        code_name: "Astra",
        name: locale === "en" ? name : `中文 ${id}`,
      })
    }
  }
  const result = await buildIntegratedSnapshot({
    rawRoot,
    version,
    temporaryParent: root,
  })
  return { ...result, rawRoot, version }
}

/** 受管理 v2 数据集现场：v2 外壳制品加旧协议（v1）管理记录；只用于拒绝路径。 */
export interface LegacyManagedPublicationFixture {
  /** 受管理目标目录；内容等价于 v3 构建结果，只把索引外壳改写为 v2。 */
  targetDirectory: string

  /** 旧记录的控制目录；成员只有永久锁与 idle 记录。 */
  control: string

  /** 本次受管理数据集的来源输入根与版本，可用于显式迁移等其他路径。 */
  rawRoot: string
  version: string
}

/**
 * 合成受管理的 v2 数据集：先按当前代码构建完整 v3 制品，再改写索引外壳为 v2，最后写入旧协议记录。
 *
 * 成员文件字节与 v3 构建结果一致，因此任何就地迁移或改写都会在字节指纹上留下痕迹；
 * 记录只表达“本机已登记一个 v2 数据集”，用于证明普通构建与读取路径不隐式迁移。
 */
export async function managedLegacyV2Fixture(
  root: string,
): Promise<LegacyManagedPublicationFixture> {
  const { artifactDirectory, index, rawRoot, version } =
    await publicationFixture(root)
  const parent = await directoryRoot(root)
  const target = join(parent, "managed")
  await rename(artifactDirectory, target)
  await rewriteAsLegacyV2Artifact(target)
  const agents = index.entities["agents"]
  if (!agents) throw new Error("合成制品缺少 agents 类别")
  const control = join(parent, ".managed.fairy-state")
  await mkdir(control)
  // 永久锁数据库为空文件即可：打开时不需要已有 schema，且不因此改写记录。
  await writeFile(join(control, "lock.sqlite"), "")
  await writeFile(
    join(control, "state.json"),
    serializeJson({
      protocol: "fairy-nanoka-current/1",
      targetDirectory: target,
      phase: "idle",
      current: {
        indexSha256: sha256(await readFile(join(target, "index.json"))),
        policy: await loadSourcePolicy(),
        rulesVersion: agents.rulesVersion,
      },
    }),
  )
  return { targetDirectory: target, control, rawRoot, version }
}
