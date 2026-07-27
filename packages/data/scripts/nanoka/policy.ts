import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export const supportedLanguages = ["zh", "en"] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]
export type VersionSelection = "live" | "latest" | "version" | "interactive"

export interface SourcePolicy {
  sourceId: string
  game: "zzz"
  manifestUrl: string
  staticDataBaseUrl: string
  allowlist: {
    host: string
    manifestPath: string
    dataPathPrefix: string
  }
  languages: SupportedLanguage[]
  requestPolicy: {
    maxConcurrency: number
    minimumStartIntervalMs: number
    timeoutMs: number
    maximumAttempts: number
    retryableStatuses: number[]
    initialRetryDelayMs: number
    maximumRetryDelayMs: number
    maximumResponseBytes: number
  }
  userAgent: string
}

export interface NanokaManifest {
  zzz: {
    live: string
    latest: string
    available: string[]
  }
}

interface RegistryDocument {
  schemaVersion: string
  sources: Record<string, unknown>
}

const versionPattern = /^[A-Za-z0-9_][A-Za-z0-9_.+-]*$/u
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
export const packageDirectory = join(scriptDirectory, "..", "..")

export async function loadSourcePolicy(): Promise<SourcePolicy> {
  const registryPath = join(packageDirectory, "source-registry.json")
  const registry = decodeUtf8Json(
    new Uint8Array(await readFile(registryPath)),
    registryPath,
  ) as RegistryDocument
  const source = registry.sources?.["nanoka-zzz"] as SourcePolicy | undefined

  if (
    registry.schemaVersion !== "fairy-source-registry/v1" ||
    source?.sourceId !== "nanoka-zzz" ||
    source.game !== "zzz" ||
    source.manifestUrl !== "https://static.nanoka.cc/manifest.json" ||
    source.staticDataBaseUrl !== "https://static.nanoka.cc/zzz/" ||
    source.allowlist?.host !== "static.nanoka.cc" ||
    source.allowlist.manifestPath !== "/manifest.json" ||
    source.allowlist.dataPathPrefix !== "/zzz/" ||
    !Array.isArray(source.languages) ||
    source.languages.length !== supportedLanguages.length ||
    !supportedLanguages.every((language) =>
      source.languages.includes(language),
    ) ||
    !isPositiveInteger(source.requestPolicy?.maxConcurrency) ||
    !isNonNegativeInteger(source.requestPolicy.minimumStartIntervalMs) ||
    !isPositiveInteger(source.requestPolicy.timeoutMs) ||
    !isPositiveInteger(source.requestPolicy.maximumAttempts) ||
    !Array.isArray(source.requestPolicy.retryableStatuses) ||
    !isPositiveInteger(source.requestPolicy.initialRetryDelayMs) ||
    !isPositiveInteger(source.requestPolicy.maximumRetryDelayMs) ||
    !isPositiveInteger(source.requestPolicy.maximumResponseBytes) ||
    typeof source.userAgent !== "string" ||
    source.userAgent.length === 0
  ) {
    throw new Error(`来源配置无效：${registryPath}`)
  }

  return source
}

export function isValidEntityId(value: string): boolean {
  return /^(0|[1-9]\d*)$/u.test(value)
}

export const isValidCharacterId = isValidEntityId

export function validateManifest(value: unknown): NanokaManifest {
  if (!isPlainObject(value) || !isPlainObject(value.zzz)) {
    throw new Error("Nanoka manifest 缺少 zzz 对象")
  }

  const { live, latest, available } = value.zzz
  if (
    typeof live !== "string" ||
    typeof latest !== "string" ||
    !Array.isArray(available) ||
    available.some((version) => typeof version !== "string")
  ) {
    throw new Error("Nanoka manifest 缺少 live、latest 或 available 字段")
  }

  const versions = available as string[]
  for (const version of [live, latest, ...versions]) {
    validateVersion(version)
  }
  if (versions.length === 0) {
    throw new Error("Nanoka manifest 的 available 不能为空")
  }
  if (new Set(versions).size !== versions.length) {
    throw new Error("Nanoka manifest 的 available 包含重复版本")
  }
  const normalizedVersions = versions.map((version) => version.toLowerCase())
  if (new Set(normalizedVersions).size !== normalizedVersions.length) {
    throw new Error("Nanoka manifest 的 available 包含大小写冲突版本")
  }
  if (!versions.includes(live) || !versions.includes(latest)) {
    throw new Error("Nanoka manifest 的 live 和 latest 必须包含在 available 中")
  }

  return { zzz: { live, latest, available: versions } }
}

export function validateVersion(version: string): string {
  if (!versionPattern.test(version)) {
    throw new Error(`版本号不安全：${version}`)
  }
  return version
}

