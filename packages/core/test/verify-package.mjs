import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const testDirectory = dirname(fileURLToPath(import.meta.url))
const packageDirectory = join(testDirectory, "..")
const temporaryDirectory = mkdtempSync(join(tmpdir(), "randomplay-core-pack-"))
const unpackedDirectory = join(temporaryDirectory, "unpacked")
const consumerDirectory = join(temporaryDirectory, "consumer")

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
  const tarballPath = join(temporaryDirectory, tarball)

  mkdirSync(unpackedDirectory)
  execFileSync("tar", ["-xzf", tarballPath, "-C", unpackedDirectory], {
    stdio: "inherit",
  })

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
  assert.match(declaration, /invalid_calculation_input/)
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

  mkdirSync(consumerDirectory)
  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "randomplay-core-packed-consumer",
        private: true,
        type: "module",
        dependencies: {
          "@randomplay/core": `file:${relative(consumerDirectory, tarballPath)}`,
        },
      },
      undefined,
      2,
    )}\n`,
  )
  execFileSync(
    "pnpm",
    ["install", "--offline", "--lockfile-only", "--ignore-workspace"],
    { cwd: consumerDirectory, stdio: "inherit" },
  )
  execFileSync(
    "pnpm",
    ["install", "--offline", "--frozen-lockfile", "--ignore-workspace"],
    { cwd: consumerDirectory, stdio: "inherit" },
  )
  writeFileSync(
    join(consumerDirectory, "smoke.mjs"),
    `import assert from "node:assert/strict"
import { calculate } from "@randomplay/core"

const result = calculate({
  formulaId: "regular_damage",
  buckets: [{ bucketId: "base_damage", value: 100 }],
})
assert.equal(result.ok, true)
assert.equal(result.value, 100)

const reduced = withMutableProperty(
  Array.prototype,
  "reduce",
  () => 777,
  () =>
    calculate({
      formulaId: "regular_damage",
      buckets: [{ bucketId: "base_damage", value: 100 }],
    }),
)
assert.deepEqual([reduced.ok, reduced.value], [true, 100])

const applicable = withMutableProperty(
  Array.prototype,
  "includes",
  () => true,
  () =>
    calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "sheer_damage_bonus", value: 2 },
      ],
    }),
)
assert.equal(applicable.error.code, "unsupported_bucket")
assert.equal(applicable.error.bucketId, "sheer_damage_bonus")

const duplicate = withMutableProperty(
  Set.prototype,
  "has",
  () => false,
  () =>
    calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "base_damage", value: 200 },
      ],
    }),
)
assert.equal(duplicate.error.code, "duplicate_bucket")
assert.equal(duplicate.error.bucketId, "base_damage")

const iterable = withMutableProperty(
  Array.prototype,
  Symbol.iterator,
  emptyIterator,
  () =>
    calculate({
      formulaId: "regular_damage",
      buckets: [{ bucketId: "base_damage", value: 100 }],
    }),
)
assert.deepEqual([iterable.ok, iterable.value], [true, 100])

const canonical = withMutableProperty(
  Array.prototype,
  "entries",
  emptyIterator,
  () =>
    calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "crit", value: 2, contributions: [{ value: 1 }] },
        {
          bucketId: "damage_bonus",
          value: 2,
          contributions: [{ value: 0.5 }],
        },
      ],
    }),
)
assert.equal(canonical.error.code, "conflicting_bucket_input")
assert.equal(canonical.error.bucketId, "damage_bonus")

function withMutableProperty(object, key, value, operation) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key)
  assert.ok(descriptor)
  Object.defineProperty(object, key, { ...descriptor, value })
  try {
    return operation()
  } finally {
    Object.defineProperty(object, key, descriptor)
  }
}

function emptyIterator() {
  return {
    next: () => ({ done: true, value: undefined }),
    [Symbol.iterator]() {
      return this
    },
  }
}
`,
  )
  execFileSync(process.execPath, ["smoke.mjs"], {
    cwd: consumerDirectory,
    stdio: "inherit",
  })

  console.log(
    `Verified installed package import/calculation, hostile collection prototypes, and packed runtime sourcemap with ${runtimeMap.sources.length} embedded sources and no declaration map.`,
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
