import type { CalcResult, Diagnostic } from "@fairy/core"
import { calculate, parseBattleSnapshot } from "@fairy/core"
import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

type Lang = "zh" | "en"
type ResultMode = "expected" | "crit" | "nonCrit"

interface CliIo {
  cwd: string
  readFile(path: string): Promise<string>
  readStdin(): Promise<string>
  stdout(text: string): void
  stderr(text: string): void
  loadMessages(lang: Lang): Promise<MessageCatalog>
}

type MessageCatalog = Record<string, string>

interface ParsedArgs {
  command: string
  inputs: string[]
  flags: Map<string, string | boolean>
}

interface CliErrorBody {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

const supportedCommands = ["calc", "compare", "scan", "explain", "migrate"] as const
const booleanFlags = new Set(["help", "pretty"])
const defaultLang: Lang = "zh"
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

export async function runCli(argv: string[], io: CliIo = nodeIo()): Promise<number> {
  const parsed = parseArgs(argv)
  const langResult = parseLang(parsed.flags.get("lang"))
  const lang = langResult.ok ? langResult.lang : defaultLang

  try {
    if (!langResult.ok)
      throw cliError("ERR-CLI-ARG", langResult.message)

    if (parsed.flags.has("help") || parsed.command === "help") {
      writeJson(io, getHelp(), parsed.flags.has("pretty"))
      return 0
    }

    switch (parsed.command) {
      case "calc":
        return await runCalc(parsed, io, lang)
      case "compare":
        return await runCompare(parsed, io, lang)
      case "scan":
        return await runScan(parsed, io, lang)
      case "explain":
        return await runExplain(parsed, io, lang)
      case "migrate":
        return await runMigrate(parsed, io, lang)
      default:
        throw cliError("ERR-CLI-CMD", `Unsupported command: ${parsed.command}`)
    }
  }
  catch (err) {
    const body = toCliErrorBody(err)
    io.stderr(`${JSON.stringify(body)}\n`)
    return 1
  }
}

async function runCalc(parsed: ParsedArgs, io: CliIo, lang: Lang): Promise<number> {
  const snapshot = await readSnapshotInput(parsed, io, 0)
  const result = calculate(withResultMode(snapshot, parseResultMode(parsed.flags.get("result-mode") ?? parsed.flags.get("resultMode"))))
  await writeDiagnostics(io, result, lang)
  writeJson(io, result, parsed.flags.has("pretty"))
  return result.errors.length > 0 ? 1 : 0
}

async function runCompare(parsed: ParsedArgs, io: CliIo, lang: Lang): Promise<number> {
  if (parsed.inputs.length < 2)
    throw cliError("ERR-CLI-ARG", "compare requires two snapshot inputs")

  const leftInput = await readSnapshotInput(parsed, io, 0)
  const rightInput = await readSnapshotInput(parsed, io, 1)
  const resultMode = parseResultMode(parsed.flags.get("result-mode") ?? parsed.flags.get("resultMode"))
  const left = calculate(withResultMode(leftInput, resultMode), { calculationId: "left" })
  const right = calculate(withResultMode(rightInput, resultMode), { calculationId: "right" })
  await writeDiagnostics(io, left, lang)
  await writeDiagnostics(io, right, lang)
  writeJson(io, {
    schemaVersion: "fairy-cli-compare-v1",
    resultMode: resultMode ?? "expected",
    left,
    right,
    delta: {
      rawTotalDamage: right.summary.rawTotalDamage - left.summary.rawTotalDamage,
      displayTotalDamage: right.summary.displayTotalDamage - left.summary.displayTotalDamage,
      expectedDamage: (right.summary.expectedDamage ?? right.summary.rawTotalDamage)
        - (left.summary.expectedDamage ?? left.summary.rawTotalDamage),
      damageTypeChanged: left.summary.damageType !== right.summary.damageType,
    },
  }, parsed.flags.has("pretty"))
  return left.errors.length > 0 || right.errors.length > 0 ? 1 : 0
}

async function runScan(parsed: ParsedArgs, io: CliIo, lang: Lang): Promise<number> {
  const path = readStringFlag(parsed, "path")
  const from = readNumberFlag(parsed, "from")
  const to = readNumberFlag(parsed, "to")
  const step = readNumberFlag(parsed, "step")
  if (step <= 0)
    throw cliError("ERR-CLI-ARG", "--step must be greater than 0")

  const snapshot = await readSnapshotInput(parsed, io, 0)
  const resultMode = parseResultMode(parsed.flags.get("result-mode") ?? parsed.flags.get("resultMode"))
  const rows: Array<{ value: number; summary: CalcResult["summary"]; diagnostics: { warnings: number; errors: number } }> = []
  for (let value = from; value <= to + Number.EPSILON; value += step) {
    const scannedSnapshot = setPath(structuredClone(snapshot), path, normalizeScanValue(value))
    const result = calculate(withResultMode(scannedSnapshot, resultMode), { calculationId: `scan-${rows.length + 1}` })
    await writeDiagnostics(io, result, lang)
    rows.push({
      value: normalizeScanValue(value),
      summary: result.summary,
      diagnostics: {
        warnings: result.warnings.length,
        errors: result.errors.length,
      },
    })
  }

  writeJson(io, {
    schemaVersion: "fairy-cli-scan-v1",
    resultMode: resultMode ?? "expected",
    scan: {
      path,
      from,
      to,
      step,
    },
    rows,
  }, parsed.flags.has("pretty"))
  return rows.some(row => row.diagnostics.errors > 0) ? 1 : 0
}

async function runExplain(parsed: ParsedArgs, io: CliIo, lang: Lang): Promise<number> {
  const snapshot = await readSnapshotInput(parsed, io, 0)
  const result = calculate(withResultMode(snapshot, parseResultMode(parsed.flags.get("result-mode") ?? parsed.flags.get("resultMode"))))
  await writeDiagnostics(io, result, lang)
  writeJson(io, {
    schemaVersion: "fairy-cli-explain-v1",
    summary: result.summary,
    warnings: result.warnings,
    errors: result.errors,
    attackSegments: result.attackSegments,
    buckets: result.buckets,
    modifiers: result.modifiers,
    trace: result.trace,
  }, parsed.flags.has("pretty"))
  return result.errors.length > 0 ? 1 : 0
}

async function runMigrate(parsed: ParsedArgs, io: CliIo, lang: Lang): Promise<number> {
  const snapshot = parseBattleSnapshot(await readSnapshotInput(parsed, io, 0))
  const messages = await io.loadMessages(lang)
  const diagnostics: Diagnostic[] = []
  writeDiagnosticLines(io, diagnostics, messages)
  writeJson(io, {
    schemaVersion: "fairy-cli-migrate-v1",
    migrated: false,
    reason: "No schema migration rules are registered in V1.",
    snapshot,
  }, parsed.flags.has("pretty"))
  return 0
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv]
  if (args[0] === "--")
    args.shift()
  const command = args.shift() ?? "help"
  const inputs: string[] = []
  const flags = new Map<string, string | boolean>()

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (!arg.startsWith("--")) {
      inputs.push(arg)
      continue
    }

