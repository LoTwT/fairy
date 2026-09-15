import { opendir } from "node:fs/promises"
import type {
  DetailLocale,
  ExportFileReference,
  IntegratedIndex,
  HistoricalIntegratedIndex,
} from "../../src/integration/agent-types.ts"
import {
  equalJson,
  isObject,
  sortedIds,
} from "../../src/integration/source-json.ts"
import type { JsonObject } from "../../src/integration/source-json.ts"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import {
  isValidEntityId,
  loadSourcePolicy,
  validateSourcePolicy,
  validateVersion,
} from "../nanoka/policy.ts"
import type { SourcePolicy } from "../nanoka/policy.ts"
import {
  checkedPath,
  directoryRoot,
  parseBytes,
  readBytes,
  sha256,
} from "./files.ts"

/** 排版、导航与索引元数据的有界膨胀预算；不改变原始输入预算。 */
export const outputExpansionLimit = 16

function requireValue(
  condition: unknown,
  path: string,
  reason: string,
): asserts condition {
  if (!condition) throw new Error(`${path}: ${reason}`)
}

function object(value: unknown, path: string): JsonObject {
  requireValue(isObject(value), path, "必须是普通对象")
  return value
}

function exactKeys(value: unknown, keys: string[], path: string): JsonObject {
  const record = object(value, path)
  requireValue(
    equalJson(Object.keys(record).toSorted(), [...keys].toSorted()),
    path,
    "字段集合不一致",
  )
  return record
}

/** 清单必须与磁盘目录和普通文件精确对应；包含空的额外目录也失败。 */
export async function verifyFileSet(
  root: string,
  files: string[],
): Promise<void> {
  const directories = new Map<string, Set<string>>([["", new Set()]])
  for (const file of files) {
    const parts = file.split("/")
    for (let index = 0; index < parts.length; index++) {
      const parent = parts.slice(0, index).join("/")
      if (!directories.has(parent)) directories.set(parent, new Set())
      directories.get(parent)!.add(parts[index])
    }
  }
  for (const [path, names] of directories) {
    const target = path ? await checkedPath(root, path) : root
    const found = new Set<string>()
    for await (const entry of await opendir(target)) {
      const child = path ? `${path}/${entry.name}` : entry.name
      requireValue(names.has(entry.name), child, "未登记的文件或目录")
      requireValue(
        directories.has(child) ? entry.isDirectory() : entry.isFile(),
        child,
        "必须是对应目录或普通文件，不能是符号链接",
      )
      found.add(entry.name)
    }
    requireValue(found.size === names.size, path || "/", "文件或目录缺失")
  }
}

/** 身份、语言与摘要全部检查同一批重新读取的字节。 */
export async function verifyAgentFile(
  root: string,
  reference: ExportFileReference,
  entityId: string,
  locale: DetailLocale | "data",
  maximumBytes: number,
): Promise<number> {
  const expectedPath = `agents/${entityId}/${locale === "data" ? "data.json" : `details.${locale}.json`}`
  exactKeys(reference, ["path", "sha256"], expectedPath)
  requireValue(reference.path === expectedPath, expectedPath, "文件路径错误")
  requireValue(
    typeof reference.sha256 === "string" &&
      /^[0-9a-f]{64}$/u.test(reference.sha256),
    expectedPath,
    "SHA-256 格式错误",
  )
  const bytes = await readBytes(root, expectedPath, maximumBytes)
  requireValue(sha256(bytes) === reference.sha256, expectedPath, "摘要不一致")
  const value = object(
    parseBytes(bytes, expectedPath, {
      entityId,
      locale: locale === "data" ? "input" : locale,
      pointer: "",
    }),
    expectedPath,
  )
  requireValue(
    Number.isSafeInteger(value.id) && String(value.id) === entityId,
    `${expectedPath}/id`,
    "身份错误",
  )
  requireValue(
    locale === "data"
      ? !Object.hasOwn(value, "locale")
      : value.locale === locale,
    `${expectedPath}/locale`,
    "语言错误",
  )
  return bytes.byteLength
}

/** 制品验证的共用输入；历史语言开关决定输出是否保证完整语言引用。 */
interface VerifyNanokaAgentArtifactOptions<RulesVersion extends string> {
  /** 指向完整制品 integrated 的本地目录。 */
  artifactDirectory: string
  /** 默认加载工作区来源策略；注入策略也必须通过同一校验。 */
  policy?: SourcePolicy
  /** 完整输入导出的预期索引；按 JSON 值核对，省略时仅校验制品自身的一致性。 */
  expectedIndex?: HistoricalIntegratedIndex<RulesVersion>
  /** 默认取 expectedIndex.rulesVersion，否则使用当前规则；显式值优先。恢复旧规则只验证同格式文件外壳。 */
  rulesVersion?: RulesVersion
  /** 仅恢复旧数据集时允许此前登记的支持语言子集；新候选仍要求完整当前配置。 */
  historicalLanguages?: boolean
}

/**
 * 验证制品的索引契约与精确文件集合；接受按实际字节重算摘要的 JSON 重新序列化副本。
 * 不读取 raw，也不把索引自述视作来源真实性证明或与原制品值相等的证明。
 * 构建器另外传入其完整输入导出的 expectedIndex，核对来源记录与输入摘要没有在写入时改变。
 */
export function verifyNanokaAgentArtifact<
  RulesVersion extends string = IntegratedIndex["rulesVersion"],
