import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"
import { writeFileAtomically } from "./atomic-write.ts"
import {
  outputExpansionLimit,
  verifyFileSet,
} from "./nanoka-integration/artifact-files.ts"
import { directoryRoot, readBytes, sha256 } from "./nanoka-integration/files.ts"
import { loadSourcePolicy } from "./nanoka/policy.ts"
import { publicationFiles } from "./prepare-publication.ts"

/** 发布副本摘要清单的外壳版本；与归档索引分开演进。 */
export const publicationManifestFormat = "fairy-publication-manifest/v1"

/** 单个文件在归档副本与发布副本中的字节事实。 */
export interface PublicationManifestFile {
  /** 归档副本（Git 跟踪的 integrated/）中的字节摘要；与索引 `files.*.sha256` 一致。 */
  archiveSha256: string

  /** 发布副本（dist/integrated/）中的字节摘要；消费端实际读到的字节。 */
  publicationSha256: string

  /** 归档副本字节数。 */
  archiveBytes: number

  /** 发布副本字节数；只删除字符串外的排版空白。 */
  publicationBytes: number
}

/**
 * 归档索引 → 发布副本的字节级映射。
 *
 * 索引内的摘要继续描述归档字节；发布副本只改变排版，因此需要独立清单说明
 * 同一 JSON 值在两侧的摘要与字节数。`archiveIndexSha256` 是归档索引的摘要，
 * 是本清单与归档快照之间的绑定；验证时传入归档目录会把该绑定锚定到真实字节。
 * 消费快照标识由归档输入计算，不随发布排版变化。
 */
export interface PublicationManifest {
  format: typeof publicationManifestFormat

  /** 快照来源身份与版本；与发布索引一致。 */
  source: { id: string; version: string }

  /** 归档 `index.json` 的摘要。 */
  archiveIndexSha256: string

  /** 相对 `integrated/` 的路径 → 两侧字节事实；覆盖发布清单的全部文件。 */
  files: Record<string, PublicationManifestFile>
}

/**
 * 删除 JSON 文本中字符串之外的排版空白（空格、制表、换行、回车）。
 *
 * 不做解析后再序列化：归档文件并非全部符合统一的 `JSON.stringify` 排版，
 * 重新序列化会改变字节语义。这里只删除字符串外的空白，字符串内容与其余字节原样保留。
 * 输入必须是有效 UTF-8 且不含 BOM；这里显式拒绝，避免非 fatal 解码静默替换字节。
 */
export function minifyJsonBytes(bytes: Uint8Array): Uint8Array {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    throw new Error("JSON 不得包含 BOM")
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch (error) {
    throw new Error("不是有效 UTF-8", { cause: error })
  }
  const chunks: string[] = []
  let start = 0
  let inString = false
  let escaped = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!
    if (inString) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      if (index > start) chunks.push(text.slice(start, index))
      start = index + 1
    }
  }
  if (start < text.length) chunks.push(text.slice(start))
  return Buffer.from(chunks.join(""), "utf8")
}

/** 解析两侧字节并核对 JSON 值完全一致；排版差异不得改变任何值或键顺序。 */
function requireSameJsonValue(
  archiveBytes: Uint8Array,
  publicationBytes: Uint8Array,
  path: string,
): void {
  const parse = (bytes: Uint8Array, side: string) => {
    try {
      return JSON.parse(Buffer.from(bytes).toString("utf8")) as unknown
    } catch (error) {
      throw new Error(`${path}: ${side}不是合法 JSON`, { cause: error })
    }
  }
  const archive = parse(archiveBytes, "归档副本")
  const publication = parse(publicationBytes, "发布副本")
  if (JSON.stringify(archive) !== JSON.stringify(publication))
    throw new Error(`${path}: 压缩改变了 JSON 值或键顺序`)
}

/** 索引中登记的归档摘要；`index.json` 自身以传入的归档索引摘要为准。 */
export function archivedDigestOf(
  index: IntegratedSnapshotIndex,
  path: string,
  archivedIndexSha256: string,
): string {
  if (path === "index.json") return archivedIndexSha256
  return archivedDigestMap(index).get(path) ?? missingDigest(path)
}

