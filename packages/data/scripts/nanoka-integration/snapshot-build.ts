import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { isAbsolute, join, relative, sep } from "node:path"
import type {
  DetailLocale,
  ExportFileReference,
} from "../../src/integration/agent-types.ts"
import type {
  IntegratedSnapshotEntity,
  IntegratedSnapshotIndex,
  IntegratedSnapshotMember,
  IntegratedSnapshotSourceInput,
} from "../../src/integration/snapshot-types.ts"
import { integratedSnapshotFormat } from "../../src/integration/snapshot-types.ts"
import {
  AgentIntegrationError,
  at,
  fail,
  isObject,
  sortedIds,
} from "../../src/integration/source-json.ts"
import type { SourceLocation } from "../../src/integration/source-json.ts"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import { supportedLanguages } from "../../src/nanoka-identity.ts"
import {
  isValidEntityId,
  loadSourcePolicy,
  selectVersion,
  validateManifest,
  validateSourcePolicy,
  validateVersion,
} from "../nanoka/policy.ts"
import type { SourcePolicy } from "../nanoka/policy.ts"
import {
  completeLocaleRecord,
  integratedMemberDataPath,
  integratedMemberDetailsPath,
  object,
  outputExpansionLimit,
  requireValue,
  verifyFileSet,
} from "./artifact-files.ts"
import { directoryRoot, parseBytes, readBytes, sha256 } from "./files.ts"
import { formatGeneratedJson } from "./format.ts"
import {
  onboardedSnapshotEntities,
  validateSnapshotEntityProducers,
} from "./snapshot-entities.ts"
import type { IntegratedSnapshotEntityProducer } from "./snapshot-entities.ts"
import { verifyIntegratedSnapshot } from "./snapshot-verify.ts"

/** 仅创建新制品；不存在默认版本、抓取或替换当前数据集的选项。 */
export interface BuildIntegratedSnapshotOptions {
  /** raw/nanoka 根目录；所选版本必须是其直接子目录。 */
  rawRoot: string

  /** 明确来源版本，必须在该版本目录的 manifest.available 中。 */
  version: string

  /** 已存在的临时父目录；仅在其内创建独占子目录，默认系统临时目录。 */
  temporaryParent?: string

  /** 默认加载来源配置；显式策略仍复用同一完整校验。 */
  policy?: SourcePolicy

  /** 本次生成的类别；默认当前已接入类别登记表，测试可注入合成类别。 */
  entities?: readonly IntegratedSnapshotEntityProducer[]
}

/** 只有全部文件复验成功后才能返回；维护材料在制品边界外。 */
export interface IntegratedSnapshotBuildResult {
  /** 本次独占的新目录，调用方可在使用完毕后整体移除。 */
  buildDirectory: string

  /** 可用的 integrated 完整制品目录。 */
  artifactDirectory: string

  /** 独立维护报告路径，不参与实体文件集合或总索引。 */
  maintenanceReportPath: string

  /** 从实际落盘字节复验得到的完整根索引。 */
  index: IntegratedSnapshotIndex

  /** 实际读取的原始文件数，包含 manifest 与全部类别索引。 */
  inputFileCount: number

  /** 实际读取的原始字节总量；跨类别累计，不按类别重置。 */
  inputBytes: number

  /** 完整制品文件数，包含总索引，不含维护报告。 */
  outputFileCount: number

  /** 类别 → 按成员顺序的维护信息；只写入制品外的维护报告。 */
  maintenance: Record<string, { memberId: string; maintenance: unknown }[]>
}

/** 成员文件的固定位置；data 文件没有语言，details 文件必须给出语言。 */
type MemberFileTarget =
  | { file: "data" }
  | { file: "details"; locale: DetailLocale }

/** 待批量格式化的成员文件；摘要仅在格式化完成后按实际字节填写。 */
type PendingMemberFile = MemberFileTarget & {
  producer: IntegratedSnapshotEntityProducer
  reference: ExportFileReference
  memberId: string
  path: string
  serializedBytes: Uint8Array
}

