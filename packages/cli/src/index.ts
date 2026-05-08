import type { CalcResult, Diagnostic } from "@randomplay/core"
import { calculate, parseBattleSnapshot } from "@randomplay/core"
import { defineCommand, parseArgs as parseCittyArgs, type ArgsDef } from "citty"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import enMessages from "../../../docs/ux/i18n/messages.en.json" with { type: "json" }
import zhMessages from "../../../docs/ux/i18n/messages.zh.json" with { type: "json" }
import { cliErrorFallbackMessages, isCliErrorCode, type CliErrorCode } from "./errors"

type Lang = "zh" | "en"
type ResultMode = "expected" | "crit" | "nonCrit"
type View = "brief" | "verbose"

interface CliIo {
  cwd: string
  readFile(path: string): Promise<string>
  readStdin(): Promise<string>
  stdout(text: string): void
  stderr(text: string): void
  loadMessages(lang: Lang): Promise<MessageCatalog>
}

type MessageCatalog = Record<string, string>
type MessageParams = Record<string, unknown>

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
const defaultLang: Lang = "zh"

function toMessageCatalog(raw: Record<string, unknown>): MessageCatalog {
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === "string")) as MessageCatalog
}

const messageCatalogs = {
  en: toMessageCatalog(enMessages),
  zh: toMessageCatalog(zhMessages),
} satisfies Record<Lang, MessageCatalog>

const commonArgs = {
  help: {
    type: "boolean",
    description: "Show JSON help output.",
  },
  lang: {
    type: "string",
    description: "Diagnostic language.",
    valueHint: "zh|en",
  },
  pretty: {
    type: "boolean",
    description: "Pretty-print JSON output.",
  },
} satisfies ArgsDef

const resultModeArg = {
  "result-mode": {
    type: "string",
    description: "Select expected, crit, or nonCrit result mode.",
    valueHint: "expected|crit|nonCrit",
  },
} satisfies ArgsDef

const commandDefinitions = {
  calc: defineCommand({
    meta: {
      name: "calc",
      description: "Calculate one BattleSnapshot.",
    },
    args: {
      input: {
        type: "positional",
        description: "Snapshot JSON path, or '-' for stdin.",
        required: false,
      },
      view: {
        type: "string",
        description: "Output brief summary or verbose CalcResult.",
        valueHint: "brief|verbose",
      },
      ...resultModeArg,
      ...commonArgs,
    },
  }),
  compare: defineCommand({
    meta: {
      name: "compare",
      description: "Compare two BattleSnapshots.",
    },
    args: {
      left: {
        type: "positional",
        description: "Left snapshot JSON path, or '-' for stdin.",
        required: false,
      },
      right: {
        type: "positional",
        description: "Right snapshot JSON path.",
        required: false,
      },
      ...resultModeArg,
      ...commonArgs,
    },
  }),
  scan: defineCommand({
    meta: {
      name: "scan",
      description: "Scan a numeric snapshot path across a range.",
    },
    args: {
      input: {
        type: "positional",
        description: "Snapshot JSON path, or '-' for stdin.",
        required: false,
      },
      path: {
        type: "string",
        description: "Snapshot path to mutate.",
      },
      from: {
        type: "string",
        description: "Scan start value.",
      },
      to: {
        type: "string",
        description: "Scan end value.",
      },
      step: {
        type: "string",
        description: "Scan step value.",
      },
      ...resultModeArg,
      ...commonArgs,
    },
  }),
  explain: defineCommand({
    meta: {
      name: "explain",
      description: "Return full explanation fields for one BattleSnapshot.",
    },
    args: {
      input: {
        type: "positional",
        description: "Snapshot JSON path, or '-' for stdin.",
        required: false,
      },
      ...resultModeArg,
      ...commonArgs,
    },
  }),
  migrate: defineCommand({
    meta: {
      name: "migrate",
      description: "Normalize a BattleSnapshot with registered migrations.",
    },
    args: {
      input: {
        type: "positional",
        description: "Snapshot JSON path, or '-' for stdin.",
        required: false,
      },
      ...commonArgs,
    },
  }),
  help: defineCommand({
    meta: {
      name: "help",
      description: "Show JSON help output.",
    },
    args: {
      command: {
        type: "positional",
        description: "Optional command name.",
        required: false,
      },
      ...commonArgs,
    },
  }),
}

