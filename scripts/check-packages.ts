import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const manifests = await Promise.all(
  ["core", "data", "shared"].map(async (name) =>
    JSON.parse(
      await readFile(join(root, "packages", name, "package.json"), "utf8"),
    ),
  ),
)
const [core, data, shared] = manifests
if (core.version !== data.version)
  throw new Error("core and data must use the same release version")
if (shared.private !== true)
  throw new Error("shared is private and must never be published")
for (const manifest of manifests) {
  for (const field of [
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  ])
    for (const name of Object.keys(manifest[field] ?? {}))
      if (
        ["@randomplay/core", "@randomplay/data", "@randomplay/shared"].includes(
          name,
        )
      )
        throw new Error(
          `${manifest.name}: forbidden runtime package dependency ${name}`,
        )
}
for (const name of ["core", "data", "shared"]) {
  const directory = join(root, "packages", name, "src")
  for (const entry of await readdir(directory, {
    withFileTypes: true,
    recursive: true,
  })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue
    const path = join(entry.parentPath, entry.name)
    const source = await readFile(path, "utf8")
    for (const match of source.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(\s*)["']([^"']+)["']/gu,
    )) {
      const target = match[1]!
      for (const other of ["core", "data"])
        if (
          other !== name &&
          (target.startsWith(`@randomplay/${other}`) ||
            new RegExp(`(?:^|/)${other}/`).test(target))
        )
          throw new Error(`${path}: runtime source must not import ${target}`)
    }
  }
}
console.log(
  `Package boundaries verified; core and data release version: ${core.version}`,
)
