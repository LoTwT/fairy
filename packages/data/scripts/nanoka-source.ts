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
  fetchNanokaSnapshot,
  fetchUpstreamManifest,
  type SnapshotFetchProgress,
  verifyNanokaSnapshots,
} from "./nanoka/snapshot.ts"

interface ParsedArguments {
  command: "fetch" | "verify"
  channel?: "live" | "latest"
  version?: string
  entities: string[]
}

export function parseArguments(arguments_: string[]): ParsedArguments {
  const command = arguments_.shift()
  if (command !== "fetch" && command !== "verify") {
    throw new Error("命令必须是 fetch 或 verify")
  }

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
  if (command === "verify" && channel !== undefined) {
    throw new Error("verify 不支持 --channel")
  }
  if (command === "verify" && entities.length > 0)
    throw new Error("verify 不支持 --entity")
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
  progress: SnapshotFetchProgress,
): string | undefined {
  switch (progress.stage) {
    case "preparing":
      return `正在准备组合快照；更新实体：${progress.requestedEntities.join(", ")}；沿用实体：${progress.carriedEntities.join(", ") || "无"}`
    case "entity-discovered":
      return `${progress.displayName}：已发现 ${progress.recordCount} 条记录，准备处理 ${progress.detailCount} 份语言详情…`
    case "entity-details":
      return progress.completed === progress.total ||
        progress.completed % 10 === 0
        ? `${progress.displayName} 详情进度：${progress.completed}/${progress.total}`
        : undefined
    case "verifying":
      return `正在执行 ${progress.layer} 分层校验…`
    case "publishing":
      return "校验通过，正在发布新快照…"
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
  if (parsed.command === "verify") {
    const results = await verifyNanokaSnapshots({
      policy,
      ...(parsed.version === undefined ? {} : { version: parsed.version }),
    })
    if (results.length === 0) {
      process.stdout.write("没有本地 Nanoka 快照需要校验。\n")
      return
    }
    const failures = results.flatMap((result) =>
      result.errors.map((error) => `${result.snapshotVersion}: ${error}`),
    )
    if (failures.length > 0) {
      throw new Error(`离线校验失败：\n${failures.join("\n")}`)
    }
    process.stdout.write(
      `离线校验通过：${results.map((result) => result.snapshotVersion).join(", ")}\n`,
    )
    return
  }

  const httpClient = new NanokaHttpClient(policy)
  process.stdout.write("正在获取 Nanoka 版本 manifest…\n")
  const { response, manifest } = await fetchUpstreamManifest(policy, httpClient)
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

  const result = await fetchNanokaSnapshot({
    policy,
    httpClient,
    upstreamManifestResponse: response,
    upstreamManifest: manifest,
    version,
    selectedBy,
    ...(parsed.entities.length === 0 ? {} : { entities: parsed.entities }),
    onProgress: (progress) => {
      const message = formatFetchProgress(progress)
      if (message !== undefined) process.stdout.write(`${message}\n`)
    },
  })
  const { summary } = result.manifest
  process.stdout.write(
    [
      `Nanoka 快照完成：${version}`,
      ...result.manifest.entities.map(
        (entity) => `${entity}: ${summary.entities[entity].recordCount} 条记录`,
      ),
      `资源: ${summary.assetCount}`,
      `字节: ${summary.totalBytes}`,
      `HTTP 304: ${result.notModifiedAssetCount}`,
      `沿用资源: ${result.carriedForwardAssetCount}`,
      `内容漂移: ${result.driftedAssetIds.length}`,
      ...(result.driftedAssetIds.length === 0
        ? []
        : [`漂移资源: ${result.driftedAssetIds.join(", ")}`]),
      ...result.cleanupWarnings.map((warning) => `清理警告: ${warning}`),
    ].join("\n") + "\n",
  )
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  run(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Nanoka 数据源命令失败：${message}\n`)
    process.exitCode = 1
  })
}
