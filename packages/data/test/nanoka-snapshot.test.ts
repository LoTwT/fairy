import { createHash } from "node:crypto"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  discoverBangbooIds,
  validateBangbooDetail,
  validateBangbooEntityDetails,
} from "../scripts/nanoka/bangboo.ts"
import {
  discoverCharacterIds,
  validateCharacterDetail,
} from "../scripts/nanoka/characters.ts"
import {
  discoverEquipmentIds,
  validateEquipmentDetail,
} from "../scripts/nanoka/equipment.ts"
import {
  discoverMonsterIds,
  validateMonsterDetail,
  validateMonsterEntityDetails,
} from "../scripts/nanoka/monster.ts"
import {
  discoverShiyuIds,
  shiyuMonsterReferenceValidator,
  validateShiyuDetail,
  validateShiyuEntityDetails,
} from "../scripts/nanoka/shiyu.ts"
import {
  discoverSimulIds,
  simulMonsterReferenceValidator,
  validateSimulDetail,
  validateSimulEntityDetails,
} from "../scripts/nanoka/simul.ts"
import {
  discoverWeaponIds,
  validateWeaponDetail,
} from "../scripts/nanoka/weapon.ts"
import {
  createCrossEntityValidationRecords,
  type CrossEntityValidator,
  type EntityName,
  type EntityValidationData,
} from "../scripts/nanoka/entities.ts"
import type { FetchedHttpAsset } from "../scripts/nanoka/http.ts"
import { NanokaHttpClient } from "../scripts/nanoka/http.ts"
import { loadSourcePolicy, validateManifest } from "../scripts/nanoka/policy.ts"
import {
  fetchNanokaSnapshot,
  fetchUpstreamManifest,
  nanokaArtifactNameForTest,
  recoverNanokaRawDirectory,
  type SnapshotFetchProgress,
  verifyNanokaSnapshots,
} from "../scripts/nanoka/snapshot.ts"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe("Nanoka cross-entity validators", () => {
  const currentEpoch: readonly EntityName[] = [
    "character",
    "equipment",
    "weapon",
    "bangboo",
    "monster",
    "shiyu",
    "simul",
  ]
  const validationData = new Map<EntityName, EntityValidationData>(
    currentEpoch.map((entity) => [
      entity,
      {
        indexValue: {},
        ids: [],
        detailsByLanguage: { zh: new Map(), en: new Map() },
      },
    ]),
  )

  function validator(
    checkId: string,
    fromEntity: EntityName,
    toEntity: EntityName,
    validate: CrossEntityValidator["validate"] = () => ({
      checkedReferenceCount: 1,
      unresolvedReferenceCount: 0,
    }),
  ): CrossEntityValidator {
    return {
      checkId,
      fromEntity,
      toEntity,
      introducedInEntityEpoch: currentEpoch,
      validate,
    }
  }

  it("creates passed records in stable registry order", () => {
    const validators = [
      validator("second/v1", "equipment", "monster"),
      validator("first/v1", "character", "monster"),
    ]
    expect(
      createCrossEntityValidationRecords(
        currentEpoch,
        new Map([...validationData].toReversed()),
        validators,
      ),
    ).toEqual([
      {
        checkId: "second/v1",
        fromEntity: "equipment",
        toEntity: "monster",
        status: "passed",
        checkedReferenceCount: 1,
        unresolvedReferenceCount: 0,
        reason: null,
      },
      {
        checkId: "first/v1",
        fromEntity: "character",
        toEntity: "monster",
        status: "passed",
        checkedReferenceCount: 1,
        unresolvedReferenceCount: 0,
        reason: null,
      },
    ])
  })

  it("records historical epoch applicability without running validators", () => {
    let calls = 0
    const validators = [
      {
        ...validator("source-absent/v1", "weapon", "character", () => {
          calls += 1
          return { checkedReferenceCount: 1, unresolvedReferenceCount: 0 }
        }),
        introducedInEntityEpoch: ["character", "equipment"] as const,
      },
      {
        ...validator("target-absent/v1", "character", "weapon", () => {
          calls += 1
          return { checkedReferenceCount: 1, unresolvedReferenceCount: 0 }
        }),
        introducedInEntityEpoch: ["character", "equipment"] as const,
      },
    ]
    expect(
      createCrossEntityValidationRecords(
        ["character", "equipment"],
        validationData,
        validators,
      ),
    ).toEqual([
      expect.objectContaining({
        checkId: "source-absent/v1",
        status: "not-applicable",
        checkedReferenceCount: 0,
        reason: expect.any(String),
      }),
      expect.objectContaining({
        checkId: "target-absent/v1",
        status: "not-run",
        checkedReferenceCount: 0,
        reason: expect.any(String),
      }),
    ])
    expect(calls).toBe(0)
  })

  it("does not require validators introduced after a historical epoch", () => {
    expect(
      createCrossEntityValidationRecords(
        ["character", "equipment"],
        validationData,
        [validator("future/v1", "character", "monster")],
      ),
    ).toEqual([])
  })

  it("rejects invalid registries, results, and unresolved references", () => {
    const duplicate = validator("duplicate/v1", "character", "monster")
    expect(() =>
      createCrossEntityValidationRecords(currentEpoch, validationData, [
        duplicate,
        duplicate,
      ]),
    ).toThrow("重复跨实体 validator checkId")
    expect(() =>
      createCrossEntityValidationRecords(currentEpoch, validationData, [
        validator("invalid-count/v1", "character", "monster", () => ({
          checkedReferenceCount: 0.5,
          unresolvedReferenceCount: 0,
        })),
      ]),
    ).toThrow("返回了无效引用计数")
    expect(() =>
      createCrossEntityValidationRecords(currentEpoch, validationData, [
        validator("unresolved/v1", "character", "monster", () => ({
          checkedReferenceCount: 2,
          unresolvedReferenceCount: 1,
        })),
      ]),
    ).toThrow("unresolved/v1 存在 1 个未解析引用")
  })
})

describe("Nanoka character resources", () => {
  it("discovers canonical IDs in numeric order", () => {
    expect(discoverCharacterIds({ "20": {}, "3": {}, "1011": {} })).toEqual([
      "3",
      "20",
      "1011",
    ])
    expect(() => discoverCharacterIds({ "01": {} })).toThrow("非法 Agent ID")
    expect(() => discoverCharacterIds({ "1": [] })).toThrow("必须是普通对象")
    expect(() => discoverCharacterIds({})).toThrow("不能为空")
  })

  it("validates optional detail IDs", () => {
    expect(() =>
      validateCharacterDetail({ name: "Anby" }, "1011"),
    ).not.toThrow()
    expect(() => validateCharacterDetail({ id: 1011 }, "1011")).not.toThrow()
    expect(() => validateCharacterDetail({ id: 1012 }, "1011")).toThrow(
      "ID 与路径不一致",
    )
  })
})

describe("Nanoka equipment resources", () => {
  it("discovers canonical Drive Disc IDs and validates details", () => {
    const index = {
      "31100": {
        icon: "UI/31100.png",
        zh: { name: "河豚电音", desc2: "二件套", desc4: "四件套" },
        en: { name: "Puffer Electro", desc2: "2-piece", desc4: "4-piece" },
      },
      "31000": {
        icon: "UI/31000.png",
        zh: { name: "啄木鸟电音", desc2: "二件套", desc4: "四件套" },
        en: {
          name: "Woodpecker Electro",
          desc2: "2-piece",
          desc4: "4-piece",
        },
      },
    }
    expect(discoverEquipmentIds(index)).toEqual(["31000", "31100"])
    expect(() => discoverEquipmentIds({ "031000": {} })).toThrow(
      "非法 Drive Disc ID",
    )
    expect(() =>
      validateEquipmentDetail(
        {
          id: 31000,
          name: "啄木鸟电音",
          desc2: "二件套",
          desc4: "四件套",
          story: "...",
          icon: "UI/31000.png",
          icon2: "UI/31000.png",
        },
        "31000",
        index,
        "zh",
      ),
    ).not.toThrow()
    expect(() =>
      validateEquipmentDetail(
        {
          id: 31100,
          name: "啄木鸟电音",
          desc2: "二件套",
          desc4: "四件套",
          story: "...",
          icon: "UI/31000.png",
          icon2: "UI/31000.png",
        },
        "31000",
        index,
        "zh",
      ),
    ).toThrow("ID 与路径不一致")
  })
})

describe("Nanoka weapon resources", () => {
  it("discovers canonical W-Engine IDs and validates the complete contract", () => {
    const detail = weaponDetail("zh")
    const index = weaponIndex()
    const second = { ...index["12002"], icon: "weapon_2" }
    expect(discoverWeaponIds({ "12002": index["12002"], "2": second })).toEqual(
      ["2", "12002"],
    )
    expect(() => discoverWeaponIds({ "012002": index["12002"] })).toThrow(
      "非法 W-Engine ID",
    )
    expect(() =>
      validateWeaponDetail(detail, "12002", index, "zh"),
    ).not.toThrow()
    expect(() =>
      validateWeaponDetail(
        {
          ...detail,
          level: { ...detail.level, "60": { exp: 1, rate: 6000, rate2: 0 } },
        },
        "12002",
        index,
        "zh",
      ),
    ).toThrow("level.60.exp")
    expect(() =>
      validateWeaponDetail(
        { ...detail, materials: "01:2,2:3|3:4,4:5|5:6,6:7|7:8,8:9|9:10,10:11" },
        "12002",
        index,
        "zh",
      ),
    ).toThrow("正整数 itemId:amount")
  })
})

