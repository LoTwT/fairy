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
  DAMAGE_TAKEN_FACTOR_ID,
  DEFAULT_CRITICAL_FACTOR_INPUT,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  DEFENSE_FACTOR_ID,
  REGULAR_DAMAGE_FORMULA_ID,
  RESISTANCE_FACTOR_ID,
  SHEER_DAMAGE_BONUS_FACTOR_ID,
  SHEER_DAMAGE_FORMULA_ID,
  STUN_DAMAGE_FACTOR_ID,
  baseDamageFactor,
  calculateFinalStat,
  calculateInitialStat,
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  criticalFactor,
  damageBonusFactor,
  damageTakenFactor,
  defenseFactor,
  defineFactor,
  defineFormula,
  regularDamageFormula,
  resistanceFactor,
  sheerDamageBonusFactor,
  sheerDamageFormula,
  stunDamageFactor,
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
const formula = defineFormula({
  formulaId: "product",
  calculate: (input) => ({
    value: input.left * input.right,
    factorResults: { left: input.left, right: input.right },
  }),
})
const formulaResult = formula.calculate({ left: 2, right: 3 })
assert.deepEqual(formulaResult, {
  value: 6,
  factorResults: { left: 2, right: 3 },
})
assert.equal(Object.isFrozen(formula), true)
assert.equal(Object.isFrozen(formulaResult), true)
assert.equal(Object.isFrozen(formulaResult.factorResults), true)
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
assert.equal(damageBonusFactor.calculate(DEFAULT_DAMAGE_BONUS_FACTOR_INPUT), 1)
assert.equal(Object.isFrozen(DEFAULT_DAMAGE_BONUS_FACTOR_INPUT), true)
assert.equal(DAMAGE_TAKEN_FACTOR_ID, "damage_taken")
assert.equal(damageTakenFactor.factorId, DAMAGE_TAKEN_FACTOR_ID)
assert.equal(
  damageTakenFactor.calculate({
    targetDamageTakenIncreases: [0.25],
    targetDamageTakenReductions: [0.125],
  }),
  1.125,
)
assert.equal(damageTakenFactor.calculate(DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT), 1)
assert.equal(Object.isFrozen(DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT), true)
assert.equal(
  Object.isFrozen(DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT.targetDamageTakenIncreases),
  true,
)
assert.equal(
  Object.isFrozen(DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT.targetDamageTakenReductions),
  true,
)
assert.equal(CRITICAL_FACTOR_ID, "critical")
assert.equal(criticalFactor.factorId, CRITICAL_FACTOR_ID)
assert.equal(
  criticalFactor.calculate({
    isCritical: true,
    criticalDamageContributions: [0.5, 0.25],
  }),
  1.75,
)
assert.equal(criticalFactor.calculate(DEFAULT_CRITICAL_FACTOR_INPUT), 1)
assert.equal(Object.isFrozen(DEFAULT_CRITICAL_FACTOR_INPUT), true)
assert.equal(
  Object.isFrozen(DEFAULT_CRITICAL_FACTOR_INPUT.criticalDamageContributions),
  true,
)
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
assert.equal(defenseFactor.calculate(DEFAULT_DEFENSE_FACTOR_INPUT), 1)
assert.equal(Object.isFrozen(DEFAULT_DEFENSE_FACTOR_INPUT), true)
assert.equal(RESISTANCE_FACTOR_ID, "resistance")
assert.equal(resistanceFactor.factorId, RESISTANCE_FACTOR_ID)
assert.equal(
  resistanceFactor.calculate({
    targetResistance: 0.2,
    targetResistanceReductions: [0.1],
    attackerResistanceIgnoreValues: [0.05],
  }),
  1 - 0.2 + 0.1 + 0.05,
)
assert.equal(resistanceFactor.calculate(DEFAULT_RESISTANCE_FACTOR_INPUT), 1)
assert.equal(Object.isFrozen(DEFAULT_RESISTANCE_FACTOR_INPUT), true)
assert.equal(
  Object.isFrozen(DEFAULT_RESISTANCE_FACTOR_INPUT.targetResistanceReductions),
  true,
)
assert.equal(
  Object.isFrozen(DEFAULT_RESISTANCE_FACTOR_INPUT.attackerResistanceIgnoreValues),
  true,
)
assert.equal(SHEER_DAMAGE_BONUS_FACTOR_ID, "sheer_damage_bonus")
assert.equal(
  sheerDamageBonusFactor.factorId,
  SHEER_DAMAGE_BONUS_FACTOR_ID,
)
assert.equal(sheerDamageBonusFactor.calculate([0.25]), 1.25)
assert.equal(
  sheerDamageBonusFactor.calculate(DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT),
  1,
)
assert.equal(Object.isFrozen(DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT), true)
assert.equal(STUN_DAMAGE_FACTOR_ID, "stun_damage")
assert.equal(stunDamageFactor.factorId, STUN_DAMAGE_FACTOR_ID)
assert.equal(
  stunDamageFactor.calculate({
    isTargetStunned: true,
    targetBaseStunDamageMultiplier: 1.5,
    targetStunDamageMultiplierAdjustments: [0.25],
  }),
  1.75,
)
assert.equal(stunDamageFactor.calculate(DEFAULT_STUN_DAMAGE_FACTOR_INPUT), 1)
assert.equal(Object.isFrozen(DEFAULT_STUN_DAMAGE_FACTOR_INPUT), true)
assert.equal(
  Object.isFrozen(
    DEFAULT_STUN_DAMAGE_FACTOR_INPUT.targetStunDamageMultiplierAdjustments,
  ),
  true,
)
assert.equal(REGULAR_DAMAGE_FORMULA_ID, "regular_damage")
assert.equal(regularDamageFormula.formulaId, REGULAR_DAMAGE_FORMULA_ID)
const regularDamageResult = regularDamageFormula.calculate({
  baseDamage: [{ damageMultiplier: 2, finalStat }],
  damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  critical: DEFAULT_CRITICAL_FACTOR_INPUT,
  defense: DEFAULT_DEFENSE_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
})
assert.equal(regularDamageResult.value, 246)
assert.deepEqual(regularDamageResult.factorResults, {
  baseDamage: 246,
  damageBonus: 1,
  critical: 1,
  defense: 1,
  resistance: 1,
  damageTaken: 1,
  stunDamage: 1,
})
assert.equal(Object.isFrozen(regularDamageResult), true)
assert.equal(Object.isFrozen(regularDamageResult.factorResults), true)
assert.equal(SHEER_DAMAGE_FORMULA_ID, "sheer_damage")
assert.equal(sheerDamageFormula.formulaId, SHEER_DAMAGE_FORMULA_ID)
const sheerDamageResult = sheerDamageFormula.calculate({
  baseDamage: [{ damageMultiplier: 2, finalStat }],
  damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  critical: DEFAULT_CRITICAL_FACTOR_INPUT,
  sheerDamageBonus: DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
})
assert.equal(sheerDamageResult.value, 246)
assert.deepEqual(sheerDamageResult.factorResults, {
  baseDamage: 246,
  damageBonus: 1,
  critical: 1,
  sheerDamageBonus: 1,
  resistance: 1,
  damageTaken: 1,
  stunDamage: 1,
})
assert.equal(Object.isFrozen(sheerDamageResult), true)
assert.equal(Object.isFrozen(sheerDamageResult.factorResults), true)
`,
    )
    writeFileSync(
      join(consumerDirectory, "smoke.ts"),
      `import {
  DEFAULT_CRITICAL_FACTOR_INPUT,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  baseDamageFactor,
  calculateFinalStat,
  calculateInitialStat,
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  criticalFactor,
  damageBonusFactor,
  damageTakenFactor,
  defenseFactor,
  defineFactor,
  defineFormula,
  regularDamageFormula,
  resistanceFactor,
  sheerDamageBonusFactor,
  sheerDamageFormula,
  stunDamageFactor,
  type BaseDamageFactorInput,
  type BaseDamageFactorInputItem,
  type CalculateFinalStatParams,
  type CalculateInitialStatParams,
  type CalculateTargetBaseDefenseParams,
  type CalculateTargetEffectiveDefenseParams,
  type CriticalFactorInput,
  type DamageBonusFactorInput,
  type DamageTakenFactorInput,
  type DefenseFactorInput,
  type Factor,
  type FactorParams,
  type Formula,
  type FormulaFactorResults,
  type FormulaParams,
  type FormulaResult,
  type RegularDamageFormulaInput,
  type ResistanceFactorInput,
  type SheerDamageBonusFactorInput,
  type SheerDamageFormulaInput,
  type StunDamageFactorInput,
} from "@randomplay/core"

