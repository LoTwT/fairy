import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  deriveNanokaAdrenalinePanel,
  deriveNanokaSkillResourceRecovery,
  nanokaResourceUnitRules,
  type NanokaAdrenalinePanelSource,
  type NanokaSkillResourceParam,
} from "./index"

const repoRoot = join(import.meta.dirname, "../../..")

type NanokaCharacter = NanokaAdrenalinePanelSource & {
  skill: Record<string, {
    description: Array<{
      param?: Array<{
        param: Record<string, NanokaSkillResourceParam>
      }>
    }>
  }>
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function skillParam(character: NanokaCharacter, path: [string, number, number, string]) {
  const [skillKey, descriptionIndex, paramIndex, paramId] = path
  const value = character.skill[skillKey]?.description[descriptionIndex]?.param?.[paramIndex]?.param[paramId]
  if (value === undefined)
    throw new Error(`Missing nanoka skill param ${path.join(".")}`)
  return value
}

describe("nanoka adrenaline and resonance normalization gate", () => {
  it("documents the canonical unit transforms", () => {
    expect(nanokaResourceUnitRules).toMatchObject({
      maxAdrenaline: "stats.rp_max",
      automaticAdrenalineAccumulation: "stats.rp_recover / 100",
      resonanceRecovery: "fever_recovery / 1000",
      adrenalineRecovery: "rp_recovery / 10000",
    })
  })

  it("derives live Yixuan Adrenaline panel fields from retained nanoka stats", () => {
    const yixuan = readJson<NanokaCharacter>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1371.json")

    expect(deriveNanokaAdrenalinePanel(yixuan)).toEqual({
      maxAdrenaline: 120,
      automaticAdrenalineAccumulation: 2,
    })
  })

  it("derives live Yixuan skill Resonance and Adrenaline recovery values", () => {
    const yixuan = readJson<NanokaCharacter>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1371.json")
    const firstBasic = skillParam(yixuan, ["basic", 4, 0, "1371001"])

    expect(deriveNanokaSkillResourceRecovery(firstBasic)).toEqual({
      resonanceRecovery: 71.5,
      resonanceRecoveryGrowth: 0,
      adrenalineRecovery: 0.52,
      adrenalineRecoveryGrowth: 0,
    })
  })

  it("keeps non-Adrenaline agents promotable for Resonance recovery while Adrenaline recovery is zero", () => {
    const nekomata = readJson<NanokaCharacter>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1021.json")
    const firstBasic = skillParam(nekomata, ["basic", 2, 0, "1021001"])

    expect(deriveNanokaSkillResourceRecovery(firstBasic)).toMatchObject({
      resonanceRecovery: 47.025,
      adrenalineRecovery: 0,
    })
  })

  it("fails loud when a required resource field is missing", () => {
    expect(() => deriveNanokaAdrenalinePanel({ stats: { rp_max: 120 } })).toThrow("stats.rp_recover")
    expect(() => deriveNanokaSkillResourceRecovery({
      fever_recovery: 71500,
      fever_recovery_growth: 0,
      rp_recovery: 5200,
    })).toThrow("rp_recovery_growth")
  })
})
