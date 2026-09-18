import { describe, expect, it } from "vitest"
import type { ShiyuData } from "../src/integration/shiyu-types.ts"
import { integrateShiyu } from "../src/integration/integrate-shiyu.ts"
import type { IntegrateShiyuInput } from "../src/integration/integrate-shiyu.ts"
import { ShiyuIntegrationError } from "../src/integration/source-json.ts"
import {
  shiyuInput,
  shiyuPermanentInput,
  shiyuSource,
} from "./fixtures/shiyu-source.ts"
import { expectShiyuRoundtrip } from "./fixtures/shiyu-roundtrip.ts"

function change(root: unknown, path: string, value: unknown): void {
  const segments = path.split(".")
  let parent = root as Record<string, unknown>
  for (const key of segments.slice(0, -1))
    parent = parent[key] as Record<string, unknown>
  Object.defineProperty(parent, segments.at(-1)!, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

function remove(root: unknown, path: string): void {
  const segments = path.split(".")
  let parent = root as Record<string, unknown>
  for (const key of segments.slice(0, -1))
    parent = parent[key] as Record<string, unknown>
  delete parent[segments.at(-1)!]
}

function freeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys)
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .toReversed()
        .map(([key, item]) => [key, reverseKeys(item)]),
    )
  return value
}

function expectFailure(
  input: IntegrateShiyuInput,
  locale: string,
  pointer: string,
  reason?: string,
): void {
  expect(() => integrateShiyu(input)).toThrow(ShiyuIntegrationError)
  try {
    integrateShiyu(input)
  } catch (error) {
    expect(error).toMatchObject({
      location: { entityId: input.entityId, locale, pointer },
    })
    if (reason) expect((error as Error).message).toContain(reason)
  }
}

/** 独立预期：details 中的 zone 已按登记表转换拼写，值与来源一致。 */
const expectedZone = {
  "9700101": {
    name: "稳定防线一",
    stageNum: 1,
    monsterLevel: 25,
    layerBuff: {
      "97001011": {
        title: "强击特化",
        desc: "· 代理人的<color=#F0D12B>物理异常积蓄效率</color>提升20%。",
      },
    },
    child: [],
    layerRoom: {
      "97001011": {
        monsterIcon: "",
        monsterList: {
          "11314": {
            id: 10019,
            name: "袭击者",
            image:
              "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
            element: {
              ice: 1,
              fire: 0,
              electric: 0,
              ether: 0,
              physical: 1,
              wind: 0,
            },
            stats: {
              hp: 18723.601000000002,
              attack: 601.3636363636364,
              defence: 177.60000000000002,
              stun: 936,
              attribute_infliction: 0,
            },
          },
          "11323": {
            id: 10018,
            name: "偷猎者",
            image:
              "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
            element: {
              ice: 1,
              fire: 0,
              electric: 0,
              ether: 0,
              physical: 1,
              wind: 0,
            },
            stats: {
              hp: 18723.601000000002,
              attack: 601.3636363636364,
              defence: 177.60000000000002,
              stun: 936,
              attribute_infliction: 0,
            },
          },
        },
        monsterWeakness: { "200": "物理", "202": "冰属性" },
        wavesNum: 2,
      },
    },
    goalType: 1,
    ssRankGoal: 300,
    sRankGoal: 240,
    aRankGoal: 180,
    bRankGoal: 120,
  },
  "9700102": {
    name: "稳定防线二",
    stageNum: 2,
    monsterLevel: 30,
    layerBuff: {},
    child: [97001021, 97001022],
    layerRoom: {
      "97002011": {
        monsterIcon:
          "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
        monsterList: {
          "11331": {
            id: 10016,
            name: "纵火犯",
            image:
              "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
            element: {
              ice: 1,
              fire: 0,
              electric: 0,
              ether: 0,
              physical: 1,
              wind: 0,
            },
            stats: {
              hp: 18723.601000000002,
              attack: 601.3636363636364,
              defence: 177.60000000000002,
              stun: 936,
              attribute_infliction: 0,
            },
          },
        },
        monsterWeakness: {},
        wavesNum: 1,
      },
    },
    goalType: 1,
    ssRankGoal: 360,
    sRankGoal: 280,
    aRankGoal: 200,
    bRankGoal: 140,
  },
}

