import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import { dirname, extname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")
const sourceDir = join(repoRoot, "data/cleaned")
const targetDir = join(packageDir, "cleaned")

function listJsonFiles(dir, baseDir = dir) {
  if (!existsSync(dir))
    return []

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return listJsonFiles(path, baseDir)
    if (entry.isFile() && extname(entry.name) === ".json")
      return [relative(baseDir, path)]
    return []
  })
}

mkdirSync(targetDir, { recursive: true })

for (const relativePath of listJsonFiles(targetDir)) {
  rmSync(join(targetDir, relativePath), { force: true })
}

for (const relativePath of listJsonFiles(sourceDir)) {
  const sourcePath = join(sourceDir, relativePath)
  const targetPath = join(targetDir, relativePath)
  mkdirSync(dirname(targetPath), { recursive: true })
  cpSync(sourcePath, targetPath)
}