export async function runCli(argv: string[], io: CliIo = nodeIo()): Promise<number> {
  let lang: Lang = defaultLang

  try {
    const parsed = parseArgs(argv)
    const langResult = parseLang(parsed.flags.get("lang"))
    lang = langResult.ok ? langResult.lang : defaultLang

    if (!langResult.ok)
      throw cliError("ERR-CLI-ARG", { message: langResult.message })

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
        throw cliError("ERR-CLI-CMD", { command: parsed.command })
    }
  }
  catch (err) {
    const body = await toCliErrorBody(err, io, lang)
    io.stderr(`${JSON.stringify(body)}\n`)
    return 1
  }
}

async function runCalc(parsed: ParsedArgs, io: CliIo, lang: Lang): Promise<number> {
  const snapshot = await readSnapshotInput(parsed, io, 0)
  const view = parseView(parsed.flags.get("view"))
  const resultMode = parseResultMode(parsed.flags.get("result-mode") ?? parsed.flags.get("resultMode"))
  const result = calculate(withResultMode(snapshot, resultMode))
  await writeDiagnostics(io, result, lang)
  writeJson(io, view === "verbose" ? result : toBriefCalcResult(result, resultMode), parsed.flags.has("pretty"))
  return result.errors.length > 0 ? 1 : 0
}

async function runCompare(parsed: ParsedArgs, io: CliIo, lang: Lang): Promise<number> {
  if (parsed.inputs.length < 2)
    throw cliError("ERR-CLI-ARG", { message: "compare requires two snapshot inputs" })

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
    throw cliError("ERR-CLI-ARG", { message: "--step must be greater than 0" })

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
  const command = normalizeCommand(args.shift())
  if (!isCliCommand(command))
    return parseUnknownCommandArgs(command, args)

  return parseCommandArgs(command, args)
}

function normalizeCommand(command: string | undefined): string {
  if (command === undefined || command === "--help" || command === "-h")
    return "help"
  return command
}

function isCliCommand(command: string): command is keyof typeof commandDefinitions {
  return command in commandDefinitions
}

function parseCommandArgs(command: keyof typeof commandDefinitions, rawArgs: string[]): ParsedArgs {
  try {
    const argsDef = (commandDefinitions[command].args ?? {}) as ArgsDef
    const args = parseCittyArgs(rawArgs, argsDef)
    return {
      command,
      inputs: readInputArgs(command, args),
      flags: readFlagArgs(args),
    }
  }
  catch (err) {
    throw cliError("ERR-CLI-ARG", { message: describeCittyArgError(err) })
  }
}

function parseUnknownCommandArgs(command: string, rawArgs: string[]): ParsedArgs {
  try {
    const args = parseCittyArgs(rawArgs, commonArgs)
    return {
      command,
      inputs: [],
      flags: readFlagArgs(args),
    }
  }
  catch {
    return {
      command,
      inputs: [],
      flags: new Map(),
    }
  }
}

function readInputArgs(command: keyof typeof commandDefinitions, args: Record<string, unknown>): string[] {
  switch (command) {
    case "compare":
      return [args.left, args.right].filter(isString)
    case "help":
      return [args.command].filter(isString)
    default:
      return [args.input].filter(isString)
  }
}

function readFlagArgs(args: Record<string, unknown>): Map<string, string | boolean> {
  const flags = new Map<string, string | boolean>()
  for (const name of ["help", "lang", "pretty", "view", "result-mode", "resultMode", "path", "from", "to", "step"]) {
    const value = args[name]
    if (typeof value === "string" || typeof value === "boolean")
      flags.set(name, value)
  }
  return flags
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function describeCittyArgError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
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
    throw cliError("ERR-CLI-JSON", { input }, describeUnknownError(err))
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
  throw cliError("ERR-CLI-ARG", { message: "--result-mode must be expected, crit, or nonCrit" })
}

function parseView(value: string | boolean | undefined): View {
  if (value === undefined || value === false)
    return "brief"
  if (value === "brief" || value === "verbose")
    return value
  throw cliError("ERR-CLI-ARG", { message: "--view must be brief or verbose" })
}

function toBriefCalcResult(result: CalcResult, resultMode: ResultMode | undefined) {
  const summary = result.summary
  return {
    schemaVersion: "fairy-cli-calc-brief-v1",
    view: "brief",
    ...(resultMode === undefined ? {} : { resultMode }),
    calculationId: result.calculationId,
    summary: {
      activeActorId: summary.activeActorId,
      ...(summary.enemyId === undefined ? {} : { enemyId: summary.enemyId }),
      damageType: summary.damageType,
      lanes: summary.lanes,
      ...(summary.daze === undefined ? {} : { daze: summary.daze }),
      ...(summary.anomalyBuildup === undefined || summary.anomalyBuildup === 0 ? {} : { anomalyBuildup: summary.anomalyBuildup }),
      ...(resultMode === "expected" ? { expectedDamage: summary.expectedDamage ?? summary.rawTotalDamage } : {}),
    },
    warnings: result.warnings,
    errors: result.errors,
  }
}