const expectedData = {
  id: 970001,
  priority: 3,
  beginTime: "2024-07-04 04:00:00",
  endTime: "2024-08-01 03:59:59",
} satisfies ShiyuData

describe("单 Shiyu 纯整合 nanoka-shiyu-reference/1", () => {
  it("按独立预期拆分双语，保留索引，冻结输入仍可整合且不修改来源", () => {
    const input = shiyuInput()
    const before = structuredClone(input)
    freeze(input)
    const result = integrateShiyu(input)
    expect(result.data).toStrictEqual(expectedData)
    // zone 完整留在各语言：阶段 key、层级结构、encounter 全部保留，不拆分为公共关卡图。
    expect(result.data).not.toHaveProperty("zone")
    expect(result.details.zh).toStrictEqual({
      id: 970001,
      locale: "zh",
      name: "示例节点",
      zone: expectedZone,
    })
    const en = result.details.en!
    expect(en.id).toBe(970001)
    expect(en.locale).toBe("en")
    expect(en.name).toBe("Example Node")
    expect(en.zone["9700101"]!.name).toBe("Stable Frontline I")
    expect(en.zone["9700101"]!.layerBuff["97001011"]).toStrictEqual({
      title: "Strike Specialization",
      desc: "· Agents gain 20% <color=#F0D12B>Physical Anomaly Buildup Rate</color>.",
    })
    expect(
      en.zone["9700101"]!.layerRoom["97001011"]!.monsterList,
    ).toMatchObject({
      "11314": { id: 10019, name: "Assaulter" },
      "11323": { id: 10018, name: "Poacher" },
    })
    expect(
      en.zone["9700101"]!.layerRoom["97001011"]!.monsterWeakness,
    ).toStrictEqual({ "200": "Physical", "202": "Ice" })
    expect(en.zone["9700102"]!.child).toEqual([97001021, 97001022])
    expect(result.details.zh).not.toHaveProperty("begin_time")
    expect(result.details.zh).not.toHaveProperty("priority")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectShiyuRoundtrip(result, input)
    expect(input).toStrictEqual(before)
    result.data.priority = 0
    result.sourceRecord.en = "modified"
    result.details.zh!.name = "modified"
    expect(input).toStrictEqual(before)
  })

  it("阶段身份由 zone 来源 key 决定；stage_num 不要求全局唯一也不作为身份", () => {
    const input = shiyuInput()
    // 两个阶段改成相同 stage_num：阶段身份仍是来源 key，不冲突、不去重。
    change(input.details.zh, "zone.9700102.stage_num", 1)
    change(input.details.en, "zone.9700102.stage_num", 1)
    const result = integrateShiyu(input)
    expect(Object.keys(result.details.zh!.zone)).toEqual(["9700101", "9700102"])
    expect(result.details.zh!.zone["9700101"]!.stageNum).toBe(1)
    expect(result.details.zh!.zone["9700102"]!.stageNum).toBe(1)
    expectShiyuRoundtrip(result, input)
  })

  it("常驻记录没有时间字段是合法情况，data 不补 beginTime/endTime", () => {
    const input = shiyuPermanentInput()
    const before = structuredClone(input)
    const result = integrateShiyu(input)
    expect(result.data).toStrictEqual({ id: 970001, priority: 3 })
    expect(result.data).not.toHaveProperty("beginTime")
    expect(result.data).not.toHaveProperty("endTime")
    expect(result.details.zh).not.toHaveProperty("beginTime")
    expect(result.details.en).not.toHaveProperty("endTime")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectShiyuRoundtrip(result, input)
    expect(input).toStrictEqual(before)
  })

  it("可选时间字段只在全部语言提供且一致时提取；单语言独有时留在该语言", () => {
    const zhOnly = shiyuInput()
    delete (zhOnly.details.en as unknown as Record<string, unknown>).begin_time
    const zhOnlyResult = integrateShiyu(zhOnly)
    expect(zhOnlyResult.data).not.toHaveProperty("beginTime")
    expect(zhOnlyResult.data.endTime).toBe(expectedData.endTime)
    expect(zhOnlyResult.details.zh!.beginTime).toBe(expectedData.beginTime)
    expect(zhOnlyResult.details.en).not.toHaveProperty("beginTime")
    expect(zhOnlyResult.details.en!.endTime).toBeUndefined()
    expectShiyuRoundtrip(zhOnlyResult, zhOnly)

    // 全部语言都提供却值不同仍按共享冲突失败，不默选一门语言。
    const conflict = shiyuInput()
    change(conflict.details.en, "begin_time", "2024-07-04 04:00:01")
    expectFailure(conflict, "en", "/begin_time", "共享冲突")

    // 时间保持原始字符串，不转换时间戳、不猜测时区。
    const exact = integrateShiyu(shiyuInput())
    expect(exact.data.beginTime).toBe("2024-07-04 04:00:00")
    expect(exact.data.endTime).toBe("2024-08-01 03:59:59")
  })

  it("monster_list 外层 key 不是 Monster ID；引用身份来自条目自身的 id", () => {
    const input = shiyuInput()
    const result = integrateShiyu(input)
    const room = result.details.zh!.zone["9700101"]!.layerRoom["97001011"]!
    expect(Object.keys(room.monsterList)).toEqual(["11314", "11323"])
    expect(room.monsterList["11314"]!.id).toBe(10019)
    expect(room.monsterList["11323"]!.id).toBe(10018)
    expectShiyuRoundtrip(result, input)
  })

  it("encounter 的名称、图片、弱点和关卡数值全部保留，不能替换成纯外键", () => {
    const input = shiyuInput()
    const result = integrateShiyu(input)
    const encounter =
      result.details.zh!.zone["9700101"]!.layerRoom["97001011"]!.monsterList[
        "11314"
      ]!
    expect(encounter).toStrictEqual({
      id: 10019,
      name: "袭击者",
      image:
        "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
      element: { ice: 1, fire: 0, electric: 0, ether: 0, physical: 1, wind: 0 },
      stats: {
        hp: 18723.601000000002,
        attack: 601.3636363636364,
        defence: 177.60000000000002,
        stun: 936,
        attribute_infliction: 0,
      },
    })
    expectShiyuRoundtrip(result, input)
  })

  it("索引记录与详情独立保留，不要求相等也不互相回退", () => {
    const input = shiyuInput()
    // 索引时间字段与详情时间字段是两个来源；索引值变化不覆盖详情提取结果。
    change(input.sourceRecord, "begin", "2099-01-01 00:00:00")
    change(input.sourceRecord, "sort", 99)
    change(input.sourceRecord, "zh", "索引改名的节点")
    const result = integrateShiyu(input)
    expect(result.data.beginTime).toBe("2024-07-04 04:00:00")
    expect(result.data.priority).toBe(3)
    expect(result.details.zh!.name).toBe("示例节点")
    expect(result.sourceRecord.begin).toBe("2099-01-01 00:00:00")
    expect(result.maintenance.diagnostics).toEqual([])
    expectShiyuRoundtrip(result, input)
  })

  it("来源索引的未知顶层字段生成 index 诊断，已知字段不误报", () => {
    const input = shiyuInput()
    change(input.sourceRecord, "future_field", { nested: [1, 2] })
    change(input.sourceRecord, "a/b~c", 0)
    change(input.sourceRecord, "__proto__", { polluted: true })
    change(input.sourceRecord, "constructor", "raw")
    const result = integrateShiyu(input)
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "970001",
        locale: "index",
        pointer: "/__proto__",
        kind: "unknown-field",
      },
      {
        entityId: "970001",
        locale: "index",
        pointer: "/a~1b~0c",
        kind: "unknown-field",
      },
      {
        entityId: "970001",
        locale: "index",
        pointer: "/constructor",
        kind: "unknown-field",
      },
      {
        entityId: "970001",
        locale: "index",
        pointer: "/future_field",
        kind: "unknown-field",
      },
    ])
    expect(result.sourceRecord).toStrictEqual(input.sourceRecord)
    expectShiyuRoundtrip(result, input)
  })

  it("zone 各层未知字段留在本语言并诊断；诊断顺序确定", () => {
    const input = shiyuInput()
    change(input.details.zh, "future_field", { nested: [1, 2] })
    change(input.details.zh, "zone.9700102.future_stage_field", 0)
    change(
      input.details.zh,
      "zone.9700102.layer_room.97002011.future_room_field",
      0,
    )
    change(
      input.details.zh,
      "zone.9700102.layer_room.97002011.monster_list.11331.future_encounter_field",
      0,
    )
    change(
      input.details.en,
      "zone.9700102.layer_room.97002011.monster_list.11331.future_encounter_field",
      0,
    )
    const result = integrateShiyu(input)
    expect(result.details.zh).toMatchObject({
      future_field: { nested: [1, 2] },
    })
    expect(result.details.en).not.toHaveProperty("future_field")
    expect(
      result.details.zh!.zone["9700102"]!.layerRoom["97002011"]!.monsterList[
        "11331"
      ],
    ).toMatchObject({ future_encounter_field: 0 })
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "970001",
        locale: "zh",
        pointer: "/future_field",
        kind: "unknown-field",
      },
      {
        entityId: "970001",
        locale: "zh",
        pointer: "/zone/9700102/future_stage_field",
        kind: "unknown-field",
      },
      {
        entityId: "970001",
        locale: "zh",
        pointer: "/zone/9700102/layer_room/97002011/future_room_field",
        kind: "unknown-field",
      },
      {
        entityId: "970001",
        locale: "zh",
        pointer:
          "/zone/9700102/layer_room/97002011/monster_list/11331/future_encounter_field",
        kind: "unknown-field",
      },
      {
        entityId: "970001",
        locale: "en",
        pointer:
          "/zone/9700102/layer_room/97002011/monster_list/11331/future_encounter_field",
        kind: "unknown-field",
      },
    ])
    expectShiyuRoundtrip(result, input)
  })

  it("对象成员排列不影响输出，诊断顺序确定", () => {
    const input = shiyuInput()
    const reversed = {
      entityId: input.entityId,
      detailLocales: [...input.detailLocales],
      sourceRecord: reverseKeys(input.sourceRecord),
      details: {
        zh: reverseKeys(input.details.zh),
        en: reverseKeys(input.details.en),
      },
    }
    change(input.details.zh, "z_field", 0)
    change(reversed.details.zh, "z_field", 0)
    change(input.details.zh, "a_field", 0)
    change(reversed.details.zh, "a_field", 0)
    const expected = integrateShiyu(input)
    const result = integrateShiyu(reversed as IntegrateShiyuInput)
    expect(result).toStrictEqual(expected)
  })

  it("已登记公共值冲突明确失败并定位来源", () => {
    const cases: Array<[path: string, value: unknown, pointer: string]> = [
      ["priority", 4, "/priority"],
      ["end_time", "2024-08-01 04:00:00", "/end_time"],
    ]
    for (const [path, value, pointer] of cases) {
      const input = shiyuInput()
      change(input.details.en, path, value)
      expectFailure(input, "en", pointer, "共享冲突")
    }
  })

  it("身份、必需字段与结构类型违规明确失败", () => {
    const input = shiyuInput()
    change(input.details.zh, "id", 970002)
    expectFailure(input, "zh", "/id", "详情身份与实体 ID 不一致")

    const wrongId = shiyuInput()
    change(wrongId.details.en, "id", "970001")
    expectFailure(wrongId, "en", "/id", "字段类型必须为 number")

    const missingCases: Array<[path: string, pointer: string]> = [
      ["name", "/name"],
      ["priority", "/priority"],
      ["zone", "/zone"],
      ["zone.9700101.name", "/zone/9700101/name"],
      ["zone.9700101.stage_num", "/zone/9700101/stage_num"],
      ["zone.9700101.monster_level", "/zone/9700101/monster_level"],
      ["zone.9700101.layer_buff", "/zone/9700101/layer_buff"],
      ["zone.9700101.child", "/zone/9700101/child"],
      ["zone.9700101.layer_room", "/zone/9700101/layer_room"],
      ["zone.9700101.goal_type", "/zone/9700101/goal_type"],
      ["zone.9700101.ss_rank_goal", "/zone/9700101/ss_rank_goal"],
      ["zone.9700101.s_rank_goal", "/zone/9700101/s_rank_goal"],
      ["zone.9700101.a_rank_goal", "/zone/9700101/a_rank_goal"],
      ["zone.9700101.b_rank_goal", "/zone/9700101/b_rank_goal"],
      [
        "zone.9700101.layer_buff.97001011.title",
        "/zone/9700101/layer_buff/97001011/title",
      ],
      [
        "zone.9700101.layer_buff.97001011.desc",
        "/zone/9700101/layer_buff/97001011/desc",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_icon",
        "/zone/9700101/layer_room/97001011/monster_icon",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list",
        "/zone/9700101/layer_room/97001011/monster_list",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_weakness",
        "/zone/9700101/layer_room/97001011/monster_weakness",
      ],
      [
        "zone.9700101.layer_room.97001011.waves_num",
        "/zone/9700101/layer_room/97001011/waves_num",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.id",
        "/zone/9700101/layer_room/97001011/monster_list/11314/id",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.name",
        "/zone/9700101/layer_room/97001011/monster_list/11314/name",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.image",
        "/zone/9700101/layer_room/97001011/monster_list/11314/image",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.element",
        "/zone/9700101/layer_room/97001011/monster_list/11314/element",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.stats",
        "/zone/9700101/layer_room/97001011/monster_list/11314/stats",
      ],
    ]
    for (const [path, pointer] of missingCases) {
      const caseInput = shiyuInput()
      remove(caseInput.details.zh, path)
      expectFailure(caseInput, "zh", pointer, "缺失必需字段")
    }

    const cases: Array<
      [path: string, value: unknown, pointer: string, reason: string]
    > = [
      ["priority", "3", "/priority", "字段类型必须为 number"],
      ["begin_time", 0, "/begin_time", "字段类型必须为 string"],
      ["name", 3, "/name", "字段类型必须为 string"],
      ["zone", [], "/zone", "字段类型必须为普通对象"],
      ["zone.9700101", "text", "/zone/9700101", "字段类型必须为普通对象"],
      [
        "zone.9700101.stage_num",
        "1",
        "/zone/9700101/stage_num",
        "字段类型必须为 number",
      ],
      [
        "zone.9700101.child",
        ["97001021"],
        "/zone/9700101/child",
        "字段类型必须为 number[]",
      ],
      [
        "zone.9700101.layer_buff",
        [],
        "/zone/9700101/layer_buff",
        "字段类型必须为普通对象",
      ],
      [
        "zone.9700101.layer_buff.97001011",
        "text",
        "/zone/9700101/layer_buff/97001011",
        "字段类型必须为普通对象",
      ],
      [
        "zone.9700101.layer_buff.97001011.title",
        0,
        "/zone/9700101/layer_buff/97001011/title",
        "字段类型必须为 string",
      ],
      [
        "zone.9700101.layer_room.97001011.waves_num",
        "2",
        "/zone/9700101/layer_room/97001011/waves_num",
        "字段类型必须为 number",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list",
        [],
        "/zone/9700101/layer_room/97001011/monster_list",
        "字段类型必须为普通对象",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314",
        "text",
        "/zone/9700101/layer_room/97001011/monster_list/11314",
        "字段类型必须为普通对象",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.id",
        "10019",
        "/zone/9700101/layer_room/97001011/monster_list/11314/id",
        "字段类型必须为 number",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.stats",
        "text",
        "/zone/9700101/layer_room/97001011/monster_list/11314/stats",
        "字段类型必须为普通对象",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.stats.hp",
        "18723.601",
        "/zone/9700101/layer_room/97001011/monster_list/11314/stats/hp",
        "关卡数值必须为 number",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_list.11314.element.ice",
        "1",
        "/zone/9700101/layer_room/97001011/monster_list/11314/element/ice",
        "元素数值必须为 number",
      ],
      [
        "zone.9700101.layer_room.97001011.monster_weakness.200",
        0,
        "/zone/9700101/layer_room/97001011/monster_weakness/200",
        "弱点文本必须为 string",
      ],
    ]
    for (const [path, value, pointer, reason] of cases) {
      const caseInput = shiyuInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, reason)
    }
  })

  it("语言配置违规与辅助字段、改名冲突明确失败", () => {
    const extraLocale = shiyuInput()
    change(extraLocale.details, "ja", shiyuSource())
    expectFailure(extraLocale, "input", "/ja", "未配置的详情语言")

    const missingLocale = shiyuInput()
    const withoutEn: Record<string, unknown> = { zh: missingLocale.details.zh }
    expectFailure(
      { ...missingLocale, details: withoutEn },
      "en",
      "",
      "缺失详情",
    )

    const emptyLocales = shiyuInput()
    expectFailure(
      { ...emptyLocales, detailLocales: [] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const duplicateLocales = shiyuInput()
    expectFailure(
      { ...duplicateLocales, detailLocales: ["zh", "zh"] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const unsupportedLocales = shiyuInput()
    expectFailure(
      {
        ...unsupportedLocales,
        detailLocales: ["zh", "ja"],
      } as unknown as IntegrateShiyuInput,
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const badEntityId = shiyuInput()
    expectFailure(
      { ...badEntityId, entityId: "0970001" },
      "input",
      "/entityId",
      "实体 ID 不是规范十进制 key",
    )

    const auxiliary = shiyuInput()
    change(auxiliary.details.zh, "locale", "zh")
    expectFailure(auxiliary, "zh", "/locale", "辅助字段重名")

    const renameCases: Array<[path: string, value: unknown, pointer: string]> =
      [
        ["beginTime", "kept", "/beginTime"],
        ["endTime", "kept", "/endTime"],
        ["zone.9700101.stageNum", 1, "/zone/9700101/stageNum"],
        ["zone.9700101.layerBuff", {}, "/zone/9700101/layerBuff"],
        ["zone.9700101.layerRoom", {}, "/zone/9700101/layerRoom"],
        ["zone.9700101.ssRankGoal", 0, "/zone/9700101/ssRankGoal"],
        [
          "zone.9700101.layer_room.97001011.monsterList",
          {},
          "/zone/9700101/layer_room/97001011/monsterList",
        ],
        [
          "zone.9700101.layer_room.97001011.monsterWeakness",
          {},
          "/zone/9700101/layer_room/97001011/monsterWeakness",
        ],
        [
          "zone.9700101.layer_room.97001011.wavesNum",
          0,
          "/zone/9700101/layer_room/97001011/wavesNum",
        ],
      ]
    for (const [path, value, pointer] of renameCases) {
      const caseInput = shiyuInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, "改名冲突")
    }
  })

  it("共享 JSON 保真边界沿用同一错误类型", () => {
    const nonFinite = shiyuInput()
    change(
      nonFinite.details.zh,
      "zone.9700101.layer_room.97001011.monster_list.11314.stats.hp",
      Number.POSITIVE_INFINITY,
    )
    expect(() => integrateShiyu(nonFinite)).toThrow(ShiyuIntegrationError)

    const accessor = shiyuInput()
    Object.defineProperty(accessor.details.zh, "name", {
      get() {
        return "示例节点"
      },
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateShiyu(accessor)).toThrow(ShiyuIntegrationError)

    const symbolKey = shiyuInput()
    Object.defineProperty(symbolKey.details, Symbol("zh"), {
      value: shiyuSource(),
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateShiyu(symbolKey)).toThrow(ShiyuIntegrationError)
  })

  it("纯函数允许显式语言子集，快照层完整性由调用方保证", () => {
    const input = shiyuInput()
    const zhOnly = integrateShiyu({
      entityId: input.entityId,
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
      detailLocales: ["zh"],
    })
    expect(zhOnly.details).not.toHaveProperty("en")
    // 单语言输入时时间字段视为该语言独有条件满足：提取到 data。
    expect(zhOnly.data).toStrictEqual(expectedData)
    expect(zhOnly.details.zh!.zone).toStrictEqual(expectedZone)
    expectShiyuRoundtrip(zhOnly, {
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
    })
  })
})

describe("单 Shiyu 纯整合的空值与特例语义", () => {
  it("空字符串、空字典、空数组与零值按来源保留", () => {
    const input = shiyuInput()
    change(input.details.zh, "zone.9700101.name", "")
    change(input.details.en, "zone.9700101.name", "")
    change(input.details.zh, "zone.9700102.layer_buff", {})
    change(input.details.en, "zone.9700102.layer_buff", {})
    change(
      input.details.zh,
      "zone.9700102.layer_room.97002011.monster_weakness",
      {},
    )
    change(
      input.details.en,
      "zone.9700102.layer_room.97002011.monster_weakness",
      {},
    )
    change(input.details.zh, "zone.9700102.child", [])
    change(input.details.en, "zone.9700102.child", [])
    change(input.details.zh, "zone.9700102.layer_room.97002011.waves_num", 0)
    change(input.details.en, "zone.9700102.layer_room.97002011.waves_num", 0)
    change(input.details.zh, "zone.9700102.goal_type", 0)
    change(input.details.en, "zone.9700102.goal_type", 0)
    const result = integrateShiyu(input)
    expect(result.details.zh!.zone["9700101"]!.name).toBe("")
    expect(result.details.zh!.zone["9700102"]!.layerBuff).toStrictEqual({})
    expect(
      result.details.zh!.zone["9700102"]!.layerRoom["97002011"]!
        .monsterWeakness,
    ).toStrictEqual({})
    expect(result.details.zh!.zone["9700102"]!.child).toStrictEqual([])
    expect(
      result.details.zh!.zone["9700102"]!.layerRoom["97002011"]!.wavesNum,
    ).toBe(0)
    expect(result.details.zh!.zone["9700102"]!.goalType).toBe(0)
    expectShiyuRoundtrip(result, input)
  })

  it.each(["constructor", "__proto__", "toString"])(
    "还原辅助函数不把特殊自有字段 %s 误判为登记改名",
    (field) => {
      const input = shiyuInput()
      // zone 各层都是本语言结构：特殊自有字段按普通数据保留，不改名、不改值。
      // change 经 Object.defineProperty 写入自有属性，避开 __proto__ 的字面量语义。
      change(input.details.zh, `zone.9700101.${field}`, { nested: [1] })
      change(input.details.en, `zone.9700101.${field}`, { nested: [1] })
      change(
        input.details.zh,
        `zone.9700101.layer_room.97001011.monster_list.11314.${field}`,
        "encounter-value",
      )
      change(
        input.details.en,
        `zone.9700101.layer_room.97001011.monster_list.11314.${field}`,
        "encounter-value",
      )
      const result = integrateShiyu(input)
      expect(Object.hasOwn(result.details.zh!.zone["9700101"]!, field)).toBe(
        true,
      )
      expect(result.details.zh!.zone["9700101"]![field]).toEqual({
        nested: [1],
      })
      expect(
        Object.hasOwn(
          result.details.zh!.zone["9700101"]!.layerRoom["97001011"]!
            .monsterList["11314"]!,
          field,
        ),
      ).toBe(true)
      expect(
        result.details.zh!.zone["9700101"]!.layerRoom["97001011"]!.monsterList[
          "11314"
        ]![field],
      ).toBe("encounter-value")
      // 还原辅助函数须按登记表命中与否改名，不读取登记表原型链。
      expectShiyuRoundtrip(result, input)
    },
  )
})
