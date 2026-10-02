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
import { SOURCE_SEMANTICS } from "./static-effects/semantics.ts"
import { SUPPLEMENTS } from "./static-effects/supplements.ts"
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
): Promise<void> {
  for (const ref of references) {
    const bytes = await readFile(
      join(publication, "verified", "integrated", ref.path),
    )
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

export async function generateStaticEffects(
  sourceRoot: string,
  outputDirectory: string,
  integratedDirectory = fileURLToPath(
    new URL("../integrated", import.meta.url),
  ),
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
      "6593c21a7b689d00ac39e39da0506852f3ccca1ddd4b232d2e5f686f71d35aea"
    )
      throw new Error(
        "The identity/rank evidence belongs to a different Nanoka snapshot",
      )
    for (const [key, entry] of Object.entries(evidence))
      await verifyEvidenceReferences(
        publication,
        `rank-evidence:${key}`,
        entry.evidence,
        "parameters" in entry,
      )
    for (const [key, semantics] of Object.entries(SOURCE_SEMANTICS))
      await verifyEvidenceReferences(
        publication,
        `semantics:${key}`,
        semantics.evidence,
      )
    for (const supplement of SUPPLEMENTS)
      await verifyEvidenceReferences(
        publication,
        `supplement:${supplement.supplementId}`,
        supplement.evidence,
      )
    const result = convertSource(source.data, source.functions, source.files)
    for (const entity of result.catalog.entities) {
      if (!entity.supplementProvenance) continue
      for (const resource of entity.supplementProvenance.resources) {
        const bytes = await readFile(
          join(publication, "verified", "integrated", resource.path),
        )
        if (
          createHash("sha256").update(bytes).digest("hex") !== resource.sha256
        )
          throw new Error(
            `Supplement provenance changed: ${entity.catalogEntityId} ${resource.path}`,
          )
      }
    }
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
      result.coverage.summary.rawEffects !== 1290 ||
      result.coverage.summary.entities !== 187 ||
      result.coverage.summary.packs !== 1061
    )
      throw new Error("Fixed-source coverage denominator changed")
    const parsed = parseEffectRuleSet(result.definitions)
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
    // 完整生成命令预先构建 core；仅导入转换工具或拒绝坏输入时不加载计算运行时。
    const { validateStaticCatalog } =
      await import("../../core/src/effects/internal/static-catalog.ts")
    const catalog = validateStaticCatalog(result.catalog, parsed.value)
    if (!catalog.ok) throw new Error(JSON.stringify(catalog.issues))
    candidate = await mkdtemp(join(dirname(output), ".fairy-static-candidate-"))
    const artifacts = {
      "static.json": result.definitions,
      "static-catalog.json": result.catalog,
      "static-coverage.json": result.coverage,
    }
    for (const [file, value] of Object.entries(artifacts))
      await writeFile(
        join(candidate, file),
        `${JSON.stringify(value, null, 2)}\n`,
      )
    await formatGeneratedJson(candidate, Object.keys(artifacts))
    await installCandidateOutputDirectory(candidate, output)
    return result.coverage.summary
  } finally {
    await rm(publication, { recursive: true, force: true })
    if (candidate) await rm(candidate, { recursive: true, force: true })
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [, , source, output] = process.argv
  if (!source || !output)
    throw new Error(
      "Usage: generate:static-effects <sourceRoot> <newOutputDirectory>",
    )
  console.log(JSON.stringify(await generateStaticEffects(source, output)))
}
