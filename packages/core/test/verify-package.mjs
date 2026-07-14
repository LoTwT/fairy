import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const testDirectory = dirname(fileURLToPath(import.meta.url))
const packageDirectory = join(testDirectory, "..")
const temporaryDirectory = mkdtempSync(join(tmpdir(), "randomplay-core-pack-"))
const unpackedDirectory = join(temporaryDirectory, "unpacked")

try {
  execFileSync("pnpm", ["build"], {
    cwd: packageDirectory,
    stdio: "inherit",
  })
  execFileSync("pnpm", ["pack", "--pack-destination", temporaryDirectory], {
    cwd: packageDirectory,
    stdio: "inherit",
  })

  const tarball = readdirSync(temporaryDirectory).find((file) =>
    file.endsWith(".tgz"),
  )
  assert.ok(tarball, "pnpm pack must produce a tarball")

  mkdirSync(unpackedDirectory)
  execFileSync(
    "tar",
    ["-xzf", join(temporaryDirectory, tarball), "-C", unpackedDirectory],
    { stdio: "inherit" },
  )

  const packedRoot = join(unpackedDirectory, "package")
  const files = listFiles(packedRoot)
  assert.deepEqual(files, [
    "LICENSE",
    "dist/index.d.mts",
    "dist/index.mjs",
    "dist/index.mjs.map",
    "package.json",
  ])

  const runtime = readFileSync(join(packedRoot, "dist/index.mjs"), "utf8")
  const declaration = readFileSync(join(packedRoot, "dist/index.d.mts"), "utf8")
  const runtimeMap = JSON.parse(
    readFileSync(join(packedRoot, "dist/index.mjs.map"), "utf8"),
  )

  assert.match(runtime, /\/\/# sourceMappingURL=index\.mjs\.map\s*$/)
  assert.doesNotMatch(declaration, /sourceMappingURL|\.\.\/src/)
  assert.equal(
    files.some((file) => file.endsWith(".d.mts.map")),
    false,
  )
  assert.ok(Array.isArray(runtimeMap.sources))
  assert.ok(Array.isArray(runtimeMap.sourcesContent))
  assert.ok(runtimeMap.sources.length > 0)
  assert.equal(runtimeMap.sourcesContent.length, runtimeMap.sources.length)
  assert.ok(
    runtimeMap.sourcesContent.every(
      (source) => typeof source === "string" && source.length > 0,
    ),
  )

  console.log(
    `Verified packed runtime sourcemap with ${runtimeMap.sources.length} embedded sources and no declaration map.`,
  )
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true })
}

function listFiles(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory()
        ? listFiles(path, root)
        : [relative(root, path)]
    })
    .toSorted()
}