describe("Nanoka bangboo resources", () => {
  it("validates regular and confirmed empty structures", () => {
    const index = bangbooIndex()
    const detail = bangbooDetail("zh")
    expect(
      discoverBangbooIds({
        "13001": index["13001"],
        "2": { ...index["13001"], zh: "二", en: "Two" },
      }),
    ).toEqual(["2", "13001"])
    expect(() => discoverBangbooIds({ "013001": index["13001"] })).toThrow(
      "非法 Bangboo ID",
    )
    expect(() =>
      validateBangbooDetail(detail, "13001", index, "zh"),
    ).not.toThrow()
    const emptyIndex = bangbooIndex(true)
    expect(() =>
      validateBangbooDetail(
        bangbooDetail("zh", true),
        "13001",
        emptyIndex,
        "zh",
      ),
    ).not.toThrow()
  })

  it("rejects invalid types and unresolved internal references", () => {
    const index = bangbooIndex()
    expect(() =>
      validateBangbooDetail(
        {
          ...bangbooDetail("zh"),
          stats: { ...bangbooDetail("zh").stats, attack: "1" },
        },
        "13001",
        index,
        "zh",
      ),
    ).toThrow("attack 必须是整数")
    const detail = bangbooDetail("zh")
    detail.skill.a.level["1"]!.param = "Skill:9999, Prop:1001"
    expect(() => validateBangbooDetail(detail, "13001", index, "zh")).toThrow(
      "技能引用未闭合",
    )
  })

  it("compares only cross-language non-localized structures", () => {
    const zh = bangbooDetail("zh")
    const en = bangbooDetail("en")
    expect(() =>
      validateBangbooEntityDetails({
        zh: new Map([["13001", zh]]),
        en: new Map([["13001", en]]),
      }),
    ).not.toThrow()
    en.level["1"]!.extra["201"]!.name = "Localized Name"
    expect(() =>
      validateBangbooEntityDetails({
        zh: new Map([["13001", zh]]),
        en: new Map([["13001", en]]),
      }),
    ).not.toThrow()
    en.stats.attack = 999
    expect(() =>
      validateBangbooEntityDetails({
        zh: new Map([["13001", zh]]),
        en: new Map([["13001", en]]),
      }),
    ).toThrow("非本地化结构不一致")
  })
})

describe("Nanoka monster resources", () => {
  it("validates multi-unit details and confirmed empty monster_info", () => {
    const index = monsterIndex()
    const detail = monsterDetail("zh")
    expect(
      discoverMonsterIds({
        "5001": { ...index["1001"], zh: "五", en: "Five" },
        "1001": index["1001"],
      }),
    ).toEqual(["1001", "5001"])
    expect(() =>
      validateMonsterDetail(detail, "1001", index, "zh"),
    ).not.toThrow()

    const emptyIndex = monsterIndex(true)
    expect(() =>
      validateMonsterDetail(
        monsterDetail("zh", true),
        "1001",
        emptyIndex,
        "zh",
      ),
    ).not.toThrow()
  })

  it("rejects invalid IDs, inconsistent empty info, and malformed types", () => {
    const index = monsterIndex()
    expect(() => discoverMonsterIds({ "01001": index["1001"] })).toThrow(
      "非法 Monster ID",
    )

    const mismatchedUnit = monsterDetail("zh")
    mismatchedUnit.monster_info["2001"]!.id = 2999
    expect(() =>
      validateMonsterDetail(mismatchedUnit, "1001", index, "zh"),
    ).toThrow("key 与 id 不一致")

    const unresolvedMain = monsterDetail("zh")
    unresolvedMain.monster_id = 2999
    expect(() =>
      validateMonsterDetail(unresolvedMain, "1001", index, "zh"),
    ).not.toThrow()

    const inconsistentEmpty = monsterDetail("zh", true)
    inconsistentEmpty.monster_id = 2999
    expect(() =>
      validateMonsterDetail(
        inconsistentEmpty,
        "1001",
        monsterIndex(true),
        "zh",
      ),
    ).toThrow("空 monster_info 必须使用 monster_id=0")

    const malformed = monsterDetail("zh")
    malformed.monster_info["2001"]!.element.fire = "1" as unknown as number
    expect(() => validateMonsterDetail(malformed, "1001", index, "zh")).toThrow(
      "element.fire 必须是整数",
    )
  })

  it("rejects zh/en numeric mismatches while allowing localized text", () => {
    const zh = monsterDetail("zh")
    const en = monsterDetail("en")
    expect(() =>
      validateMonsterEntityDetails({
        zh: new Map([["1001", zh]]),
        en: new Map([["1001", en]]),
      }),
    ).not.toThrow()

    en.monster_info["2002"]!.curves.hp.curve[1] = 999
    expect(() =>
      validateMonsterEntityDetails({
        zh: new Map([["1001", zh]]),
        en: new Map([["1001", en]]),
      }),
    ).toThrow("zh/en 数值不一致")
  })
})

describe("Nanoka shiyu resources", () => {
  it("discovers IDs, accepts time variants, zones, duplicate stages, and empty parent rooms", () => {
    const base = shiyuIndex()["620541"]!
    expect(
      discoverShiyuIds({
        "620541": base,
        "2": { ...base, zh: "二", en: "Two" },
      }),
    ).toEqual(["2", "620541"])
    expect(() => discoverShiyuIds({ "0620541": base })).toThrow("非法 Shiyu ID")
    for (const times of [
      {},
      { live_begin: "live-start", live_end: "live-end" },
      { begin: "start", end: "end" },
      {
        begin: "start",
        end: "end",
        live_begin: "live-start",
        live_end: "live-end",
      },
    ])
      expect(() =>
        discoverShiyuIds({ "620541": { ...base, ...times } }),
      ).not.toThrow()

    expect(() =>
      validateShiyuDetail(shiyuDetail("zh"), "620541", shiyuIndex()),
    ).not.toThrow()
    const brokenChild = shiyuDetail("zh")
    brokenChild.zone["6205405"]!.child = [999999]
    expect(() =>
      validateShiyuDetail(brokenChild, "620541", shiyuIndex()),
    ).toThrow("child[0] 引用未闭合")
    const { end: _end, ...missingEnd } = base
    expect(() =>
      discoverShiyuIds({
        "620541": { ...missingEnd, begin: "start" },
      }),
    ).toThrow("begin/end 必须同时存在或缺失")
  })

  it("allows localized text but rejects cross-language machine drift", () => {
    const zh = shiyuDetail("zh")
    const en = shiyuDetail("en")
    expect(() =>
      validateShiyuEntityDetails({
        zh: new Map([["620541", zh]]),
        en: new Map([["620541", en]]),
      }),
    ).not.toThrow()
    en.zone["62054051"]!.stage_num = 6
    expect(() =>
      validateShiyuEntityDetails({
        zh: new Map([["620541", zh]]),
        en: new Map([["620541", en]]),
      }),
    ).toThrow("zh/en 机器值不一致")
  })

  it("validates nested Monster IDs rather than outer entry keys", () => {
    const data = new Map<EntityName, EntityValidationData>([
      [
        "shiyu",
        {
          indexValue: shiyuIndex(),
          ids: ["620541"],
          detailsByLanguage: {
            zh: new Map([["620541", shiyuDetail("zh")]]),
            en: new Map([["620541", shiyuDetail("en")]]),
          },
        },
      ],
      [
        "monster",
        {
          indexValue: monsterIndex(),
          ids: ["1001"],
          detailsByLanguage: { zh: new Map(), en: new Map() },
        },
      ],
    ])
    expect(shiyuMonsterReferenceValidator.validate({ entities: data })).toEqual(
      {
        checkedReferenceCount: 2,
        unresolvedReferenceCount: 0,
      },
    )
    const broken = shiyuDetail("en")
    broken.zone["62054051"]!.layer_room["62054051"]!.monster_list["11114"]!.id =
      9999
    data.get("shiyu")!.detailsByLanguage.en.set("620541", broken)
    expect(() =>
      shiyuMonsterReferenceValidator.validate({ entities: data }),
    ).toThrow(
      "shiyu 620541 的 en.zone.62054051.layer_room.62054051.monster_list.11114.id（monsterListEntryKey=11114）引用了未解析 Monster ID 9999",
    )
  })
})

describe("Nanoka simul resources", () => {
  it("validates graph structure, legal empties, and internal closures", () => {
    const index = simulIndex()
    expect(
      discoverSimulIds({
        "101": index["101"],
        "2": { end: "later" },
      }),
    ).toEqual(["2", "101"])
    expect(() => discoverSimulIds({ "0101": { end: "" } })).toThrow(
      "非法 Simul ID",
    )
    expect(() =>
      validateSimulDetail(simulDetail("zh"), "101", index),
    ).not.toThrow()

    const empty = simulDetail("zh", true)
    expect(() => validateSimulDetail(empty, "101", index)).not.toThrow()

    const brokenNode = simulDetail("zh")
    brokenNode.node["10101"]!.id = 10102
    expect(() => validateSimulDetail(brokenNode, "101", index)).toThrow(
      "key 与 id 不一致",
    )

    const brokenNextPage = simulDetail("zh")
    brokenNextPage.node["10101"]!.story_event["5001"]!["7001"]!.next_page = [
      9999,
    ]
    expect(() => validateSimulDetail(brokenNextPage, "101", index)).toThrow(
      "story-event ID",
    )

    const brokenNodeUnlock = simulDetail("zh")
    brokenNodeUnlock.node["10101"]!.story_event["5001"]![
      "7001"
    ]!.next_node_unlock = [10101]
    expect(() => validateSimulDetail(brokenNodeUnlock, "101", index)).toThrow(
      "story-event group key",
    )

    const brokenRecordUnlock = simulDetail("zh")
    brokenRecordUnlock.node["10101"]!.story_event["5001"]![
      "7001"
    ]!.next_record_unlock = [9999]
    expect(() => validateSimulDetail(brokenRecordUnlock, "101", index)).toThrow(
      "record 成员 ID 与 battle ID 两个目标命名空间",
    )

    const driftedLayerRoom = simulDetail("zh")
    driftedLayerRoom.node["10101"]!.battle["1010801"]!.layer.layer_room = {
      "1": simulRoom("zh"),
    }
    expect(() => validateSimulDetail(driftedLayerRoom, "101", index)).toThrow(
      "当前必须为空对象",
    )
  })

  it("allows localized text while enforcing recursive machine consistency", () => {
    const zh = simulDetail("zh")
    const en = simulDetail("en")
    expect(() =>
      validateSimulEntityDetails({
        zh: new Map([["101", zh]]),
        en: new Map([["101", en]]),
      }),
    ).not.toThrow()
    en.node["10101"]!.battle["1010801"]!.layer.monster_level = 99
    expect(() =>
      validateSimulEntityDetails({
        zh: new Map([["101", zh]]),
        en: new Map([["101", en]]),
      }),
    ).toThrow("zh/en 机器值不一致")
    en.node["10101"]!.battle["1010801"]!.layer.monster_level = 70
    en.end_time = "changed"
    expect(() =>
      validateSimulEntityDetails({
        zh: new Map([["101", zh]]),
        en: new Map([["101", en]]),
      }),
    ).toThrow("zh/en 机器字符串不一致")
  })

  it("validates battle-level nested Monster IDs rather than outer keys", () => {
    const data = new Map<EntityName, EntityValidationData>([
      [
        "simul",
        {
          indexValue: simulIndex(),
          ids: ["101"],
          detailsByLanguage: {
            zh: new Map([["101", simulDetail("zh")]]),
            en: new Map([["101", simulDetail("en")]]),
          },
        },
      ],
      [
        "monster",
        {
          indexValue: monsterIndex(),
          ids: ["1001"],
          detailsByLanguage: { zh: new Map(), en: new Map() },
        },
      ],
    ])
    expect(simulMonsterReferenceValidator.validate({ entities: data })).toEqual(
      {
        checkedReferenceCount: 2,
        unresolvedReferenceCount: 0,
      },
    )
    const broken = simulDetail("en")
    broken.node["10101"]!.battle["1010801"]!.layer_room["8101"]!.monster_list[
      "9001"
    ]!.id = 9999
    data.get("simul")!.detailsByLanguage.en.set("101", broken)
    expect(() =>
      simulMonsterReferenceValidator.validate({ entities: data }),
    ).toThrow(
      "en.node.10101.battle.1010801.layer_room.8101.monster_list.9001.id（monsterListEntryKey=9001）引用了未解析 Monster ID 9999",
    )
  })
})