function readStringFlag(parsed: ParsedArgs, name: string): string {
  const value = parsed.flags.get(name)
  if (typeof value !== "string" || value.length === 0)
    throw cliError("ERR-CLI-ARG", { message: `--${name} is required` })
  return value
}

function readNumberFlag(parsed: ParsedArgs, name: string): number {
  const rawValue = readStringFlag(parsed, name)
  const value = Number(rawValue)
  if (!Number.isFinite(value))
    throw cliError("ERR-CLI-ARG", { message: `--${name} must be a number` })
  return value
}

function setPath(input: unknown, path: string, value: unknown): unknown {
  const parts = path.match(/[^[.\]]+/g)
  if (parts === null || parts.length === 0)
    throw cliError("ERR-CLI-ARG", { message: `Invalid scan path: ${path}` })

  let cursor = input as Record<string, unknown> | unknown[]
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]!
    const next = Array.isArray(cursor) ? cursor[Number(part)] : cursor[part]
    if (next === null || typeof next !== "object")
      throw cliError("ERR-CLI-ARG", { message: `Cannot scan missing path segment: ${parts.slice(0, index + 1).join(".")}` })
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
  return renderMessageTemplate(template, diagnostic.messageParams)
}

function renderMessageTemplate(template: string, params: MessageParams = {}): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = params[key]
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
      "--view": ["brief", "verbose"],
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

function cliError(code: CliErrorCode, messageParams: MessageParams = {}, details?: unknown): Error & {
  code: CliErrorCode
  messageParams: MessageParams
  details?: unknown
} {
  const err = new Error(renderMessageTemplate(cliErrorFallbackMessages[code], messageParams)) as Error & {
    code: CliErrorCode
    messageParams: MessageParams
    details?: unknown
  }
  err.code = code
  err.messageParams = messageParams
  if (details !== undefined)
    err.details = details
  return err
}

async function toCliErrorBody(err: unknown, io?: CliIo, lang: Lang = defaultLang): Promise<CliErrorBody> {
  const normalized = normalizeCliError(err)
  const message = await renderCliErrorMessage(normalized.code, normalized.messageParams, io, lang)
  return {
    ok: false,
    error: {
      code: normalized.code,
      message,
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
    },
  }
}

interface NormalizedCliError {
  code: CliErrorCode
  messageParams: MessageParams
  details?: unknown
}

function normalizeCliError(err: unknown): NormalizedCliError {
  if (isZodErrorLike(err)) {
    return {
      code: "ERR-CLI-SCHEMA",
      messageParams: {},
      details: err.issues,
    }
  }

  if (err instanceof Error) {
    const maybeCoded = err as Error & { code?: string; messageParams?: MessageParams; details?: unknown }
    if (maybeCoded.code !== undefined && isCliErrorCode(maybeCoded.code)) {
      return {
        code: maybeCoded.code,
        messageParams: maybeCoded.messageParams ?? { message: err.message },
        ...(maybeCoded.details === undefined ? {} : { details: maybeCoded.details }),
      }
    }

    return {
      code: "ERR-CLI-UNCAUGHT",
      messageParams: { message: err.message },
      ...(maybeCoded.details === undefined ? {} : { details: maybeCoded.details }),
    }
  }

  return {
    code: "ERR-CLI-UNCAUGHT",
    messageParams: { message: String(err) },
  }
}

async function renderCliErrorMessage(
  code: CliErrorCode,
  messageParams: MessageParams,
  io: CliIo | undefined,
  lang: Lang,
): Promise<string> {
  if (io !== undefined) {
    try {
      const messages = await io.loadMessages(lang)
      const template = messages[code]
      if (template !== undefined)
        return renderMessageTemplate(template, messageParams)
    }
    catch {
      // Fall through to stable English fallback when catalog loading fails.
    }
  }

  return renderMessageTemplate(cliErrorFallbackMessages[code], messageParams)
}

function describeUnknownError(err: unknown): { cause: string } {
  return {
    cause: err instanceof Error ? err.message : String(err),
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
    loadMessages: async lang => messageCatalogs[lang],
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code
  }).catch((err: unknown) => {
    toCliErrorBody(err).then((body) => {
      process.stderr.write(`${JSON.stringify(body)}\n`)
    }).catch((fallbackErr: unknown) => {
      process.stderr.write(`${JSON.stringify({
        ok: false,
        error: {
          code: "ERR-CLI-UNCAUGHT",
          message: String(fallbackErr),
        },
      })}\n`)
    })
    process.exitCode = 1
  })
}
