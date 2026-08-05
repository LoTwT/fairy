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
  BASE_DAMAGE_FACTOR_ID,
  CRITICAL_FACTOR_ID,
  DAMAGE_BONUS_FACTOR_ID,
  DEFENSE_FACTOR_ID,
  baseDamageFactor,
  calculateFinalStat,
  calculateInitialStat,
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  criticalFactor,
  damageBonusFactor,
  defenseFactor,
  defineFactor,
} from "@randomplay/core"

const factor = defineFactor({
  factorId: "sum",
  calculate: (input) => input.values.reduce((sum, value) => sum + value, 0),
})

assert.equal(factor.calculate({ values: [2, 3] }), 5)
assert.equal(Object.isFrozen(factor), true)
assert.throws(
  () => defineFactor({ factorId: "invalid", calculate: null }),
  TypeError,
)
const initialStat = calculateInitialStat({
  baseStat: 80,
  initialStatPercentageAdjustments: [0.25, -0.125],
  initialStatFixedValueAdjustments: [10, -5],
})
const finalStat = calculateFinalStat({
  initialStat,
  finalStatPercentageAdjustments: [0.5, -0.25],
  finalStatFixedValueAdjustments: [5, -0.75],
})
assert.equal(initialStat, 95)
assert.equal(finalStat, 123)
assert.equal(BASE_DAMAGE_FACTOR_ID, "base_damage")
assert.equal(baseDamageFactor.factorId, BASE_DAMAGE_FACTOR_ID)
assert.equal(
  baseDamageFactor.calculate([{ damageMultiplier: 2, finalStat }]),
  246,
)
assert.equal(DAMAGE_BONUS_FACTOR_ID, "damage_bonus")
assert.equal(damageBonusFactor.factorId, DAMAGE_BONUS_FACTOR_ID)
assert.equal(damageBonusFactor.calculate([0.25]), 1.25)
assert.equal(CRITICAL_FACTOR_ID, "critical")
assert.equal(criticalFactor.factorId, CRITICAL_FACTOR_ID)
assert.equal(criticalFactor.calculate([0.5, 0.25]), 1.75)
const attackerLevelBase = calculateDefenseLevelBase(60)
const targetLevelBase = calculateDefenseLevelBase(60)
const targetBaseDefense = calculateTargetBaseDefense({
  targetLevelBase,
  targetLevelOneBaseDefense: 60,
})
const targetEffectiveDefense = calculateTargetEffectiveDefense({
  targetBaseDefense,
  defensePercentageAdjustments: [],
  penetrationRatios: [0.24],
  penetrationValues: [],
})
assert.equal(attackerLevelBase, 794)
assert.equal(targetBaseDefense, 952.8)
assert.equal(targetEffectiveDefense, 952.8 * 0.76)
assert.equal(DEFENSE_FACTOR_ID, "defense")
assert.equal(defenseFactor.factorId, DEFENSE_FACTOR_ID)
assert.equal(
  defenseFactor.calculate({ attackerLevelBase, targetEffectiveDefense }),
  attackerLevelBase / (targetEffectiveDefense + attackerLevelBase),
)
`,
    )
    writeFileSync(
      join(consumerDirectory, "smoke.ts"),
      `import {
  baseDamageFactor,
  calculateFinalStat,
  calculateInitialStat,
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  criticalFactor,
  damageBonusFactor,
  defenseFactor,
  defineFactor,
  type BaseDamageFactorInput,
  type BaseDamageFactorInputItem,
  type CalculateFinalStatParams,
  type CalculateInitialStatParams,
  type CalculateTargetBaseDefenseParams,
  type CalculateTargetEffectiveDefenseParams,
  type CriticalFactorInput,
  type DamageBonusFactorInput,
  type DefenseFactorInput,
  type Factor,
  type FactorParams,
} from "@randomplay/core"

interface SumFactorInput {
  readonly values: readonly number[]
}

const params: FactorParams<SumFactorInput> = {
  factorId: "draft-sum",
  calculate: (input) =>
    input.values.reduce((sum, value) => sum + value, 0),
}
params.factorId = "sum"

const factor: Factor<SumFactorInput> = defineFactor(params)
const initialStatParams: CalculateInitialStatParams = {
  baseStat: 80,
  initialStatPercentageAdjustments: [0.25, -0.125],
  initialStatFixedValueAdjustments: [10, -5],
}
const initialStat = calculateInitialStat(initialStatParams)
const finalStatParams: CalculateFinalStatParams = {
  initialStat,
  finalStatPercentageAdjustments: [0.5, -0.25],
  finalStatFixedValueAdjustments: [5, -0.75],
}
const finalStat = calculateFinalStat(finalStatParams)
const baseDamageInputItem: BaseDamageFactorInputItem = {
  damageMultiplier: 2,
  finalStat,
}
const baseDamageInputs: BaseDamageFactorInput = [baseDamageInputItem]
const criticalInputs: CriticalFactorInput = [0.5, 0.25]
const damageBonusInputs: DamageBonusFactorInput = [0.25, -0.125]
const targetLevelBase = calculateDefenseLevelBase(60)
const targetBaseDefenseParams: CalculateTargetBaseDefenseParams = {
  targetLevelBase,
  targetLevelOneBaseDefense: 60,
}
const targetBaseDefense = calculateTargetBaseDefense(targetBaseDefenseParams)
const targetEffectiveDefenseParams: CalculateTargetEffectiveDefenseParams = {
  targetBaseDefense,
  defensePercentageAdjustments: [],
  penetrationRatios: [0.24],
  penetrationValues: [],
}
const defenseInput: DefenseFactorInput = {
  attackerLevelBase: calculateDefenseLevelBase(60),
  targetEffectiveDefense: calculateTargetEffectiveDefense(
    targetEffectiveDefenseParams,
  ),
}

factor.calculate({ values: [2, 3] })
baseDamageFactor.calculate(baseDamageInputs)
criticalFactor.calculate(criticalInputs)
damageBonusFactor.calculate(damageBonusInputs)
defenseFactor.calculate(defenseInput)
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
