import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { buildNanokaAgents } from "../../scripts/nanoka-integration/build.ts"
import { agentInput } from "./agent-source.ts"

/** 合成双语制品；不同英文展示名、codeName 和索引名称用于捕获错误取值来源。 */
export async function publicationFixture(root: string) {
  const rawRoot = join(root, "raw")
  const version = "synthetic-publication"
  async function write(path: string, value: unknown) {
    const destination = join(rawRoot, version, path)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, JSON.stringify(value))
  }
  const input = agentInput()
  await write("manifest.json", {
    zzz: { live: version, latest: version, available: [version] },
  })
  await write("character.json", {
    "10": input.sourceRecord,
    "2": input.sourceRecord,
  })
  for (const [id, name] of [
    ["10", "Soldier 0 - Anby"],
    ["2", "Astra Yao"],
  ]) {
    for (const locale of ["zh", "en"] as const) {
      await write(`${locale}/character/${id}.json`, {
        ...input.details[locale],
        id: Number(id),
        code_name: "Astra",
        name: locale === "en" ? name : `中文 ${id}`,
      })
    }
  }
  const result = await buildNanokaAgents({
    rawRoot,
    version,
    temporaryParent: root,
  })
  return { ...result, rawRoot, version }
}