    const [rawName, inlineValue] = arg.slice(2).split("=", 2)
    const name = rawName ?? ""
    if (booleanFlags.has(name)) {
      flags.set(name, true)
      continue
    }

    if (inlineValue !== undefined) {
      flags.set(name, inlineValue)
      continue
    }

    const next = args[index + 1]
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(name, next)
      index += 1
    }
    else {
      flags.set(name, true)
    }
  }

  return {
    command,
    inputs,
    flags,
  }
}

async function readSnapshotInput(parsed: ParsedArgs, io: CliIo, index: number): Promise<unknown> {
  const input = parsed.inputs[index] ?? "-"
  const text = input === "-"
    ? await io.readStdin()
    : await io.readFile(resolve(io.cwd, input))
  try {
    return JSON.parse(text) as unknown
  }
  catch (err) {
    throw cliError("ERR-CLI-JSON", `Invalid JSON input at ${input}`, err)
  }
}

function withResultMode(input: unknown, resultMode: ResultMode | undefined): unknown {
  if (resultMode === undefined || input === null || typeof input !== "object")
    return input

  const snapshot = structuredClone(input) as Record<string, unknown>
  const options = snapshot.options !== null && typeof snapshot.options === "object"
    ? { ...snapshot.options as Record<string, unknown> }
    : {}
  options.resultMode = resultMode
  snapshot.options = options
  return snapshot
}

function parseLang(value: string | boolean | undefined): { ok: true; lang: Lang } | { ok: false; message: string } {
  if (value === undefined || value === false || value === true)
    return { ok: true, lang: defaultLang }
  if (value === "zh" || value === "en")
    return { ok: true, lang: value }
  return { ok: false, message: "--lang must be zh or en" }
}

function parseResultMode(value: string | boolean | undefined): ResultMode | undefined {
  if (value === undefined || value === false || value === true)
    return undefined
  if (value === "expected" || value === "crit" || value === "nonCrit")
    return value
  throw cliError("ERR-CLI-ARG", "--result-mode must be expected, crit, or nonCrit")
}

function readStringFlag(parsed: ParsedArgs, name: string): string {
  const value = parsed.flags.get(name)
  if (typeof value !== "string" || value.length === 0)
    throw cliError("ERR-CLI-ARG", `--${name} is required`)
  return value
}

function readNumberFlag(parsed: ParsedArgs, name: string): number {
  const rawValue = readStringFlag(parsed, name)
  const value = Number(rawValue)
  if (!Number.isFinite(value))
    throw cliError("ERR-CLI-ARG", `--${name} must be a number`)
  return value
}

