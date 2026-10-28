import { LUCY_GUARD_BOAR_FACTION } from "./static-effects/lucy-guard-boar.ts"
import {
  PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE,
  verifyPheonyAdditionalAbilitySameFactionIndex,
} from "./static-effects/pheony-additional.ts"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseEffectRuleSet } from "../../core/src/effects/parse-effect-rule-set.ts"
import { formatGeneratedJson } from "./nanoka-integration/format.ts"
import { preparePublication } from "./prepare-publication.ts"
import {
  installCandidateOutputDirectory,
  resolveCandidateOutputDirectory,
} from "./candidate-output.ts"
import { convertSource } from "./static-effects/convert.ts"
import { loadSource } from "./static-effects/source.ts"
import {
  compareStaticArtifacts,
  formatDifference,
} from "./static-effects/authoring/canonical.ts"
import {
  compileAuthoringRecords,
  type StaticArtifacts,
} from "./static-effects/authoring/compile.ts"
import { MIGRATED_AUTHORING_RECORDS } from "./static-effects/authoring/records.ts"
import type { EffectAuthoringRecord } from "./static-effects/authoring/types.ts"
import {
  COMPLETE_STATE_OPTIONS,
  SOURCE_SEMANTICS,
  type CompleteStateOptionRegistration,
} from "./static-effects/semantics.ts"
import { SUPPLEMENTS, type Supplement } from "./static-effects/supplements.ts"
import evidence from "./static-effects/rank-evidence.json" with { type: "json" }

/** RFC 6901 Pointer 存在性检查；不要求目标为真值。 */
export function jsonPointerExists(document: unknown, pointer: string): boolean {
  if (pointer === "") return true
  let current: unknown = document
  for (const raw of pointer.split("/").slice(1)) {
    const token = raw.replaceAll("~1", "/").replaceAll("~0", "~")
    if (Array.isArray(current)) {
      const index = Number(token)
      if (!Number.isInteger(index) || index < 0 || index >= current.length)
        return false
      current = current[index]!
      continue
    }
    if (current !== null && typeof current === "object") {
      const record = current as Record<string, unknown>
      if (!Object.hasOwn(record, token)) return false
      current = record[token]
      continue
    }
    return false
  }
  return true
}

interface EvidenceReference {
  readonly rank?: number
  readonly source?: "integrated" | "data-package"
  readonly path: string
  readonly pointer: string
  readonly sha256: string
}

/**
 * 逐条验证证据：文件摘要、Pointer 存在，被动形证据还须与 data.json 的
 * 明确 level 元数据一致（不能只验证整份文件存在）。
 * talent 形证据（如希希芙 1 影继承核心语义）没有等级节点，仅核对 Pointer。
 */
async function verifyEvidenceReferences(
  publication: string,
  label: string,
  references: readonly EvidenceReference[],
  requirePassiveRanks = false,
  dataPackageRoot = fileURLToPath(new URL("..", import.meta.url)),
): Promise<void> {
  for (const ref of references) {
    // D4 的 3.2.5 补充来源层使用已提交的冻结夹具；其余证据仍属于
    // integrated 发布副本。两条路径都按整文件摘要与 Pointer 核对。
    const root =
      ref.source === "data-package"
        ? dataPackageRoot
        : join(publication, "verified", "integrated")
    const bytes = await readFile(join(root, ref.path))
    if (createHash("sha256").update(bytes).digest("hex") !== ref.sha256)
      throw new Error(`Evidence file changed: ${label} ${ref.path}`)
    const document = JSON.parse(bytes.toString("utf8"))
    if (!jsonPointerExists(document, ref.pointer))
      throw new Error(`Evidence pointer missing: ${label} ${ref.pointer}`)
    const passive = /^\/passive\/level\/(\d+)(?:\/|$)/.exec(ref.pointer)
    if (
      requirePassiveRanks &&
      ref.rank !== undefined &&
      (!passive || !Number.isInteger(ref.rank) || ref.rank < 1 || ref.rank > 7)
    )
      throw new Error(`Invalid passive rank evidence: ${label} ${ref.pointer}`)
    if (!passive || ref.rank === undefined) continue
    const dataPath = ref.path.replace(/details\.[a-z]+\.json$/, "data.json")
    if (dataPath === ref.path)
      throw new Error(
        `Evidence path is not a details file: ${label} ${ref.path}`,
      )
    const data = JSON.parse(
      await readFile(
        join(publication, "verified", "integrated", dataPath),
        "utf8",
      ),
    )
    const level = (
      data as {
        passive?: { level?: Record<string, { level?: number }> }
      }
    )?.passive?.level?.[passive[1]!]?.level
    if (level !== ref.rank)
      throw new Error(
        `Evidence rank metadata mismatch for ${label}: ${ref.pointer} is level ${String(level)}, expected ${String(ref.rank)}`,
      )
  }
}

/**
 * 完整状态选项登记的证据逐条核对；生成路径与测试使用同一入口，标识到
 * optionId。默认核对生产登记；测试传入变更后的登记副本以核对拒绝行为。
 */
