import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentDetails } from "../src/integration/agent-types.ts"
import type { AgentActionManifest, AgentActions } from "../src/skills/types.ts"
import { directoryRoot, readBytes, sha256 } from "./nanoka-integration/files.ts"
import { formatGeneratedJson } from "./nanoka-integration/format.ts"
import {
  installCandidateOutputDirectory,
  resolveCandidateOutputDirectory,
} from "./candidate-output.ts"
import { maximumAttributeBytes } from "./panel-attributes/manifest.ts"
import { preparePublication } from "./prepare-publication.ts"
import { convertAgentActions } from "./skills/convert.ts"
import {
  actionCoverage,
  actionRegistryDigest,
  actionSourceContract,
  limitations,
  rulesVersion,
  verifyAgentActions,
} from "./skills/manifest.ts"
import type { ActionRegistryEntry } from "./skills/registry.ts"
import evidence from "./skills/evidence.json" with { type: "json" }
import registryData from "./skills/registry.json" with { type: "json" }

const registry = registryData as readonly ActionRegistryEntry[]
interface ReferenceSkill {
  id: string
  element: string
  baseMult: number
  skillTypes: string[]
}
const sourceElements: Readonly<Record<string, string>> = {
  物理: "physical",
  火: "fire",
  冰: "ice",
  电: "electric",
  以太: "ether",
  风: "wind",
  烈霜: "frost",
  玄墨: "auric-ink",
  流明: "lumiflux",
}
const sourceSkillCategories: Readonly<Record<string, string>> = {
  "basic": "basic",
  "dash": "dash",
  "dodge-counter": "dodgeCounter",
  "special": "specialBasic",
  "enhanced-special": "specialEnhanced",
  "chain": "chain",
  "ultimate": "ultimate",
  "quick-assist": "assist",
  "assist-follow-up": "assist",
}

