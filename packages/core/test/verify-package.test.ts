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
  ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
  ADRENALINE_GENERATION_FORMULA_ID,
  ADRENALINE_GENERATION_RATE_FACTOR_ID,
  ANOMALY_BUILDUP_FORMULA_ID,
  ANOMALY_BUILDUP_RATE_FACTOR_ID,
  ANOMALY_CRITICAL_FACTOR_ID,
  ANOMALY_DAMAGE_BONUS_FACTOR_ID,
  ANOMALY_DAMAGE_FORMULA_ID,
  ANOMALY_DAMAGE_LEVEL_FACTOR_ID,
  ANOMALY_MASTERY_FACTOR_ID,
  ANOMALY_PROFICIENCY_FACTOR_ID,
  BASE_ADRENALINE_GENERATION_FACTOR_ID,
  BASE_ANOMALY_BUILDUP_FACTOR_ID,
  BASE_DAMAGE_FACTOR_ID,
  BASE_DAZE_FACTOR_ID,
  BASE_DECIBEL_GENERATION_FACTOR_ID,
  BASE_ENERGY_GENERATION_FACTOR_ID,
  BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
  CRITICAL_FACTOR_ID,
  DAMAGE_BONUS_FACTOR_ID,
  DAMAGE_TAKEN_FACTOR_ID,
  DAZE_DEALT_FACTOR_ID,
  DAZE_TAKEN_FACTOR_ID,
  DECIBEL_GENERATION_FORMULA_ID,
  DECIBEL_GENERATION_RATE_FACTOR_ID,
  DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
  DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  DEFAULT_CRITICAL_FACTOR_INPUT,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DAZE_DEALT_FACTOR_INPUT,
  DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
  DEFAULT_DISORDER_DAZE_MULTIPLIER,
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  DEFENSE_FACTOR_ID,
  DISORDER_DAZE_DEALT_FACTOR_ID,
  DISORDER_DAZE_FORMULA_ID,
  DISORDER_DAZE_LEVEL_FACTOR_ID,
  ENERGY_GENERATION_FORMULA_ID,
  ENERGY_GENERATION_RATE_FACTOR_ID,
  MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
  MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
  MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
  REGULAR_DAMAGE_FORMULA_ID,
  REGULAR_DAZE_FORMULA_ID,
  RESISTANCE_FACTOR_ID,
  SHEER_DAMAGE_BONUS_FACTOR_ID,
  SHEER_DAMAGE_FORMULA_ID,
  STUN_DAMAGE_FACTOR_ID,
  accompanyingDecibelGenerationRateFactor,
  adrenalineGenerationFormula,
  adrenalineGenerationRateFactor,
  anomalyBuildupFormula,
  anomalyBuildupRateFactor,
  anomalyCriticalFactor,
  anomalyDamageBonusFactor,
  anomalyDamageFormula,
  anomalyDamageLevelFactor,
  anomalyMasteryFactor,
  anomalyProficiencyFactor,
  baseAdrenalineGenerationFactor,
  baseAnomalyBuildupFactor,
  baseDamageFactor,
  baseDazeFactor,
  baseDecibelGenerationFactor,
  baseEnergyGenerationFactor,
  baseMiasmicShieldReductionFactor,
  calculateAnomalyTriggerThreshold,
  calculateTotalDisplayedDamage,
  calculateFinalStat,
  calculateInitialStat,
  calculateStandardDisorderDamageMultiplier,
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  criticalFactor,
  damageBonusFactor,
  damageTakenFactor,
  dazeDealtFactor,
  dazeTakenFactor,
  decibelGenerationFormula,
  decibelGenerationRateFactor,
  defenseFactor,
  defineFactor,
  defineFormula,
  disorderDazeDealtFactor,
  disorderDazeFormula,
  disorderDazeLevelFactor,
  energyGenerationFormula,
  energyGenerationRateFactor,
  miasmicShieldReductionFormula,
  miasmicShieldReductionRateFactor,
  miasmicShieldReductionTakenRateFactor,
  regularDamageFormula,
  regularDazeFormula,
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
assert.equal(calculateTotalDisplayedDamage([10.2, 20.1]), 32)
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
assert.equal(
  BASE_ADRENALINE_GENERATION_FACTOR_ID,
  "base_adrenaline_generation",
)
assert.equal(
  baseAdrenalineGenerationFactor.factorId,
  BASE_ADRENALINE_GENERATION_FACTOR_ID,
)
assert.equal(
  baseAdrenalineGenerationFactor.calculate({
    baseAdrenalineGenerationValues: [2, 3],
    finalAdrenalineRegen: 4,
    effectiveAdrenalineRegenDurationInSeconds: 5,
  }),
  25,
)
assert.equal(
  ADRENALINE_GENERATION_RATE_FACTOR_ID,
  "adrenaline_generation_rate",
)
assert.equal(
  adrenalineGenerationRateFactor.factorId,
  ADRENALINE_GENERATION_RATE_FACTOR_ID,
)
assert.equal(adrenalineGenerationRateFactor.calculate([0.25, -0.125]), 1.125)
assert.equal(
  adrenalineGenerationRateFactor.calculate(
    DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  ),
  1,
)
assert.equal(
  Object.isFrozen(DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT),
  true,
)
assert.notEqual(
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
)
assert.equal(BASE_ANOMALY_BUILDUP_FACTOR_ID, "base_anomaly_buildup")
assert.equal(
  baseAnomalyBuildupFactor.factorId,
  BASE_ANOMALY_BUILDUP_FACTOR_ID,
)
assert.equal(baseAnomalyBuildupFactor.calculate(123), 123)
assert.equal(ANOMALY_MASTERY_FACTOR_ID, "anomaly_mastery")
assert.equal(anomalyMasteryFactor.factorId, ANOMALY_MASTERY_FACTOR_ID)
assert.equal(anomalyMasteryFactor.calculate(125.9), 1.25)
assert.equal(
  anomalyMasteryFactor.calculate(DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT),
  1,
)
assert.equal(ANOMALY_BUILDUP_RATE_FACTOR_ID, "anomaly_buildup_rate")
assert.equal(
  anomalyBuildupRateFactor.factorId,
  ANOMALY_BUILDUP_RATE_FACTOR_ID,
)
assert.equal(anomalyBuildupRateFactor.calculate([0.25, -0.125]), 1.125)
assert.equal(
  anomalyBuildupRateFactor.calculate(
    DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  ),
  1,
)
assert.equal(Object.isFrozen(DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT), true)
assert.equal(ANOMALY_PROFICIENCY_FACTOR_ID, "anomaly_proficiency")
assert.equal(
  anomalyProficiencyFactor.factorId,
  ANOMALY_PROFICIENCY_FACTOR_ID,
)
assert.equal(anomalyProficiencyFactor.calculate(125), 1.25)
assert.equal(
  anomalyProficiencyFactor.calculate(
    DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  ),
  1,
)
assert.equal(ANOMALY_DAMAGE_LEVEL_FACTOR_ID, "anomaly_damage_level")
assert.equal(
  anomalyDamageLevelFactor.factorId,
  ANOMALY_DAMAGE_LEVEL_FACTOR_ID,
)
assert.equal(anomalyDamageLevelFactor.calculate(60), 2)
assert.equal(
  anomalyDamageLevelFactor.calculate(DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT),
  1,
)
assert.equal(ANOMALY_DAMAGE_BONUS_FACTOR_ID, "anomaly_damage_bonus")
assert.equal(
  anomalyDamageBonusFactor.factorId,
  ANOMALY_DAMAGE_BONUS_FACTOR_ID,
)
assert.equal(anomalyDamageBonusFactor.calculate([0.25]), 1.25)
assert.equal(
  anomalyDamageBonusFactor.calculate(DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT),
  1,
)
assert.equal(Object.isFrozen(DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT), true)
assert.equal(ANOMALY_CRITICAL_FACTOR_ID, "anomaly_critical")
assert.equal(anomalyCriticalFactor.factorId, ANOMALY_CRITICAL_FACTOR_ID)
assert.equal(
  anomalyCriticalFactor.calculate({
    isAnomalyCritical: true,
    anomalyCriticalDamageContributions: [0.5],
  }),
  1.5,
)
assert.equal(
  anomalyCriticalFactor.calculate(DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT),
  1,
)
assert.equal(Object.isFrozen(DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT), true)
assert.equal(
  Object.isFrozen(
    DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT.anomalyCriticalDamageContributions,
  ),
  true,
)
assert.equal(BASE_DAMAGE_FACTOR_ID, "base_damage")
assert.equal(baseDamageFactor.factorId, BASE_DAMAGE_FACTOR_ID)
assert.equal(
  baseDamageFactor.calculate([{ damageMultiplier: 2, finalStat }]),
  246,
)
assert.equal(BASE_DAZE_FACTOR_ID, "base_daze")
assert.equal(baseDazeFactor.factorId, BASE_DAZE_FACTOR_ID)
assert.equal(
  baseDazeFactor.calculate([{ finalImpact: 123, dazeMultiplier: 2 }]),
  246,
)
assert.equal(BASE_ENERGY_GENERATION_FACTOR_ID, "base_energy_generation")
assert.equal(
  baseEnergyGenerationFactor.factorId,
  BASE_ENERGY_GENERATION_FACTOR_ID,
)
assert.equal(
  baseEnergyGenerationFactor.calculate({
    baseEnergyGenerationValues: [2, 3],
    finalEnergyRegen: 4,
    effectiveEnergyRegenDurationInSeconds: 5,
  }),
  25,
)
assert.equal(ENERGY_GENERATION_RATE_FACTOR_ID, "energy_generation_rate")
assert.equal(
  energyGenerationRateFactor.factorId,
  ENERGY_GENERATION_RATE_FACTOR_ID,
)
assert.equal(energyGenerationRateFactor.calculate([0.25, -0.125]), 1.125)
assert.equal(
  energyGenerationRateFactor.calculate(
    DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  ),
  1,
)
assert.equal(
  Object.isFrozen(DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT),
  true,
)
assert.equal(BASE_DECIBEL_GENERATION_FACTOR_ID, "base_decibel_generation")
assert.equal(
  baseDecibelGenerationFactor.factorId,
  BASE_DECIBEL_GENERATION_FACTOR_ID,
)
assert.equal(baseDecibelGenerationFactor.calculate(100), 100)
assert.equal(DECIBEL_GENERATION_RATE_FACTOR_ID, "decibel_generation_rate")
assert.equal(
  decibelGenerationRateFactor.factorId,
  DECIBEL_GENERATION_RATE_FACTOR_ID,
)
assert.equal(decibelGenerationRateFactor.calculate([0.25, -0.125]), 1.125)
assert.equal(
  decibelGenerationRateFactor.calculate(
    DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  ),
  1,
)
assert.equal(
  Object.isFrozen(DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT),
  true,
)
assert.notEqual(
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
)
assert.notEqual(
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
)
assert.equal(
  ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
  "accompanying_decibel_generation_rate",
)
assert.equal(
  accompanyingDecibelGenerationRateFactor.factorId,
  ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
)
assert.equal(DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT, 1)
assert.equal(
  accompanyingDecibelGenerationRateFactor.calculate(
    DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  ),
  1,
)
assert.equal(
  BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
  "base_miasmic_shield_reduction",
)
assert.equal(
  baseMiasmicShieldReductionFactor.factorId,
  BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
)
assert.equal(baseMiasmicShieldReductionFactor.calculate(100), 100)
assert.equal(
  MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
  "miasmic_shield_reduction_rate",
)
assert.equal(
  miasmicShieldReductionRateFactor.factorId,
  MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
)
assert.equal(miasmicShieldReductionRateFactor.calculate([0.25, -0.125]), 1.125)
assert.equal(
  miasmicShieldReductionRateFactor.calculate(
    DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
  ),
  1,
)
assert.equal(
  Object.isFrozen(DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT),
  true,
)
assert.equal(
  MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
  "miasmic_shield_reduction_taken_rate",
)
assert.equal(
  miasmicShieldReductionTakenRateFactor.factorId,
  MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
)
assert.equal(
  miasmicShieldReductionTakenRateFactor.calculate([0.25, -0.125]),
  1.125,
)
assert.equal(
  miasmicShieldReductionTakenRateFactor.calculate(
    DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
  ),
  1,
)
assert.equal(
  Object.isFrozen(DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT),
  true,
)
assert.notEqual(
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
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
assert.equal(DAZE_DEALT_FACTOR_ID, "daze_dealt")
assert.equal(dazeDealtFactor.factorId, DAZE_DEALT_FACTOR_ID)
assert.equal(
  dazeDealtFactor.calculate({
    dazeDealtIncreases: [0.25],
    dazeDealtReductions: [0.125],
  }),
  1.125,
)
assert.equal(dazeDealtFactor.calculate(DEFAULT_DAZE_DEALT_FACTOR_INPUT), 1)
assert.equal(Object.isFrozen(DEFAULT_DAZE_DEALT_FACTOR_INPUT), true)
assert.equal(
  Object.isFrozen(DEFAULT_DAZE_DEALT_FACTOR_INPUT.dazeDealtIncreases),
  true,
)
assert.equal(
  Object.isFrozen(DEFAULT_DAZE_DEALT_FACTOR_INPUT.dazeDealtReductions),
  true,
)
assert.equal(DAZE_TAKEN_FACTOR_ID, "daze_taken")
assert.equal(dazeTakenFactor.factorId, DAZE_TAKEN_FACTOR_ID)
assert.equal(
  dazeTakenFactor.calculate({
    targetDazeTakenIncreases: [0.25],
    targetDazeTakenReductions: [0.125],
  }),
  1.125,
)
assert.equal(dazeTakenFactor.calculate(DEFAULT_DAZE_TAKEN_FACTOR_INPUT), 1)
assert.equal(Object.isFrozen(DEFAULT_DAZE_TAKEN_FACTOR_INPUT), true)
assert.equal(
  Object.isFrozen(DEFAULT_DAZE_TAKEN_FACTOR_INPUT.targetDazeTakenIncreases),
  true,
)
assert.equal(
  Object.isFrozen(DEFAULT_DAZE_TAKEN_FACTOR_INPUT.targetDazeTakenReductions),
  true,
)
assert.equal(DISORDER_DAZE_DEALT_FACTOR_ID, "disorder_daze_dealt")
assert.equal(
  disorderDazeDealtFactor.factorId,
  DISORDER_DAZE_DEALT_FACTOR_ID,
)
assert.equal(disorderDazeDealtFactor.calculate(1.25), 1.25)
assert.equal(
  disorderDazeDealtFactor.calculate(
    DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
  ),
  1,
)
assert.equal(DISORDER_DAZE_LEVEL_FACTOR_ID, "disorder_daze_level")
assert.equal(
  disorderDazeLevelFactor.factorId,
  DISORDER_DAZE_LEVEL_FACTOR_ID,
)
assert.equal(disorderDazeLevelFactor.calculate(60), 1.45)
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
assert.equal(REGULAR_DAZE_FORMULA_ID, "regular_daze")
assert.equal(regularDazeFormula.formulaId, REGULAR_DAZE_FORMULA_ID)
const regularDazeResult = regularDazeFormula.calculate({
  baseDaze: [{ finalImpact: 123, dazeMultiplier: 2 }],
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  dazeDealt: DEFAULT_DAZE_DEALT_FACTOR_INPUT,
  dazeTaken: DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
})
assert.equal(regularDazeResult.value, 246)
assert.deepEqual(regularDazeResult.factorResults, {
  baseDaze: 246,
  resistance: 1,
  dazeDealt: 1,
  dazeTaken: 1,
})
assert.equal(Object.isFrozen(regularDazeResult), true)
assert.equal(Object.isFrozen(regularDazeResult.factorResults), true)
assert.equal(DISORDER_DAZE_FORMULA_ID, "disorder_daze")
assert.equal(DEFAULT_DISORDER_DAZE_MULTIPLIER, 2)
assert.equal(disorderDazeFormula.formulaId, DISORDER_DAZE_FORMULA_ID)
const disorderDazeResult = disorderDazeFormula.calculate({
  baseDaze: [
    {
      finalImpact: 123,
      dazeMultiplier: DEFAULT_DISORDER_DAZE_MULTIPLIER,
    },
  ],
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  disorderDazeDealt: DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
  dazeTaken: DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  disorderDazeLevel: 60,
})
assert.equal(disorderDazeResult.value, 246 * 1.45)
assert.deepEqual(disorderDazeResult.factorResults, {
  baseDaze: 246,
  resistance: 1,
  disorderDazeDealt: 1,
  dazeTaken: 1,
  disorderDazeLevel: 1.45,
})
assert.equal(Object.isFrozen(disorderDazeResult), true)
assert.equal(Object.isFrozen(disorderDazeResult.factorResults), true)
assert.equal(ENERGY_GENERATION_FORMULA_ID, "energy_generation")
assert.equal(
  energyGenerationFormula.formulaId,
  ENERGY_GENERATION_FORMULA_ID,
)
const energyGenerationResult = energyGenerationFormula.calculate({
  baseEnergyGeneration: {
    baseEnergyGenerationValues: [2, 3],
    finalEnergyRegen: 4,
    effectiveEnergyRegenDurationInSeconds: 5,
  },
  energyGenerationRate: [0.25],
})
assert.equal(energyGenerationResult.value, 31.25)
assert.deepEqual(energyGenerationResult.factorResults, {
  baseEnergyGeneration: 25,
  energyGenerationRate: 1.25,
})
assert.equal(Object.isFrozen(energyGenerationResult), true)
assert.equal(Object.isFrozen(energyGenerationResult.factorResults), true)
assert.equal(ADRENALINE_GENERATION_FORMULA_ID, "adrenaline_generation")
assert.equal(
  adrenalineGenerationFormula.formulaId,
  ADRENALINE_GENERATION_FORMULA_ID,
)
const adrenalineGenerationResult = adrenalineGenerationFormula.calculate({
  baseAdrenalineGeneration: {
    baseAdrenalineGenerationValues: [2, 3],
    finalAdrenalineRegen: 4,
    effectiveAdrenalineRegenDurationInSeconds: 5,
  },
  adrenalineGenerationRate: [0.25],
})
assert.equal(adrenalineGenerationResult.value, 31.25)
assert.deepEqual(adrenalineGenerationResult.factorResults, {
  baseAdrenalineGeneration: 25,
  adrenalineGenerationRate: 1.25,
})
assert.equal(Object.isFrozen(adrenalineGenerationResult), true)
assert.equal(Object.isFrozen(adrenalineGenerationResult.factorResults), true)
assert.equal(DECIBEL_GENERATION_FORMULA_ID, "decibel_generation")
assert.equal(
  decibelGenerationFormula.formulaId,
  DECIBEL_GENERATION_FORMULA_ID,
)
const decibelGenerationResult = decibelGenerationFormula.calculate({
  baseDecibelGeneration: 100,
  decibelGenerationRate: [0.25],
  accompanyingDecibelGenerationRate: 0.5,
})
assert.equal(decibelGenerationResult.value, 62.5)
assert.deepEqual(decibelGenerationResult.factorResults, {
  baseDecibelGeneration: 100,
  decibelGenerationRate: 1.25,
  accompanyingDecibelGenerationRate: 0.5,
})
assert.equal(Object.isFrozen(decibelGenerationResult), true)
assert.equal(Object.isFrozen(decibelGenerationResult.factorResults), true)
assert.equal(
  MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
  "miasmic_shield_reduction",
)
assert.equal(
  miasmicShieldReductionFormula.formulaId,
  MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
)
const miasmicShieldReductionResult = miasmicShieldReductionFormula.calculate({
  baseMiasmicShieldReduction: 100,
  miasmicShieldReductionRate: [0.25],
  miasmicShieldReductionTakenRate: [0.5],
})
assert.equal(miasmicShieldReductionResult.value, 187.5)
assert.deepEqual(miasmicShieldReductionResult.factorResults, {
  baseMiasmicShieldReduction: 100,
  miasmicShieldReductionRate: 1.25,
  miasmicShieldReductionTakenRate: 1.5,
})
assert.equal(Object.isFrozen(miasmicShieldReductionResult), true)
assert.equal(
  Object.isFrozen(miasmicShieldReductionResult.factorResults),
  true,
)
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
assert.equal(ANOMALY_BUILDUP_FORMULA_ID, "anomaly_buildup")
assert.equal(anomalyBuildupFormula.formulaId, ANOMALY_BUILDUP_FORMULA_ID)
const anomalyBuildupResult = anomalyBuildupFormula.calculate({
  baseAnomalyBuildup: 123,
  anomalyMastery: DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
  anomalyBuildupRate: DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
})
assert.equal(anomalyBuildupResult.value, 123)
assert.deepEqual(anomalyBuildupResult.factorResults, {
  baseAnomalyBuildup: 123,
  anomalyMastery: 1,
  anomalyBuildupRate: 1,
  resistance: 1,
})
assert.equal(Object.isFrozen(anomalyBuildupResult), true)
assert.equal(Object.isFrozen(anomalyBuildupResult.factorResults), true)
assert.equal(
  calculateAnomalyTriggerThreshold({
    thresholdTier: "boss",
    thresholdKind: "physical",
    previousAnomalyTriggerCountForAttribute: 0,
    baseThresholdMultiplier: 1.2,
    scenarioThresholdMultiplier: 1.1,
  }),
  4752,
)
assert.equal(ANOMALY_DAMAGE_FORMULA_ID, "anomaly_damage")
assert.equal(anomalyDamageFormula.formulaId, ANOMALY_DAMAGE_FORMULA_ID)
const anomalyDamageResult = anomalyDamageFormula.calculate({
  baseDamage: [{ damageMultiplier: 2, finalStat }],
  damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  anomalyProficiency: DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  defense: DEFAULT_DEFENSE_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  anomalyDamageLevel: DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  anomalyDamageBonus: DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  anomalyCritical: DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
})
assert.equal(anomalyDamageResult.value, 246)
assert.deepEqual(anomalyDamageResult.factorResults, {
  baseDamage: 246,
  damageBonus: 1,
  anomalyProficiency: 1,
  defense: 1,
  resistance: 1,
  damageTaken: 1,
  stunDamage: 1,
  anomalyDamageLevel: 1,
  anomalyDamageBonus: 1,
  anomalyCritical: 1,
})
assert.equal(Object.isFrozen(anomalyDamageResult), true)
assert.equal(Object.isFrozen(anomalyDamageResult.factorResults), true)
assert.equal(
  calculateStandardDisorderDamageMultiplier({
    originalAnomalyAttribute: "fire",
    remainingAnomalyDurationInSeconds: 10,
  }),
  14.5,
)
`,
    )
    writeFileSync(
      join(consumerDirectory, "smoke.ts"),
      `import {
  ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
  ADRENALINE_GENERATION_FORMULA_ID,
  ADRENALINE_GENERATION_RATE_FACTOR_ID,
  ANOMALY_BUILDUP_FORMULA_ID,
  ANOMALY_BUILDUP_RATE_FACTOR_ID,
  ANOMALY_CRITICAL_FACTOR_ID,
  ANOMALY_DAMAGE_BONUS_FACTOR_ID,
  ANOMALY_DAMAGE_FORMULA_ID,
  ANOMALY_DAMAGE_LEVEL_FACTOR_ID,
  ANOMALY_MASTERY_FACTOR_ID,
  ANOMALY_PROFICIENCY_FACTOR_ID,
  BASE_ADRENALINE_GENERATION_FACTOR_ID,
  BASE_ANOMALY_BUILDUP_FACTOR_ID,
  BASE_DAZE_FACTOR_ID,
  BASE_DECIBEL_GENERATION_FACTOR_ID,
  BASE_ENERGY_GENERATION_FACTOR_ID,
  BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
  DAZE_DEALT_FACTOR_ID,
  DAZE_TAKEN_FACTOR_ID,
  DECIBEL_GENERATION_FORMULA_ID,
  DECIBEL_GENERATION_RATE_FACTOR_ID,
  DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
  DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  DEFAULT_CRITICAL_FACTOR_INPUT,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DAZE_DEALT_FACTOR_INPUT,
  DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
  DEFAULT_DISORDER_DAZE_MULTIPLIER,
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  DISORDER_DAZE_DEALT_FACTOR_ID,
  DISORDER_DAZE_FORMULA_ID,
  DISORDER_DAZE_LEVEL_FACTOR_ID,
  ENERGY_GENERATION_FORMULA_ID,
  ENERGY_GENERATION_RATE_FACTOR_ID,
  MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
  MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
  MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
  REGULAR_DAZE_FORMULA_ID,
  accompanyingDecibelGenerationRateFactor,
  adrenalineGenerationFormula,
  adrenalineGenerationRateFactor,
  anomalyBuildupFormula,
  anomalyBuildupRateFactor,
  anomalyCriticalFactor,
  anomalyDamageBonusFactor,
  anomalyDamageFormula,
  anomalyDamageLevelFactor,
  anomalyMasteryFactor,
  anomalyProficiencyFactor,
  baseAdrenalineGenerationFactor,
  baseAnomalyBuildupFactor,
  baseDamageFactor,
  baseDazeFactor,
  baseDecibelGenerationFactor,
  baseEnergyGenerationFactor,
  baseMiasmicShieldReductionFactor,
  calculateAnomalyTriggerThreshold,
  calculateTotalDisplayedDamage,
  calculateFinalStat,
  calculateInitialStat,
  calculateStandardDisorderDamageMultiplier,
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  criticalFactor,
  damageBonusFactor,
  damageTakenFactor,
  dazeDealtFactor,
  dazeTakenFactor,
  decibelGenerationFormula,
  decibelGenerationRateFactor,
  defenseFactor,
  defineFactor,
  defineFormula,
  disorderDazeDealtFactor,
  disorderDazeFormula,
  disorderDazeLevelFactor,
  energyGenerationFormula,
  energyGenerationRateFactor,
  miasmicShieldReductionFormula,
  miasmicShieldReductionRateFactor,
  miasmicShieldReductionTakenRateFactor,
  regularDamageFormula,
  regularDazeFormula,
  resistanceFactor,
  sheerDamageBonusFactor,
  sheerDamageFormula,
  stunDamageFactor,
  type AccompanyingDecibelGenerationRateFactorInput,
  type AdrenalineGenerationFormulaInput,
  type AdrenalineGenerationRateFactorInput,
  type AnomalyBuildupFormulaInput,
  type AnomalyBuildupRateFactorInput,
  type AnomalyCriticalFactorInput,
  type AnomalyDamageBonusFactorInput,
  type AnomalyDamageFormulaInput,
  type AnomalyDamageLevelFactorInput,
  type AnomalyMasteryFactorInput,
  type AnomalyProficiencyFactorInput,
  type AnomalyTriggerThresholdKind,
  type AnomalyTriggerThresholdTier,
  type BaseAdrenalineGenerationFactorInput,
  type BaseAnomalyBuildupFactorInput,
  type BaseDamageFactorInput,
  type BaseDamageFactorInputItem,
  type BaseDazeFactorInput,
  type BaseDazeFactorInputItem,
  type BaseDecibelGenerationFactorInput,
  type BaseEnergyGenerationFactorInput,
  type BaseMiasmicShieldReductionFactorInput,
  type CalculateAnomalyTriggerThresholdParams,
  type CalculateFinalStatParams,
  type CalculateInitialStatParams,
  type CalculateStandardDisorderDamageMultiplierParams,
  type CalculateTargetBaseDefenseParams,
  type CalculateTargetEffectiveDefenseParams,
  type CriticalFactorInput,
  type DamageBonusFactorInput,
  type DamageTakenFactorInput,
  type DazeDealtFactorInput,
  type DazeTakenFactorInput,
  type DecibelGenerationFormulaInput,
  type DecibelGenerationRateFactorInput,
  type DefenseFactorInput,
  type DisorderDazeDealtFactorInput,
  type DisorderDazeFormulaInput,
  type DisorderDazeLevelFactorInput,
  type DisorderSourceAttribute,
  type EnergyGenerationFormulaInput,
  type EnergyGenerationRateFactorInput,
  type Factor,
  type FactorParams,
  type Formula,
  type FormulaFactorResults,
  type FormulaParams,
  type FormulaResult,
  type MiasmicShieldReductionFormulaInput,
  type MiasmicShieldReductionRateFactorInput,
  type MiasmicShieldReductionTakenRateFactorInput,
  type RegularDamageFormulaInput,
  type RegularDazeFormulaInput,
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

const accompanyingDecibelGenerationRateFactorId: "accompanying_decibel_generation_rate" =
  ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID
const defaultAccompanyingDecibelGenerationRateFactorInput: AccompanyingDecibelGenerationRateFactorInput =
  DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT
const adrenalineGenerationFormulaId: "adrenaline_generation" =
  ADRENALINE_GENERATION_FORMULA_ID
const adrenalineGenerationRateFactorId: "adrenaline_generation_rate" =
  ADRENALINE_GENERATION_RATE_FACTOR_ID
const anomalyBuildupFormulaId: "anomaly_buildup" = ANOMALY_BUILDUP_FORMULA_ID
const anomalyBuildupRateFactorId: "anomaly_buildup_rate" =
  ANOMALY_BUILDUP_RATE_FACTOR_ID
const anomalyCriticalFactorId: "anomaly_critical" = ANOMALY_CRITICAL_FACTOR_ID
const anomalyDamageBonusFactorId: "anomaly_damage_bonus" =
  ANOMALY_DAMAGE_BONUS_FACTOR_ID
const anomalyDamageFormulaId: "anomaly_damage" = ANOMALY_DAMAGE_FORMULA_ID
const anomalyDamageLevelFactorId: "anomaly_damage_level" =
  ANOMALY_DAMAGE_LEVEL_FACTOR_ID
const anomalyMasteryFactorId: "anomaly_mastery" = ANOMALY_MASTERY_FACTOR_ID
const anomalyProficiencyFactorId: "anomaly_proficiency" =
  ANOMALY_PROFICIENCY_FACTOR_ID
const anomalyTriggerThresholdKind: AnomalyTriggerThresholdKind = "standard"
const anomalyTriggerThresholdTier: AnomalyTriggerThresholdTier = "normal"
const anomalyTriggerThresholdParams: CalculateAnomalyTriggerThresholdParams = {
  thresholdTier: anomalyTriggerThresholdTier,
  thresholdKind: anomalyTriggerThresholdKind,
  previousAnomalyTriggerCountForAttribute: 0,
  baseThresholdMultiplier: 1,
  scenarioThresholdMultiplier: 1,
}
const anomalyTriggerThreshold: number = calculateAnomalyTriggerThreshold(
  anomalyTriggerThresholdParams,
)
const totalDisplayedDamage: number = calculateTotalDisplayedDamage([
  10.2,
  20.1,
] as const)
const disorderSourceAttribute: DisorderSourceAttribute = "fire"
const standardDisorderDamageMultiplierParams: CalculateStandardDisorderDamageMultiplierParams =
  {
    originalAnomalyAttribute: disorderSourceAttribute,
    remainingAnomalyDurationInSeconds: 10,
  }
const standardDisorderDamageMultiplier: number =
  calculateStandardDisorderDamageMultiplier(
    standardDisorderDamageMultiplierParams,
  )
const baseAdrenalineGenerationFactorId: "base_adrenaline_generation" =
  BASE_ADRENALINE_GENERATION_FACTOR_ID
const baseAnomalyBuildupFactorId: "base_anomaly_buildup" =
  BASE_ANOMALY_BUILDUP_FACTOR_ID
const baseDazeFactorId: "base_daze" = BASE_DAZE_FACTOR_ID
const baseDecibelGenerationFactorId: "base_decibel_generation" =
  BASE_DECIBEL_GENERATION_FACTOR_ID
const baseEnergyGenerationFactorId: "base_energy_generation" =
  BASE_ENERGY_GENERATION_FACTOR_ID
const baseMiasmicShieldReductionFactorId: "base_miasmic_shield_reduction" =
  BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID
const dazeDealtFactorId: "daze_dealt" = DAZE_DEALT_FACTOR_ID
const dazeTakenFactorId: "daze_taken" = DAZE_TAKEN_FACTOR_ID
const decibelGenerationFormulaId: "decibel_generation" =
  DECIBEL_GENERATION_FORMULA_ID
const decibelGenerationRateFactorId: "decibel_generation_rate" =
  DECIBEL_GENERATION_RATE_FACTOR_ID
const defaultDecibelGenerationRateFactorInput: DecibelGenerationRateFactorInput =
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT
const disorderDazeDealtFactorId: "disorder_daze_dealt" =
  DISORDER_DAZE_DEALT_FACTOR_ID
const disorderDazeFormulaId: "disorder_daze" = DISORDER_DAZE_FORMULA_ID
const disorderDazeLevelFactorId: "disorder_daze_level" =
  DISORDER_DAZE_LEVEL_FACTOR_ID
const defaultDisorderDazeMultiplier: 2 = DEFAULT_DISORDER_DAZE_MULTIPLIER
const energyGenerationFormulaId: "energy_generation" =
  ENERGY_GENERATION_FORMULA_ID
const energyGenerationRateFactorId: "energy_generation_rate" =
  ENERGY_GENERATION_RATE_FACTOR_ID
const miasmicShieldReductionFormulaId: "miasmic_shield_reduction" =
  MIASMIC_SHIELD_REDUCTION_FORMULA_ID
const miasmicShieldReductionRateFactorId: "miasmic_shield_reduction_rate" =
  MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID
const defaultMiasmicShieldReductionRateFactorInput: MiasmicShieldReductionRateFactorInput =
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT
const miasmicShieldReductionTakenRateFactorId: "miasmic_shield_reduction_taken_rate" =
  MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID
const defaultMiasmicShieldReductionTakenRateFactorInput: MiasmicShieldReductionTakenRateFactorInput =
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT
const regularDazeFormulaId: "regular_daze" = REGULAR_DAZE_FORMULA_ID
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
const baseDazeInputItem: BaseDazeFactorInputItem = {
  finalImpact: finalStat,
  dazeMultiplier: 2,
}
const baseDazeInputs: BaseDazeFactorInput = [baseDazeInputItem]
const baseEnergyGenerationInput: BaseEnergyGenerationFactorInput = {
  baseEnergyGenerationValues: [2, 3],
  finalEnergyRegen: 4,
  effectiveEnergyRegenDurationInSeconds: 5,
}
const energyGenerationRateInput: EnergyGenerationRateFactorInput = [0.25]
const baseAdrenalineGenerationInput: BaseAdrenalineGenerationFactorInput = {
  baseAdrenalineGenerationValues: [2, 3],
  finalAdrenalineRegen: 4,
  effectiveAdrenalineRegenDurationInSeconds: 5,
}
const adrenalineGenerationRateInput: AdrenalineGenerationRateFactorInput = [
  0.25,
]
const baseDecibelGenerationInput: BaseDecibelGenerationFactorInput = 100
const decibelGenerationRateInput: DecibelGenerationRateFactorInput = [0.25]
const accompanyingDecibelGenerationRateInput: AccompanyingDecibelGenerationRateFactorInput =
  0.5
const baseMiasmicShieldReductionInput: BaseMiasmicShieldReductionFactorInput =
  100
const miasmicShieldReductionRateInput: MiasmicShieldReductionRateFactorInput =
  [0.25]
const miasmicShieldReductionTakenRateInput: MiasmicShieldReductionTakenRateFactorInput =
  [0.5]
const baseAnomalyBuildupInput: BaseAnomalyBuildupFactorInput = 123
const anomalyBuildupRateInputs: AnomalyBuildupRateFactorInput = [0.25, -0.125]
const anomalyCriticalInput: AnomalyCriticalFactorInput = {
  isAnomalyCritical: true,
  anomalyCriticalDamageContributions: [0.5],
}
const anomalyDamageBonusInputs: AnomalyDamageBonusFactorInput = [0.25, -0.125]
const anomalyDamageLevelInput: AnomalyDamageLevelFactorInput = 60
const anomalyMasteryInput: AnomalyMasteryFactorInput = 125.9
const anomalyProficiencyInput: AnomalyProficiencyFactorInput = 125
const criticalInputs: CriticalFactorInput = {
  isCritical: true,
  criticalDamageContributions: [0.5, 0.25],
}
const damageBonusInputs: DamageBonusFactorInput = [0.25, -0.125]
const damageTakenInput: DamageTakenFactorInput = {
  targetDamageTakenIncreases: [0.25],
  targetDamageTakenReductions: [0.125],
}
const dazeDealtInput: DazeDealtFactorInput = {
  dazeDealtIncreases: [0.25],
  dazeDealtReductions: [0.125],
}
const dazeTakenInput: DazeTakenFactorInput = {
  targetDazeTakenIncreases: [0.25],
  targetDazeTakenReductions: [0.125],
}
const disorderDazeDealtInput: DisorderDazeDealtFactorInput = 1.25
const disorderDazeLevelInput: DisorderDazeLevelFactorInput = 60
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
const regularDazeInput: RegularDazeFormulaInput = {
  baseDaze: baseDazeInputs,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  dazeDealt: DEFAULT_DAZE_DEALT_FACTOR_INPUT,
  dazeTaken: DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
}
const disorderDazeInput: DisorderDazeFormulaInput = {
  baseDaze: [
    {
      finalImpact: finalStat,
      dazeMultiplier: defaultDisorderDazeMultiplier,
    },
  ],
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  disorderDazeDealt: DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
  dazeTaken: DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  disorderDazeLevel: disorderDazeLevelInput,
}
const energyGenerationInput: EnergyGenerationFormulaInput = {
  baseEnergyGeneration: baseEnergyGenerationInput,
  energyGenerationRate: energyGenerationRateInput,
}
const adrenalineGenerationInput: AdrenalineGenerationFormulaInput = {
  baseAdrenalineGeneration: baseAdrenalineGenerationInput,
  adrenalineGenerationRate: adrenalineGenerationRateInput,
}
const decibelGenerationInput: DecibelGenerationFormulaInput = {
  baseDecibelGeneration: baseDecibelGenerationInput,
  decibelGenerationRate: decibelGenerationRateInput,
  accompanyingDecibelGenerationRate: accompanyingDecibelGenerationRateInput,
}
const miasmicShieldReductionInput: MiasmicShieldReductionFormulaInput = {
  baseMiasmicShieldReduction: baseMiasmicShieldReductionInput,
  miasmicShieldReductionRate: miasmicShieldReductionRateInput,
  miasmicShieldReductionTakenRate: miasmicShieldReductionTakenRateInput,
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
const anomalyBuildupInput: AnomalyBuildupFormulaInput = {
  baseAnomalyBuildup: baseAnomalyBuildupInput,
  anomalyMastery: DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
  anomalyBuildupRate: DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
}
const anomalyDamageInput: AnomalyDamageFormulaInput = {
  baseDamage: baseDamageInputs,
  damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  anomalyProficiency: DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  defense: DEFAULT_DEFENSE_FACTOR_INPUT,
  resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  anomalyDamageLevel: DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  anomalyDamageBonus: DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  anomalyCritical: DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
}

factor.calculate({ values: [2, 3] })
formulaFactorResults.left
accompanyingDecibelGenerationRateFactorId
defaultAccompanyingDecibelGenerationRateFactorInput
adrenalineGenerationFormulaId
adrenalineGenerationRateFactorId
anomalyBuildupFormulaId
anomalyBuildupRateFactorId
anomalyCriticalFactorId
anomalyDamageBonusFactorId
anomalyDamageFormulaId
anomalyDamageLevelFactorId
anomalyMasteryFactorId
anomalyProficiencyFactorId
anomalyTriggerThreshold
totalDisplayedDamage
disorderSourceAttribute
standardDisorderDamageMultiplier
baseAdrenalineGenerationFactorId
baseAnomalyBuildupFactorId
baseDazeFactorId
baseDecibelGenerationFactorId
baseEnergyGenerationFactorId
baseMiasmicShieldReductionFactorId
dazeDealtFactorId
dazeTakenFactorId
decibelGenerationFormulaId
decibelGenerationRateFactorId
defaultDecibelGenerationRateFactorInput
disorderDazeDealtFactorId
disorderDazeFormulaId
disorderDazeLevelFactorId
defaultDisorderDazeMultiplier
energyGenerationFormulaId
energyGenerationRateFactorId
miasmicShieldReductionFormulaId
miasmicShieldReductionRateFactorId
defaultMiasmicShieldReductionRateFactorInput
miasmicShieldReductionTakenRateFactorId
defaultMiasmicShieldReductionTakenRateFactorInput
regularDazeFormulaId
baseAnomalyBuildupFactor.calculate(baseAnomalyBuildupInput)
anomalyBuildupRateFactor.calculate(anomalyBuildupRateInputs)
anomalyBuildupRateFactor.calculate(DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT)
anomalyCriticalFactor.calculate(anomalyCriticalInput)
anomalyCriticalFactor.calculate(DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT)
anomalyDamageBonusFactor.calculate(anomalyDamageBonusInputs)
anomalyDamageBonusFactor.calculate(DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT)
anomalyDamageLevelFactor.calculate(anomalyDamageLevelInput)
anomalyDamageLevelFactor.calculate(DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT)
anomalyMasteryFactor.calculate(anomalyMasteryInput)
anomalyMasteryFactor.calculate(DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT)
anomalyProficiencyFactor.calculate(anomalyProficiencyInput)
anomalyProficiencyFactor.calculate(DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT)
baseAdrenalineGenerationFactor.calculate(baseAdrenalineGenerationInput)
adrenalineGenerationRateFactor.calculate(adrenalineGenerationRateInput)
adrenalineGenerationRateFactor.calculate(
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
)
baseDecibelGenerationFactor.calculate(baseDecibelGenerationInput)
decibelGenerationRateFactor.calculate(decibelGenerationRateInput)
decibelGenerationRateFactor.calculate(
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
)
accompanyingDecibelGenerationRateFactor.calculate(
  accompanyingDecibelGenerationRateInput,
)
accompanyingDecibelGenerationRateFactor.calculate(
  DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
)
baseDamageFactor.calculate(baseDamageInputs)
baseDazeFactor.calculate(baseDazeInputs)
baseEnergyGenerationFactor.calculate(baseEnergyGenerationInput)
baseMiasmicShieldReductionFactor.calculate(baseMiasmicShieldReductionInput)
energyGenerationRateFactor.calculate(energyGenerationRateInput)
energyGenerationRateFactor.calculate(
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
)
miasmicShieldReductionRateFactor.calculate(miasmicShieldReductionRateInput)
miasmicShieldReductionRateFactor.calculate(
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
)
miasmicShieldReductionTakenRateFactor.calculate(
  miasmicShieldReductionTakenRateInput,
)
miasmicShieldReductionTakenRateFactor.calculate(
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
)
criticalFactor.calculate(criticalInputs)
damageBonusFactor.calculate(damageBonusInputs)
damageTakenFactor.calculate(damageTakenInput)
dazeDealtFactor.calculate(dazeDealtInput)
dazeDealtFactor.calculate(DEFAULT_DAZE_DEALT_FACTOR_INPUT)
dazeTakenFactor.calculate(dazeTakenInput)
dazeTakenFactor.calculate(DEFAULT_DAZE_TAKEN_FACTOR_INPUT)
disorderDazeDealtFactor.calculate(disorderDazeDealtInput)
disorderDazeDealtFactor.calculate(DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT)
disorderDazeLevelFactor.calculate(disorderDazeLevelInput)
defenseFactor.calculate(defenseInput)
resistanceFactor.calculate(resistanceInput)
sheerDamageBonusFactor.calculate(sheerDamageBonusInputs)
sheerDamageBonusFactor.calculate(DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT)
stunDamageFactor.calculate(stunDamageInput)
regularDamageFormula.calculate(regularDamageInput)
regularDazeFormula.calculate(regularDazeInput)
disorderDazeFormula.calculate(disorderDazeInput)
energyGenerationFormula.calculate(energyGenerationInput)
adrenalineGenerationFormula.calculate(adrenalineGenerationInput)
decibelGenerationFormula.calculate(decibelGenerationInput)
miasmicShieldReductionFormula.calculate(miasmicShieldReductionInput)
sheerDamageFormula.calculate(sheerDamageInput)
anomalyBuildupFormula.calculate(anomalyBuildupInput)
anomalyDamageFormula.calculate(anomalyDamageInput)
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
