import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { dirname, extname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")
const sourceDir = join(repoRoot, "data/cleaned")
const targetDir = join(packageDir, "cleaned")
const checkOnly = process.argv.includes("--check")

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

function assertMirrorsMatch() {
  const sourceFiles = listJsonFiles(sourceDir).sort()
  const targetFiles = listJsonFiles(targetDir).sort()
  const targetFileSet = new Set(targetFiles)
  const sourceFileSet = new Set(sourceFiles)
  const missingInTarget = sourceFiles.filter(relativePath => !targetFileSet.has(relativePath))
  const extraInTarget = targetFiles.filter(relativePath => !sourceFileSet.has(relativePath))
  const mismatched = sourceFiles.filter((relativePath) => {
    if (!targetFileSet.has(relativePath))
      return false

    return !readFileSync(join(sourceDir, relativePath)).equals(
      readFileSync(join(targetDir, relativePath)),
    )
  })

  if (missingInTarget.length || extraInTarget.length || mismatched.length) {
    const details = [
      missingInTarget.length ? `missing in package cleaned mirror: ${missingInTarget.join(", ")}` : "",
      extraInTarget.length ? `extra in package cleaned mirror: ${extraInTarget.join(", ")}` : "",
      mismatched.length ? `mismatched cleaned mirror files: ${mismatched.join(", ")}` : "",
    ].filter(Boolean).join("\n")

    throw new Error(`cleaned mirror check failed\n${details}`)
  }

  console.log(`cleaned mirror check passed (${sourceFiles.length} JSON files)`)
}

if (checkOnly) {
  assertMirrorsMatch()
  process.exit(0)
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