export async function buildIntegratedSnapshot(
  options: BuildIntegratedSnapshotOptions,
): Promise<IntegratedSnapshotBuildResult> {
  const version = validateVersion(options.version)
  const policy = validateSourcePolicy(
    options.policy ?? (await loadSourcePolicy()),
  )
  const producers = options.entities ?? onboardedSnapshotEntities
  validateSnapshotEntityProducers(producers)
  if (policy.languages.length !== supportedLanguages.length)
    throw new Error("多实体完整制品要求来源配置提供全部支持语言")
  const detailLocales: DetailLocale[] = [...policy.languages]
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
  const snapshotInputs: IntegratedSnapshotSourceInput[] = []
  let inputBytes = 0
  let inputFileCount = 0
  async function readSourceInput(
    path: string,
    resource: string,
    location: SourceLocation,
    inputs: IntegratedSnapshotSourceInput[],
  ): Promise<unknown> {
    try {
      if (inputFileCount >= policy.fetchLimits.maximumAssetsPerRun)
        throw new Error("输入资源数超过上限")
      const remaining = policy.fetchLimits.maximumBytesPerRun - inputBytes
      if (remaining <= 0) throw new Error("原始输入字节合计超过上限")
      const bytes = await readBytes(
        rawRoot,
        `${version}/${path}`,
        Math.min(policy.requestPolicy.maximumResponseBytes, remaining),
      )
      const value = parseBytes(bytes, resource, location)
      inputBytes += bytes.byteLength
      inputFileCount++
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
  const manifest = await readSourceInput(
    "manifest.json",
    "manifest.json",
    indexLocation,
    snapshotInputs,
  )
  try {
    selectVersion(validateManifest(manifest), { version })
  } catch (error) {
    throw new Error(
      `manifest.json: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
  const buildDirectory = await mkdtemp(
    join(temporaryParent, "fairy-integrated-snapshot-"),
  )
  try {
    const artifactDirectory = join(buildDirectory, "integrated")
    await mkdir(artifactDirectory)
    const maximumOutputBytes =
      policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
    const entityBlocks: Record<string, IntegratedSnapshotEntity> = {}
    const maintenance: IntegratedSnapshotBuildResult["maintenance"] = {}
    const outputFiles: string[] = []
    let outputBytes = 0
    const pendingFiles: PendingMemberFile[] = []
    /** 格式化后回读同一批字节：JSON 值必须等于整合结果，摘要按格式化后的实际字节计算。 */
    async function finishPendingFiles() {
      if (!pendingFiles.length) return
      await formatGeneratedJson(
        artifactDirectory,
        pendingFiles.map(({ path }) => path),
      )
      for (const pending of pendingFiles) {
        const location: SourceLocation = {
          entityId: pending.memberId,
          locale: pending.file === "data" ? "input" : pending.locale,
          pointer: "",
        }
        const maximumBytes = Math.min(
          policy.requestPolicy.maximumResponseBytes * outputExpansionLimit,
          maximumOutputBytes - outputBytes,
        )
        const bytes = await readBytes(
          artifactDirectory,
          pending.path,
          maximumBytes,
        )
        const value = object(
          parseBytes(bytes, pending.path, location),
          pending.path,
        )
        if (!Buffer.from(serializeJson(value)).equals(pending.serializedBytes))
          throw new Error(`${pending.path}: 格式化后的 JSON 值与整合结果不一致`)
        pending.reference.sha256 = sha256(bytes)
        outputBytes += bytes.byteLength
        pending.producer.verifyMemberFile(
          value,
          pending.file === "data"
            ? { path: pending.path, memberId: pending.memberId, file: "data" }
            : {
                path: pending.path,
                memberId: pending.memberId,
                file: "details",
                locale: pending.locale,
              },
        )
      }
      pendingFiles.length = 0
    }
    async function writeMemberFile(
      producer: IntegratedSnapshotEntityProducer,
      value: unknown,
      memberId: string,
      target: MemberFileTarget,
    ): Promise<ExportFileReference> {
      const path =
        target.file === "data"
          ? integratedMemberDataPath(producer.name, memberId)
          : integratedMemberDetailsPath(producer.name, memberId, target.locale)
      const bytes = serializeJson(value)
      await writeFile(join(artifactDirectory, path), bytes, { flag: "wx" })
      const reference: ExportFileReference = { path, sha256: "" }
      pendingFiles.push({
        ...target,
        producer,
        reference,
        memberId,
        path,
        serializedBytes: bytes,
      })
      // 限制待核对字节与命令行参数数量；摘要仅在批量格式化完成后填写。
      if (pendingFiles.length >= 64) await finishPendingFiles()
      outputFiles.push(path)
      return reference
    }
    for (const producer of producers) {
      const categoryInputs: IntegratedSnapshotSourceInput[] = []
      const indexResource = `zzz/${version}/${producer.sourceEntity}.json`
      const sourceIndex = await readSourceInput(
        `${producer.sourceEntity}.json`,
        indexResource,
        indexLocation,
        categoryInputs,
      )
      if (!isObject(sourceIndex))
        throw new Error(`${indexResource}: 索引必须是普通对象`)
      const sourceKeys = Object.keys(sourceIndex)
      if (
        !sourceKeys.length ||
        sourceKeys.length > policy.fetchLimits.maximumRecordsPerEntity
      )
        throw new Error(`${indexResource}: 索引为空或记录数超过上限`)
      for (const key of sourceKeys) {
        const location = at({ ...indexLocation, entityId: key }, key)
        if (!isValidEntityId(key))
          fail(location, `${indexResource}: 非法实体 ID`)
        if (!isObject(sourceIndex[key]))
          fail(location, `${indexResource}: 索引成员必须是普通对象`)
      }
      const memberIds = sortedIds(sourceKeys)
      if (
        inputFileCount + memberIds.length * detailLocales.length >
        policy.fetchLimits.maximumAssetsPerRun
      )
        throw new Error(`${indexResource}: 输入资源数超过上限`)
      await mkdir(join(artifactDirectory, producer.name), { recursive: true })
      const members: Record<string, IntegratedSnapshotMember> = {}
      const categoryMaintenance: { memberId: string; maintenance: unknown }[] =
        []
      for (const memberId of memberIds) {
        const detailInputs = new Map<DetailLocale, unknown>()
        for (const locale of detailLocales) {
          const path = `${locale}/${producer.sourceEntity}/${memberId}.json`
          detailInputs.set(
            locale,
            await readSourceInput(
              path,
              `zzz/${version}/${path}`,
              { entityId: memberId, locale, pointer: "" },
              categoryInputs,
            ),
          )
        }
        let result: ReturnType<IntegratedSnapshotEntityProducer["integrate"]>
        try {
          result = producer.integrate({
            memberId,
            sourceRecord: sourceIndex[memberId],
            details: completeLocaleRecord(
              detailInputs,
              `${producer.name}/${memberId} 详情输入`,
            ),
            detailLocales,
          })
        } catch (error) {
          if (!(error instanceof AgentIntegrationError)) throw error
          const resource =
            error.location.locale === "index"
              ? indexResource
              : `zzz/${version}/${error.location.locale}/${producer.sourceEntity}/${memberId}.json`
          throw new Error(`${resource}: ${error.message}`, { cause: error })
        }
        const data = result.data
        requireValue(
          isObject(data),
          `${producer.name}/${memberId}/data.json`,
          "整合结果必须是普通对象",
        )
        const sourceRecord = result.sourceRecord
        requireValue(
          isObject(sourceRecord),
          `${producer.name}/${memberId}/sourceRecord`,
          "来源索引记录必须是普通对象",
        )
        const integratedDetails = new Map<DetailLocale, unknown>()
        for (const locale of detailLocales) {
          const details = result.details[locale]
          requireValue(
            isObject(details),
            `${producer.name}/${memberId}/details.${locale}.json`,
            "整合结果必须是普通对象",
          )
          integratedDetails.set(locale, details)
        }
        await mkdir(join(artifactDirectory, producer.name, memberId))
        const dataReference = await writeMemberFile(producer, data, memberId, {
          file: "data",
        })
        const detailReferences = new Map<DetailLocale, ExportFileReference>()
        for (const locale of detailLocales)
          detailReferences.set(
            locale,
            await writeMemberFile(
              producer,
              integratedDetails.get(locale),
              memberId,
              {
                file: "details",
                locale,
              },
            ),
          )
        members[memberId] = {
          files: {
            data: dataReference,
            details: completeLocaleRecord(
              detailReferences,
              `${producer.name}/${memberId} 详情文件引用`,
            ),
          },
          sourceRecord,
        }
        categoryMaintenance.push({
          memberId,
          maintenance: result.maintenance ?? null,
        })
      }
      await finishPendingFiles()
      entityBlocks[producer.name] = {
        rulesVersion: producer.rulesVersion,
        detailLocales: [...detailLocales],
        complete: true,
        memberIds,
        inputs: categoryInputs,
        members,
      }
      maintenance[producer.name] = categoryMaintenance
    }
    // 在声明完整之前，全部类别、成员、语言与文件均已格式化并复验，且集合与输入索引一致。
    await verifyFileSet(artifactDirectory, outputFiles)
    const index: IntegratedSnapshotIndex = {
      format: integratedSnapshotFormat,
      source: { id: "nanoka-zzz", version, inputs: snapshotInputs },
      entities: entityBlocks,
    }
    await writeFile(
      join(artifactDirectory, "index.json"),
      serializeJson(index),
      { flag: "wx" },
    )
    await formatGeneratedJson(artifactDirectory, ["index.json"])
    const verifiedIndex = await verifyIntegratedSnapshot({
      artifactDirectory,
      policy,
      entities: producers,
      expectedIndex: index,
    })
    const maintenanceReportPath = join(buildDirectory, "maintenance.json")
    await writeFile(
      maintenanceReportPath,
      serializeJson({ categories: maintenance }),
      { flag: "wx" },
    )
    return {
      buildDirectory,
      artifactDirectory,
      maintenanceReportPath,
      index: verifiedIndex,
      inputFileCount,
      inputBytes,
      outputFileCount: outputFiles.length + 1,
      maintenance,
    }
  } catch (error) {
    await rm(buildDirectory, { recursive: true, force: true })
    throw error
  }
}