describe("Nanoka snapshots", () => {
  it("writes a complete raw-byte snapshot and verifies it offline", async () => {
    const directory = await temporaryDirectory()
    const result = await createSnapshot(directory, false)
    expect(result.manifest.summary).toMatchObject({
      entityTypeCount: 7,
      assetCount: 26,
      entities: {
        character: {
          recordCount: 2,
          detailCountByLanguage: { zh: 2, en: 2 },
          assetCount: 5,
        },
        equipment: {
          recordCount: 2,
          detailCountByLanguage: { zh: 2, en: 2 },
          assetCount: 5,
        },
        weapon: {
          recordCount: 1,
          detailCountByLanguage: { zh: 1, en: 1 },
          assetCount: 3,
        },
        bangboo: {
          recordCount: 1,
          detailCountByLanguage: { zh: 1, en: 1 },
          assetCount: 3,
        },
        monster: {
          recordCount: 1,
          detailCountByLanguage: { zh: 1, en: 1 },
          assetCount: 3,
        },
        shiyu: {
          recordCount: 1,
          detailCountByLanguage: { zh: 1, en: 1 },
          assetCount: 3,
        },
        simul: {
          recordCount: 1,
          detailCountByLanguage: { zh: 1, en: 1 },
          assetCount: 3,
        },
      },
    })
    const rawIndex = await readFile(join(directory, "3.0", "character.json"))
    expect(rawIndex.toString()).toBe('{"1011":{},"2":{}}')
    const verification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification).toEqual([{ snapshotVersion: "3.0", errors: [] }])
  })

  it("writes and offline-recomputes nonempty cross-entity records", async () => {
    const directory = await temporaryDirectory()
    const validators: readonly CrossEntityValidator[] = [
      {
        checkId: "character-monster-test/v1",
        fromEntity: "character",
        toEntity: "monster",
        introducedInEntityEpoch: [
          "character",
          "equipment",
          "weapon",
          "bangboo",
          "monster",
        ],
        validate({ entities }) {
          return {
            checkedReferenceCount:
              entities.get("character")!.ids.length +
              entities.get("monster")!.ids.length,
            unresolvedReferenceCount: 0,
          }
        },
      },
    ]
    const result = await createSnapshot(
      directory,
      false,
      {},
      {
        crossEntityValidators: validators,
      },
    )
    expect(result.manifest.validation.crossEntityReferences).toEqual([
      {
        checkId: "character-monster-test/v1",
        fromEntity: "character",
        toEntity: "monster",
        status: "passed",
        checkedReferenceCount: 3,
        unresolvedReferenceCount: 0,
        reason: null,
      },
    ])
    expect(
      await verifyNanokaSnapshots({
        policy: await loadSourcePolicy(),
        rawDirectory: directory,
        crossEntityValidators: validators,
      }),
    ).toEqual([{ snapshotVersion: "3.0", errors: [] }])

    const manifestPath = join(directory, "3.0", "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    manifest.validation.crossEntityReferences[0].checkedReferenceCount = 2
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
    const verification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
      crossEntityValidators: validators,
    })
    expect(verification[0]?.errors.join("\n")).toContain("离线重算结果不匹配")
  })

  it("rejects malformed cross-entity registry records", async () => {
    const directory = await temporaryDirectory()
    const validators: readonly CrossEntityValidator[] = [
      {
        checkId: "first-test/v1",
        fromEntity: "character",
        toEntity: "monster",
        introducedInEntityEpoch: [
          "character",
          "equipment",
          "weapon",
          "bangboo",
          "monster",
        ],
        validate: () => ({
          checkedReferenceCount: 1,
          unresolvedReferenceCount: 0,
        }),
      },
      {
        checkId: "second-test/v1",
        fromEntity: "equipment",
        toEntity: "monster",
        introducedInEntityEpoch: [
          "character",
          "equipment",
          "weapon",
          "bangboo",
          "monster",
        ],
        validate: () => ({
          checkedReferenceCount: 1,
          unresolvedReferenceCount: 0,
        }),
      },
    ]
    await createSnapshot(
      directory,
      false,
      {},
      {
        crossEntityValidators: validators,
      },
    )
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")
    const original = JSON.parse(await readFile(manifestPath, "utf8"))
    const mutations: Array<{
      mutate(manifest: typeof original): void
      expected: string
    }> = [
      {
        mutate: (manifest) => {
          manifest.validation.crossEntityReferences[0].checkId = "unknown/v1"
        },
        expected: "未知跨实体 validator 记录",
      },
      {
        mutate: (manifest) => {
          manifest.validation.crossEntityReferences.pop()
        },
        expected: "记录数量不匹配",
      },
      {
        mutate: (manifest) => {
          manifest.validation.crossEntityReferences.push(
            manifest.validation.crossEntityReferences[0],
          )
        },
        expected: "重复跨实体 validator 记录",
      },
      {
        mutate: (manifest) => {
          manifest.validation.crossEntityReferences.reverse()
        },
        expected: "记录顺序错误",
      },
      {
        mutate: (manifest) => {
          manifest.validation.crossEntityReferences[0].fromEntity = "equipment"
        },
        expected: "实体边界不匹配",
      },
      {
        mutate: (manifest) => {
          manifest.validation.crossEntityReferences[0].status = "not-run"
          manifest.validation.crossEntityReferences[0].reason = "missing"
        },
        expected: "status 与当前 epoch 适用性不匹配",
      },
      {
        mutate: (manifest) => {
          manifest.validation.crossEntityReferences[0].reason = "unexpected"
        },
        expected: "passed 记录语义无效",
      },
    ]
    for (const { mutate, expected } of mutations) {
      const manifest = structuredClone(original)
      mutate(manifest)
      await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
      const verification = await verifyNanokaSnapshots({
        policy: await loadSourcePolicy(),
        rawDirectory: directory,
        crossEntityValidators: validators,
      })
      expect(verification[0]?.errors.join("\n")).toContain(expected)
    }
  })

  it("validates carried-forward entities and preserves the old snapshot on relation failure", async () => {
    const directory = await temporaryDirectory()
    let rejectReferences = false
    let observedCarriedEntities = false
    const validator: CrossEntityValidator = {
      checkId: "carried-test/v1",
      fromEntity: "character",
      toEntity: "monster",
      introducedInEntityEpoch: [
        "character",
        "equipment",
        "weapon",
        "bangboo",
        "monster",
      ],
      validate({ entities }) {
        observedCarriedEntities =
          entities.get("character")?.ids.length === 2 &&
          entities.get("monster")?.ids.length === 1
        return {
          checkedReferenceCount: 1,
          unresolvedReferenceCount: rejectReferences ? 1 : 0,
        }
      },
    }
    await createSnapshot(
      directory,
      false,
      {},
      {
        crossEntityValidators: [validator],
      },
    )
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")
    const before = await readFile(manifestPath)
    observedCarriedEntities = false
    rejectReferences = true
    await expect(
      createSnapshot(
        directory,
        false,
        {},
        {
          entities: ["equipment"],
          crossEntityValidators: [validator],
        },
      ),
    ).rejects.toThrow("carried-test/v1 存在 1 个未解析引用")
    expect(observedCarriedEntities).toBe(true)
    expect(await readFile(manifestPath)).toEqual(before)
  })

  it("reports structured fetch progress", async () => {
    const directory = await temporaryDirectory()
    const stages: string[] = []
    const detailProgress: Array<{ completed: number; total: number }> = []
    await createSnapshot(
      directory,
      false,
      {},
      {
        onProgress: (progress) => {
          stages.push(progress.stage)
          if (progress.stage === "entity-details") detailProgress.push(progress)
        },
      },
    )

    expect(stages).toEqual([
      "preparing",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "entity-details",
      "entity-details",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "entity-details",
      "entity-details",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "verifying",
      "verifying",
      "verifying",
      "verifying",
      "publishing",
    ])
    expect(detailProgress).toHaveLength(18)
    expect(detailProgress.at(-1)).toMatchObject({ completed: 2, total: 2 })
  })

  it("rebuilds selected equipment while carrying validated other entity assets", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)

    const result = await createSnapshot(
      directory,
      false,
      {},
      { entities: ["equipment"] },
    )

    expect(result.manifest.fetchScope).toEqual({
      mode: "selected",
      requestedEntities: ["equipment"],
    })
    expect(result.carriedForwardAssetCount).toBe(20)
    expect(
      result.manifest.assets
        .filter((asset) => asset.result === "carried-forward")
        .every((asset) => asset.entity !== "equipment"),
    ).toBe(true)
  })

  it("upgrades a legal six-entity v2 snapshot by fetching only simul", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    await retainSnapshotEntities(directory, [
      "character",
      "equipment",
      "weapon",
      "bangboo",
      "monster",
      "shiyu",
    ])

    expect(
      await verifyNanokaSnapshots({
        policy: await loadSourcePolicy(),
        rawDirectory: directory,
      }),
    ).toEqual([{ snapshotVersion: "3.0", errors: [] }])
    const upgraded = await createSnapshot(
      directory,
      false,
      {},
      { entities: ["simul"] },
    )
    expect(upgraded.manifest.entities).toEqual([
      "character",
      "equipment",
      "weapon",
      "bangboo",
      "monster",
      "shiyu",
      "simul",
    ])
    expect(upgraded.carriedForwardAssetCount).toBe(22)
  })

  it("requires bangboo and monster migration from the three-entity epoch", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    await retainSnapshotEntities(directory, [
      "character",
      "equipment",
      "weapon",
    ])

    expect(
      await verifyNanokaSnapshots({
        policy: await loadSourcePolicy(),
        rawDirectory: directory,
      }),
    ).toEqual([{ snapshotVersion: "3.0", errors: [] }])
    const before = await readFile(join(directory, "3.0", "fetch-manifest.json"))
    await expect(
      createSnapshot(directory, false, {}, { entities: ["monster"] }),
    ).rejects.toThrow("缺少未选实体 bangboo")
    expect(
      await readFile(join(directory, "3.0", "fetch-manifest.json")),
    ).toEqual(before)

    const upgraded = await createSnapshot(
      directory,
      false,
      {},
      { entities: ["bangboo", "monster", "shiyu", "simul"] },
    )
    expect(upgraded.manifest.entities).toEqual([
      "character",
      "equipment",
      "weapon",
      "bangboo",
      "monster",
      "shiyu",
      "simul",
    ])
    expect(upgraded.carriedForwardAssetCount).toBe(13)
  })

  it("requires weapon, bangboo, and monster migration from the two-entity epoch", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    await retainSnapshotEntities(directory, ["character", "equipment"])
    expect(
      await verifyNanokaSnapshots({
        policy: await loadSourcePolicy(),
        rawDirectory: directory,
      }),
    ).toEqual([{ snapshotVersion: "3.0", errors: [] }])

    const before = await readFile(join(directory, "3.0", "fetch-manifest.json"))
    await expect(
      createSnapshot(
        directory,
        false,
        {},
        { entities: ["bangboo", "monster"] },
      ),
    ).rejects.toThrow("缺少未选实体 weapon")
    expect(
      await readFile(join(directory, "3.0", "fetch-manifest.json")),
    ).toEqual(before)

    const migrated = await createSnapshot(
      directory,
      false,
      {},
      { entities: ["weapon", "bangboo", "monster", "shiyu", "simul"] },
    )
    expect(migrated.manifest.entities).toEqual([
      "character",
      "equipment",
      "weapon",
      "bangboo",
      "monster",
      "shiyu",
      "simul",
    ])
    expect(migrated.carriedForwardAssetCount).toBe(10)
  })

  it("migrates a strict v1 character snapshot only after selected entities succeed", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const snapshotDirectory = join(directory, "3.0")
    const manifestPath = join(snapshotDirectory, "fetch-manifest.json")
    const v2 = JSON.parse(await readFile(manifestPath, "utf8")) as {
      schemaVersion: string
      entities: string[]
      fetchScope: unknown
      validation: unknown
      assets: Array<Record<string, unknown>>
      summary: {
        assetCount: number
        totalBytes: number
        entities: {
          character: {
            recordCount: number
            detailCountByLanguage: { zh: number; en: number }
          }
        }
      }
    }
    const characterAssets = v2.assets
      .filter(
        (asset) =>
          asset.entity === "character" || asset.kind === "upstream-manifest",
      )
      .map((asset) => {
        if (asset.kind === "upstream-manifest") return asset
        if (asset.kind === "entity-index")
          return {
            ...asset,
            assetId: "character-index",
            kind: "character-index",
            entity: undefined,
          }
        return {
          ...asset,
          assetId: `character-detail:${String(asset.language)}:${String(asset.entityId)}`,
          kind: "character-detail",
          characterId: asset.entityId,
          entity: undefined,
          entityId: undefined,
        }
      })
    const v1 = {
      ...v2,
      schemaVersion: "nanoka-fetch-manifest/v1",
      assets: characterAssets,
      summary: {
        characterCount: v2.summary.entities.character.recordCount,
        zhDetailCount: v2.summary.entities.character.detailCountByLanguage.zh,
        enDetailCount: v2.summary.entities.character.detailCountByLanguage.en,
        assetCount: characterAssets.length,
        totalBytes: characterAssets.reduce(
          (sum, asset) => sum + Number(asset.bytes),
          0,
        ),
      },
    } as Record<string, unknown>
    delete v1.entities
    delete v1.fetchScope
    delete v1.validation
    await rm(join(snapshotDirectory, "equipment.json"))
    await rm(join(snapshotDirectory, "zh", "equipment"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "equipment"), { recursive: true })
    await rm(join(snapshotDirectory, "weapon.json"))
    await rm(join(snapshotDirectory, "zh", "weapon"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "weapon"), { recursive: true })
    await rm(join(snapshotDirectory, "bangboo.json"))
    await rm(join(snapshotDirectory, "zh", "bangboo"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "bangboo"), { recursive: true })
    await rm(join(snapshotDirectory, "monster.json"))
    await rm(join(snapshotDirectory, "zh", "monster"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "monster"), { recursive: true })
    await rm(join(snapshotDirectory, "shiyu.json"))
    await rm(join(snapshotDirectory, "zh", "shiyu"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "shiyu"), { recursive: true })
    await rm(join(snapshotDirectory, "simul.json"))
    await rm(join(snapshotDirectory, "zh", "simul"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "simul"), { recursive: true })
    await writeFile(manifestPath, `${JSON.stringify(v1)}\n`)

    expect(
      await verifyNanokaSnapshots({
        policy: await loadSourcePolicy(),
        rawDirectory: directory,
      }),
    ).toEqual([{ snapshotVersion: "3.0", errors: [] }])
    const migrated = await createSnapshot(
      directory,
      false,
      {},
      {
        entities: [
          "equipment",
          "weapon",
          "bangboo",
          "monster",
          "shiyu",
          "simul",
        ],
      },
    )
    expect(migrated.manifest.schemaVersion).toBe("nanoka-fetch-manifest/v2")
    expect(migrated.manifest.entities).toEqual([
      "character",
      "equipment",
      "weapon",
      "bangboo",
      "monster",
      "shiyu",
      "simul",
    ])
  })

  it("reuses validated files on 304 and reports drift", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const reused = await createSnapshot(directory, true)
    expect(reused.reusedAssetCount).toBe(25)
    expect(reused.driftedAssetIds).toEqual([])

    const drifted = await createSnapshot(directory, false, {
      "/zzz/3.0/en/character/1011.json": '{"id":1011,"name":"changed"}',
    })
    expect(drifted.driftedAssetIds).toContain("entity-detail:character:en:1011")
  })

  it("refetches unconditionally after a 304 finds damaged cached bytes", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const indexPath = join(directory, "3.0", "character.json")
    await writeFile(indexPath, "damaged")

    const refreshed = await createSnapshot(directory, true)
    expect(refreshed.manifest.summary.entities.character.recordCount).toBe(2)
    expect(await readFile(indexPath, "utf8")).toBe('{"1011":{},"2":{}}')
  })

  it("rejects unsafe persisted asset paths before reading the cache", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      assets: Array<{ assetId: string; localPath: string }>
    }
    const index = manifest.assets.find(
      (asset) => asset.assetId === "entity-index:character",
    )
    if (index === undefined) throw new Error("missing fixture asset")
    index.localPath = "../outside.json"
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)

    await expect(createSnapshot(directory, true)).rejects.toThrow(
      "资源本地路径不安全",
    )
    expect(await readdir(directory)).toContain("3.0")
  })

  it("isolates unrelated broken directories when finding manifest cache", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    await mkdir(join(directory, "broken"))
    await writeFile(join(directory, "broken", "fetch-manifest.json"), "invalid")

    const policy = await loadSourcePolicy()
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: { ...policy.requestPolicy, minimumStartIntervalMs: 0 },
      },
      {
        fetchImplementation: async () => new Response(null, { status: 304 }),
        sleep: async () => {},
      },
    )
    await expect(
      fetchUpstreamManifest(policy, client, directory),
    ).resolves.toMatchObject({ manifest: { zzz: { live: "3.0" } } })
  })

  it("reports staging and backup artifacts without modifying them", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const staging = nanokaArtifactNameForTest("3.0", "staging", "active")
    const backup = nanokaArtifactNameForTest("3.0", "backup", "active")
    await mkdir(join(directory, staging))
    await mkdir(join(directory, backup))

    const verification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification).toEqual([
      {
        snapshotVersion: "3.0",
        errors: [`存在未恢复的 Nanoka artifact：${backup}`],
      },
      {
        snapshotVersion: "3.0",
        errors: [`存在未恢复的 Nanoka artifact：${staging}`],
      },
      { snapshotVersion: "3.0", errors: [] },
    ])
    expect(await readdir(directory)).toContain(staging)
    expect(await readdir(directory)).toContain(backup)

    const scopedVerification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
      version: "3.0",
    })
    expect(scopedVerification).toContainEqual({
      snapshotVersion: "3.0",
      errors: [`存在未恢复的 Nanoka artifact：${staging}`],
    })
    expect(scopedVerification).toContainEqual({
      snapshotVersion: "3.0",
      errors: [`存在未恢复的 Nanoka artifact：${backup}`],
    })
  })

  it("reports lock and pending-lock artifacts without modifying them", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const lock = nanokaArtifactNameForTest("3.0", "lock")
    const pending = `${lock}-abandoned.pending`
    await writeFile(join(directory, lock), "malformed\n")
    await writeFile(join(directory, pending), "complete but abandoned\n")

    const verification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification).toHaveLength(3)
    expect(verification).toContainEqual({ snapshotVersion: "3.0", errors: [] })
    expect(verification).toContainEqual({
      snapshotVersion: "3.0",
      errors: [`存在未恢复的 Nanoka artifact：${lock}`],
    })
    expect(verification).toContainEqual({
      snapshotVersion: "3.0",
      errors: [`存在未恢复的 Nanoka artifact：${pending}`],
    })
    expect(await readdir(directory)).toContain(lock)
    expect(await readdir(directory)).toContain(pending)
  })

  it("recovers stale artifacts only when no version lock is active", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const backup = nanokaArtifactNameForTest("3.0", "backup", "stale")
    const staging = nanokaArtifactNameForTest("3.0", "staging", "stale")
    const activeStaging = nanokaArtifactNameForTest("4.0", "staging", "active")
    const unknownLock = nanokaArtifactNameForTest("4.0", "lock")
    await rename(join(directory, "3.0"), join(directory, backup))
    await mkdir(join(directory, staging))
    await mkdir(join(directory, activeStaging))
    await writeFile(
      join(directory, unknownLock),
      `${JSON.stringify({
        schemaVersion: "nanoka-version-lock/v1",
        version: "4.0",
        pid: process.pid,
        ownerToken: "active-owner",
        createdAt: new Date().toISOString(),
      })}\n`,
    )

    await recoverNanokaRawDirectory(directory)
    expect(await readdir(directory)).toContain("3.0")
    expect(await readdir(directory)).not.toContain(backup)
    expect(await readdir(directory)).not.toContain(staging)
    expect(await readdir(directory)).toContain(activeStaging)
    expect(await readdir(directory)).toContain(unknownLock)
  })

  it("preserves stale and malformed locks for manual recovery", async () => {
    const directory = await temporaryDirectory()
    const staleVersion = "3.0"
    const malformedVersion = "5.0"
    const emptyVersion = "6.0"
    const fixtures = [
      {
        version: staleVersion,
        lockContents: `${JSON.stringify({
          schemaVersion: "nanoka-version-lock/v1",
          version: staleVersion,
          pid: 2_147_483_647,
          ownerToken: "stale-owner",
          createdAt: new Date().toISOString(),
        })}\n`,
      },
      { version: malformedVersion, lockContents: "unknown lock contents\n" },
      { version: emptyVersion, lockContents: "" },
    ]

    for (const fixture of fixtures) {
      const lock = nanokaArtifactNameForTest(fixture.version, "lock")
      const staging = nanokaArtifactNameForTest(
        fixture.version,
        "staging",
        "crashed",
      )
      await writeFile(join(directory, lock), fixture.lockContents)
      await mkdir(join(directory, staging))
    }

    await recoverNanokaRawDirectory(directory)
    const entries = await readdir(directory)
    for (const fixture of fixtures) {
      expect(entries).toContain(
        nanokaArtifactNameForTest(fixture.version, "lock"),
      )
      expect(entries).toContain(
        nanokaArtifactNameForTest(fixture.version, "staging", "crashed"),
      )
    }
    await expect(createSnapshot(directory, false)).rejects.toThrow(
      "请确认没有抓取进程正在运行，再手动删除残留锁",
    )
  })

  it("preserves an active lock during recovery", async () => {
    const directory = await temporaryDirectory()
    const version = "3.0"
    const lock = nanokaArtifactNameForTest(version, "lock")
    const staging = nanokaArtifactNameForTest(version, "staging", "active")
    await writeFile(
      join(directory, lock),
      `${JSON.stringify({
        schemaVersion: "nanoka-version-lock/v1",
        version,
        pid: process.pid,
        ownerToken: "active-owner",
        createdAt: new Date().toISOString(),
      })}\n`,
    )
    await mkdir(join(directory, staging))

    await recoverNanokaRawDirectory(directory)
    expect(await readdir(directory)).toContain(lock)
    expect(await readdir(directory)).toContain(staging)
  })

  it("uses exact artifact namespaces without version-prefix collisions", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const ownStaging = nanokaArtifactNameForTest("3.0", "staging", "stale")
    const neighboringVersion = "3.0-extra"
    const neighboringStaging = nanokaArtifactNameForTest(
      neighboringVersion,
      "staging",
      "active",
    )
    const neighboringLock = nanokaArtifactNameForTest(
      neighboringVersion,
      "lock",
    )
    await mkdir(join(directory, ownStaging))
    await mkdir(join(directory, neighboringStaging))
    await writeFile(
      join(directory, neighboringLock),
      `${JSON.stringify({
        schemaVersion: "nanoka-version-lock/v1",
        version: neighboringVersion,
        pid: process.pid,
        ownerToken: "neighbor-owner",
        createdAt: new Date().toISOString(),
      })}\n`,
    )

    await recoverNanokaRawDirectory(directory)
    expect(await readdir(directory)).not.toContain(ownStaging)
    expect(await readdir(directory)).toContain(neighboringStaging)
    expect(await readdir(directory)).toContain(neighboringLock)
  })

  it("saves exact cached manifest bytes into a different target version on 304", async () => {
    const directory = await temporaryDirectory()
    const cachedManifest = validateManifest({
      zzz: {
        live: "3.0",
        latest: "4.0",
        available: ["3.0", "4.0"],
      },
    })
    await createSnapshot(
      directory,
      false,
      {},
      {
        manifest: cachedManifest,
        version: "3.0",
        selectedBy: "live",
      },
    )
    const previousTargetManifest = validateManifest({
      zzz: {
        live: "4.0",
        latest: "4.0",
        available: ["4.0"],
      },
    })
    await createSnapshot(
      directory,
      false,
      {},
      {
        manifest: previousTargetManifest,
        version: "4.0",
        selectedBy: "latest",
      },
    )
    const cachedFetchManifestPath = join(
      directory,
      "3.0",
      "fetch-manifest.json",
    )
    const cachedFetchManifest = JSON.parse(
      await readFile(cachedFetchManifestPath, "utf8"),
    ) as {
      assets: Array<{
        assetId: string
        etag: string | null
        lastModified: string | null
        contentType: string | null
        cacheControl: string | null
        contentFetchedAt: string
        lastCheckedAt: string
      }>
    }
    const cachedManifestAsset = cachedFetchManifest.assets.find(
      (asset) => asset.assetId === "upstream-manifest",
    )
    if (cachedManifestAsset === undefined)
      throw new Error("missing fixture asset")
    cachedManifestAsset.lastModified = "Sat, 25 Jul 2026 12:00:00 GMT"
    cachedManifestAsset.cacheControl = "public, max-age=3600"
    cachedManifestAsset.lastCheckedAt = "9999-12-31T23:59:59.999Z"
    await writeFile(
      cachedFetchManifestPath,
      `${JSON.stringify(cachedFetchManifest)}\n`,
    )

    const policy = await loadSourcePolicy()
    let conditionalEtag: string | null = null
    let conditionalLastModified: string | null = null
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: {
          ...policy.requestPolicy,
          minimumStartIntervalMs: 0,
        },
      },
      {
        fetchImplementation: async (_input, init) => {
          const headers = new Headers(init?.headers)
          conditionalEtag = headers.get("If-None-Match")
          conditionalLastModified = headers.get("If-Modified-Since")
          return new Response(null, { status: 304 })
        },
        sleep: async () => {},
      },
    )

    const result = await fetchUpstreamManifest(policy, client, directory)
    expect(conditionalEtag).toBe(cachedManifestAsset.etag)
    expect(conditionalLastModified).toBe(cachedManifestAsset.lastModified)
    expect(result.manifest).toEqual(cachedManifest)
    expect(result.response).toMatchObject({
      result: "not-modified",
      status: 304,
      etag: cachedManifestAsset.etag,
      lastModified: cachedManifestAsset.lastModified,
      contentType: cachedManifestAsset.contentType,
      cacheControl: cachedManifestAsset.cacheControl,
      contentFetchedAt: cachedManifestAsset.contentFetchedAt,
    })
    expect(result.response.bytes).not.toBeNull()

    const refreshed = await createSnapshot(
      directory,
      false,
      {},
      {
        manifest: cachedManifest,
        version: "4.0",
        selectedBy: "latest",
        upstreamManifestResponse: result.response,
      },
    )
    expect(refreshed.reusedAssetCount).toBe(1)
    expect(refreshed.driftedAssetIds).toContain("upstream-manifest")
    const savedManifestBytes = await readFile(
      join(directory, "4.0", "manifest.json"),
    )
    expect(savedManifestBytes).toEqual(Buffer.from(result.response.bytes ?? []))
    const savedFetchManifest = JSON.parse(
      await readFile(join(directory, "4.0", "fetch-manifest.json"), "utf8"),
    ) as {
      observedLiveVersion: string
      observedLatestVersion: string
      observedAvailableVersions: string[]
      assets: Array<{
        assetId: string
        result: string
        httpStatus: number
        sha256: string
        bytes: number
        etag: string | null
        lastModified: string | null
        contentType: string | null
        cacheControl: string | null
        contentFetchedAt: string
      }>
    }
    expect(savedFetchManifest).toMatchObject({
      observedLiveVersion: "3.0",
      observedLatestVersion: "4.0",
      observedAvailableVersions: ["3.0", "4.0"],
    })
    expect(
      savedFetchManifest.assets.find(
        (asset) => asset.assetId === "upstream-manifest",
      ),
    ).toMatchObject({
      result: "not-modified",
      httpStatus: 304,
      bytes: savedManifestBytes.byteLength,
      sha256: sha(savedManifestBytes),
      etag: cachedManifestAsset.etag,
      lastModified: cachedManifestAsset.lastModified,
      contentType: cachedManifestAsset.contentType,
      cacheControl: cachedManifestAsset.cacheControl,
      contentFetchedAt: cachedManifestAsset.contentFetchedAt,
    })
    const verification = await verifyNanokaSnapshots({
      policy,
      rawDirectory: directory,
      version: "4.0",
    })
    expect(verification).toEqual([{ snapshotVersion: "4.0", errors: [] }])
  })

  it("rejects concurrent same-version fetches without touching active staging", async () => {
    const directory = await temporaryDirectory()
    const lock = nanokaArtifactNameForTest("3.0", "lock")
    const staging = nanokaArtifactNameForTest("3.0", "staging", "active")
    await writeFile(
      join(directory, lock),
      `${JSON.stringify({
        schemaVersion: "nanoka-version-lock/v1",
        version: "3.0",
        pid: process.pid,
        ownerToken: "concurrent-owner",
        createdAt: new Date().toISOString(),
      })}\n`,
    )
    await mkdir(join(directory, staging))

    await expect(createSnapshot(directory, false)).rejects.toThrow(
      "请确认没有抓取进程正在运行，再手动删除残留锁",
    )
    expect(await readdir(directory)).toContain(staging)
    expect(await readdir(directory)).toContain(lock)
  })

  it("rejects invalid UTF-8 in fetched JSON", async () => {
    const directory = await temporaryDirectory()
    const policy = await loadSourcePolicy()
    const manifest = validateManifest({
      zzz: { live: "3.0", latest: "3.0", available: ["3.0"] },
    })
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: { ...policy.requestPolicy, minimumStartIntervalMs: 0 },
      },
      {
        fetchImplementation: async () =>
          new Response(new Uint8Array([0xff]), { status: 200 }),
        sleep: async () => {},
      },
    )
    await expect(
      fetchNanokaSnapshot({
        policy,
        httpClient: client,
        upstreamManifestResponse: fetched(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        selectedBy: "live",
        rawDirectory: directory,
      }),
    ).rejects.toThrow("不是有效 UTF-8")
  })

  it("rejects incomplete or malformed fetch manifests", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      assets: Array<{ kind: string }>
      summary: { assetCount: number }
      completedAt?: string
    }
    delete manifest.completedAt
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
    let [verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("结构无效")

    await rm(join(directory, "3.0"), { recursive: true })
    await createSnapshot(directory, false)
    const duplicateManifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as {
      assets: Array<{ kind: string; entity?: string }>
      summary: { assetCount: number }
    }
    duplicateManifest.assets = duplicateManifest.assets.filter(
      (asset) => asset.kind !== "entity-index" || asset.entity !== "character",
    )
    duplicateManifest.summary.assetCount = duplicateManifest.assets.length
    await writeFile(manifestPath, `${JSON.stringify(duplicateManifest)}\n`)
    ;[verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain(
      "存在未登记文件：character.json",
    )
  })

  it("rejects malformed v2 scope, entity closure, and result semantics", async () => {
    const directory = await temporaryDirectory()
    const policy = await loadSourcePolicy()
    await createSnapshot(directory, false)
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")

    const partial = JSON.parse(await readFile(manifestPath, "utf8")) as {
      entities: string[]
      fetchScope: { mode: string; requestedEntities: string[] }
    }
    partial.entities = ["character"]
    partial.fetchScope = { mode: "all", requestedEntities: ["character"] }
    await writeFile(manifestPath, `${JSON.stringify(partial)}\n`)
    let [verification] = await verifyNanokaSnapshots({
      policy,
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("全部启用实体")
    expect(verification?.errors.join("\n")).toContain(
      "实体集合与 entities 不匹配",
    )

    await rm(join(directory, "3.0"), { recursive: true })
    await createSnapshot(directory, false)
    await createSnapshot(directory, false, {}, { entities: ["equipment"] })
    const selected = JSON.parse(await readFile(manifestPath, "utf8")) as {
      assets: Array<{
        entity?: string
        result: string
        httpStatus: number
      }>
    }
    const carried = selected.assets.find(
      (asset) => asset.entity === "character",
    )
    if (carried === undefined) throw new Error("missing carried fixture asset")
    carried.result = "fetched"
    carried.httpStatus = 200
    await writeFile(manifestPath, `${JSON.stringify(selected)}\n`)
    ;[verification] = await verifyNanokaSnapshots({
      policy,
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain(
      "未选实体资源必须为 carried-forward",
    )

    carried.result = "not-modified"
    carried.httpStatus = 200
    await writeFile(manifestPath, `${JSON.stringify(selected)}\n`)
    ;[verification] = await verifyNanokaSnapshots({
      policy,
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("结构无效")
  })

  it("strictly rejects malformed v1 asset fields and stable IDs", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const snapshotDirectory = join(directory, "3.0")
    const manifestPath = join(snapshotDirectory, "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      assets: Array<Record<string, unknown>>
      summary: {
        entities: {
          character: {
            recordCount: number
            detailCountByLanguage: { zh: number; en: number }
          }
        }
      }
    } & Record<string, unknown>
    const characterAssets = manifest.assets
      .filter(
        (asset) =>
          asset.entity === "character" || asset.kind === "upstream-manifest",
      )
      .map((asset) => {
        if (asset.kind === "upstream-manifest") return asset
        if (asset.kind === "entity-index")
          return {
            ...asset,
            assetId: "character-index",
            kind: "character-index",
            entity: undefined,
          }
        return {
          ...asset,
          assetId: `character-detail:${String(asset.language)}:${String(asset.entityId)}`,
          kind: "character-detail",
          characterId: asset.entityId,
          entity: undefined,
          entityId: undefined,
        }
      })
    const v1 = {
      ...manifest,
      schemaVersion: "nanoka-fetch-manifest/v1",
      assets: characterAssets,
      summary: {
        characterCount: manifest.summary.entities.character.recordCount,
        zhDetailCount:
          manifest.summary.entities.character.detailCountByLanguage.zh,
        enDetailCount:
          manifest.summary.entities.character.detailCountByLanguage.en,
        assetCount: characterAssets.length,
        totalBytes: characterAssets.reduce(
          (sum, asset) => sum + Number(asset.bytes),
          0,
        ),
      },
    } as Record<string, unknown>
    delete v1.entities
    delete v1.fetchScope
    delete v1.validation
    const v1Assets = v1.assets as Array<Record<string, unknown>>
    const index = v1Assets.find((asset) => asset.kind === "character-index")
    if (index === undefined) throw new Error("missing v1 index fixture")
    index.characterId = "1011"
    index.assetId = "wrong-index"
    await rm(join(snapshotDirectory, "equipment.json"))
    await rm(join(snapshotDirectory, "zh", "equipment"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "equipment"), { recursive: true })
    await writeFile(manifestPath, `${JSON.stringify(v1)}\n`)

    const [verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("结构无效")
  })

  it("rejects symbolic links in managed snapshot files", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const target = join(directory, "outside.json")
    const asset = join(directory, "3.0", "zh", "character", "1011.json")
    await writeFile(target, '{"id":1011,"name":"outside"}')
    await rm(asset)
    await symlink(target, asset)

    const [verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
      version: "3.0",
    })
    expect(verification?.errors.join("\n")).toContain("资源不是普通文件")
  })

  it("rejects empty character indexes without replacing an existing snapshot", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const before = await readFile(join(directory, "3.0", "character.json"))

    await expect(
      createSnapshot(directory, false, {
        "/zzz/3.0/character.json": "{}",
      }),
    ).rejects.toThrow("character.json 不能为空")
    expect(await readFile(join(directory, "3.0", "character.json"))).toEqual(
      before,
    )
  })

  it("does not replace an existing snapshot when a fetch fails", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const before = await readFile(join(directory, "3.0", "fetch-manifest.json"))
    await expect(
      createSnapshot(directory, false, {
        "/zzz/3.0/zh/character/1011.json": undefined,
      }),
    ).rejects.toThrow("返回 404")
    expect(
      await readFile(join(directory, "3.0", "fetch-manifest.json")),
    ).toEqual(before)
  })

  it("detects weapon cross-language, summary, and validation tampering", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const snapshotDirectory = join(directory, "3.0")
    const enWeaponPath = join(snapshotDirectory, "en", "weapon", "12002.json")
    const enWeapon = JSON.parse(await readFile(enWeaponPath, "utf8")) as {
      materials: string
    }
    enWeapon.materials = "1:2,2:3|3:4,4:5|5:6,6:7|7:8,8:9|9:10,10:12"
    await writeFile(enWeaponPath, JSON.stringify(enWeapon))
    const manifestPath = join(snapshotDirectory, "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      summary: { entities: { weapon: { recordCount: number } } }
      validation: { entities: { weapon: string } }
    }
    manifest.summary.entities.weapon.recordCount = 99
    manifest.validation.entities.weapon = "failed"
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)

    const [verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    const errors = verification?.errors.join("\n") ?? ""
    expect(errors).toContain("zh/en materials 不一致")
    expect(errors).toContain("summary.entities 不匹配")
    expect(errors).toContain("validation.entities 无效")
  })

  it("rejects non-epoch v2 entity subsets", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      entities: string[]
      fetchScope: { mode: string; requestedEntities: string[] }
    }
    manifest.entities = ["character", "weapon"]
    manifest.fetchScope = {
      mode: "all",
      requestedEntities: ["character", "weapon"],
    }
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
    const [verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("合法历史 epoch")
  })

  it("reports tampering, missing files, and unregistered files", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    await writeFile(
      join(directory, "3.0", "zh", "character", "1011.json"),
      "{}",
    )
    await rm(join(directory, "3.0", "en", "character", "2.json"))
    await writeFile(join(directory, "3.0", "extra.json"), "{}")
    const [result] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
      version: "3.0",
    })
    expect(result?.errors.join("\n")).toContain("SHA-256 不匹配")
    expect(result?.errors.join("\n")).toContain("缺少文件")
    expect(result?.errors.join("\n")).toContain("存在未登记文件")
  })
})

