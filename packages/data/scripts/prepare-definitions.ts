import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"
import { directoryRoot, readBytes } from "./nanoka-integration/files.ts"
import {
  maximumAttributeBytes,
  regularFiles,
  verifyPanelAttributes,
} from "./panel-attributes/manifest.ts"
import { verifyAgentActions } from "./skills/manifest.ts"

/** 冻结全部 definitions，再核对其中属性制品与同次 integrated；后续构建只用此副本。 */
export async function prepareDefinitions(
  sourceDirectory: string,
  outputDirectory: string,
  index: IntegratedSnapshotIndex,
): Promise<void> {
  const source = await directoryRoot(sourceDirectory)
  await mkdir(outputDirectory)
  for (const path of await regularFiles(source)) {
    const bytes = await readBytes(source, path, maximumAttributeBytes)
    await mkdir(dirname(join(outputDirectory, path)), { recursive: true })
    await writeFile(join(outputDirectory, path), bytes, { flag: "wx" })
  }
  // 包含 effects 等非属性制品，拒绝捕获期间来源更替形成的跨版本副本。
  await verifyDefinitionsCopy(source, outputDirectory)
  await verifyPanelAttributes(join(outputDirectory, "attributes"), index)
  await verifyAgentActions(
    join(outputDirectory, "skills"),
    index,
    join(outputDirectory, "effects/static-catalog.json"),
  )
}

export async function verifyDefinitionsCopy(
  sourceDirectory: string,
  outputDirectory: string,
): Promise<void> {
  const source = await directoryRoot(sourceDirectory)
  const output = await directoryRoot(outputDirectory)
  const paths = await regularFiles(source)
  if (JSON.stringify(paths) !== JSON.stringify(await regularFiles(output)))
    throw new Error("definitions artifact membership mismatch")
  for (const path of paths) {
    const [expected, actual] = await Promise.all([
      readBytes(source, path, maximumAttributeBytes),
      readBytes(output, path, maximumAttributeBytes),
    ])
    if (!Buffer.from(expected).equals(actual))
      throw new Error(`definitions artifact mismatch: ${path}`)
  }
}
