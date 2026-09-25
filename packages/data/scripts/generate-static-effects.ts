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
import evidence from "./static-effects/rank-evidence.json" with { type: "json" }

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
    for (const entry of Object.values(evidence))
      for (const ref of entry.evidence) {
        const bytes = await readFile(
          join(publication, "verified", "integrated", ref.path),
        )
        if (createHash("sha256").update(bytes).digest("hex") !== ref.sha256)
          throw new Error(`Rank evidence changed: ${ref.path}`)
      }
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
