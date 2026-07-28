#!/usr/bin/env node
import { createInterface } from "node:readline/promises"
import { pathToFileURL } from "node:url"
import { NanokaHttpClient } from "./nanoka/http.ts"
import {
  loadSourcePolicy,
  selectVersion,
  type NanokaManifest,
  type VersionSelection,
} from "./nanoka/policy.ts"
import {
  fetchNanokaData,
  fetchUpstreamManifest,
  type FetchProgress,
} from "./nanoka/fetch.ts"

interface ParsedArguments {
  command: "fetch"
  channel?: "live" | "latest"
  version?: string
  entities: string[]
}

export function escapeTerminalText(value: string): string {
  const maximumInputCodePoints = 4096
  let escaped = ""
  let codePointCount = 0
  for (const character of value) {
    if (codePointCount === maximumInputCodePoints) {
      escaped += "…"
      break
    }
    codePointCount += 1
    const codePoint = character.codePointAt(0)
    escaped +=
      codePoint === undefined || !isUnsafeTerminalCodePoint(codePoint)
        ? character
        : `\\u{${codePoint.toString(16).padStart(4, "0")}}`
  }
  return escaped
}

function isUnsafeTerminalCodePoint(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x61c ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    (codePoint >= 0x2028 && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  )
}

export function formatCommandFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Nanoka 数据源命令失败：${escapeTerminalText(message)}\n`
}

export function parseArguments(arguments_: string[]): ParsedArguments {
  const command = arguments_.shift()
  if (command !== "fetch") throw new Error("命令必须是 fetch")

  let channel: "live" | "latest" | undefined
  let version: string | undefined
  const entities: string[] = []
  while (arguments_.length > 0) {
    const argument = arguments_.shift()
    if (argument === "--channel") {
      const value = arguments_.shift()
      if (value !== "live" && value !== "latest") {
        throw new Error("--channel 必须是 live 或 latest")
      }
      if (channel !== undefined) throw new Error("--channel 不能重复")
      channel = value
    } else if (argument === "--version") {
      const value = arguments_.shift()
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--version 需要版本号")
      }
      if (version !== undefined) throw new Error("--version 不能重复")
      version = value
    } else if (argument === "--entity") {
      const value = arguments_.shift()
      if (value === undefined || value.startsWith("--"))
        throw new Error("--entity 需要实体名")
      entities.push(value)
    } else {
      throw new Error(`未知参数：${argument}`)
    }
  }
  if (channel !== undefined && version !== undefined) {
    throw new Error("--channel 和 --version 互斥")
  }
  return {
    command,
    entities,
    ...(channel === undefined ? {} : { channel }),
    ...(version === undefined ? {} : { version }),
  }
}

export function formatVersionMenu(manifest: NanokaManifest): string {
  const options = manifest.zzz.available.map((version, index) => {
    const markers = [
      version === manifest.zzz.live ? "live（默认）" : undefined,
      version === manifest.zzz.latest ? "latest" : undefined,
    ].filter((marker): marker is string => marker !== undefined)
    return `  ${index + 1}. ${version}${markers.length === 0 ? "" : `     ${markers.join("、")}`}`
  })
  return [
    "请选择要抓取的 Nanoka ZZZ 数据版本：",
    "",
    ...options,
    "",
    `输入序号或版本号，直接回车使用 ${manifest.zzz.live}：`,
  ].join("\n")
}

export function parseInteractiveSelection(
  input: string,
  manifest: NanokaManifest,
): string | undefined {
  const trimmed = input.trim()
  if (trimmed === "") {
    return manifest.zzz.available.includes(manifest.zzz.live)
      ? manifest.zzz.live
      : undefined
  }
  if (/^[1-9]\d*$/u.test(trimmed)) {
    return manifest.zzz.available[Number(trimmed) - 1]
  }
  return manifest.zzz.available.includes(trimmed) ? trimmed : undefined
}

export async function chooseVersionInteractively(
  manifest: NanokaManifest,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<string> {
  const readline = createInterface({ input, output })
  try {
    output.write(`${formatVersionMenu(manifest)}\n`)
    while (true) {
      const answer = await readline.question("> ")
      const version = parseInteractiveSelection(answer, manifest)
      if (version !== undefined) return version
      output.write("输入无效，请输入列表序号或完整版本号。\n")
    }
  } finally {
    readline.close()
  }
}

export function formatFetchProgress(
  progress: FetchProgress,
): string | undefined {
  switch (progress.stage) {
    case "preparing":
      return `正在抓取实体：${progress.requestedEntities.join(", ")}`
    case "entity-discovered":
      return `${progress.entity}：已发现 ${progress.recordCount} 条记录，准备处理 ${progress.detailCount} 份语言详情…`
    case "entity-details":
      return progress.completed === progress.total ||
        progress.completed % 10 === 0
        ? `${progress.entity} 详情进度：${progress.completed}/${progress.total}`
        : undefined
  }
}

export async function run(
  arguments_: string[],
  terminal = {
    inputIsTTY: process.stdin.isTTY,
    outputIsTTY: process.stdout.isTTY,
  },
): Promise<void> {
  const parsed = parseArguments([...arguments_])
  const policy = await loadSourcePolicy()

  const httpClient = new NanokaHttpClient(policy)
  process.stdout.write("正在获取 Nanoka 版本 manifest…\n")
  const { bytes: manifestBytes, manifest } = await fetchUpstreamManifest(
    policy,
    httpClient,
  )
  const selection: { version: string; selectedBy: VersionSelection } =
    parsed.channel !== undefined
      ? selectVersion(manifest, { channel: parsed.channel })
      : parsed.version !== undefined
        ? selectVersion(manifest, { version: parsed.version })
        : terminal.inputIsTTY && terminal.outputIsTTY
          ? {
              version: await chooseVersionInteractively(manifest),
              selectedBy: "interactive",
            }
          : selectVersion(manifest, { channel: "live" })
  const { version, selectedBy } = selection
  process.stdout.write(`已选择版本：${version}（${selectedBy}）\n`)

  const result = await fetchNanokaData({
    policy,
    httpClient,
    upstreamManifestBytes: manifestBytes,
    upstreamManifest: manifest,
    version,
    ...(parsed.entities.length === 0 ? {} : { entities: parsed.entities }),
    onProgress: (progress) => {
      const message = formatFetchProgress(progress)
      if (message !== undefined) process.stdout.write(`${message}\n`)
    },
  })
  process.stdout.write(
    [
      `Nanoka 本地缓存更新完成：${version}`,
      ...result.entities.map(
        (entity) => `${entity}: ${result.recordCounts[entity]} 条记录`,
      ),
      `本次资源: ${result.fetchedAssetCount}`,
      `本次字节: ${result.fetchedBytes}`,
      `缓存目录: ${result.cacheDirectory}`,
    ].join("\n") + "\n",
  )
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  run(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(formatCommandFailure(error))
    process.exitCode = 1
  })
}