export function selectVersion(
  manifest: NanokaManifest,
  selection:
    | { channel: "live" | "latest"; version?: never }
    | { channel?: never; version: string },
): { version: string; selectedBy: VersionSelection } {
  if (selection.version !== undefined) {
    validateVersion(selection.version)
    if (!manifest.zzz.available.includes(selection.version)) {
      throw new Error(`版本不在 manifest available 中：${selection.version}`)
    }
    return { version: selection.version, selectedBy: "version" }
  }

  const version = manifest.zzz[selection.channel]
  if (!manifest.zzz.available.includes(version)) {
    throw new Error(
      `${selection.channel} 对应版本不在 manifest available 中：${version}`,
    )
  }
  return { version, selectedBy: selection.channel }
}

export function buildManifestUrl(policy: SourcePolicy): URL {
  return validateAllowedUrl(policy, new URL(policy.manifestUrl), "manifest")
}

export function buildEntityIndexUrl(
  policy: SourcePolicy,
  version: string,
  entity: "character" | "equipment" | "weapon" | "bangboo",
): URL {
  validateVersion(version)
  return validateAllowedUrl(
    policy,
    new URL(
      `${encodeURIComponent(version)}/${entity}.json`,
      policy.staticDataBaseUrl,
    ),
    "data",
  )
}

export function buildCharacterIndexUrl(
  policy: SourcePolicy,
  version: string,
): URL {
  return buildEntityIndexUrl(policy, version, "character")
}

export function buildEntityDetailUrl(
  policy: SourcePolicy,
  version: string,
  language: SupportedLanguage,
  entity: "character" | "equipment" | "weapon" | "bangboo",
  entityId: string,
): URL {
  validateVersion(version)
  if (!policy.languages.includes(language))
    throw new Error(`不支持的语言：${language}`)
  if (!isValidEntityId(entityId))
    throw new Error(`${entity} ID 无效：${entityId}`)
  return validateAllowedUrl(
    policy,
    new URL(
      `${encodeURIComponent(version)}/${language}/${entity}/${entityId}.json`,
      policy.staticDataBaseUrl,
    ),
    "data",
  )
}

export function buildCharacterDetailUrl(
  policy: SourcePolicy,
  version: string,
  language: SupportedLanguage,
  characterId: string,
): URL {
  return buildEntityDetailUrl(
    policy,
    version,
    language,
    "character",
    characterId,
  )
}

export function validateAllowedUrl(
  policy: SourcePolicy,
  url: URL,
  kind: "manifest" | "data",
): URL {
  if (url.protocol !== "https:" || url.hostname !== policy.allowlist.host) {
    throw new Error(`URL 不在来源 allowlist 中：${url.href}`)
  }
  if (url.username || url.password || url.port || url.search || url.hash) {
    throw new Error(`URL 包含不允许的组成部分：${url.href}`)
  }
  const validPath =
    kind === "manifest"
      ? url.pathname === policy.allowlist.manifestPath
      : isAllowedDataPath(policy, url.pathname)
  if (!validPath) {
    throw new Error(`URL 路径不在来源 allowlist 中：${url.href}`)
  }
  return url
}

function isAllowedDataPath(policy: SourcePolicy, pathname: string): boolean {
  if (!pathname.startsWith(policy.allowlist.dataPathPrefix)) return false
  const relativePath = pathname.slice(policy.allowlist.dataPathPrefix.length)
  const segments = relativePath.split("/")
  let decodedSegments: string[]
  try {
    decodedSegments = segments.map((segment) => decodeURIComponent(segment))
  } catch {
    return false
  }
  if (decodedSegments.some((segment) => segment === "." || segment === "..")) {
    return false
  }

  if (decodedSegments.length === 2) {
    const [version, file] = decodedSegments
    return (
      version !== undefined &&
      isValidVersion(version) &&
      file !== undefined &&
      (file === "character.json" ||
        file === "equipment.json" ||
        file === "weapon.json" ||
        file === "bangboo.json")
    )
  }
  if (decodedSegments.length === 4) {
    const [version, language, entity, file] = decodedSegments
    return (
      version !== undefined &&
      isValidVersion(version) &&
      language !== undefined &&
      policy.languages.includes(language as SupportedLanguage) &&
      (entity === "character" ||
        entity === "equipment" ||
        entity === "weapon" ||
        entity === "bangboo") &&
      file !== undefined &&
      file.endsWith(".json") &&
      isValidEntityId(file.slice(0, -".json".length))
    )
  }
  return false
}

function isValidVersion(version: string): boolean {
  return versionPattern.test(version)
}

export function decodeUtf8Json(
  bytes: Uint8Array,
  description: string,
): unknown {
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch (error) {
    throw new Error(`${description} 不是有效 UTF-8`, { cause: error })
  }
  return parseJson(text, description)
}

export function parseJson(text: string, description: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new Error(`${description} 不是有效 JSON`, { cause: error })
  }
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  )
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0
}

export function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}
