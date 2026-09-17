import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, sep } from "node:path"
import type {
  DetailLocale,
  ExportFileReference,
  IntegratedIndex,
} from "../../src/integration/agent-types.ts"
import type {
  IntegratedSnapshotIndex,
  IntegratedSnapshotMember,
  IntegratedSnapshotSourceInput,
} from "../../src/integration/snapshot-types.ts"
import { integratedSnapshotFormat } from "../../src/integration/snapshot-types.ts"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import { supportedLanguages } from "../../src/nanoka-identity.ts"
import { loadSourcePolicy, validateSourcePolicy } from "../nanoka/policy.ts"
import type { SourcePolicy } from "../nanoka/policy.ts"
import {
  completeLocaleRecord,
  outputExpansionLimit,
  requireValue,
} from "./artifact-files.ts"
import { directoryRoot, readBytes, sha256 } from "./files.ts"
import { formatGeneratedJson } from "./format.ts"
import { onboardedSnapshotEntities } from "./snapshot-entities.ts"
import { verifyIntegratedSnapshot } from "./snapshot-verify.ts"
import { verifyNanokaAgentArtifact } from "./verify.ts"

/** 转换输入；只接受静态制品副本，不读取 raw，也不改写输入。 */
export interface ConvertNanokaAgentsArtifactOptions {
  /** v2 代理人制品目录；只读，转换期间必须保持不变。 */
  artifactDirectory: string

  /** 独占输出父目录；默认系统临时目录，不能位于输入制品目录内部。 */
  outputParent?: string

  /** 默认加载来源配置；显式策略仍复用同一完整校验。 */
  policy?: SourcePolicy
}

/** 转换结果；conversionDirectory 可整体移除。 */
export interface IntegratedSnapshotConversionResult {
  /** 本次独占的新目录，包含转换后的制品。 */
  conversionDirectory: string

  /** 转换后的 integrated 完整制品目录。 */
  artifactDirectory: string

  /** 从实际落盘字节复验得到的完整根索引。 */
  index: IntegratedSnapshotIndex

  /** 转换的代理人成员数。 */
  memberCount: number

  /** 输入索引登记的原始资源数。 */
  inputFileCount: number

  /** 制品文件数，包含总索引。 */
  outputFileCount: number
}

