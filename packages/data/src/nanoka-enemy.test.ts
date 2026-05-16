import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  deriveNanokaEnemyVariantMapping,
  deriveNanokaEnemyVariantMappings,
  type NanokaEnemyVariantMappingSpec,
  type NanokaMonsterDetail,
} from "./index"

const repoRoot = join(import.meta.dirname, "../../..")

const variantSpecs: NanokaEnemyVariantMappingSpec[] = [
  {
    cleanedEnemyId: "enemy.dullahan",
    sourceVersion: "2.8",
    detailId: 30000,
    monsterInfoId: 11154,
    expectedName: "杜拉罕",
    expectedCodeName: "Monster_DurahanGrey",
    requiredTags: ["Ether", "Demote", "Middle"],
    goldenAnchors: [],
  },
  {
    cleanedEnemyId: "golden.G18.greta",
    sourceVersion: "2.8",
    detailId: 30004,
    monsterInfoId: 11301,
    expectedName: "格莱特",
    expectedCodeName: "Monster_BoringMachine",
    requiredTags: ["Mech", "Gigantic", "Boss"],
    goldenAnchors: ["G18"],
  },
  {
    cleanedEnemyId: "golden.G19.ruthlessFiend",
    sourceVersion: "2.8",
    detailId: 200141,
    monsterInfoId: 11521,
    expectedName: "凶心疯汉",
    expectedCodeName: "Monster_RuthlessFiend",
    requiredTags: ["Ether", "Demote", "Large"],
    goldenAnchors: ["G19"],
  },
  {
    cleanedEnemyId: "golden.G20.notoriousHati",
    sourceVersion: "2.8",
    detailId: 200014,
    monsterInfoId: 11195,
    expectedName: "恶名·哈提",
    expectedCodeName: "Monster_HatiArmoredBoss",
    requiredTags: ["Ether", "Armored", "Boss"],
    goldenAnchors: ["G20"],
  },
  {
    cleanedEnemyId: "golden.G20.notoriousArmoredHatiAlias",
    sourceVersion: "2.8",
    detailId: 200034,
    monsterInfoId: 11195,
    expectedName: "恶名·装甲哈提",
    expectedCodeName: "Monster_HatiArmoredBoss",
    requiredTags: ["Ether", "Armored", "Boss"],
    goldenAnchors: ["G20"],
  },
  {
    cleanedEnemyId: "golden.G13.miasmaPriest",
    sourceVersion: "2.8",
    detailId: 30033,
    monsterInfoId: 31031,
    expectedName: "秽息司祭",
    expectedCodeName: "Monster_MentorMevorakh",
    requiredTags: ["Bios", "Boss", "Miasma"],
    goldenAnchors: ["G13"],
  },
  {
    cleanedEnemyId: "golden.G13.notoriousPompey",
    sourceVersion: "2.8",
    detailId: 300211,
    monsterInfoId: 11881,
    expectedName: "恶名·庞培",
    expectedCodeName: "Monster_NotoriousPompey",
    requiredTags: ["Ether", "MainStoryBoss", "Middle"],
    goldenAnchors: ["G13"],
  },
]

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function liveMonster(detailId: number) {
  return readJson<NanokaMonsterDetail>(`packages/data/source/raw/nanoka/zzz/2.8/zh/monster/${detailId}.json`)
}

function liveMonsters() {
  return variantSpecs.map(spec => liveMonster(spec.detailId))
}

describe("nanoka enemy monster_info variant mapping gate", () => {
  it("maps retained live monster details to deterministic cleaned/golden enemy identities", () => {
    const mappings = deriveNanokaEnemyVariantMappings(liveMonsters(), variantSpecs)

    expect(mappings.map(mapping => [
      mapping.cleanedEnemyId,
      mapping.nanokaDetailId,
      mapping.nanokaMonsterInfoId,
      mapping.nanokaCodeName,
    ])).toEqual([
      ["enemy.dullahan", 30000, 11154, "Monster_DurahanGrey"],
      ["golden.G18.greta", 30004, 11301, "Monster_BoringMachine"],
      ["golden.G19.ruthlessFiend", 200141, 11521, "Monster_RuthlessFiend"],
      ["golden.G20.notoriousHati", 200014, 11195, "Monster_HatiArmoredBoss"],
      ["golden.G20.notoriousArmoredHatiAlias", 200034, 11195, "Monster_HatiArmoredBoss"],
      ["golden.G13.miasmaPriest", 30033, 31031, "Monster_MentorMevorakh"],
      ["golden.G13.notoriousPompey", 300211, 11881, "Monster_NotoriousPompey"],
    ])
    expect(mappings.every(mapping => mapping.runtimeCutoverReady === false)).toBe(true)
    expect(mappings.find(mapping => mapping.cleanedEnemyId === "golden.G18.greta")).toMatchObject({
      statsRaw: {
        hp: 21523,
        attack: 120,
        defense: 60,
        daze: 7189,
        autoRecoverRate: 0,
        baseBuildupRatio: 0,
      },
      elementProfile: {
        electric: 1,
        physical: -1,
      },
    })
    expect(mappings.find(mapping => mapping.cleanedEnemyId === "golden.G13.miasmaPriest")).toMatchObject({
      statsRaw: {
        hp: 42163,
        defense: 60,
        daze: 7084,
        baseBuildupRatio: 2000,
      },
      elementProfile: {
        ice: -1,
        ether: 1,
      },
    })
  })

  it("proves the Notorious Hati aliases select the same canonical monster_info variant", () => {
    const hati = deriveNanokaEnemyVariantMapping(liveMonster(200014), variantSpecs[3]!)
    const armoredHati = deriveNanokaEnemyVariantMapping(liveMonster(200034), variantSpecs[4]!)

    expect(hati.nanokaMonsterInfoId).toBe(11195)
    expect(armoredHati.nanokaMonsterInfoId).toBe(11195)
    expect(armoredHati.statsRaw).toEqual(hati.statsRaw)
    expect(armoredHati.nanokaCodeName).toBe(hati.nanokaCodeName)
  })

  it("fails loud when the selected monster_info variant is missing or mismatched", () => {
    const detail = liveMonster(30000)
    const missingVariant = structuredClone(detail)
    const mismatchedVariant = structuredClone(detail)

    delete missingVariant.monster_info?.["11154"]
    mismatchedVariant.monster_id = 11155

    expect(() => deriveNanokaEnemyVariantMapping(missingVariant, variantSpecs[0]!)).toThrow("missing monster_info.11154")
    expect(() => deriveNanokaEnemyVariantMapping(mismatchedVariant, variantSpecs[0]!)).toThrow("monster_info id mismatch")
  })

  it("fails loud when required identity, tag, or stat fields are missing", () => {
    const detail = liveMonster(30004)
    const missingName = structuredClone(detail)
    const missingTag = structuredClone(detail)
    const missingHp = structuredClone(detail)

    delete missingName.name
    delete missingTag.monster_info?.["11301"]?.tag
    delete missingHp.monster_info?.["11301"]?.stats?.hp

    expect(() => deriveNanokaEnemyVariantMapping(missingName, variantSpecs[1]!)).toThrow("name")
    expect(() => deriveNanokaEnemyVariantMapping(missingTag, variantSpecs[1]!)).toThrow("tag")
    expect(() => deriveNanokaEnemyVariantMapping(missingHp, variantSpecs[1]!)).toThrow("stats.hp")
  })
})