async function retainSnapshotEntities(
  rawDirectory: string,
  entities: string[],
): Promise<void> {
  const snapshotDirectory = join(rawDirectory, "3.0")
  const manifestPath = join(snapshotDirectory, "fetch-manifest.json")
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    entities: string[]
    fetchScope: { mode: string; requestedEntities: string[] }
    assets: Array<{ entity?: string; bytes: number }>
    summary: {
      entityTypeCount: number
      assetCount: number
      totalBytes: number
      entities: Record<string, unknown>
    }
    validation: {
      entities: Record<string, string>
      crossEntityReferences: Array<{ fromEntity: string; toEntity: string }>
    }
  }
  const removed = manifest.entities.filter(
    (entity) => !entities.includes(entity),
  )
  manifest.entities = entities
  manifest.fetchScope = { mode: "all", requestedEntities: entities }
  manifest.assets = manifest.assets.filter(
    (asset) => asset.entity === undefined || entities.includes(asset.entity),
  )
  manifest.summary.entityTypeCount = entities.length
  manifest.summary.assetCount = manifest.assets.length
  manifest.summary.totalBytes = manifest.assets.reduce(
    (sum, asset) => sum + asset.bytes,
    0,
  )
  manifest.validation.crossEntityReferences =
    manifest.validation.crossEntityReferences.filter(
      (record) =>
        entities.includes(record.fromEntity) &&
        entities.includes(record.toEntity),
    )
  for (const entity of removed) {
    delete manifest.summary.entities[entity]
    delete manifest.validation.entities[entity]
    await rm(join(snapshotDirectory, `${entity}.json`))
    await rm(join(snapshotDirectory, "zh", entity), { recursive: true })
    await rm(join(snapshotDirectory, "en", entity), { recursive: true })
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
}

