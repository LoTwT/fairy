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
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

const testDirectory = dirname(fileURLToPath(import.meta.url))
const packageDirectory = join(testDirectory, "..")
const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe("packed package", () => {
  it("contains only public files and works when installed", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "randomplay-core-pack-"),
    )
    temporaryDirectories.push(temporaryDirectory)

    const unpackedDirectory = join(temporaryDirectory, "unpacked")
    const consumerDirectory = join(temporaryDirectory, "consumer")

    execFileSync(
      "corepack",
      ["pnpm", "pack", "--pack-destination", temporaryDirectory],
      {
        cwd: packageDirectory,
        stdio: "pipe",
      },
    )

    const tarball = readdirSync(temporaryDirectory).find((file) =>
      file.endsWith(".tgz"),
    )
    expect(tarball).toBeDefined()
    const tarballPath = join(temporaryDirectory, tarball!)

    mkdirSync(unpackedDirectory)
    execFileSync("tar", ["-xzf", tarballPath, "-C", unpackedDirectory], {
      stdio: "pipe",
    })

    const packedRoot = join(unpackedDirectory, "package")
    expect(listFiles(packedRoot)).toEqual([
      "LICENSE",
      "README.md",
      "dist/index.d.mts",
      "dist/index.mjs",
      "dist/index.mjs.map",
      "package.json",
    ])

    const manifest = JSON.parse(
      readFileSync(join(packedRoot, "package.json"), "utf8"),
    )
    expect(manifest.dependencies).toEqual({})

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
      "corepack",
      ["pnpm", "install", "--offline", "--lockfile-only", "--ignore-workspace"],
      { cwd: consumerDirectory, stdio: "pipe" },
    )
    execFileSync(
      "corepack",
      [
        "pnpm",
        "install",
        "--offline",
        "--frozen-lockfile",
        "--ignore-workspace",
      ],
      { cwd: consumerDirectory, stdio: "pipe" },
    )
    writeFileSync(
      join(consumerDirectory, "smoke.mjs"),
      `import assert from "node:assert/strict"
import {
  DAMAGE_BONUS_FACTOR_ID,
  damageBonusFactor,
  defineFactor,
} from "@randomplay/core"

const factor = defineFactor({
  factorId: "sum",
  calculate: (inputs) => inputs.reduce((sum, input) => sum + input, 0),
})

assert.equal(factor.calculate([2, 3]), 5)
assert.equal(Object.isFrozen(factor), true)
assert.throws(
  () => defineFactor({ factorId: "invalid", calculate: null }),
  TypeError,
)
assert.equal(DAMAGE_BONUS_FACTOR_ID, "damage_bonus")
assert.equal(damageBonusFactor.factorId, DAMAGE_BONUS_FACTOR_ID)
assert.equal(damageBonusFactor.calculate([0.25]), 1.25)
`,
    )
    writeFileSync(
      join(consumerDirectory, "smoke.ts"),
      `import {
  damageBonusFactor,
  defineFactor,
  type DamageBonusFactorInput,
  type Factor,
  type FactorParams,
} from "@randomplay/core"

const params: FactorParams<number> = {
  factorId: "draft-sum",
  calculate: (inputs) => inputs.reduce((sum, input) => sum + input, 0),
}
params.factorId = "sum"

const factor: Factor<number> = defineFactor(params)
const damageBonusInputs: readonly DamageBonusFactorInput[] = [0.25, -0.125]

factor.calculate([2, 3])
damageBonusFactor.calculate(damageBonusInputs)
`,
    )

    expect(() =>
      execFileSync(process.execPath, ["smoke.mjs"], {
        cwd: consumerDirectory,
        stdio: "pipe",
      }),
    ).not.toThrow()
    expect(() =>
      execFileSync(
        process.execPath,
        [
          join(packageDirectory, "node_modules/typescript/bin/tsc"),
          "--noEmit",
          "--module",
          "ESNext",
          "--moduleResolution",
          "Bundler",
          "smoke.ts",
        ],
        {
          cwd: consumerDirectory,
          stdio: "pipe",
        },
      ),
    ).not.toThrow()
  }, 30_000)
})

function listFiles(directory: string, root = directory): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory()
        ? listFiles(path, root)
        : [relative(root, path).split(sep).join("/")]
    })
    .toSorted()
}
