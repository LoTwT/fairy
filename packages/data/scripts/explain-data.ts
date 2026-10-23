import { realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { loadAgentActionIndex } from "./data-product/agent-actions.ts"
import {
  explainDataIdentity,
  ExplainError,
  formatExplainText,
  identifyDataIdentity,
  isDataIdentityType,
  serializeExplainResult,
  supportedInputForms,
  type DataIdentityType,
} from "./data-product/explain.ts"
import { loadStaticEffectsProduct } from "./data-product/manifests.ts"

const usage =
  "用法：pnpm --filter @randomplay/data explain <effectId|optionId|actionId|pointer> [--json] [--type effect|option|action|pointer]"

export interface ExplainCliIo {
  readonly stdout: (text: string) => void
  readonly stderr: (text: string) => void
}

export interface ExplainCliOptions {
  readonly definitionsDirectory?: string
  readonly io?: ExplainCliIo
}

interface ParsedArguments {
  readonly help: boolean
  readonly json: boolean
  readonly query: string
  readonly type?: DataIdentityType
}

function parseType(value: string): DataIdentityType {
  if (isDataIdentityType(value)) return value
  throw new ExplainError(
    "INVALID_ARGUMENT",
    `未知 --type 值 "${value}"；支持 effect、option、action、pointer。`,
  )
}

function parseArguments(args: readonly string[]): ParsedArguments {
  const json = args.includes("--json")
  if (args.includes("--help") || args.includes("-h"))
    return { help: true, json, query: "" }

  let type: DataIdentityType | undefined
  const positionals: string[] = []

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === undefined) continue
    if (argument === "--json") continue
    if (argument === "--type") {
      if (type !== undefined)
        throw new ExplainError("INVALID_ARGUMENT", "--type 只能指定一次。")
      const value = args[index + 1]
      if (value === undefined)
        throw new ExplainError("INVALID_ARGUMENT", "--type 需要一个值。")
      type = parseType(value)
      index += 1
      continue
    }
    if (argument.startsWith("--type=")) {
      if (type !== undefined)
        throw new ExplainError("INVALID_ARGUMENT", "--type 只能指定一次。")
      type = parseType(argument.slice("--type=".length))
      continue
    }
    if (argument.startsWith("-"))
      throw new ExplainError("INVALID_ARGUMENT", `未知选项：${argument}`)
    positionals.push(argument)
  }

  if (positionals.length !== 1)
    throw new ExplainError(
      "INVALID_ARGUMENT",
      positionals.length === 0
        ? "缺少要解释的数据身份。"
        : "只接受一个数据身份。",
    )
  return {
    help: false,
    json,
    query: positionals[0] ?? "",
    ...(type === undefined ? {} : { type }),
  }
}

function writeUsage(io: ExplainCliIo): void {
  io.stdout(
    `${usage}\n支持的形式：\n${supportedInputForms.map((form) => `  - ${form}`).join("\n")}\n`,
  )
}

function reportError(error: unknown, json: boolean, io: ExplainCliIo): number {
  const code = error instanceof ExplainError ? error.code : "LOAD_FAILED"
  const message = error instanceof Error ? error.message : String(error)
  if (json) {
    io.stderr(
      `${JSON.stringify(
        {
          schemaVersion: 1,
          type: "error",
          error: { code, message },
          supportedInputs: supportedInputForms,
        },
        null,
        2,
      )}\n`,
    )
  } else {
    io.stderr(
      `错误：${message}\n支持的形式：\n${supportedInputForms.map((form) => `  - ${form}`).join("\n")}\n`,
    )
  }
  return 1
}

/** 可测试的 CLI 入口：不调用 process.exit，只返回退出码。 */
export function runExplainCli(
  args: readonly string[],
  options: ExplainCliOptions = {},
): number {
  const io = options.io ?? {
    stdout: (text: string) => process.stdout.write(text),
    stderr: (text: string) => process.stderr.write(text),
  }

  let parsed: ParsedArguments
  try {
    parsed = parseArguments(args)
  } catch (error) {
    return reportError(error, args.includes("--json"), io)
  }

  if (parsed.help) {
    writeUsage(io)
    return 0
  }

  try {
    const identity = identifyDataIdentity(parsed.query, parsed.type)
    if (identity === undefined) {
      const hint = parsed.type === undefined ? "" : `（--type ${parsed.type}）`
      throw new ExplainError(
        "UNKNOWN_INPUT_TYPE",
        `无法识别或无法唯一识别输入 "${parsed.query}"${hint}。`,
      )
    }

    const staticEffects = loadStaticEffectsProduct(options.definitionsDirectory)
    const agentActions =
      identity.type === "action"
        ? loadAgentActionIndex(options.definitionsDirectory)
        : { files: [] }
    const result = explainDataIdentity(
      identity.value,
      { staticEffects, agentActions },
      identity.type,
    )
    io.stdout(
      `${parsed.json ? serializeExplainResult(result) : formatExplainText(result)}\n`,
    )
    return 0
  } catch (error) {
    return reportError(error, parsed.json, io)
  }
}

/** 用 realpath 比较入口，避免通过符号链接调用时静默不执行。 */
export function isMainModuleEntry(
  entry: string | undefined,
  moduleUrl: string,
): boolean {
  if (entry === undefined) return false
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(moduleUrl))
  } catch {
    return false
  }
}

if (isMainModuleEntry(process.argv[1], import.meta.url))
  process.exitCode = runExplainCli(process.argv.slice(2))
