import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { deriveNanokaPanelValue, type NanokaPanelSource } from "./index"

const repoRoot = join(import.meta.dirname, "../../..")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

describe("nanoka panel normalization gate", () => {
  it("derives live agent base panel fields from retained nanoka stats and level rows", () => {
    const nekomata = readJson<NanokaPanelSource>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1021.json")

    expect(deriveNanokaPanelValue(nekomata, {
      baseKey: "hp_max",
      levelKey: "hp_max",
      growthKey: "hp_growth",
    })).toBeCloseTo(7560.1902, 8)
    expect(deriveNanokaPanelValue(nekomata, {
      baseKey: "attack",
      levelKey: "attack",
      growthKey: "attack_growth",
    })).toBeCloseTo(835.5958, 8)
    expect(deriveNanokaPanelValue(nekomata, {
      baseKey: "defence",
      levelKey: "defence",
      growthKey: "defence_growth",
    })).toBeCloseTo(587.5794, 8)
  })

  it("derives live Bangboo base panel fields from retained nanoka stats and level rows", () => {
    const plugboo = readJson<NanokaPanelSource>("packages/data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json")

    expect(deriveNanokaPanelValue(plugboo, {
      baseKey: "attack",
      levelKey: "attack",
      growthKey: "attack_upgrade",
    })).toBeCloseTo(8057.0996, 8)
    expect(deriveNanokaPanelValue(plugboo, {
      baseKey: "hp_max",
      levelKey: "hp_max",
      growthKey: "hpupgrade",
    })).toBeCloseTo(4210.2983, 8)
    expect(deriveNanokaPanelValue(plugboo, {
      baseKey: "defence",
      levelKey: "defence",
      growthKey: "def_upgrade",
    })).toBeCloseTo(723.8011, 8)
  })

  it("fails loud when a required panel field is missing", () => {
    const nekomata = readJson<NanokaPanelSource>("packages/data/source/raw/nanoka/zzz/2.8/zh/character/1021.json")

    expect(() => deriveNanokaPanelValue(nekomata, {
      baseKey: "missing",
      levelKey: "attack",
      growthKey: "attack_growth",
    })).toThrow("stats.missing")
  })
})