export async function verifyCompleteStateOptionEvidence(
  publication: string,
  registrations: readonly CompleteStateOptionRegistration[] = COMPLETE_STATE_OPTIONS,
): Promise<readonly string[]> {
  const verified: string[] = []
  for (const registration of registrations) {
    const label = `complete-state-option:${registration.optionId}`
    await verifyEvidenceReferences(publication, label, registration.evidence)
    verified.push(label)
  }
  return verified
}

export async function verifySupplementEvidence(
  publication: string,
  supplements: readonly Supplement[] = SUPPLEMENTS,
): Promise<readonly string[]> {
  const verified: string[] = []
  for (const supplement of supplements) {
    const label = `supplement:${supplement.supplementId}`
    await verifyEvidenceReferences(publication, label, supplement.evidence)
    verified.push(label)
  }
  return verified
}

/**
 * 生成路径的来源证据验证：rank-evidence、来源语义与完整状态选项登记、
 * 补充来源。返回实际验证的登记标识，测试据此核对登记确实被消费。
 */
export async function verifyStaticEffectsEvidence(
  publication: string,
): Promise<readonly string[]> {
  const verified: string[] = []
  const factionBytes = await readFile(
    join(publication, "verified", "integrated", LUCY_GUARD_BOAR_FACTION.path),
  )
  if (
    createHash("sha256").update(factionBytes).digest("hex") !==
    LUCY_GUARD_BOAR_FACTION.sha256
  )
    throw new Error("Lucy faction evidence belongs to a different Nanoka index")
  const members = (
    JSON.parse(factionBytes.toString("utf8")) as {
      entities: {
        agents: { members: Record<string, { sourceRecord: { camp: number } }> }
      }
    }
  ).entities.agents.members
  const factionMembers = Object.entries(members)
    .filter(([, member]) => member.sourceRecord.camp === 4)
    .map(([id]) => id)
    .toSorted()
  if (
    JSON.stringify(factionMembers) !==
    JSON.stringify(LUCY_GUARD_BOAR_FACTION.agentEntityIds)
  )
    throw new Error("Lucy same-faction agent membership changed")
  for (const pointer of LUCY_GUARD_BOAR_FACTION.pointers)
    if (!jsonPointerExists(JSON.parse(factionBytes.toString("utf8")), pointer))
      throw new Error(`Lucy faction evidence pointer missing: ${pointer}`)
  verified.push("mechanism:lucy-guard-boar:faction")
  if (
    PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE.path !==
      LUCY_GUARD_BOAR_FACTION.path ||
    PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE.sha256 !==
      LUCY_GUARD_BOAR_FACTION.sha256
  )
    throw new Error(
      "Pheony additional ability faction evidence must reference the same verified Nanoka index",
    )
  verifyPheonyAdditionalAbilitySameFactionIndex(
    JSON.parse(factionBytes.toString("utf8")),
  )
  verified.push("applicability:pheony-additional-ability:same-faction")
  for (const [key, entry] of Object.entries(evidence)) {
    await verifyEvidenceReferences(
      publication,
      `rank-evidence:${key}`,
      entry.evidence,
      "parameters" in entry,
    )
    verified.push(`rank-evidence:${key}`)
  }
  for (const [key, semantics] of Object.entries(SOURCE_SEMANTICS)) {
    if (semantics.evidence === undefined) continue
    await verifyEvidenceReferences(
      publication,
      `semantics:${key}`,
      semantics.evidence,
    )
    verified.push(`semantics:${key}`)
  }
  verified.push(...(await verifyCompleteStateOptionEvidence(publication)))
  verified.push(...(await verifySupplementEvidence(publication)))
  return verified
}

export type StaticEffectsAuthoringMode = "authoring" | "converter-fallback"

export interface StaticEffectsGenerationOptions {
  /**
   * 默认使用正式 authoring 记录；`converter-fallback` 只用于显式回滚，
   * authoring 编译或等价校验失败时不会自动退回该模式。
   */
  readonly authoring?: StaticEffectsAuthoringMode
  /** 测试注入点；生产调用省略并使用正式迁移记录。 */
  readonly authoringRecords?: readonly EffectAuthoringRecord[]
}

export function applyStaticEffectsAuthoring(
  converterArtifacts: StaticArtifacts,
  options: StaticEffectsGenerationOptions = {},
): StaticArtifacts {
  const authoringMode = options.authoring ?? "authoring"
  if (authoringMode !== "authoring" && authoringMode !== "converter-fallback")
    throw new Error(`Unknown authoring mode: ${String(authoringMode)}`)
  if (authoringMode === "converter-fallback") return converterArtifacts
  const compilation = compileAuthoringRecords(
    options.authoringRecords ?? MIGRATED_AUTHORING_RECORDS,
    converterArtifacts,
  )
  const comparison = compareStaticArtifacts(
    converterArtifacts,
    compilation.artifacts,
  )
  if (!comparison.equivalent)
    throw new Error(
      `Authoring artifacts are not semantically equivalent to the converter baseline:\n${comparison.differences
        .map(formatDifference)
        .join("\n")}`,
    )
  return compilation.artifacts
}