>(
  options: VerifyNanokaAgentArtifactOptions<RulesVersion> & {
    historicalLanguages?: false
  },
): Promise<IntegratedIndex<RulesVersion>>
/** 历史开关为 true、动态 boolean 或未收窄的可选 boolean 时，返回可能缺失语言的索引。 */
export function verifyNanokaAgentArtifact<
  RulesVersion extends string = IntegratedIndex["rulesVersion"],
>(
  options: VerifyNanokaAgentArtifactOptions<RulesVersion>,
): Promise<HistoricalIntegratedIndex<RulesVersion>>
export async function verifyNanokaAgentArtifact<
  RulesVersion extends string = IntegratedIndex["rulesVersion"],
>(
  options: VerifyNanokaAgentArtifactOptions<RulesVersion>,
): Promise<HistoricalIntegratedIndex<RulesVersion>> {
  const policy = validateSourcePolicy(
    options.policy ?? (await loadSourcePolicy()),
    { historicalLanguages: options.historicalLanguages ?? false },
  )
  const root = await directoryRoot(options.artifactDirectory)
  const maximumTotalBytes =
    policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
  const bytes = await readBytes(root, "index.json", maximumTotalBytes)
  const value = parseBytes(bytes, "index.json", {
    entityId: "",
    locale: "index",
    pointer: "",
  })
  const index = exactKeys(
    value,
    ["format", "rulesVersion", "scope", "source", "agents"],
    "index.json",
  )
  requireValue(
    index.format === "fairy-nanoka-integrated/v2",
    "/format",
    "格式版本错误",
  )
  requireValue(
    index.rulesVersion ===
      (options.rulesVersion ??
        options.expectedIndex?.rulesVersion ??
        "nanoka-agent-reference/4"),
    "/rulesVersion",
    "规则版本错误",
  )
  const scope = exactKeys(
    index.scope,
    ["kind", "agentIds", "completeDataset"],
    "/scope",
  )
  requireValue(
    scope.kind === "full-index" && scope.completeDataset === true,
    "/scope",
    "不是完整数据集",
  )
  const agents = object(index.agents, "/agents")
  const ids = Object.keys(agents)
  requireValue(
    ids.length > 0 &&
      ids.length <= policy.fetchLimits.maximumRecordsPerEntity &&
      ids.every(isValidEntityId),
    "/agents",
    "成员数量或实体 ID 无效",
  )
  const orderedIds = sortedIds(ids)
  requireValue(
    equalJson(scope.agentIds, orderedIds),
    "/scope/agentIds",
    "成员须数值升序、无重复且与 agents 完全一致",
  )
  const source = exactKeys(
    index.source,
    ["id", "version", "detailLocales", "inputs"],
    "/source",
  )
  requireValue(
    source.id === "nanoka-zzz" && typeof source.version === "string",
    "/source",
    "来源身份或版本错误",
  )
  validateVersion(source.version)
  requireValue(
    equalJson(source.detailLocales, policy.languages),
    "/source/detailLocales",
    "详情语言或配置顺序不一致",
  )
  const resources = [
    "manifest.json",
    `zzz/${source.version}/character.json`,
    ...orderedIds.flatMap((id) =>
      policy.languages.map(
        (locale) => `zzz/${source.version}/${locale}/character/${id}.json`,
      ),
    ),
  ]
  requireValue(
    resources.length <= policy.fetchLimits.maximumAssetsPerRun,
    "/source/inputs",
    "资源数超过上限",
  )
  requireValue(
    Array.isArray(source.inputs) && source.inputs.length === resources.length,
    "/source/inputs",
    "输入资源集合不一致",
  )
  source.inputs.forEach((input, offset) => {
    const path = `/source/inputs/${offset}`
    const entry = exactKeys(input, ["resource", "sha256"], path)
    requireValue(
      entry.resource === resources[offset],
      path,
      "资源路径、顺序或唯一性错误",
    )
    requireValue(
      typeof entry.sha256 === "string" && /^[0-9a-f]{64}$/u.test(entry.sha256),
      path,
      "输入 SHA-256 格式错误",
    )
  })
  if (options.expectedIndex)
    requireValue(
      Buffer.from(serializeJson(index)).equals(
        serializeJson(options.expectedIndex),
      ),
      "index.json",
      "与完整输入构建结果不一致",
    )
  const files = ["index.json"]
  let totalBytes = bytes.byteLength
  for (const id of orderedIds) {
    const agent = exactKeys(
      agents[id],
      ["files", "sourceRecord"],
      `/agents/${id}`,
    )
    object(agent.sourceRecord, `/agents/${id}/sourceRecord`)
    const references = exactKeys(
      agent.files,
      ["stats", "content"],
      `/agents/${id}/files`,
    )
    const content = exactKeys(
      references.content,
      policy.languages,
      `/agents/${id}/files/content`,
    )
    for (const locale of ["data", ...policy.languages] as const) {
      const reference = (locale === "data"
        ? references.stats
        : content[locale]) as unknown as ExportFileReference
      totalBytes += await verifyAgentFile(
        root,
        reference,
        id,
        locale,
        Math.min(
          policy.requestPolicy.maximumResponseBytes * outputExpansionLimit,
          maximumTotalBytes - totalBytes,
        ),
      )
      files.push(reference.path)
    }
  }
  await verifyFileSet(root, files)
  // 以上运行时检查覆盖完整索引外壳；sourceRecord 仅要求 JSON 对象，未知原 key 保留。
  return index as unknown as HistoricalIntegratedIndex<RulesVersion>
}
