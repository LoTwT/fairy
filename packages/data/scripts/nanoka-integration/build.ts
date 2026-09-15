import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { isAbsolute, join, relative, sep } from "node:path"
import type {
  DetailLocale,
  ExportFileReference,
  IntegratedIndex,
} from "../../src/integration/agent-types.ts"
import { integrateAgent } from "../../src/integration/integrate-agent.ts"
import type { IntegratedAgent } from "../../src/integration/integrate-agent.ts"
import {
  AgentIntegrationError,
  at,
  fail,
  isObject,
  put,
  sortedIds,
} from "../../src/integration/source-json.ts"
import type { SourceLocation } from "../../src/integration/source-json.ts"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import {
  isValidEntityId,
  loadSourcePolicy,
  selectVersion,
  validateManifest,
  validateSourcePolicy,
  validateVersion,
} from "../nanoka/policy.ts"
import type { SourcePolicy } from "../nanoka/policy.ts"
import { directoryRoot, parseBytes, readBytes, sha256 } from "./files.ts"
import { formatGeneratedJson } from "./format.ts"
import {
  outputExpansionLimit,
  verifyAgentFile,
  verifyFileSet,
  verifyNanokaAgentArtifact,
} from "./verify.ts"

/** 仅创建新制品；不存在默认版本、抓取或替换当前数据集的选项。 */
export interface BuildNanokaAgentsOptions {
  /** raw/nanoka 根目录；所选版本必须是其直接子目录。 */
  rawRoot: string
  /** 明确来源版本，必须在该版本目录的 manifest.available 中。 */
  version: string
  /** 已存在的临时父目录；仅在其内创建独占子目录，默认系统临时目录。 */
  temporaryParent?: string
  /** 默认加载来源配置；显式策略仍复用同一完整校验。 */
  policy?: SourcePolicy
}

/** 只有全部文件复验成功后才能返回；维护材料在制品边界外。 */
export interface NanokaAgentBuildResult {
  /** 本次独占的新目录，调用方可在使用完毕后整体移除。 */
  buildDirectory: string
  /** 可用的 integrated 完整制品目录。 */
  artifactDirectory: string
  /** 独立维护报告路径，不参与实体文件集合或总索引。 */
  maintenanceReportPath: string
  /** 从实际落盘字节复验得到的完整总索引。 */
  index: IntegratedIndex
  /** 实际读取的原始文件数，包含 manifest 与完整索引。 */
  inputFileCount: number
  /** 实际读取的原始字节总量。 */
  inputBytes: number
  /** 完整制品文件数，包含总索引，不含维护报告。 */
  outputFileCount: number
  /** 与单实体函数一致的独立维护信息，按实体 ID 与配置语言顺序汇集。 */
  maintenance: IntegratedAgent["maintenance"]
}

