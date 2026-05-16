import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  deriveNanokaDeadlyAssaultPeriod,
  type NanokaDaDetail,
  type NanokaDaIndex,
} from "./index"

const repoRoot = join(import.meta.dirname, "../../..")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function livePeriod() {
  return deriveNanokaDeadlyAssaultPeriod(
    readJson<NanokaDaIndex>("packages/data/source/raw/nanoka/zzz/2.8/boss.json"),
    readJson<NanokaDaDetail>("packages/data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json"),
    {
      sourceVersion: "2.8",
      configuredLiveSnapshotDate: "2026-05-15T12:30:00+08:00",
    },
  )
}

describe("nanoka Deadly Assault formal-live semantic mapping gate", () => {
  it("derives the live period, zones, buffs, monsters, weakness, and rank goals", () => {
    const period = livePeriod()

    expect(period).toMatchObject({
      id: "69036",
      title: "危局强袭战",
      sourceVersion: "2.8",
      beginAt: "2026-05-08T04:00:00+08:00",
      endAt: "2026-05-22T03:59:59+08:00",
      runtimeCutoverReady: false,
    })
    expect(period.zones).toHaveLength(3)
    expect(period.zones[0]).toMatchObject({
      zoneId: "6903601",
      stageNumber: 1,
      name: "焚昼余火·法厄同",
      monsterLevel: 70,
      goalType: 2,
      rankGoals: { s: 20000, a: 14000, b: 6000 },
    })
    expect(period.zones[0]?.layerBuffs.map(buff => buff.id)).toEqual(["69013003", "69013601", "69013602"])
    expect(period.zones[0]?.selectableBuffs.map(buff => buff.id)).toEqual(["69012403", "69013603", "69013604"])
    expect(period.zones[0]?.rooms[0]?.monsters[0]).toMatchObject({
      slotId: "31431",
      monsterId: 40005,
      name: "焚昼余火·法厄同",
      weaknessAttributes: ["ice", "wind"],
      stats: {
        hp: 17018878.882499997,
        attack: 2967.1515151515155,
        defense: 952.8000000000001,
        daze: 19540.25,
        anomalyBuildupResistance: 10,
      },
    })
  })

  it("derives boss_adjust as explicit HP/ATK raw adjustment rows plus score points", () => {
    const period = livePeriod()

    expect(period.bossAdjustments).toHaveLength(59)
    expect(period.bossAdjustments[0]).toEqual({
      id: "1001",
      hpAdjustmentRaw: 1200,
      attackAdjustmentRaw: 0,
      operationScorePoints: 1000,
    })
    expect(period.bossAdjustments.at(-1)).toEqual({
      id: "900203",
      hpAdjustmentRaw: 3400,
      attackAdjustmentRaw: 0,
      operationScorePoints: 3400,
    })
  })

  it("rejects future periods before they can enter cleaned output", () => {
    const index = readJson<NanokaDaIndex>("packages/data/source/raw/nanoka/zzz/2.8/boss.json")
    const detail = readJson<NanokaDaDetail>("packages/data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json")

    expect(() => deriveNanokaDeadlyAssaultPeriod(index, detail, {
      sourceVersion: "2.8",
      configuredLiveSnapshotDate: "2026-05-01T00:00:00+08:00",
    })).toThrow("begins after configured live snapshot date")
  })

  it("fails loud when detail period windows drift from the live index", () => {
    const index = readJson<NanokaDaIndex>("packages/data/source/raw/nanoka/zzz/2.8/boss.json")
    const detail = readJson<NanokaDaDetail>("packages/data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json")
    const driftedIndex = structuredClone(index)
    driftedIndex["69036"]!.end = "2026-05-23 03:59:59"

    expect(() => deriveNanokaDeadlyAssaultPeriod(driftedIndex, detail, {
      sourceVersion: "2.8",
      configuredLiveSnapshotDate: "2026-05-15T12:30:00+08:00",
    })).toThrow("end_time does not match boss index")
  })

  it("fails loud when required title, score, HP, or monster stat fields are missing", () => {
    const index = readJson<NanokaDaIndex>("packages/data/source/raw/nanoka/zzz/2.8/boss.json")
    const detail = readJson<NanokaDaDetail>("packages/data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json")
    const brokenTitle = structuredClone(detail)
    const brokenAdjust = structuredClone(detail)
    const brokenMonster = structuredClone(detail)

    delete (brokenTitle as Partial<NanokaDaDetail>).name
    const brokenAdjustRecord = brokenAdjust.boss_adjust["1001"]! as Partial<NanokaDaDetail["boss_adjust"][string]>
    const brokenMonsterStats = brokenMonster.zone["6903601"]!.layer_room["69036011"]!.monster_list["31431"]!.stats as Partial<NanokaDaDetail["zone"][string]["layer_room"][string]["monster_list"][string]["stats"]>
    delete brokenAdjustRecord.points
    delete brokenMonsterStats.hp

    expect(() => deriveNanokaDeadlyAssaultPeriod(index, brokenTitle, {
      sourceVersion: "2.8",
      configuredLiveSnapshotDate: "2026-05-15T12:30:00+08:00",
    })).toThrow("name")
    expect(() => deriveNanokaDeadlyAssaultPeriod(index, brokenAdjust, {
      sourceVersion: "2.8",
      configuredLiveSnapshotDate: "2026-05-15T12:30:00+08:00",
    })).toThrow("boss_adjust.1001.points")
    expect(() => deriveNanokaDeadlyAssaultPeriod(index, brokenMonster, {
      sourceVersion: "2.8",
      configuredLiveSnapshotDate: "2026-05-15T12:30:00+08:00",
    })).toThrow("monster.31431.stats.hp")
  })
})