async function createSnapshot(
  rawDirectory: string,
  notModified: boolean,
  overrides: Record<string, string | undefined> = {},
  options: {
    manifest?: ReturnType<typeof validateManifest>
    version?: string
    selectedBy?: "live" | "latest" | "version" | "interactive"
    upstreamManifestResponse?: FetchedHttpAsset
    entities?: string[]
    crossEntityValidators?: readonly CrossEntityValidator[]
    onProgress?: (progress: SnapshotFetchProgress) => void
  } = {},
) {
  const policy = await loadSourcePolicy()
  const manifest =
    options.manifest ??
    validateManifest({
      zzz: { live: "3.0", latest: "3.0", available: ["3.0"] },
    })
  const version = options.version ?? "3.0"
  const contents: Record<string, string | undefined> = {
    [`/zzz/${version}/character.json`]: '{"1011":{},"2":{}}',
    [`/zzz/${version}/zh/character/2.json`]: '{"id":2,"name":"二"}',
    [`/zzz/${version}/en/character/2.json`]: '{"id":2,"name":"Two"}',
    [`/zzz/${version}/zh/character/1011.json`]: '{"id":1011,"name":"安比"}',
    [`/zzz/${version}/en/character/1011.json`]: '{"id":1011,"name":"Anby"}',
    [`/zzz/${version}/equipment.json`]:
      '{"31000":{"icon":"UI/31000.png","zh":{"name":"啄木鸟电音","desc2":"二件套","desc4":"四件套"},"en":{"name":"Woodpecker Electro","desc2":"2-piece","desc4":"4-piece"}},"31100":{"icon":"UI/31100.png","zh":{"name":"河豚电音","desc2":"二件套","desc4":"四件套"},"en":{"name":"Puffer Electro","desc2":"2-piece","desc4":"4-piece"}}}',
    [`/zzz/${version}/zh/equipment/31000.json`]:
      '{"id":31000,"name":"啄木鸟电音","desc2":"二件套","desc4":"四件套","story":"...","icon":"UI/31000.png","icon2":"UI/31000.png"}',
    [`/zzz/${version}/en/equipment/31000.json`]:
      '{"id":31000,"name":"Woodpecker Electro","desc2":"2-piece","desc4":"4-piece","story":"...","icon":"UI/31000.png","icon2":"UI/31000.png"}',
    [`/zzz/${version}/zh/equipment/31100.json`]:
      '{"id":31100,"name":"河豚电音","desc2":"二件套","desc4":"四件套","story":"...","icon":"UI/31100.png","icon2":"UI/31100.png"}',
    [`/zzz/${version}/en/equipment/31100.json`]:
      '{"id":31100,"name":"Puffer Electro","desc2":"2-piece","desc4":"4-piece","story":"...","icon":"UI/31100.png","icon2":"UI/31100.png"}',
    [`/zzz/${version}/weapon.json`]: JSON.stringify(weaponIndex()),
    [`/zzz/${version}/zh/weapon/12002.json`]: JSON.stringify(
      weaponDetail("zh"),
    ),
    [`/zzz/${version}/en/weapon/12002.json`]: JSON.stringify(
      weaponDetail("en"),
    ),
    [`/zzz/${version}/bangboo.json`]: JSON.stringify(bangbooIndex()),
    [`/zzz/${version}/zh/bangboo/13001.json`]: JSON.stringify(
      bangbooDetail("zh"),
    ),
    [`/zzz/${version}/en/bangboo/13001.json`]: JSON.stringify(
      bangbooDetail("en"),
    ),
    [`/zzz/${version}/monster.json`]: JSON.stringify(monsterIndex()),
    [`/zzz/${version}/zh/monster/1001.json`]: JSON.stringify(
      monsterDetail("zh"),
    ),
    [`/zzz/${version}/en/monster/1001.json`]: JSON.stringify(
      monsterDetail("en"),
    ),
    [`/zzz/${version}/shiyu.json`]: JSON.stringify(shiyuIndex()),
    [`/zzz/${version}/zh/shiyu/620541.json`]: JSON.stringify(shiyuDetail("zh")),
    [`/zzz/${version}/en/shiyu/620541.json`]: JSON.stringify(shiyuDetail("en")),
    [`/zzz/${version}/simul.json`]: JSON.stringify(simulIndex()),
    [`/zzz/${version}/zh/simul/101.json`]: JSON.stringify(simulDetail("zh")),
    [`/zzz/${version}/en/simul/101.json`]: JSON.stringify(simulDetail("en")),
    ...overrides,
  }
  const httpClient = new NanokaHttpClient(
    {
      ...policy,
      requestPolicy: {
        ...policy.requestPolicy,
        minimumStartIntervalMs: 0,
      },
    },
    {
      fetchImplementation: async (input, init) => {
        const url = new URL(String(input))
        const content = contents[url.pathname]
        if (content === undefined)
          return new Response("missing", { status: 404 })
        const hasValidator = new Headers(init?.headers).has("If-None-Match")
        if (notModified && hasValidator)
          return new Response(null, { status: 304 })
        return new Response(content, {
          status: 200,
          headers: {
            "ETag": `"${sha(content)}"`,
            "Content-Type": "application/json",
          },
        })
      },
      sleep: async () => {},
    },
  )
  return fetchNanokaSnapshot({
    policy,
    httpClient,
    upstreamManifestResponse:
      options.upstreamManifestResponse ?? fetched(JSON.stringify(manifest)),
    upstreamManifest: manifest,
    version,
    selectedBy: options.selectedBy ?? "live",
    rawDirectory,
    ...(options.entities === undefined ? {} : { entities: options.entities }),
    ...(options.crossEntityValidators === undefined
      ? {}
      : { crossEntityValidators: options.crossEntityValidators }),
    ...(options.onProgress === undefined
      ? {}
      : { onProgress: options.onProgress }),
  })
}