export async function buildNanokaAgents(
  options: BuildNanokaAgentsOptions,
): Promise<NanokaAgentBuildResult> {
  const version = validateVersion(options.version)
  const policy = validateSourcePolicy(
    options.policy ?? (await loadSourcePolicy()),
  )
  const rawRoot = await directoryRoot(options.rawRoot)
  const temporaryParent = await directoryRoot(
    options.temporaryParent ?? tmpdir(),
  )
  const outputFromRaw = relative(rawRoot, temporaryParent)
  if (
    outputFromRaw === "" ||
    (!isAbsolute(outputFromRaw) &&
      outputFromRaw !== ".." &&
      !outputFromRaw.startsWith(`..${sep}`))
  )
    throw new Error("临时父目录不能位于只读 raw 根目录内")
  const inputs: IntegratedIndex["source"]["inputs"] = []
  let inputBytes = 0
  async function readInput(
    path: string,
    resource: string,
    location: SourceLocation,
  ) {
    try {
      if (inputs.length >= policy.fetchLimits.maximumAssetsPerRun)
        throw new Error("输入资源数超过上限")
      const bytes = await readBytes(
        rawRoot,
        `${version}/${path}`,
        Math.min(
          policy.requestPolicy.maximumResponseBytes,
          policy.fetchLimits.maximumBytesPerRun - inputBytes,
        ),
      )
      const value = parseBytes(bytes, resource, location)
      inputBytes += bytes.byteLength
      inputs.push({ resource, sha256: sha256(bytes) })
      return value
    } catch (error) {
      throw new Error(
        `${resource} [${location.entityId || "index"}/${location.locale}] ${location.pointer || "/"}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      )
    }
  }
  const indexLocation: SourceLocation = {
    entityId: "",
    locale: "index",
    pointer: "",
  }
  const manifest = await readInput(
    "manifest.json",
    "manifest.json",
    indexLocation,
  )
  try {
    selectVersion(validateManifest(manifest), { version })
  } catch (error) {
    throw new Error(
      `manifest.json: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
  const sourceIndexResource = `zzz/${version}/character.json`
  const sourceIndex = await readInput(
    "character.json",
    sourceIndexResource,
    indexLocation,
  )
  if (!isObject(sourceIndex))
    throw new Error(`${sourceIndexResource}: 索引必须是普通对象`)
  const keys = Object.keys(sourceIndex)
  if (!keys.length || keys.length > policy.fetchLimits.maximumRecordsPerEntity)
    throw new Error(`${sourceIndexResource}: 索引为空或记录数超过上限`)
  for (const key of keys) {
    const location = at({ ...indexLocation, entityId: key }, key)
    if (!isValidEntityId(key))
      fail(location, `${sourceIndexResource}: 非法实体 ID`)
    if (!isObject(sourceIndex[key]))
      fail(location, `${sourceIndexResource}: 索引成员必须是普通对象`)
  }
  const agentIds = sortedIds(keys)
  if (
    2 + agentIds.length * policy.languages.length >
    policy.fetchLimits.maximumAssetsPerRun
  )
    throw new Error(`${sourceIndexResource}: 输入资源数超过上限`)
  const buildDirectory = await mkdtemp(
    join(temporaryParent, "fairy-nanoka-agents-"),
  )
  try {
    const artifactDirectory = join(buildDirectory, "integrated")
    await mkdir(join(artifactDirectory, "agents"), { recursive: true })
    const agents: IntegratedIndex["agents"] = {}
    const maintenance: IntegratedAgent["maintenance"] = {
      diagnostics: [],
      codeNameDifferences: [],
    }
    const outputFiles: string[] = []
    let outputBytes = 0
    const maximumOutputBytes =
      policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
    const pendingFiles: {
      reference: ExportFileReference
      id: string
      locale: DetailLocale | "data"
      serializedBytes: Uint8Array
    }[] = []
    async function finishAgentFiles() {
      if (!pendingFiles.length) return
      await formatGeneratedJson(
        artifactDirectory,
        pendingFiles.map(({ reference }) => reference.path),
      )
      for (const { reference, id, locale, serializedBytes } of pendingFiles) {
        const maximumBytes = Math.min(
          policy.requestPolicy.maximumResponseBytes * outputExpansionLimit,
          maximumOutputBytes - outputBytes,
        )
        const bytes = await readBytes(
          artifactDirectory,
          reference.path,
          maximumBytes,
        )
        const value = parseBytes(bytes, reference.path, {
          entityId: id,
          locale: locale === "data" ? "input" : locale,
          pointer: "",
        })
        if (!Buffer.from(serializeJson(value)).equals(serializedBytes))
          throw new Error(
            `${reference.path}: 格式化后的 JSON 值与整合结果不一致`,
          )
        reference.sha256 = sha256(bytes)
        outputBytes += await verifyAgentFile(
          artifactDirectory,
          reference,
          id,
          locale,
          maximumBytes,
        )
      }
      pendingFiles.length = 0
    }
    async function writeAgentFile(
      value: unknown,
      id: string,
      locale: DetailLocale | "data",
    ): Promise<ExportFileReference> {
      const path = `agents/${id}/${locale === "data" ? "data.json" : `details.${locale}.json`}`
      const bytes = serializeJson(value)
      await writeFile(join(artifactDirectory, path), bytes, { flag: "wx" })
      const reference = { path, sha256: "" }
      pendingFiles.push({ reference, id, locale, serializedBytes: bytes })
      // 限制待核对字节与命令行参数数量；摘要仅在批量格式化完成后填写。
      if (pendingFiles.length >= 64) await finishAgentFiles()
      outputFiles.push(path)
      return reference
    }
    for (const entityId of agentIds) {
      const details: Partial<Record<DetailLocale, unknown>> = {}
      for (const locale of policy.languages) {
        const path = `${locale}/character/${entityId}.json`
        details[locale] = await readInput(path, `zzz/${version}/${path}`, {
          entityId,
          locale,
          pointer: "",
        })
      }
      let result: IntegratedAgent
      try {
        result = integrateAgent({
          entityId,
          sourceRecord: sourceIndex[entityId],
          details,
          detailLocales: policy.languages,
        })
      } catch (error) {
        if (!(error instanceof AgentIntegrationError)) throw error
        const resource =
          error.location.locale === "index"
            ? sourceIndexResource
            : `zzz/${version}/${error.location.locale}/character/${entityId}.json`
        throw new Error(`${resource}: ${error.message}`, { cause: error })
      }
      await mkdir(join(artifactDirectory, "agents", entityId))
      const stats = await writeAgentFile(result.data, entityId, "data")
      const content = {} as Record<DetailLocale, ExportFileReference>
      for (const locale of policy.languages)
        content[locale] = await writeAgentFile(
          result.details[locale],
          entityId,
          locale,
        )
      put(agents, entityId, {
        files: { stats, content },
        sourceRecord: result.sourceRecord,
      })
      for (const diagnostic of result.maintenance.diagnostics)
        maintenance.diagnostics.push(diagnostic)
      maintenance.codeNameDifferences.push(
        ...result.maintenance.codeNameDifferences,
      )
    }
    await finishAgentFiles()
    // 在声明完整之前，全部成员、语言与文件均已格式化并复验，且集合与输入索引一致。
    await verifyFileSet(artifactDirectory, outputFiles)
    const index: IntegratedIndex = {
      format: "fairy-nanoka-integrated/v2",
      rulesVersion: "nanoka-agent-reference/4",
      scope: { kind: "full-index", agentIds, completeDataset: true },
      source: {
        id: "nanoka-zzz",
        version,
        detailLocales: [...policy.languages],
        inputs,
      },
      agents,
    }
    await writeFile(
      join(artifactDirectory, "index.json"),
      serializeJson(index),
      {
        flag: "wx",
      },
    )
    await formatGeneratedJson(artifactDirectory, ["index.json"])
    const verifiedIndex = await verifyNanokaAgentArtifact({
      artifactDirectory,
      policy,
      expectedIndex: index,
    })
    const maintenanceReportPath = join(buildDirectory, "maintenance.json")
    await writeFile(maintenanceReportPath, serializeJson(maintenance), {
      flag: "wx",
    })
    return {
      buildDirectory,
      artifactDirectory,
      maintenanceReportPath,
      index: verifiedIndex,
      inputFileCount: inputs.length,
      inputBytes,
      outputFileCount: outputFiles.length + 1,
      maintenance,
    }
  } catch (error) {
    await rm(buildDirectory, { recursive: true, force: true })
    throw error
  }
}
