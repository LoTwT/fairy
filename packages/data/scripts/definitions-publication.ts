import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { writeFileAtomically } from "./atomic-write.ts"
import { directoryRoot, readBytes, sha256 } from "./nanoka-integration/files.ts"
import { verifyFileSet } from "./nanoka-integration/artifact-files.ts"
import {
  maximumAttributeBytes,
  regularFiles,
} from "./panel-attributes/manifest.ts"
import { minifyJsonBytes } from "./publication-minify.ts"

/** definitions 发布副本摘要清单的外壳版本；与 integrated 的 publication.json 独立演进。 */
export const definitionsPublicationManifestFormat =
  "fairy-definitions-publication-manifest/v1"

/** 单个 definitions 文件在归档副本与发布副本中的字节事实。 */
export interface DefinitionsPublicationManifestFile {
  /** 构建冻结副本（`.generated/definitions`）中的字节摘要。 */
  archiveSha256: string

  /** 发布副本（`dist/definitions/`）中的字节摘要；消费端实际读到的字节。 */
  publicationSha256: string

  /** 归档副本字节数。 */
  archiveBytes: number

  /** 发布副本字节数；只删除 JSON 字符串外的排版空白。 */
  publicationBytes: number
}

/**
 * definitions 归档 → 发布副本的字节级映射。
 *
 * 属性与技能 manifest 的 `artifacts` 继续描述归档字节；发布副本只改变排版，
 * 因此由本清单说明同一 JSON 值在两侧的摘要与字节数。清单自身不进入
 * `dist/definitions/`，避免破坏该目录的精确成员校验。
 */
export interface DefinitionsPublicationManifest {
  format: typeof definitionsPublicationManifestFormat

  /** 相对 `definitions/` 的路径 → 两侧字节事实；覆盖发布目录的全部文件。 */
  files: Record<string, DefinitionsPublicationManifestFile>
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
  if (
    JSON.stringify(parse(archiveBytes, "归档副本")) !==
    JSON.stringify(parse(publicationBytes, "发布副本"))
  )
    throw new Error(`${path}: 压缩改变了 JSON 值或键顺序`)
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
 * 从冻结的 definitions 归档生成压缩发布副本，并写出归档 → 发布的摘要清单。
 *
 * 归档副本保持原字节；发布副本只删除字符串外的排版空白。每个文件在写入前核对
 * 两侧 JSON 值一致，写入后按实际字节计算摘要。返回清单供调用方复核。
 */
export async function writeMinifiedDefinitionsPublication(options: {
  archiveDirectory: string
  publicationDirectory: string
  manifestPath: string
}): Promise<DefinitionsPublicationManifest> {
  const archiveRoot = await directoryRoot(options.archiveDirectory)
  const files: Record<string, DefinitionsPublicationManifestFile> = {}
  for (const path of await regularFiles(archiveRoot)) {
    const archiveBytes = await readBytes(
      archiveRoot,
      path,
      maximumAttributeBytes,
    )
    const publicationBytes = minifyJsonBytes(archiveBytes)
    requireSameJsonValue(archiveBytes, publicationBytes, path)
    await writeFileAtomically(
      join(options.publicationDirectory, path),
      publicationBytes,
      { exclusive: true },
    )
    files[path] = {
      archiveSha256: sha256(archiveBytes),
      publicationSha256: sha256(publicationBytes),
      archiveBytes: archiveBytes.byteLength,
      publicationBytes: publicationBytes.byteLength,
    }
  }
  const manifest: DefinitionsPublicationManifest = {
    format: definitionsPublicationManifestFormat,
    files,
  }
  await writeFileAtomically(
    options.manifestPath,
    `${JSON.stringify(manifest)}\n`,
  )
  return manifest
}

/**
 * 只读核对 definitions 发布目录与清单：精确文件集、两侧摘要与字节数。
 *
 * 传入 `archiveDirectory` 时逐文件读取冻结归档，核对归档侧摘要、字节数，
 * 并要求发布字节恰好等于归档字节的空白压缩结果。清单本身不记录自身摘要。
 */
export async function verifyDefinitionsPublication(options: {
  publicationDirectory: string
  manifestPath: string
  archiveDirectory?: string
}): Promise<DefinitionsPublicationManifest> {
  const root = await directoryRoot(options.publicationDirectory)
  const archiveRoot = options.archiveDirectory
    ? await directoryRoot(options.archiveDirectory)
    : undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(options.manifestPath, "utf8"))
  } catch (error) {
    throw new Error(`${options.manifestPath}: 发布清单不是合法 JSON`, {
      cause: error,
    })
  }
  const manifest = exactKeys(parsed, ["format", "files"], options.manifestPath)
  if (manifest.format !== definitionsPublicationManifestFormat)
    throw new Error(`${options.manifestPath}: 发布清单版本错误`)
  const paths = await regularFiles(root)
  const recordedFiles = exactKeys(
    manifest.files,
    paths,
    `${options.manifestPath}/files`,
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
    const bytes = await readBytes(root, path, maximumAttributeBytes)
    if (bytes.byteLength !== entry.publicationBytes)
      throw new Error(`${path}: 发布副本字节数与清单不一致`)
    if (sha256(bytes) !== entry.publicationSha256)
      throw new Error(`${path}: 发布副本摘要与清单不一致`)
    try {
      JSON.parse(Buffer.from(bytes).toString("utf8"))
    } catch (error) {
      throw new Error(`${path}: 发布副本不是合法 JSON`, { cause: error })
    }
    if (archiveRoot) {
      const archiveBytes = await readBytes(
        archiveRoot,
        path,
        maximumAttributeBytes,
      )
      if (archiveBytes.byteLength !== entry.archiveBytes)
        throw new Error(`${path}: 归档副本字节数与清单不一致`)
      if (sha256(archiveBytes) !== entry.archiveSha256)
        throw new Error(`${path}: 归档副本摘要与清单不一致`)
      const expected = minifyJsonBytes(archiveBytes)
      if (!Buffer.from(bytes).equals(Buffer.from(expected)))
        throw new Error(`${path}: 发布副本不是归档字节的空白压缩结果`)
    }
  }
  const archivePaths = archiveRoot ? await regularFiles(archiveRoot) : undefined
  if (archivePaths && JSON.stringify(archivePaths) !== JSON.stringify(paths))
    throw new Error(`${options.manifestPath}: 归档与发布文件集合不一致`)
  await verifyFileSet(root, paths)
  return manifest as unknown as DefinitionsPublicationManifest
}