export async function generateStaticEffects(
  sourceRoot: string,
  outputDirectory: string,
  integratedDirectory = fileURLToPath(
    new URL("../integrated", import.meta.url),
  ),
  options: StaticEffectsGenerationOptions = {},
): Promise<ReturnType<typeof convertSource>["coverage"]["summary"]> {
  const output = await resolveCandidateOutputDirectory(
    outputDirectory,
    integratedDirectory,
  )
  const source = await loadSource(resolve(sourceRoot))
  await mkdir(dirname(output), { recursive: true })
  const publication = await mkdtemp(
    join(dirname(output), ".fairy-static-source-"),
  )
  let candidate: string | undefined
  try {
    await preparePublication(integratedDirectory, join(publication, "verified"))
    const index = await readFile(
      join(publication, "verified", "integrated", "index.json"),
    )
    if (
      createHash("sha256").update(index).digest("hex") !==
      "d68ad1d80b203b9633f2cd6d176e4051c15c52f2ea3c0d71a2d2310c8b1a1b6d"
    )
      throw new Error(
        "The identity/rank evidence belongs to a different Nanoka snapshot",
      )
    // 来源证据（rank-evidence、来源语义与完整状态选项登记、补充来源）由同一
    // 入口逐条验证，标识可用于定位具体登记。
    await verifyStaticEffectsEvidence(publication)
    const result = convertSource(source.data, source.functions, source.files)
    for (const entity of result.catalog.entities)
      if (entity.identity) {
        const category =
          entity.identity.kind === "agent"
            ? "agents"
            : entity.identity.kind === "w-engine"
              ? "w-engines"
              : "drive-discs"
        const data = JSON.parse(
          await readFile(
            join(
              publication,
              "verified",
              "integrated",
              category,
              entity.identity.entityId,
              "data.json",
            ),
            "utf8",
          ),
        )
        if (String(data.id) !== entity.identity.entityId)
          throw new Error(
            `Identity target is invalid: ${entity.catalogEntityId}`,
          )
      }
    if (
      result.coverage.summary.rawEffects !== 1375 ||
      result.coverage.summary.entities !== 196 ||
      result.coverage.summary.packs !== 1118
    )
      throw new Error(
        `Fixed-source coverage denominator changed: ${result.coverage.summary.entities}/${result.coverage.summary.packs}/${result.coverage.summary.rawEffects}`,
      )
    const converterArtifacts: StaticArtifacts = {
      definitions: result.definitions,
      catalog: result.catalog,
      coverage: result.coverage,
    }
    const artifacts = applyStaticEffectsAuthoring(converterArtifacts, options)
    const parsed = parseEffectRuleSet(artifacts.definitions)
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
    // 完整生成命令预先构建 core；仅导入转换工具或拒绝坏输入时不加载计算运行时。
    const { validateStaticCatalog } =
      await import("../../core/src/effects/internal/static-catalog.ts")
    const catalog = validateStaticCatalog(artifacts.catalog, parsed.value)
    if (!catalog.ok) throw new Error(JSON.stringify(catalog.issues))
    candidate = await mkdtemp(join(dirname(output), ".fairy-static-candidate-"))
    const artifactsByFile = {
      "static.json": artifacts.definitions,
      "static-catalog.json": artifacts.catalog,
      "static-coverage.json": artifacts.coverage,
    }
    for (const [file, value] of Object.entries(artifactsByFile))
      await writeFile(
        join(candidate, file),
        `${JSON.stringify(value, null, 2)}\n`,
      )
    await formatGeneratedJson(candidate, Object.keys(artifactsByFile))
    await installCandidateOutputDirectory(candidate, output)
    return result.coverage.summary
  } finally {
    await rm(publication, { recursive: true, force: true })
    if (candidate) await rm(candidate, { recursive: true, force: true })
  }
}
export function resolveAuthoringMode(
  value: string | undefined,
): StaticEffectsAuthoringMode {
  if (value === undefined || value === "authoring") return "authoring"
  if (value === "converter-fallback") return "converter-fallback"
  throw new Error(
    `Unknown authoring mode "${value}"; expected "authoring" or "converter-fallback"`,
  )
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const positional: string[] = []
  let fallback = false
  for (const argument of process.argv.slice(2)) {
    if (argument === "--fallback-converter") fallback = true
    else if (argument.startsWith("-"))
      throw new Error(`Unknown option: ${argument}`)
    else positional.push(argument)
  }
  const [source, output] = positional
  if (!source || !output || positional.length !== 2)
    throw new Error(
      "Usage: generate:static-effects [--fallback-converter] <sourceRoot> <newOutputDirectory>",
    )
  const authoring = fallback
    ? "converter-fallback"
    : resolveAuthoringMode(process.env.FAIRY_STATIC_EFFECTS_AUTHORING)
  if (authoring === "converter-fallback")
    console.warn(
      "Static effects authoring is disabled: using the converter-only fallback.",
    )
  console.log(
    JSON.stringify(
      await generateStaticEffects(source, output, undefined, { authoring }),
    ),
  )
}