function setPath(input: unknown, path: string, value: unknown): unknown {
  const parts = path.match(/[^[.\]]+/g)
  if (parts === null || parts.length === 0)
    throw cliError("ERR-CLI-ARG", `Invalid scan path: ${path}`)

  let cursor = input as Record<string, unknown> | unknown[]
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]!
    const next = Array.isArray(cursor) ? cursor[Number(part)] : cursor[part]
    if (next === null || typeof next !== "object")
      throw cliError("ERR-CLI-ARG", `Cannot scan missing path segment: ${parts.slice(0, index + 1).join(".")}`)
    cursor = next as Record<string, unknown> | unknown[]
  }

  const finalPart = parts[parts.length - 1]!
  if (Array.isArray(cursor))
    cursor[Number(finalPart)] = value
  else
    cursor[finalPart] = value
  return input
}

function normalizeScanValue(value: number): number {
  return Number(value.toFixed(12))
}

async function writeDiagnostics(io: CliIo, result: CalcResult, lang: Lang): Promise<void> {
  if (result.warnings.length === 0 && result.errors.length === 0)
    return

  const messages = await io.loadMessages(lang)
  writeDiagnosticLines(io, [...result.warnings, ...result.errors], messages)
}

function writeDiagnosticLines(io: CliIo, diagnostics: Diagnostic[], messages: MessageCatalog): void {
  for (const diagnostic of diagnostics) {
    const level = diagnostic.severity.toUpperCase()
    const path = diagnostic.path === undefined ? "" : ` ${diagnostic.path}`
    io.stderr(`${level} ${diagnostic.key}${path}: ${renderDiagnostic(diagnostic, messages)}\n`)
  }
}

function renderDiagnostic(diagnostic: Diagnostic, messages: MessageCatalog): string {
  const template = messages[diagnostic.key] ?? diagnostic.key
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = diagnostic.messageParams?.[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}

function writeJson(io: CliIo, value: unknown, pretty: boolean): void {
  io.stdout(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`)
}

function getHelp() {
  return {
    schemaVersion: "fairy-cli-help-v1",
    commands: supportedCommands,
    flags: {
      "--lang": ["zh", "en"],
      "--result-mode": ["expected", "crit", "nonCrit"],
      "--pretty": true,
      "--path": "scan target path",
      "--from": "scan start number",
      "--to": "scan end number",
      "--step": "scan step number",
    },
    input: "Use a JSON file path or '-' for stdin. calc/explain/migrate accept one input; compare accepts two; scan accepts one plus --path/--from/--to/--step.",
  }
}

function cliError(code: string, message: string, details?: unknown): Error & { code: string; details?: unknown } {
  const err = new Error(message) as Error & { code: string; details?: unknown }
  err.code = code
  if (details !== undefined)
    err.details = details
  return err
}

function toCliErrorBody(err: unknown): CliErrorBody {
  if (isZodErrorLike(err)) {
    return {
      ok: false,
      error: {
        code: "ERR-CLI-SCHEMA",
        message: "Input does not match BattleSnapshot schema.",
        details: err.issues,
      },
    }
  }

  if (err instanceof Error) {
    const maybeCoded = err as Error & { code?: string; details?: unknown }
    return {
      ok: false,
      error: {
        code: maybeCoded.code ?? "ERR-CLI-UNCAUGHT",
        message: err.message,
        ...(maybeCoded.details === undefined ? {} : { details: maybeCoded.details }),
      },
    }
  }

  return {
    ok: false,
    error: {
      code: "ERR-CLI-UNCAUGHT",
      message: String(err),
    },
  }
}

function isZodErrorLike(err: unknown): err is { issues: unknown[] } {
  return err !== null
    && typeof err === "object"
    && Array.isArray((err as { issues?: unknown }).issues)
}

function nodeIo(): CliIo {
  return {
    cwd: process.cwd(),
    readFile: path => readFile(path, "utf8"),
    readStdin: () => new Promise((resolveInput, reject) => {
      let input = ""
      process.stdin.setEncoding("utf8")
      process.stdin.on("data", chunk => {
        input += chunk
      })
      process.stdin.on("end", () => resolveInput(input))
      process.stdin.on("error", reject)
    }),
    stdout: text => process.stdout.write(text),
    stderr: text => process.stderr.write(text),
    loadMessages: async (lang) => {
      const path = resolve(repoRoot, "docs", "ux", "i18n", `messages.${lang}.json`)
      const raw = await readFile(path, "utf8")
      return JSON.parse(raw) as MessageCatalog
    },
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code
  }).catch((err: unknown) => {
    process.stderr.write(`${JSON.stringify(toCliErrorBody(err))}\n`)
    process.exitCode = 1
  })
}