function shiyuIndex(): Record<string, Record<string, unknown>> {
  return {
    "620541": {
      sort: 1,
      en: "Critical Node",
      ko: "격변 구간",
      zh: "剧变节点",
      ja: "激変ノード",
      begin: "2026-01-01 04:00:00",
      end: "2026-01-15 03:59:59",
      live_begin: "2026-01-01 04:00:00",
      live_end: "2026-01-15 03:59:59",
    },
  }
}

function shiyuDetail(language: "zh" | "en") {
  const zone = (name: string, child: number[], withRoom: boolean) => ({
    name,
    stage_num: 5,
    monster_level: withRoom ? 70 : 0,
    layer_buff: {
      "62001541": {
        title: language === "zh" ? "增益" : "Buff",
        desc: language === "zh" ? "中文效果" : "English effect",
      },
    },
    child,
    layer_room: withRoom
      ? {
          "62054051": {
            monster_icon: "",
            monster_list: {
              "11114": {
                id: 1001,
                name: language === "zh" ? "装甲哈提" : "Armored Hati",
                image: "UI/Monster.png",
                element: { ice: 1, fire: 0 },
                stats: { hp: 1000.5, attack: 100 },
              },
            },
            monster_weakness: {
              "202": language === "zh" ? "冰" : "Ice",
            },
            waves_num: 2,
          },
        }
      : {},
    goal_type: withRoom ? 2 : 3,
    ss_rank_goal: 0,
    s_rank_goal: withRoom ? 25000 : 1270001003,
    a_rank_goal: withRoom ? 16000 : 1270001002,
    b_rank_goal: withRoom ? 8000 : 1270001001,
  })
  return {
    id: 620541,
    name: language === "zh" ? "剧变节点" : "Critical Node",
    priority: 1,
    zone: {
      "6205405": zone("", [62054051], false),
      "62054051": zone(language === "zh" ? "房间 1" : "Room 1", [], true),
    },
    begin_time: "2026-01-01 04:00:00",
    end_time: "2026-01-15 03:59:59",
  }
}