/** 只写新的候选目录；输入与现有正式制品的维护、安装分别进行。 */
export async function generateAgentActions(
  sourceRoot: string,
  outputDirectory: string,
  integratedDirectory = fileURLToPath(
    new URL("../integrated", import.meta.url),
  ),
): Promise<AgentActionManifest["coverage"]> {
  const output = await resolveCandidateOutputDirectory(
    outputDirectory,
    integratedDirectory,
  )
  const source = await directoryRoot(sourceRoot)
  let sourceSkills: ReferenceSkill[] = []
  for (const reference of evidence.resources) {
    const bytes = await readBytes(
      source,
      reference.resource,
      maximumAttributeBytes,
    )
    if (sha256(bytes) !== reference.sha256)
      throw new Error(
        `Source checksum mismatch: ${reference.resource}; expected ${evidence.zzzHpCommit}`,
      )
    if (reference.resource.endsWith("zzz-hp-calculator-buffs.json"))
      sourceSkills = JSON.parse(Buffer.from(bytes).toString("utf8")).skills
  }
  const staticCatalogFile = fileURLToPath(
    new URL("../definitions/effects/static-catalog.json", import.meta.url),
  )
  const staticBytes = await readFile(staticCatalogFile)
  const staticCatalog = JSON.parse(staticBytes.toString("utf8")) as {
    skillTargets: { targetId: string; agentEntityId: string | null }[]
  }
  for (const entry of registry) {
    if (
      entry.upstreamSkillId &&
      !sourceSkills.some((skill) => skill.id === entry.upstreamSkillId)
    )
      throw new Error(
        `Missing pinned reference skill: ${entry.upstreamSkillId}`,
      )
    for (const id of entry.skillTargetIds) {
      const target = staticCatalog.skillTargets.find(
        (value) => value.targetId === id,
      )
      if (
        !target ||
        (target.agentEntityId !== null &&
          target.agentEntityId !== entry.entityId)
      )
        throw new Error(`Invalid static skill target: ${entry.actionId}/${id}`)
    }
  }
  await mkdir(dirname(output), { recursive: true })
  const temporary = await directoryRoot(
    await mkdtemp(join(dirname(output), ".fairy-actions-")),
  )
  try {
    const index = await preparePublication(
      integratedDirectory,
      join(temporary, "source"),
    )
    const snapshot = await directoryRoot(join(temporary, "source/integrated"))
    const sourceContract = actionSourceContract(index)
    if (
      JSON.stringify([...new Set(registry.map((entry) => entry.entityId))]) !==
      JSON.stringify(sourceContract.members)
    )
      throw new Error("Action registry membership changed")
    const candidate = join(temporary, "candidate")
    await mkdir(candidate)
    const write = async (path: string, value: unknown) => {
      await mkdir(dirname(join(candidate, path)), { recursive: true })
      await writeFile(
        join(candidate, path),
        `${JSON.stringify(value, null, 2)}\n`,
        { flag: "wx" },
      )
    }
    const agents: AgentActions[] = []
    for (const id of sourceContract.members) {
      const details = JSON.parse(
        Buffer.from(
          await readBytes(
            snapshot,
            `agents/${id}/details.zh.json`,
            maximumAttributeBytes,
          ),
        ).toString("utf8"),
      ) as AgentDetails
      const agent = convertAgentActions(id, details, registry)
      agents.push(agent)
      await write(`agents/${id}.json`, agent)
    }
    const paths = sourceContract.members.map((id) => `agents/${id}.json`)
    await formatGeneratedJson(candidate, paths)
    const artifacts: Record<string, string> = {}
    for (const path of paths)
      artifacts[path] = sha256(
        await readBytes(candidate, path, maximumAttributeBytes),
      )
    const discrepancies: AgentActionManifest["discrepancies"][number][] = []
    for (const action of agents.flatMap((agent) => agent.actions)) {
      const reference = sourceSkills.find(
        (skill) => skill.id === action.upstreamSkillId,
      )
      if (!reference) continue
      if (action.calculation.kind === "damage") {
        const category = sourceSkillCategories[action.skillCategory!]
        if (category && !reference.skillTypes.includes(category))
          discrepancies.push({
            actionId: action.actionId,
            field: "skillCategory",
            upstream: reference.skillTypes.join(","),
            adopted: action.skillCategory!,
            reason:
              "按具名招式的来源说明确认伤害分类；和弦追加震音明确视为强化特殊技，不沿用上游普通特殊技分类。",
          })
        const element = action.calculation.segments[0]!.element
        if (sourceElements[reference.element] !== element)
          discrepancies.push({
            actionId: action.actionId,
            field: "element",
            upstream: reference.element,
            adopted: element,
            reason:
              "按具名招式的 Nanoka 说明核对；不把角色属性自动赋给所有招式，并保留特殊属性身份。",
          })
      }
      if (action.damageCoefficient) {
        const multiplier =
          action.damageCoefficient.base + 11 * action.damageCoefficient.growth
        if (Math.abs(multiplier - reference.baseMult / 100) > 1e-6)
          discrepancies.push({
            actionId: action.actionId,
            field: "level12DamageMultiplier",
            upstream: String(reference.baseMult / 100),
            adopted: String(multiplier),
            reason:
              "保留本来源行的完整表达式；上游导入只提取首个参数，且没有保留全部分摊、求和与重复项。",
          })
      }
    }
    const manifest: AgentActionManifest = {
      schemaVersion: 1,
      rulesVersion,
      ...sourceContract,
      artifacts,
      evidence,
      registrySha256: await actionRegistryDigest(),
      staticCatalogSha256: sha256(staticBytes),
      coverage: actionCoverage(agents),
      limitations,
      discrepancies,
    }
    await write("manifest.json", manifest)
    await formatGeneratedJson(candidate, ["manifest.json"])
    await verifyAgentActions(candidate, index, staticCatalogFile)
    await installCandidateOutputDirectory(candidate, output)
    return manifest.coverage
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [, , source, output] = process.argv
  if (!source || !output)
    throw new Error(
      "Usage: generate:agent-actions <pinnedSourceRoot> <newOutputDirectory>",
    )
  console.log(JSON.stringify(await generateAgentActions(source, output)))
}
