import type { DetailLocale } from "../../src/integration/agent-types.ts"
import { integratedSnapshotFormat } from "../../src/integration/snapshot-types.ts"
import type {
  HistoricalIntegratedSnapshotIndex,
  IntegratedSnapshotIndex,
} from "../../src/integration/snapshot-types.ts"
import { equalJson, sortedIds } from "../../src/integration/source-json.ts"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import {
  isValidEntityId,
  loadSourcePolicy,
  validateSourcePolicy,
  validateVersion,
} from "../nanoka/policy.ts"
import type { SourcePolicy } from "../nanoka/policy.ts"
import {
  exactKeys,
  integratedMemberDataPath,
  integratedMemberDetailsPath,
  maximumArtifactFileCount,
  object,
  outputExpansionLimit,
  readVerifiedArtifactFile,
  requireValue,
  verifyFileSet,
} from "./artifact-files.ts"
import { directoryRoot, parseBytes, readBytes } from "./files.ts"
import {
  onboardedSnapshotEntities,
  validateSnapshotEntityContracts,
} from "./snapshot-entities.ts"
import type { IntegratedSnapshotEntityContract } from "./snapshot-entities.ts"

/** 制品验证的输入；policy 与 entities 省略时使用工作区来源配置与当前已接入类别登记表。 */
export interface VerifyIntegratedSnapshotOptions {
  /** 指向完整制品 integrated 的本地目录。 */
  artifactDirectory: string

  /** 默认加载工作区来源策略；注入策略也必须通过同一校验。 */
  policy?: SourcePolicy

  /**
   * 本次期望验证的类别契约；默认当前已接入登记表。
   * 复验旧快照时显式提供其原有契约，不从制品内容推断规则版本、来源实体或身份规则。
   */
  entities?: readonly IntegratedSnapshotEntityContract[]

  /** 完整输入导出的预期索引；按 JSON 值核对，省略时仅校验制品自身的一致性。 */
  expectedIndex?: IntegratedSnapshotIndex

  /**
   * 仅复验旧数据集时允许此前登记的支持语言子集；新候选必须提供完整当前配置。
   * 复验旧集仍要求各类别的 detailLocales 与该配置一致。
   */
  historicalLanguages?: boolean
}

/** 索引内一个成员文件的待读取项；第一阶段只收集，第二阶段才读取字节。 */
type MemberFileCheck = {
  entity: IntegratedSnapshotEntityContract
  memberId: string
  reference: unknown
  expectedPath: string
} & ({ file: "data" } | { file: "details"; locale: DetailLocale })

/** 核对一个类别的输入清单：资源路径、顺序、唯一性与摘要格式。 */
function verifySourceInputs(
  value: unknown,
  resources: string[],
  path: string,
  seenResources: Set<string>,
): void {
  requireValue(
    Array.isArray(value) && value.length === resources.length,
    path,
    "输入资源集合不一致",
  )
  value.forEach((input, offset) => {
    const resourcePath = `${path}/${offset}`
    const entry = exactKeys(input, ["resource", "sha256"], resourcePath)
    const expected = resources[offset]!
    requireValue(
      entry.resource === expected,
      resourcePath,
      "资源路径、顺序或唯一性错误",
    )
    requireValue(
      !seenResources.has(expected),
      resourcePath,
      "同一来源资源被重复登记",
    )
    seenResources.add(expected)
    requireValue(
      typeof entry.sha256 === "string" && /^[0-9a-f]{64}$/u.test(entry.sha256),
      resourcePath,
      "输入 SHA-256 格式错误",
    )
  })
}

/**
 * 验证多实体完整制品：根索引外壳、类别集合、成员范围、来源输入、精确文件集合与实际字节摘要。
 * 先只依据索引完成结构与数量预算检查，再读取实体文件核对字节、摘要与身份；索引自身同时受单文件上限
 * 与整库累计输出预算约束。不读取 raw，不认证来源真实性；接受按实际字节重算摘要的重新序列化副本。
 */