function simulIndex(): Record<string, Record<string, unknown>> {
  return { "101": { end: "" } }
}

function simulRoom(language: "zh" | "en") {
  return {
    monster_icon: "UI/Monster.png",
    monster_list: {
      "9001": {
        id: 1001,
        name: language === "zh" ? "装甲哈提" : "Armored Hati",
        image: "UI/Monster/1001.png",
        element: {
          physical: 1,
          fire: 2,
          ice: 3,
          electric: 4,
          ether: 5,
          wind: 6,
        },
        stats: {
          hp: 1000.5,
          attack: 100,
          defence: 50,
          stun: 20,
          attribute_infliction: 10.5,
        },
      },
    },
    monster_weakness: { "202": language === "zh" ? "冰" : "Ice" },
    waves_num: 2,
  }
}

function simulDetail(language: "zh" | "en", empty = false) {
  const localized = (zh: string, en: string) => (language === "zh" ? zh : en)
  const battle = {
    id: 1010801,
    name: localized("战斗", "Battle"),
    tag: localized("标签", "Tag"),
    tag_type: 1,
    a_rank_score_layer_buff: empty
      ? {}
      : {
          "3001": {
            title: localized("A级", "A Rank"),
            desc: localized("效果", "Effect"),
          },
        },
    b_rank_score_layer_buff: {},
    s_rank_score_layer_buff: {},
    layer: {
      id: 4001,
      monster_level: 70,
      layer_buff: empty
        ? {}
        : {
            "4002": {
              title: localized("层增益", "Layer Buff"),
              desc: localized("描述", "Description"),
            },
          },
      layer_room: {},
      goal_type: 2,
      s_rank_goal: 100,
      a_rank_goal: 80,
      b_rank_goal: 60,
    },
    selectable_buff: empty
      ? {}
      : {
          "5002": {
            title: localized("可选增益", "Selectable Buff"),
            desc: localized("描述", "Description"),
          },
        },
    layer_room: empty ? {} : { "8101": simulRoom(language) },
  }
  const event = {
    id: 7001,
    name: localized("事件", "Event"),
    desc: localized("事件描述", "Event description"),
    icon: "UI/Event.png",
    choice: empty
      ? []
      : [
          {
            id: 1,
            name: localized("选择", "Choice"),
            desc: localized("选择描述", "Choice description"),
          },
        ],
    next_page: empty ? [] : [7001],
    next_node_unlock: empty ? [] : [5001],
    next_record_unlock: empty ? [] : [6001, 1010801],
  }
  return {
    id: 101,
    end_time: "",
    boss_adjust: empty ? {} : { "1": { hp: 100, atk: 20, points: 5 } },
    record: empty
      ? {}
      : {
          slot_a: {
            id: 6001,
            name: localized("记录", "Record"),
            desc: localized("描述", "Description"),
            text: localized("文本", "Text"),
            icon: "UI/Record.png",
          },
        },
    node: {
      "10101": {
        id: 10101,
        name: localized("节点", "Node"),
        icon: "UI/Node.png",
        type: 1,
        prev_node: empty ? 0 : 10001001,
        story_event: empty ? {} : { "5001": { "7001": event } },
        battle: empty ? {} : { "1010801": battle },
      },
    },
  }
}