// 调用方必须把索引视为不可变；验证器与构建器都只在一次构建内复用同一对象。
const archivedDigestMaps = new WeakMap<
  IntegratedSnapshotIndex,
  Map<string, string>
>()

/** 索引登记的归档摘要；按索引缓存，避免逐文件遍历全部成员。 */
function archivedDigestMap(
  index: IntegratedSnapshotIndex,
): Map<string, string> {
  const cached = archivedDigestMaps.get(index)
  if (cached) return cached
  const digests = new Map<string, string>()
  for (const entity of Object.values(index.entities))
    for (const member of Object.values(entity.members)) {
      digests.set(member.files.data.path, member.files.data.sha256)
      for (const reference of Object.values(member.files.details))
        if (reference) digests.set(reference.path, reference.sha256)
    }
  archivedDigestMaps.set(index, digests)
  return digests
}

function missingDigest(path: string): never {
  throw new Error(`${path}: 不在发布文件清单中`)
}

async function publicationByteLimit(): Promise<number> {
  const policy = await loadSourcePolicy()
  return policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
}

/**
 * 从已验证归档副本生成压缩发布副本，并写出归档 → 发布的摘要清单。
 *
 * 归档副本保持原字节；发布副本只删除字符串外的排版空白。每个文件在写入前核对
 * 两侧 JSON 值一致与归档摘要，写入后按实际字节计算摘要。返回清单供调用方复核。
 */
export async function writeMinifiedPublication(options: {
  archiveDirectory: string
  publicationDirectory: string
  manifestPath: string
  index: IntegratedSnapshotIndex
}): Promise<PublicationManifest> {
  const archiveRoot = await directoryRoot(options.archiveDirectory)
  const maximumBytes = await publicationByteLimit()
  const archiveIndexBytes = await readBytes(
    archiveRoot,
    "index.json",
    maximumBytes,
  )
  const archiveIndexSha256 = sha256(archiveIndexBytes)
  const files: Record<string, PublicationManifestFile> = {}
  for (const path of publicationFiles(options.index)) {
    const archiveBytes = await readBytes(archiveRoot, path, maximumBytes)
    const publicationBytes = minifyJsonBytes(archiveBytes)
    requireSameJsonValue(archiveBytes, publicationBytes, path)
    const archiveSha256 = sha256(archiveBytes)
    if (
      archiveSha256 !==
      archivedDigestOf(options.index, path, archiveIndexSha256)
    )
      throw new Error(`${path}: 归档副本摘要与索引不一致`)
    await writeFileAtomically(
      join(options.publicationDirectory, path),
      publicationBytes,
      { exclusive: true },
    )
    files[path] = {
      archiveSha256,
      publicationSha256: sha256(publicationBytes),
      archiveBytes: archiveBytes.byteLength,
      publicationBytes: publicationBytes.byteLength,
    }
  }
  const manifest: PublicationManifest = {
    format: publicationManifestFormat,
    source: {
      id: options.index.source.id,
      version: options.index.source.version,
    },
    archiveIndexSha256,
    files,
  }
  await writeFileAtomically(
    options.manifestPath,
    `${JSON.stringify(manifest)}\n`,
  )
  return manifest
}

