import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import { syncBuiltinESMExports } from "node:module"
import { join } from "node:path"

const configuredPackageDirectory = process.env.FAIRY_PUBLICATION_TEST_PACKAGE
const intervention = process.env.FAIRY_PUBLICATION_TEST_INTERVENTION
const tracePath = process.env.FAIRY_PUBLICATION_TEST_TRACE
if (
  !configuredPackageDirectory ||
  !tracePath ||
  (intervention !== "source-change" && intervention !== "dist-corruption")
)
  throw new Error("Missing publication build fixture configuration")
const packageDirectory = await fs.realpath(configuredPackageDirectory)

const writeFile = fs.writeFile
const cp = fs.cp
let injected = false

if (intervention === "source-change") {
  fs.writeFile = async (path, ...args) => {
    await writeFile(path, ...args)
    if (
      !injected &&
      String(path).startsWith(join(packageDirectory, ".publication-")) &&
      String(path).endsWith("/src/index.browser.ts")
    ) {
      injected = true
      // The catalog and private JSON snapshot are already captured. Publish a valid newer source.
      const source = join(packageDirectory, "integrated")
      const detailsPath = join(source, "agents/1311/details.en.json")
      const details = JSON.parse(await fs.readFile(detailsPath, "utf8"))
      details.name += " [next snapshot]"
      const bytes = JSON.stringify(details)
      const indexPath = join(source, "index.json")
      const index = JSON.parse(await fs.readFile(indexPath, "utf8"))
      index.entities.agents.members["1311"].files.details.en.sha256 =
        createHash("sha256").update(bytes).digest("hex")
      await writeFile(detailsPath, bytes)
      const dataPath = join(source, "agents/1311/data.json")
      const data = JSON.parse(await fs.readFile(dataPath, "utf8"))
      data.stats.attack += 1
      const dataBytes = JSON.stringify(data)
      index.entities.agents.members["1311"].files.data.sha256 = createHash(
        "sha256",
      )
        .update(dataBytes)
        .digest("hex")
      await writeFile(dataPath, dataBytes)
      await writeFile(indexPath, JSON.stringify(index))
      // 同步下一份属性制品；发布必须仍使用捕获到的旧属性与旧 manifest。
      const attributesRoot = join(packageDirectory, "definitions/attributes")
      const attributePath = join(attributesRoot, "agents/1311.json")
      const attributes = JSON.parse(await fs.readFile(attributePath, "utf8"))
      attributes.baseAttributes.attack.value = 641.7699
      const attributeBytes = JSON.stringify(attributes)
      await writeFile(attributePath, attributeBytes)
      const manifestPath = join(attributesRoot, "manifest.json")
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))
      for (const ref of manifest.inputs) {
        if (ref.path === "agents/1311/data.json")
          ref.sha256 = index.entities.agents.members["1311"].files.data.sha256
        if (ref.path === "agents/1311/details.en.json")
          ref.sha256 =
            index.entities.agents.members["1311"].files.details.en.sha256
      }
      manifest.artifacts["agents/1311.json"] = createHash("sha256")
        .update(attributeBytes)
        .digest("hex")
      await writeFile(manifestPath, JSON.stringify(manifest))
      await writeFile(tracePath, intervention)
    }
  }
} else {
  fs.cp = async (from, to, ...args) => {
    await cp(from, to, ...args)
    if (!injected && String(to) === join(packageDirectory, "dist/integrated")) {
      injected = true
      // Damage only the installed bytes, after copying the verified private snapshot.
      await fs.appendFile(join(String(to), "agents/1311/data.json"), " ")
      await writeFile(tracePath, intervention)
    }
  }
}
syncBuiltinESMExports()