function monsterIndex(empty = false): Record<string, Record<string, unknown>> {
  return {
    "1001": {
      zh: empty ? "空壳" : "装甲哈提",
      en: empty ? "Empty Husk" : "Armored Hati",
      group: 7,
      rarity: 4,
      icon: empty ? "" : "UI/Monster/1001.png",
      desc: empty ? "" : "Monster summary",
      tag: null,
      tag2: null,
    },
  }
}

function monsterDetail(language: "zh" | "en", empty = false) {
  const battleUnit = (id: number, icon: string) => ({
    id,
    code_name: `monster_${id}`,
    type: language === "zh" ? "普通" : "Normal",
    icon,
    tag: [language === "zh" ? "机械" : "Machine", ""],
    element: {
      physical: 10,
      fire: 20,
      ice: 30,
      electric: 40,
      ether: 50,
      wind: 60,
    },
    curves: {
      hp: { ratio: 100, curve: [1000, 1100] },
      attack: { ratio: 100, curve: [100, 110] },
      defence: { ratio: 100, curve: [50, 55] },
      stun: { ratio: 100, curve: [20, 22] },
    },
    stats: id === 2001 ? { hp: 1000, attack: 100 } : {},
  })
  const monster_info = empty
    ? {}
    : {
        "2001": battleUnit(2001, "UI/Monster/Unit/2001.png"),
        "2002": battleUnit(2002, ""),
      }
  return {
    id: 1001,
    monster_id: empty ? 0 : 2001,
    name:
      language === "zh"
        ? empty
          ? "空壳"
          : "装甲哈提"
        : empty
          ? "Empty Husk"
          : "Armored Hati",
    desc: empty ? "" : language === "zh" ? "中文描述" : "English description",
    rarity: 4,
    group_id: 7,
    group_desc: language === "zh" ? "机械敌人" : "Machine enemies",
    image_path: empty ? "" : "UI/Monster/1001.png",
    card_obtain: language === "zh" ? "获得方式" : "How to obtain",
    card_quote: "",
    card_skill_desc: "",
    element_abnormal: empty ? {} : { "1": 10, "2": 20 },
    monster_info,
  }
}

function bangbooIndex(empty = false): Record<string, Record<string, unknown>> {
  return {
    "13001": {
      icon: empty ? "" : "UI/Bangboo/13001.png",
      codename: "bangboo_13001",
      en: "Safety",
      desc: "English description",
      ko: "세이프티",
      zh: "阿全",
      ja: "セーフティ",
      rank: 4,
    },
  }
}

function bangbooDetail(language: "zh" | "en", empty = false) {
  const icon = empty ? "" : "UI/Bangboo/13001.png"
  const stats = {
    endurance: 1,
    hp_max: 100,
    hpupgrade: 10,
    attack: 20,
    attack_upgrade: 2,
    break_stun: 3,
    element_abnormal_power: 4,
    defence: 5,
    def_upgrade: 1,
    crit: 6,
    pen_ratio: 7,
    crit_dmg: 8,
  }
  const level = empty
    ? {}
    : {
        "1": {
          hp_max: 100,
          attack: 20,
          defence: 5,
          level_max: 10,
          level_min: 1,
          materials: { "5001": 2 },
          extra: {
            "201": {
              prop: 201,
              value: 10,
              name: language === "zh" ? "生命值" : "HP",
              format: "{0}",
            },
          },
        },
      }
  const skillLevel = empty
    ? {}
    : {
        "1": {
          name: language === "zh" ? "技能" : "Skill",
          desc: language === "zh" ? "描述" : "Description",
          param: "Skill:2001, Prop:1001",
          property: [language === "zh" ? "物理" : "Physical"],
        },
      }
  const skill_prop = empty
    ? {}
    : {
        "2001": {
          "1001": { main: 100, growth: 10, format: "{0}%" },
          "1002": { main: 200, growth: 20, format: "{0}" },
          "element_accumulation_value": 30,
        },
      }
  return {
    id: 13001,
    code_name: "different-code-name-is-allowed",
    name: language === "zh" ? "阿全" : "Safety",
    desc: language === "en" ? "English description" : "中文描述",
    rarity: 4,
    icon,
    stats,
    level,
    skill: {
      a: { level: structuredClone(skillLevel) },
      b: { level: structuredClone(skillLevel) },
      c: { level: structuredClone(skillLevel) },
    },
    skill_prop,
  }
}

function weaponIndex(): Record<string, Record<string, unknown>> {
  return {
    "12002": {
      icon: "weapon_12002",
      en: "The Vault",
      zh: "逍遥游球",
      ja: "ザ・ボールト",
      ko: "더 볼트",
      desc: "English description <color=#fff>...</color>",
      sub: "ATK",
      rank: 4,
      type: 1,
      atk: 210,
    },
  }
}

function weaponDetail(language: "zh" | "en") {
  const level = Object.fromEntries(
    Array.from({ length: 61 }, (_, levelNumber) => [
      String(levelNumber),
      {
        exp: levelNumber === 60 ? 0 : 100 + levelNumber,
        rate: levelNumber * 100,
        rate2: 0,
      },
    ]),
  )
  const stars = Object.fromEntries(
    Array.from({ length: 6 }, (_, star) => [
      String(star),
      { star_rate: star * 1_000, rand_rate: star * 100 },
    ]),
  )
  const talents = Object.fromEntries(
    Array.from({ length: 5 }, (_, index) => [
      String(index + 1),
      { name: `Talent ${index + 1}`, desc: "... <color=#fff>rich</color>" },
    ]),
  )
  return {
    id: 12002,
    code_name: "weapon_12002",
    name: language === "zh" ? "逍遥游球" : "The Vault",
    desc: "...",
    desc2: "...",
    desc3: "English description <color=#fff>...</color>",
    icon: "UI/Weapon/weapon_12002.png",
    rarity: 4,
    weapon_type: { "1": language === "zh" ? "支援" : "Support" },
    base_property: { name: "ATK", name2: "攻击力", format: "{0}", value: 100 },
    rand_property: { name: "ATK", name2: "攻击力", format: "{0}%", value: 10 },
    level,
    stars,
    talents,
    materials: "1:2,2:3|3:4,4:5|5:6,6:7|7:8,8:9|9:10,10:11",
  }
}

function fetched(content: string): FetchedHttpAsset {
  return {
    status: 200,
    result: "fetched",
    bytes: new TextEncoder().encode(content),
    etag: `"${sha(content)}"`,
    lastModified: null,
    contentType: "application/json",
    cacheControl: null,
    checkedAt: new Date().toISOString(),
  }
}

function sha(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex")
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "nanoka-snapshot-"))
  temporaryDirectories.push(directory)
  return directory
}
