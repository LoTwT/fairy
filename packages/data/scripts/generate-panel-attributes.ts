import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentData } from "../src/integration/agent-types.ts"
import type {
  WEngineData,
  WEngineDetails,
} from "../src/integration/w-engine-types.ts"
import type { PanelAttributeManifest } from "../src/attributes/types.ts"
import { directoryRoot, readBytes, sha256 } from "./nanoka-integration/files.ts"
import { formatGeneratedJson } from "./nanoka-integration/format.ts"
import { preparePublication } from "./prepare-publication.ts"
import {
  installCandidateOutputDirectory,
  resolveCandidateOutputDirectory,
} from "./candidate-output.ts"
import {
  convertAgentAttributes,
  convertWEngineAttributes,
} from "./panel-attributes/convert.ts"
import { sDriveDiscMaxLevelAffixes } from "./panel-attributes/drive-discs.ts"
import {
  attributeArtifactPaths,
  attributeSourceContract,
  discrepancies,
  limitations,
  maximumAttributeBytes,
  rulesVersion,
  verifyPanelAttributes,
} from "./panel-attributes/manifest.ts"
import evidence from "./panel-attributes/evidence.json" with { type: "json" }

/** 只生成到不存在的目录；失败清理临时目录，永不自动替换正式 definitions。 */
export async function generatePanelAttributes(
  sourceRoot: string,
  outputDirectory: string,
  integratedDirectory = fileURLToPath(
    new URL("../integrated", import.meta.url),
  ),
): Promise<{ agents: number; wEngines: number }> {
  const output = await resolveCandidateOutputDirectory(
    outputDirectory,
    integratedDirectory,
  )
  const source = await directoryRoot(sourceRoot)
  for (const reference of evidence.resources.filter(
    (ref) => !ref.resource.startsWith("https://"),
  )) {
    if (
      sha256(
        await readBytes(source, reference.resource, maximumAttributeBytes),
      ) !== reference.sha256
    )
      throw new Error(
        `Source checksum mismatch: ${reference.resource}; expected ${evidence.zzzHpCommit}`,
      )
  }
  await mkdir(dirname(output), { recursive: true })
  const temporary = await directoryRoot(
    await mkdtemp(join(dirname(output), ".fairy-attributes-")),
  )
  try {
    const index = await preparePublication(
      integratedDirectory,
      join(temporary, "source"),
    )
    const snapshot = await directoryRoot(join(temporary, "source/integrated"))
    const candidate = join(temporary, "candidate")
    await mkdir(candidate)
    const readJson = async (path: string) =>
      JSON.parse(
        Buffer.from(
          await readBytes(snapshot, path, maximumAttributeBytes),
        ).toString("utf8"),
      )
    const write = async (path: string, value: unknown) => {
      await mkdir(dirname(join(candidate, path)), { recursive: true })
      await writeFile(
        join(candidate, path),
        `${JSON.stringify(value, null, 2)}\n`,
        { flag: "wx" },
      )
    }
    for (const id of index.entities.agents.memberIds)
      await write(
        `agents/${id}.json`,
        convertAgentAttributes(
          (await readJson(
            index.entities.agents.members[id].files.data.path,
          )) as AgentData,
        ),
      )
    for (const id of index.entities["w-engines"].memberIds) {
      const member = index.entities["w-engines"].members[id]
      await write(
        `w-engines/${id}.json`,
        convertWEngineAttributes(
          (await readJson(member.files.data.path)) as WEngineData,
          (await readJson(member.files.details.zh.path)) as WEngineDetails,
        ),
      )
    }
    await write("drive-disc-affixes.json", sDriveDiscMaxLevelAffixes())
    const paths = attributeArtifactPaths(index)
    await formatGeneratedJson(candidate, paths)
    const artifacts: Record<string, string> = {}
    for (const path of paths)
      artifacts[path] = sha256(
        await readBytes(candidate, path, maximumAttributeBytes),
      )
    const manifest: PanelAttributeManifest = {
      schemaVersion: 1,
      rulesVersion,
      ...attributeSourceContract(index),
      artifacts,
      evidence,
      limitations,
      discrepancies,
    }
    await write("manifest.json", manifest)
    await formatGeneratedJson(candidate, ["manifest.json"])
    await verifyPanelAttributes(candidate, index)
    await installCandidateOutputDirectory(candidate, output)
    return {
      agents: manifest.members.agents.length,
      wEngines: manifest.members.wEngines.length,
    }
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
      "Usage: generate:panel-attributes <pinnedSourceRoot> <newOutputDirectory>",
    )
  console.log(JSON.stringify(await generatePanelAttributes(source, output)))
}