interface SumFactorInput {
  readonly values: readonly number[]
}

interface ProductFormulaInput {
  readonly left: number
  readonly right: number
}

const params: FactorParams<SumFactorInput> = {
  factorId: "draft-sum",
  calculate: (input) =>
    input.values.reduce((sum, value) => sum + value, 0),
}
params.factorId = "sum"

const factor: Factor<SumFactorInput> = defineFactor(params)
const formulaParams: FormulaParams<ProductFormulaInput> = {
  formulaId: "draft-product",
  calculate: (input) => ({
    value: input.left * input.right,
    factorResults: { left: input.left, right: input.right },
  }),
}
formulaParams.formulaId = "product"
const formula: Formula<ProductFormulaInput> = defineFormula(formulaParams)
const formulaResult: FormulaResult<ProductFormulaInput> = formula.calculate({
  left: 2,
  right: 3,
})
const formulaFactorResults: FormulaFactorResults<ProductFormulaInput> =
  formulaResult.factorResults
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
const criticalInputs: CriticalFactorInput = {
  isCritical: true,
  criticalDamageContributions: [0.5, 0.25],
}
const damageBonusInputs: DamageBonusFactorInput = [0.25, -0.125]
const damageTakenInput: DamageTakenFactorInput = {
  targetDamageTakenIncreases: [0.25],
  targetDamageTakenReductions: [0.125],
}
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
const resistanceInput: ResistanceFactorInput = {
  targetResistance: 0.2,
  targetResistanceReductions: [0.1],
  attackerResistanceIgnoreValues: [0.05],
}
const sheerDamageBonusInputs: SheerDamageBonusFactorInput = [0.25, -0.125]
const stunDamageInput: StunDamageFactorInput = {
  isTargetStunned: true,
  targetBaseStunDamageMultiplier: 1.5,
  targetStunDamageMultiplierAdjustments: [0.25],
}
const regularDamageInput: RegularDamageFormulaInput = {
  baseDamage: baseDamageInputs,
  damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  critical: DEFAULT_CRITICAL_FACTOR_INPUT,
  defense: DEFAULT_DEFENSE_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
}
const sheerDamageInput: SheerDamageFormulaInput = {
  baseDamage: baseDamageInputs,
  damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  critical: DEFAULT_CRITICAL_FACTOR_INPUT,
  sheerDamageBonus: DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
}

factor.calculate({ values: [2, 3] })
formulaFactorResults.left
baseDamageFactor.calculate(baseDamageInputs)
criticalFactor.calculate(criticalInputs)
damageBonusFactor.calculate(damageBonusInputs)
damageTakenFactor.calculate(damageTakenInput)
defenseFactor.calculate(defenseInput)
resistanceFactor.calculate(resistanceInput)
sheerDamageBonusFactor.calculate(sheerDamageBonusInputs)
sheerDamageBonusFactor.calculate(DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT)
stunDamageFactor.calculate(stunDamageInput)
regularDamageFormula.calculate(regularDamageInput)
sheerDamageFormula.calculate(sheerDamageInput)
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
