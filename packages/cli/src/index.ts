import type {
  BattleSnapshot,
  BucketContributor,
  BucketResult,
  CalcResult,
  Diagnostic,
  ModifierResult,
} from "@randomplay/core"
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
type ChangeStatus = "added" | "removed" | "changed" | "unchanged"
type LaneId = "nonCrit" | "crit" | "fixed"

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
      view: {
        type: "string",
        description: "Output brief delta or verbose inputs plus full CalcResults.",
        valueHint: "brief|verbose",
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

  const leftInput = parseBattleSnapshot(await readSnapshotInput(parsed, io, 0))
  const rightInput = parseBattleSnapshot(await readSnapshotInput(parsed, io, 1))
  const view = parseView(parsed.flags.get("view"))
  const resultMode = parseResultMode(parsed.flags.get("result-mode") ?? parsed.flags.get("resultMode"))
  const left = calculate(withResultMode(leftInput, resultMode), { calculationId: "left" })
  const right = calculate(withResultMode(rightInput, resultMode), { calculationId: "right" })
  await writeDiagnostics(io, left, lang)
  await writeDiagnostics(io, right, lang)
  const warnings = getCompareWarnings(leftInput, rightInput, left, right)
  if (warnings.length > 0)
    writeDiagnosticLines(io, warnings, await io.loadMessages(lang))

  const diff = buildCompareDiff(left, right, view === "verbose")
  const result = {
    schemaVersion: "fairy-cli-compare-v1",
    view,
    resultMode: resultMode ?? "expected",
    left: view === "verbose" ? left : toCompareSideSummary(left),
    right: view === "verbose" ? right : toCompareSideSummary(right),
    delta: diff.summary,
    diff,
    diagnostics: {
      left: {
        warnings: left.warnings.length,
        errors: left.errors.length,
      },
      right: {
        warnings: right.warnings.length,
        errors: right.errors.length,
      },
    },
    warnings,
    errors: [],
  }
  writeJson(io, result, parsed.flags.has("pretty"))
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

function toCompareSideSummary(result: CalcResult) {
  const summary = result.summary
  return {
    calculationId: result.calculationId,
    activeActorId: summary.activeActorId,
    ...(summary.enemyId === undefined ? {} : { enemyId: summary.enemyId }),
    damageType: summary.damageType,
    lanes: summary.lanes,
    ...(summary.daze === undefined ? {} : { daze: summary.daze }),
    rawTotalDamage: summary.rawTotalDamage,
    displayTotalDamage: summary.displayTotalDamage,
    expectedDamage: summary.expectedDamage ?? summary.rawTotalDamage,
    critDamage: summary.critDamage,
    nonCritDamage: summary.nonCritDamage,
    dazeValue: summary.dazeValue,
    anomalyBuildup: summary.anomalyBuildup,
    disorderDamage: summary.disorderDamage,
    trueDamage: summary.trueDamage,
    warnings: result.warnings.length,
    errors: result.errors.length,
  }
}

function buildCompareDiff(left: CalcResult, right: CalcResult, includeUnchanged: boolean) {
  return {
    summary: buildSummaryDelta(left, right),
    lanes: buildLaneDiffs(left, right, includeUnchanged),
    buckets: buildBucketDiffs(left, right, includeUnchanged),
    modifiers: buildModifierDiffs(left, right, includeUnchanged),
  }
}

function buildSummaryDelta(left: CalcResult, right: CalcResult) {
  return {
    rawTotalDamage: numericDelta(left.summary.rawTotalDamage, right.summary.rawTotalDamage),
    displayTotalDamage: numericDelta(left.summary.displayTotalDamage, right.summary.displayTotalDamage),
    expectedDamage: numericDelta(
      left.summary.expectedDamage ?? left.summary.rawTotalDamage,
      right.summary.expectedDamage ?? right.summary.rawTotalDamage,
    ),
    critDamage: numericDelta(left.summary.critDamage ?? left.summary.rawTotalDamage, right.summary.critDamage ?? right.summary.rawTotalDamage),
    nonCritDamage: numericDelta(left.summary.nonCritDamage ?? left.summary.rawTotalDamage, right.summary.nonCritDamage ?? right.summary.rawTotalDamage),
    dazeValue: numericDelta(left.summary.dazeValue ?? 0, right.summary.dazeValue ?? 0),
    anomalyBuildup: numericDelta(left.summary.anomalyBuildup ?? 0, right.summary.anomalyBuildup ?? 0),
    disorderDamage: numericDelta(left.summary.disorderDamage ?? 0, right.summary.disorderDamage ?? 0),
    trueDamage: numericDelta(left.summary.trueDamage ?? 0, right.summary.trueDamage ?? 0),
    activeActorChanged: left.summary.activeActorId !== right.summary.activeActorId,
    enemyChanged: (left.summary.enemyId ?? "") !== (right.summary.enemyId ?? ""),
    damageTypeChanged: left.summary.damageType !== right.summary.damageType,
  }
}

function buildLaneDiffs(left: CalcResult, right: CalcResult, includeUnchanged: boolean) {
  const laneIds: LaneId[] = ["nonCrit", "crit", "fixed"]
  return laneIds.flatMap((laneId) => {
    const leftLane = left.summary.lanes[laneId]
    const rightLane = right.summary.lanes[laneId]
    if (leftLane === undefined && rightLane === undefined)
      return []

    const status = getStatus(leftLane !== undefined, rightLane !== undefined, !sameJson(leftLane, rightLane))
    if (status === "unchanged" && !includeUnchanged)
      return []

    return [{
      laneId,
      status,
      rawDamage: numericDelta(leftLane?.rawDamage ?? 0, rightLane?.rawDamage ?? 0),
      displayDamage: numericDelta(leftLane?.displayDamage ?? 0, rightLane?.displayDamage ?? 0),
    }]
  })
}

function buildBucketDiffs(left: CalcResult, right: CalcResult, includeUnchanged: boolean) {
  const leftBuckets = indexBuckets(left.buckets)
  const rightBuckets = indexBuckets(right.buckets)
  const keys = sortedUnion(leftBuckets, rightBuckets)

  return keys.flatMap((key) => {
    const leftEntry = leftBuckets.get(key)
    const rightEntry = rightBuckets.get(key)
    const contributorDiffs = buildContributorDiffs(leftEntry?.contributors, rightEntry?.contributors, includeUnchanged)
    const bucketChanged = !sameBucket(leftEntry?.bucket, rightEntry?.bucket) || contributorDiffs.some(diff => diff.status !== "unchanged")
    const status = getStatus(leftEntry !== undefined, rightEntry !== undefined, bucketChanged)
    if (status === "unchanged" && !includeUnchanged)
      return []

    const bucket = rightEntry?.bucket ?? leftEntry?.bucket
    if (bucket === undefined)
      return []

    return [{
      key,
      bucketId: bucket.bucketId,
      status,
      before: numericDelta(leftEntry?.bucket.before ?? 0, rightEntry?.bucket.before ?? 0),
      after: numericDelta(leftEntry?.bucket.after ?? 0, rightEntry?.bucket.after ?? 0),
      effectiveMultiplier: numericDelta(leftEntry?.bucket.effectiveMultiplier ?? 0, rightEntry?.bucket.effectiveMultiplier ?? 0),
      contributors: contributorDiffs,
    }]
  })
}

function buildContributorDiffs(
  leftContributors: Map<string, BucketContributor> | undefined,
  rightContributors: Map<string, BucketContributor> | undefined,
  includeUnchanged: boolean,
) {
  const keys = sortedUnion(leftContributors ?? new Map(), rightContributors ?? new Map())
  return keys.flatMap((key) => {
    const left = leftContributors?.get(key)
    const right = rightContributors?.get(key)
    const changed = !sameContributor(left, right)
    const status = getStatus(left !== undefined, right !== undefined, changed)
    if (status === "unchanged" && !includeUnchanged)
      return []

    const contributor = right ?? left
    if (contributor === undefined)
      return []

    return [{
      key,
      id: contributor.id,
      status,
      value: numericDelta(left?.value ?? 0, right?.value ?? 0),
      active: {
        left: left?.active ?? false,
        right: right?.active ?? false,
      },
      operation: {
        left: left?.operation,
        right: right?.operation,
      },
      sourceChanged: !sameJson(left?.source, right?.source),
    }]
  })
}

function buildModifierDiffs(left: CalcResult, right: CalcResult, includeUnchanged: boolean) {
  const leftModifiers = indexModifiers(left.modifiers)
  const rightModifiers = indexModifiers(right.modifiers)
  const keys = sortedUnion(leftModifiers, rightModifiers)

  return keys.flatMap((key) => {
    const leftEntry = leftModifiers.get(key)
    const rightEntry = rightModifiers.get(key)
    const changed = !sameModifier(leftEntry?.modifier, rightEntry?.modifier)
    const status = getStatus(leftEntry !== undefined, rightEntry !== undefined, changed)
    if (status === "unchanged" && !includeUnchanged)
      return []

    const modifier = rightEntry?.modifier ?? leftEntry?.modifier
    if (modifier === undefined)
      return []

    return [{
      key,
      id: modifier.id,
      status,
      handlerId: {
        left: leftEntry?.modifier.handlerId,
        right: rightEntry?.modifier.handlerId,
      },
      active: {
        left: leftEntry?.modifier.active ?? false,
        right: rightEntry?.modifier.active ?? false,
      },
      bucket: {
        left: leftEntry?.modifier.bucket,
        right: rightEntry?.modifier.bucket,
      },
      sourceChanged: !sameJson(leftEntry?.modifier.source, rightEntry?.modifier.source),
      inactiveReason: {
        left: leftEntry?.modifier.inactiveReason,
        right: rightEntry?.modifier.inactiveReason,
      },
    }]
  })
}

function indexBuckets(buckets: BucketResult[]) {
  const seen = new Map<string, number>()
  const indexed = new Map<string, { bucket: BucketResult; contributors: Map<string, BucketContributor> }>()
  for (const bucket of buckets) {
    indexed.set(uniqueKey(bucket.bucketId, seen), {
      bucket,
      contributors: indexByUniqueKey(bucket.contributors, contributor => contributor.id),
    })
  }
  return indexed
}

function indexModifiers(modifiers: ModifierResult[]) {
  const seen = new Map<string, number>()
  const indexed = new Map<string, { modifier: ModifierResult }>()
  for (const modifier of modifiers)
    indexed.set(uniqueKey(modifier.id, seen), { modifier })
  return indexed
}

function indexByUniqueKey<T>(items: T[], getBaseKey: (item: T) => string): Map<string, T> {
  const seen = new Map<string, number>()
  const indexed = new Map<string, T>()
  for (const item of items)
    indexed.set(uniqueKey(getBaseKey(item), seen), item)
  return indexed
}

function uniqueKey(baseKey: string, seen: Map<string, number>): string {
  const count = seen.get(baseKey) ?? 0
  seen.set(baseKey, count + 1)
  return count === 0 ? baseKey : `${baseKey}#${count + 1}`
}

function sortedUnion<TLeft, TRight>(left: Map<string, TLeft>, right: Map<string, TRight>): string[] {
  return [...new Set([...left.keys(), ...right.keys()])].sort((a, b) => a.localeCompare(b))
}

function sameBucket(left: BucketResult | undefined, right: BucketResult | undefined): boolean {
  if (left === undefined || right === undefined)
    return left === right

  return left.bucketId === right.bucketId
    && left.before === right.before
    && left.after === right.after
    && left.effectiveMultiplier === right.effectiveMultiplier
}

function sameContributor(left: BucketContributor | undefined, right: BucketContributor | undefined): boolean {
  if (left === undefined || right === undefined)
    return left === right

  return left.id === right.id
    && left.value === right.value
    && left.operation === right.operation
    && left.active === right.active
    && sameJson(left.source, right.source)
}

function sameModifier(left: ModifierResult | undefined, right: ModifierResult | undefined): boolean {
  if (left === undefined || right === undefined)
    return left === right

  return left.id === right.id
    && left.handlerId === right.handlerId
    && left.active === right.active
    && left.bucket === right.bucket
    && left.inactiveReason === right.inactiveReason
    && sameJson(left.appliesTo, right.appliesTo)
    && sameJson(left.source, right.source)
}

function getStatus(leftExists: boolean, rightExists: boolean, changed: boolean): ChangeStatus {
  if (!leftExists && rightExists)
    return "added"
  if (leftExists && !rightExists)
    return "removed"
  return changed ? "changed" : "unchanged"
}

function numericDelta(left: number, right: number) {
  const delta = normalizeNumber(right - left)
  const ratio = left === 0 ? undefined : normalizeNumber(delta / Math.abs(left))
  return {
    left: normalizeNumber(left),
    right: normalizeNumber(right),
    delta,
    ...(ratio === undefined ? {} : { deltaRatio: ratio }),
  }
}

function normalizeNumber(value: number): number {
  return Number(value.toFixed(12))
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function getCompareWarnings(
  leftSnapshot: BattleSnapshot,
  rightSnapshot: BattleSnapshot,
  left: CalcResult,
  right: CalcResult,
): Diagnostic[] {
  const warnings: Diagnostic[] = []
  pushCompareWarning(warnings, "activeActor", leftSnapshot.activeActor.agentId, rightSnapshot.activeActor.agentId, "activeActor.agentId")
  pushCompareWarning(warnings, "enemy", getEnemyIdentity(leftSnapshot), getEnemyIdentity(rightSnapshot), "enemy")
  pushCompareWarning(warnings, "damageType", left.summary.damageType, right.summary.damageType, "summary.damageType")

  const leftActor = getActiveActorSnapshot(leftSnapshot)
  const rightActor = getActiveActorSnapshot(rightSnapshot)
  pushCompareWarning(warnings, "wEngine", leftActor?.wEngine?.id ?? "none", rightActor?.wEngine?.id ?? "none", "team[active].wEngine.id")
  pushCompareWarning(warnings, "driveDiscs", getDriveDiscSignature(leftActor), getDriveDiscSignature(rightActor), "team[active].driveDiscs")
  return warnings
}

function pushCompareWarning(
  warnings: Diagnostic[],
  field: string,
  left: string,
  right: string,
  path: string,
): void {
  if (left === right)
    return

  warnings.push({
    key: "ERR-CMP-001",
    severity: "warning",
    path,
    messageParams: { field, left, right },
  })
}

function getActiveActorSnapshot(snapshot: BattleSnapshot): BattleSnapshot["team"][number] | undefined {
  return snapshot.team.find(actor => actor.agentId === snapshot.activeActor.agentId)
}

function getEnemyIdentity(snapshot: BattleSnapshot): string {
  return snapshot.enemy.enemyId ?? `${snapshot.enemy.rank}@${snapshot.enemy.level}`
}

function getDriveDiscSignature(actor: BattleSnapshot["team"][number] | undefined): string {
  return (actor?.driveDiscs ?? [])
    .map(disc => `${disc.slot ?? "?"}:${disc.id}:${disc.setId ?? ""}`)
    .sort((a, b) => a.localeCompare(b))
    .join("|") || "none"
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
