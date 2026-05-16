import { join } from "node:path"
import { fileURLToPath } from "node:url"

export const packageDir = fileURLToPath(new URL("..", import.meta.url))
export const repoRoot = join(packageDir, "../..")
export const sourceRoot = join(packageDir, "source")
export const rawSourceRoot = join(sourceRoot, "raw")
export const cleanedRoot = join(packageDir, "cleaned")
export const sourceManifestPath = join(sourceRoot, "source-manifest.json")
export const sourceRegistryPath = join(packageDir, "source-registry.json")