export function verifyIntegratedSnapshot(
  options: VerifyIntegratedSnapshotOptions & { historicalLanguages?: false },
): Promise<IntegratedSnapshotIndex>
/** 历史开关为 true、动态 boolean 或未收窄的可选 boolean 时，返回可能缺失语言引用的索引。 */
export function verifyIntegratedSnapshot(
  options: VerifyIntegratedSnapshotOptions,
): Promise<HistoricalIntegratedSnapshotIndex>
export async function verifyIntegratedSnapshot(
  options: VerifyIntegratedSnapshotOptions,
): Promise<HistoricalIntegratedSnapshotIndex> {
  const policy = validateSourcePolicy(
    options.policy ?? (await loadSourcePolicy()),
    { historicalLanguages: options.historicalLanguages ?? false },
  )
  const entities = options.entities ?? onboardedSnapshotEntities
  validateSnapshotEntityContracts(entities)
  const root = await directoryRoot(options.artifactDirectory)
  const maximumTotalBytes =
    policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
  const maximumSingleFileBytes =
    policy.requestPolicy.maximumResponseBytes * outputExpansionLimit
  // 索引自身也要满足单文件上限，同时计入整库累计输出字节。
  const bytes = await readBytes(
    root,
    "index.json",
    Math.min(maximumSingleFileBytes, maximumTotalBytes),
  )
  const value = parseBytes(bytes, "index.json", {
    entityId: "",
    locale: "index",
    pointer: "",
  })
  const parsed = object(value, "index.json")
  // 外壳版本先单独核对：v2 或未知外壳在这里明确报错，而不是被当成字段集合不符。
  requireValue(
    parsed.format === integratedSnapshotFormat,
    "/format",
    "格式版本错误",
  )
  const index = exactKeys(
    parsed,
    ["format", "source", "entities"],
    "index.json",
  )
  const source = exactKeys(index.source, ["id", "version", "inputs"], "/source")
  requireValue(
    source.id === "nanoka-zzz" && typeof source.version === "string",
    "/source",
    "来源身份或版本错误",
  )
  const version = validateVersion(source.version)
  const seenResources = new Set<string>()
  verifySourceInputs(
    source.inputs,
    ["manifest.json"],
    "/source/inputs",
    seenResources,
  )
  const categories = object(index.entities, "/entities")
  const recordedNames = Object.keys(categories)
  requireValue(
    equalJson(
      [...recordedNames].toSorted(),
      entities.map((entity) => entity.name).toSorted(),
    ),
    "/entities",
    "类别集合与本次期望的已接入类别不一致",
  )
  // 预期索引先按 JSON 值核对；字段偏移、来源记录或摘要偏移都会在这里明确报错。
  if (options.expectedIndex)
    requireValue(
      Buffer.from(serializeJson(index)).equals(
        serializeJson(options.expectedIndex),
      ),
      "index.json",
      "与完整输入构建结果不一致",
    )
  // 第一阶段只使用索引与类别契约：完成结构检查、累计数量预算与文件数量预算，绝不读取实体文件。
  const memberFiles: MemberFileCheck[] = []
  let totalMembers = 0
  let totalInputResources = 1
  for (const entity of entities) {
    const categoryPath = `/entities/${entity.name}`
    const category = exactKeys(
      categories[entity.name],
      [
        "rulesVersion",
        "detailLocales",
        "complete",
        "memberIds",
        "inputs",
        "members",
      ],
      categoryPath,
    )
    requireValue(
      category.rulesVersion === entity.rulesVersion,
      `${categoryPath}/rulesVersion`,
      "规则版本错误",
    )
    requireValue(
      equalJson(category.detailLocales, policy.languages),
      `${categoryPath}/detailLocales`,
      "详情语言或配置顺序不一致",
    )
    requireValue(
      category.complete === true,
      `${categoryPath}/complete`,
      "不是完整类别",
    )
    const members = object(category.members, `${categoryPath}/members`)
    const recordedIds = Object.keys(members)
    requireValue(
      recordedIds.length > 0 &&
        recordedIds.length <= policy.fetchLimits.maximumRecordsPerEntity &&
        recordedIds.every(isValidEntityId),
      `${categoryPath}/members`,
      "成员数量或实体 ID 无效",
    )
    const memberIds = sortedIds(recordedIds)
    requireValue(
      equalJson(category.memberIds, memberIds),
      `${categoryPath}/memberIds`,
      "成员须数值升序、无重复且与 members 完全一致",
    )
    const resources = [
      `zzz/${version}/${entity.sourceEntity}.json`,
      ...memberIds.flatMap((memberId) =>
        policy.languages.map(
          (locale) =>
            `zzz/${version}/${locale}/${entity.sourceEntity}/${memberId}.json`,
        ),
      ),
    ]
    verifySourceInputs(
      category.inputs,
      resources,
      `${categoryPath}/inputs`,
      seenResources,
    )
    totalInputResources += resources.length
    totalMembers += memberIds.length
    for (const memberId of memberIds) {
      const memberPath = `${categoryPath}/members/${memberId}`
      const member = exactKeys(
        members[memberId],
        ["files", "sourceRecord"],
        memberPath,
      )
      object(member.sourceRecord, `${memberPath}/sourceRecord`)
      const references = exactKeys(
        member.files,
        ["data", "details"],
        `${memberPath}/files`,
      )
      const details = exactKeys(
        references.details,
        policy.languages,
        `${memberPath}/files/details`,
      )
      memberFiles.push({
        entity,
        memberId,
        file: "data",
        reference: references.data,
        expectedPath: integratedMemberDataPath(entity.name, memberId),
      })
      for (const locale of policy.languages)
        memberFiles.push({
          entity,
          memberId,
          file: "details",
          locale,
          reference: details[locale],
          expectedPath: integratedMemberDetailsPath(
            entity.name,
            memberId,
            locale,
          ),
        })
    }
  }
  requireValue(
    totalInputResources <= policy.fetchLimits.maximumAssetsPerRun,
    "/entities",
    "输入资源数超过上限",
  )
  requireValue(
    totalMembers <= policy.fetchLimits.maximumAssetsPerRun,
    "/entities",
    "成员总数超过上限",
  )
  requireValue(
    memberFiles.length + 1 <= maximumArtifactFileCount(policy),
    "/entities",
    "制品文件数超过上限",
  )
  // 第二阶段：数量预算通过后才读取实体文件，核对实际字节、摘要与身份。
  const files = ["index.json"]
  let totalBytes = bytes.byteLength
  for (const check of memberFiles) {
    const maximumBytes = Math.min(
      maximumSingleFileBytes,
      maximumTotalBytes - totalBytes,
    )
    const { value: fileValue, byteLength } = await readVerifiedArtifactFile(
      root,
      check.reference,
      check.expectedPath,
      {
        entityId: check.memberId,
        locale: check.file === "data" ? "input" : check.locale,
        pointer: "",
      },
      maximumBytes,
    )
    check.entity.verifyMemberFile(
      fileValue,
      check.file === "data"
        ? { path: check.expectedPath, memberId: check.memberId, file: "data" }
        : {
            path: check.expectedPath,
            memberId: check.memberId,
            file: "details",
            locale: check.locale,
          },
    )
    totalBytes += byteLength
    files.push(check.expectedPath)
  }
  await verifyFileSet(root, files)
  // 以上运行时检查覆盖完整索引外壳；sourceRecord 仅要求 JSON 对象，未知原 key 保留。
  return index as unknown as HistoricalIntegratedSnapshotIndex
}