/** candidate 是否就是 ancestor 或位于其内部；两侧都已解析系统路径别名。 */
function isInsidePath(ancestor: string, candidate: string): boolean {
  const path = relative(ancestor, candidate)
  return (
    path === "" ||
    (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`))
  )
}

/** 索引输入条目转换为制品输入记录；只保留资源名与摘要，不带摘录 Pointer。 */
function toSnapshotInput(input: {
  resource: string
  sha256: string
}): IntegratedSnapshotSourceInput {
  return { resource: input.resource, sha256: input.sha256 }
}

/**
 * 把当前规则、当前语言配置下已完整验证的 v2 代理人制品转换为多实体 v3 根索引。
 *
 * 实体文件按原字节复制，来源索引记录原值保留，规则版本从输入原样带入而不升级；
 * 其他 format、其他规则、样例范围、历史语言子集或损坏输入都明确失败，不猜测转换、不静默降级。
 * 受管理目录必须先按既有读取契约取得稳定副本再传入，本函数只处理静态副本。
 */
export async function convertNanokaAgentsArtifactToSnapshot(
  options: ConvertNanokaAgentsArtifactOptions,
): Promise<IntegratedSnapshotConversionResult> {
  const policy = validateSourcePolicy(
    options.policy ?? (await loadSourcePolicy()),
  )
  const agents = onboardedSnapshotEntities.find(
    (entity) => entity.name === "agents",
  )
  if (!agents) throw new Error("已接入类别登记表缺少 agents 类别")
  const source = await directoryRoot(options.artifactDirectory)
  const outputParent = await directoryRoot(options.outputParent ?? tmpdir())
  // 创建任何输出之前先按解析后的实际路径拒绝与输入重叠；路径别名由 directoryRoot 统一解析。
  requireValue(
    !isInsidePath(source, outputParent),
    "outputParent",
    "输出父目录不能位于输入制品目录内",
  )
  let index: IntegratedIndex<string>
  try {
    // 复用 v2 完整验证器：外壳、范围、语言、成员、身份、精确文件集合与全部字节摘要。
    index = await verifyNanokaAgentArtifact({
      artifactDirectory: source,
      policy,
      rulesVersion: agents.rulesVersion,
    })
  } catch (error) {
    throw new Error(
      `输入制品未通过 v2 完整验证，不执行转换：${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
  if (index.source.detailLocales.length !== supportedLanguages.length)
    throw new Error("输入制品不是当前完整语言配置，不执行转换")
  const conversionDirectory = await mkdtemp(
    join(outputParent, "fairy-integrated-conversion-"),
  )
  try {
    const artifactDirectory = join(conversionDirectory, "integrated")
    await mkdir(artifactDirectory)
    const maximumTotalBytes =
      policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
    let outputBytes = 0
    let copiedFileCount = 0
    const maximumBytes = () =>
      Math.min(
        policy.requestPolicy.maximumResponseBytes * outputExpansionLimit,
        maximumTotalBytes - outputBytes,
      )
    async function copyMemberFile(
      reference: ExportFileReference,
      path: string,
    ): Promise<void> {
      const bytes = await readBytes(source, path, maximumBytes())
      requireValue(sha256(bytes) === reference.sha256, path, "摘要不一致")
      const destination = join(artifactDirectory, path)
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, bytes, { flag: "wx" })
      outputBytes += bytes.byteLength
      copiedFileCount++
    }
    const inputs = index.source.inputs
    requireValue(
      inputs.length > 0 &&
        inputs[0]?.resource === "manifest.json" &&
        inputs.filter((input) => input.resource === "manifest.json").length ===
          1,
      "/source/inputs",
      "快照级输入不是唯一的 manifest.json",
    )
    const snapshotInputs = inputs.slice(0, 1).map(toSnapshotInput)
    const categoryInputs = inputs.slice(1).map(toSnapshotInput)
    const members: Record<string, IntegratedSnapshotMember> = {}
    for (const memberId of index.scope.agentIds) {
      const member = index.agents[memberId]
      if (!member) throw new Error(`输入索引缺少成员 ${memberId}`)
      const data = member.files.stats
      await copyMemberFile(data, data.path)
      const detailReferences = new Map<DetailLocale, ExportFileReference>()
      for (const locale of index.source.detailLocales) {
        const reference = member.files.content[locale]
        requireValue(
          reference !== undefined,
          `agents/${memberId}`,
          `缺少 ${locale} 详情文件引用`,
        )
        await copyMemberFile(reference, reference.path)
        detailReferences.set(locale, reference)
      }
      members[memberId] = {
        files: {
          data,
          details: completeLocaleRecord(
            detailReferences,
            `agents/${memberId} 详情文件引用`,
          ),
        },
        sourceRecord: member.sourceRecord,
      }
    }
    const snapshotIndex: IntegratedSnapshotIndex = {
      format: integratedSnapshotFormat,
      source: {
        id: "nanoka-zzz",
        version: index.source.version,
        inputs: snapshotInputs,
      },
      entities: {
        [agents.name]: {
          rulesVersion: index.rulesVersion,
          detailLocales: [...index.source.detailLocales],
          complete: true,
          memberIds: [...index.scope.agentIds],
          inputs: categoryInputs,
          members,
        },
      },
    }
    await writeFile(
      join(artifactDirectory, "index.json"),
      serializeJson(snapshotIndex),
      { flag: "wx" },
    )
    await formatGeneratedJson(artifactDirectory, ["index.json"])
    const verifiedIndex = await verifyIntegratedSnapshot({
      artifactDirectory,
      policy,
      entities: [agents],
      expectedIndex: snapshotIndex,
    })
    return {
      conversionDirectory,
      artifactDirectory,
      index: verifiedIndex,
      memberCount: index.scope.agentIds.length,
      inputFileCount: index.source.inputs.length,
      outputFileCount: copiedFileCount + 1,
    }
  } catch (error) {
    await rm(conversionDirectory, { recursive: true, force: true })
    throw error
  }
}