function exactKeys(value: unknown, keys: string[], label: string) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${label}: 必须是普通对象`)
  const recorded = Object.keys(value).toSorted()
  if (JSON.stringify(recorded) !== JSON.stringify([...keys].toSorted()))
    throw new Error(`${label}: 字段集合不一致`)
  return value as Record<string, unknown>
}

/**
 * 只读发布副本核对清单：结构、文件集、JSON 解析、归档摘要绑定与发布字节摘要。
 *
 * 不传 `archiveDirectory` 时只证明发布副本与清单自洽；传入时逐文件读取归档字节，
 * 把清单的归档摘要与字节数锚定到真实归档文件（`index.json` 也由同一循环覆盖）。
 * 该函数不比较归档与发布的 JSON 值：值等价由 `writeMinifiedPublication` 在写入前核对，
 * 打包验收再由 `verify:pack` 对真实字节做第二次比较。
 */
export async function verifyMinifiedPublication(options: {
  publicationDirectory: string
  manifestPath: string
  index: IntegratedSnapshotIndex
  archiveDirectory?: string
}): Promise<PublicationManifest> {
  const root = await directoryRoot(options.publicationDirectory)
  const archiveRoot = options.archiveDirectory
    ? await directoryRoot(options.archiveDirectory)
    : undefined
  const maximumBytes = await publicationByteLimit()
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(options.manifestPath, "utf8"))
  } catch (error) {
    throw new Error(`${options.manifestPath}: 发布清单不是合法 JSON`, {
      cause: error,
    })
  }
  const manifest = exactKeys(
    parsed,
    ["format", "source", "archiveIndexSha256", "files"],
    options.manifestPath,
  )
  if (manifest.format !== publicationManifestFormat)
    throw new Error(`${options.manifestPath}: 发布清单版本错误`)
  const source = exactKeys(
    manifest.source,
    ["id", "version"],
    `${options.manifestPath}/source`,
  )
  if (
    source.id !== options.index.source.id ||
    source.version !== options.index.source.version
  )
    throw new Error(`${options.manifestPath}: 来源身份或版本不一致`)
  if (
    typeof manifest.archiveIndexSha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(manifest.archiveIndexSha256)
  )
    throw new Error(`${options.manifestPath}: 归档索引摘要格式错误`)
  const paths = publicationFiles(options.index)
  const recordedFiles = exactKeys(
    manifest.files,
    paths,
    `${options.manifestPath}/files`,
  )
  const indexEntry = recordedFiles["index.json"] as
    | Record<string, unknown>
    | undefined
  if (indexEntry?.archiveSha256 !== manifest.archiveIndexSha256)
    throw new Error(
      `${options.manifestPath}: 归档索引摘要与 index.json 记录不一致`,
    )
  for (const path of paths) {
    const entry = exactKeys(
      recordedFiles[path],
      [
        "archiveSha256",
        "publicationSha256",
        "archiveBytes",
        "publicationBytes",
      ],
      `${options.manifestPath}/files/${path}`,
    )
    for (const key of ["archiveSha256", "publicationSha256"] as const)
      if (typeof entry[key] !== "string" || !/^[0-9a-f]{64}$/u.test(entry[key]))
        throw new Error(`${options.manifestPath}: ${path} 的 ${key} 格式错误`)
    for (const key of ["archiveBytes", "publicationBytes"] as const)
      if (!Number.isSafeInteger(entry[key]) || (entry[key] as number) < 0)
        throw new Error(`${options.manifestPath}: ${path} 的 ${key} 无效`)
    if (
      entry.archiveSha256 !==
      archivedDigestOf(options.index, path, manifest.archiveIndexSha256)
    )
      throw new Error(`${options.manifestPath}: ${path} 的归档摘要与索引不一致`)
    if (archiveRoot) {
      const archiveBytes = await readBytes(archiveRoot, path, maximumBytes)
      if (archiveBytes.byteLength !== entry.archiveBytes)
        throw new Error(
          `${options.manifestPath}: ${path} 的归档字节数与清单不一致`,
        )
      if (sha256(archiveBytes) !== entry.archiveSha256)
        throw new Error(`${options.manifestPath}: ${path} 的归档字节摘要不一致`)
    }
    const bytes = await readBytes(root, path, maximumBytes)
    if (bytes.byteLength !== entry.publicationBytes)
      throw new Error(`${path}: 发布副本字节数与清单不一致`)
    if (sha256(bytes) !== entry.publicationSha256)
      throw new Error(`${path}: 摘要不一致`)
    try {
      JSON.parse(Buffer.from(bytes).toString("utf8"))
    } catch (error) {
      throw new Error(`${path}: 发布副本不是合法 JSON`, { cause: error })
    }
  }
  await verifyFileSet(root, paths)
  return manifest as unknown as PublicationManifest
}
