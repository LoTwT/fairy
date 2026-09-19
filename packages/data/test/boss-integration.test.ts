import { describe, expect, it } from "vitest"
import type { BossData } from "../src/integration/boss-types.ts"
import { integrateBoss } from "../src/integration/integrate-boss.ts"
import type { IntegrateBossInput } from "../src/integration/integrate-boss.ts"
import { BossIntegrationError } from "../src/integration/source-json.ts"
import {
  bossInput,
  bossLegacyZoneInput,
  bossSource,
} from "./fixtures/boss-source.ts"
import { expectBossRoundtrip } from "./fixtures/boss-roundtrip.ts"

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
  input: IntegrateBossInput,
  locale: string,
  pointer: string,
  reason?: string,
): void {
  expect(() => integrateBoss(input)).toThrow(BossIntegrationError)
  try {
    integrateBoss(input)
  } catch (error) {
    expect(error).toMatchObject({
      location: { entityId: input.entityId, locale, pointer },
    })
    if (reason) expect((error as Error).message).toContain(reason)
  }
}

const expectedData = {
  id: 980001,
  priority: 5,
  zoneType: 1001,
  beginTime: "2024-07-04 04:00:00",
  endTime: "2024-08-01 03:59:59",
  bossAdjust: {
    "1001": { hp: 1200, atk: -5000, points: 1000 },
    "1002": { hp: 1700, atk: -2500, points: 1200 },
  },
} satisfies BossData

describe("单 Boss 纯整合 nanoka-boss-reference/1", () => {
  it("按独立预期拆分双语，保留索引，冻结输入仍可整合且不修改来源", () => {
    const input = bossInput()
    const before = structuredClone(input)
    freeze(input)
    const result = integrateBoss(input)
    expect(result.data).toStrictEqual(expectedData)
    // modes 完整留在各语言：顺序保持来源原样，不排序、不去重。
    expect(result.data).not.toHaveProperty("modes")
    const zh = result.details.zh!
    expect(zh.id).toBe(980001)
    expect(zh.locale).toBe("zh")
    expect(zh.name).toBe("试炼")
    expect(zh.modes).toHaveLength(2)
    expect(zh.modes![0]!.id).toBe(980001)
    expect(zh.modes![0]!.zoneType).toBe(1001)
    expect(zh.modes![0]!.zone["9800101"]!.name).toBe("示例首领·一阶")
    expect(zh.modes![0]!.zone["9800101"]!.selectableBuff).toMatchObject({
      "98010101": { title: "诛心" },
    })
    expect(zh.modes![1]!.id).toBe(980002)
    expect(zh.modes![1]!.zoneType).toBe(1002)
    expect(zh.modes![1]!.zone["9800201"]!.name).toBe("示例首领·二阶")
    expect(zh.zone).toBeUndefined()
    const en = result.details.en!
    expect(en.modes![0]!.zone["9800101"]!.name).toBe(
      "Example Overlord · Phase I",
    )
    expect(
      en.modes![0]!.zone["9800101"]!.layerRoom["98001011"]!.monsterList[
        "11818"
      ],
    ).toMatchObject({ id: 30024, name: "Example Overlord" })
    expect(result.details.zh).not.toHaveProperty("boss_adjust")
    expect(result.details.zh).not.toHaveProperty("zone_type")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectBossRoundtrip(result, input)
    expect(input).toStrictEqual(before)
    result.data.priority = 0
    result.sourceRecord.en = "modified"
    result.details.zh!.name = "modified"
    expect(input).toStrictEqual(before)
  })

  it("modes 顺序保持来源原样；顶层 zoneType 与 mode 的 zoneType 分别保留", () => {
    const input = bossInput()
    // 交换两个 mode 的顺序：输出保持交换后的来源顺序，不重新排序。
    const modes = input.details.zh.modes
    const enModes = input.details.en.modes
    ;[modes[0], modes[1]] = [modes[1]!, modes[0]!]
    ;[enModes[0], enModes[1]] = [enModes[1]!, enModes[0]!]
    const result = integrateBoss(input)
    expect(result.details.zh!.modes![0]!.id).toBe(980002)
    expect(result.details.zh!.modes![1]!.id).toBe(980001)
    expect(result.data.zoneType).toBe(1001)
    // 第二个 mode 的 zone_type 与顶层不同，分别保留，不要求相等。
    expect(result.details.zh!.modes![0]!.zoneType).toBe(1002)
    expectBossRoundtrip(result, input)
  })

  it("旧结构变体：顶层 zone 字典按实际字段识别，不转换成 modes 也不丢弃原层级", () => {
    const input = bossLegacyZoneInput()
    const before = structuredClone(input)
    const result = integrateBoss(input)
    expect(result.data).toStrictEqual(expectedData)
    expect(result.details.zh!.modes).toBeUndefined()
    expect(Object.keys(result.details.zh!.zone!)).toEqual(["9800101"])
    expect(result.details.zh!.zone!["9800101"]!.stageNum).toBe(1)
    expect(result.details.zh!.zone!["9800101"]!.selectableBuff).toMatchObject({
      "98010101": { title: "诛心" },
    })
    expect(result.details.en!.zone!["9800101"]!.name).toBe(
      "Example Overlord · Phase I",
    )
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectBossRoundtrip(result, input)
    expect(input).toStrictEqual(before)
  })

  it("结构冲突：modes 与 zone 同时存在或同时缺失明确失败", () => {
    const both = bossInput()
    change(both.details.zh, "zone", bossLegacyZoneInput().details.zh.zone)
    change(both.details.en, "zone", bossLegacyZoneInput().details.en.zone)
    expectFailure(both, "zh", "/modes", "结构冲突：modes 与 zone 同时存在")

    const neither = bossInput()
    remove(neither.details.zh, "modes")
    remove(neither.details.en, "modes")
    expectFailure(neither, "zh", "/modes", "结构冲突：modes 与 zone 同时缺失")
  })

  it("boss_adjust 是完整共享块：负值原样保留，未知成员随块参与完整值比较", () => {
    const input = bossInput()
    // 未知成员两语言一致：随块提取到 data 并进入诊断。
    change(input.details.zh, "boss_adjust.1001.note", "说明")
    change(input.details.en, "boss_adjust.1001.note", "说明")
    const result = integrateBoss(input)
    expect(result.data.bossAdjust["1001"]).toMatchObject({
      hp: 1200,
      atk: -5000,
      points: 1000,
      note: "说明",
    })
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "980001",
        locale: "zh",
        pointer: "/boss_adjust/1001/note",
        kind: "unknown-field",
      },
      {
        entityId: "980001",
        locale: "en",
        pointer: "/boss_adjust/1001/note",
        kind: "unknown-field",
      },
    ])
    expectBossRoundtrip(result, input)
    // 未知成员跨语言不一致仍按共享冲突处理。
    const conflict = bossInput()
    change(conflict.details.en, "boss_adjust.1001.note", "different")
    change(conflict.details.zh, "boss_adjust.1001.note", "说明")
    expectFailure(conflict, "en", "/boss_adjust", "共享冲突")
    // 已登记成员的冲突同样失败。
    const memberConflict = bossInput()
    change(memberConflict.details.en, "boss_adjust.1001.atk", -4999)
    expectFailure(memberConflict, "en", "/boss_adjust", "共享冲突")
  })

  it("encounter 与弱点完整保留；monster_list 外层 key 不是 Monster ID", () => {
    const input = bossInput()
    const result = integrateBoss(input)
    const room =
      result.details.zh!.modes![0]!.zone["9800101"]!.layerRoom["98001011"]!
    expect(Object.keys(room.monsterList)).toEqual(["11818"])
    expect(room.monsterList["11818"]).toStrictEqual({
      id: 30024,
      name: "示例首领",
      image:
        "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv03/Monster_Example.png",
      element: {
        ice: 1,
        fire: 0,
        electric: 0,
        ether: 0,
        physical: -1,
        wind: 0,
      },
      stats: {
        hp: 8737162.92,
        attack: 3948.5939393939398,
        defence: 952.8000000000001,
        stun: 16647.4,
        attribute_infliction: 0,
      },
    })
    expect(room.monsterWeakness).toStrictEqual({ "202": "冰属性" })
    expectBossRoundtrip(result, input)
  })

  it("索引记录与详情独立保留，不要求相等也不互相回退", () => {
    const input = bossInput()
    change(input.sourceRecord, "zone_type", 9999)
    change(input.sourceRecord, "sort", 99)
    change(input.sourceRecord, "begin", "2099-01-01 00:00:00")
    const result = integrateBoss(input)
    expect(result.data.zoneType).toBe(1001)
    expect(result.data.beginTime).toBe("2024-07-04 04:00:00")
    expect(result.sourceRecord.zone_type).toBe(9999)
    expect(result.maintenance.diagnostics).toEqual([])
    expectBossRoundtrip(result, input)
  })

  it("来源索引的未知顶层字段生成 index 诊断，已知字段不误报", () => {
    const input = bossInput()
    change(input.sourceRecord, "future_field", { nested: [1, 2] })
    change(input.sourceRecord, "a/b~c", 0)
    change(input.sourceRecord, "__proto__", { polluted: true })
    change(input.sourceRecord, "constructor", "raw")
    const result = integrateBoss(input)
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "980001",
        locale: "index",
        pointer: "/__proto__",
        kind: "unknown-field",
      },
      {
        entityId: "980001",
        locale: "index",
        pointer: "/a~1b~0c",
        kind: "unknown-field",
      },
      {
        entityId: "980001",
        locale: "index",
        pointer: "/constructor",
        kind: "unknown-field",
      },
      {
        entityId: "980001",
        locale: "index",
        pointer: "/future_field",
        kind: "unknown-field",
      },
    ])
    expect(result.sourceRecord).toStrictEqual(input.sourceRecord)
    expectBossRoundtrip(result, input)
  })

  it("zone 各层未知字段留在本语言并诊断；诊断顺序确定", () => {
    const input = bossInput()
    change(input.details.zh, "future_field", { nested: [1, 2] })
    change(input.details.zh, "modes.0.zone.9800101.future_stage_field", 0)
    change(input.details.zh, "modes.0.future_mode_field", 0)
    change(
      input.details.zh,
      "modes.0.zone.9800101.layer_room.98001011.future_room_field",
      0,
    )
    change(
      input.details.zh,
      "modes.0.zone.9800101.selectable_buff.98010101.future_buff_field",
      0,
    )
    const result = integrateBoss(input)
    expect(result.details.zh).toMatchObject({
      future_field: { nested: [1, 2] },
    })
    expect(result.details.zh!.modes![0]).toMatchObject({
      future_mode_field: 0,
    })
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "980001",
        locale: "zh",
        pointer: "/future_field",
        kind: "unknown-field",
      },
      {
        entityId: "980001",
        locale: "zh",
        pointer: "/modes/0/future_mode_field",
        kind: "unknown-field",
      },
      {
        entityId: "980001",
        locale: "zh",
        pointer: "/modes/0/zone/9800101/future_stage_field",
        kind: "unknown-field",
      },
      {
        entityId: "980001",
        locale: "zh",
        pointer: "/modes/0/zone/9800101/layer_room/98001011/future_room_field",
        kind: "unknown-field",
      },
      {
        entityId: "980001",
        locale: "zh",
        pointer:
          "/modes/0/zone/9800101/selectable_buff/98010101/future_buff_field",
        kind: "unknown-field",
      },
    ])
    expectBossRoundtrip(result, input)
  })

  it("对象成员排列不影响输出", () => {
    const input = bossInput()
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
    const expected = integrateBoss(input)
    const result = integrateBoss(reversed as IntegrateBossInput)
    expect(result).toStrictEqual(expected)
  })

  it("已登记公共值冲突明确失败并定位来源", () => {
    const cases: Array<[path: string, value: unknown, pointer: string]> = [
      ["priority", 6, "/priority"],
      ["zone_type", 1002, "/zone_type"],
      ["begin_time", "2024-07-04 04:00:01", "/begin_time"],
      ["end_time", "2024-08-01 04:00:00", "/end_time"],
      ["boss_adjust.1002.hp", 1701, "/boss_adjust"],
    ]
    for (const [path, value, pointer] of cases) {
      const input = bossInput()
      change(input.details.en, path, value)
      expectFailure(input, "en", pointer, "共享冲突")
    }
  })

  it("身份、必需字段与结构类型违规明确失败", () => {
    const input = bossInput()
    change(input.details.zh, "id", 980002)
    expectFailure(input, "zh", "/id", "详情身份与实体 ID 不一致")

    const wrongId = bossInput()
    change(wrongId.details.en, "id", "980001")
    expectFailure(wrongId, "en", "/id", "字段类型必须为 number")

    const missingCases: Array<[path: string, pointer: string]> = [
      ["name", "/name"],
      ["priority", "/priority"],
      ["zone_type", "/zone_type"],
      ["boss_adjust", "/boss_adjust"],
      ["begin_time", "/begin_time"],
      ["end_time", "/end_time"],
      ["modes.0.id", "/modes/0/id"],
      ["modes.0.zone_type", "/modes/0/zone_type"],
      ["modes.0.zone", "/modes/0/zone"],
      ["modes.0.zone.9800101.name", "/modes/0/zone/9800101/name"],
      ["modes.0.zone.9800101.stage_num", "/modes/0/zone/9800101/stage_num"],
      [
        "modes.0.zone.9800101.selectable_buff",
        "/modes/0/zone/9800101/selectable_buff",
      ],
      [
        "modes.0.zone.9800101.selectable_buff.98010101.title",
        "/modes/0/zone/9800101/selectable_buff/98010101/title",
      ],
      [
        "modes.0.zone.9800101.layer_room.98001011.monster_list.11818.image",
        "/modes/0/zone/9800101/layer_room/98001011/monster_list/11818/image",
      ],
      ["boss_adjust.1001.atk", "/boss_adjust/1001/atk"],
    ]
    for (const [path, pointer] of missingCases) {
      const caseInput = bossInput()
      remove(caseInput.details.zh, path)
      expectFailure(caseInput, "zh", pointer, "缺失必需字段")
    }

    const cases: Array<
      [path: string, value: unknown, pointer: string, reason: string]
    > = [
      ["priority", "5", "/priority", "字段类型必须为 number"],
      ["zone_type", "1001", "/zone_type", "字段类型必须为 number"],
      ["begin_time", 0, "/begin_time", "字段类型必须为 string"],
      ["modes", {}, "/modes", "字段类型必须为 array"],
      ["modes.0", "text", "/modes/0", "字段类型必须为普通对象"],
      [
        "modes.0.zone_type",
        "1001",
        "/modes/0/zone_type",
        "字段类型必须为 number",
      ],
      ["modes.0.zone", [], "/modes/0/zone", "字段类型必须为普通对象"],
      ["boss_adjust", [], "/boss_adjust", "字段类型必须为普通对象"],
      [
        "boss_adjust.1001",
        "text",
        "/boss_adjust/1001",
        "字段类型必须为普通对象",
      ],
      [
        "boss_adjust.1001.points",
        "1000",
        "/boss_adjust/1001/points",
        "字段类型必须为 number",
      ],
      [
        "modes.0.zone.9800101.s_rank_goal",
        "20000",
        "/modes/0/zone/9800101/s_rank_goal",
        "字段类型必须为 number",
      ],
      [
        "modes.0.zone.9800101.layer_room.98001011.waves_num",
        "1",
        "/modes/0/zone/9800101/layer_room/98001011/waves_num",
        "字段类型必须为 number",
      ],
      [
        "modes.0.zone.9800101.layer_room.98001011.monster_list.11818.stats.hp",
        "8737162",
        "/modes/0/zone/9800101/layer_room/98001011/monster_list/11818/stats/hp",
        "关卡数值必须为 number",
      ],
      [
        "modes.0.zone.9800101.layer_room.98001011.monster_weakness.202",
        0,
        "/modes/0/zone/9800101/layer_room/98001011/monster_weakness/202",
        "弱点文本必须为 string",
      ],
    ]
    for (const [path, value, pointer, reason] of cases) {
      const caseInput = bossInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, reason)
    }
  })

  it("语言配置违规与辅助字段、改名冲突明确失败", () => {
    const extraLocale = bossInput()
    change(extraLocale.details, "ja", bossSource())
    expectFailure(extraLocale, "input", "/ja", "未配置的详情语言")

    const missingLocale = bossInput()
    const withoutEn: Record<string, unknown> = { zh: missingLocale.details.zh }
    expectFailure(
      { ...missingLocale, details: withoutEn },
      "en",
      "",
      "缺失详情",
    )

    const emptyLocales = bossInput()
    expectFailure(
      { ...emptyLocales, detailLocales: [] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const duplicateLocales = bossInput()
    expectFailure(
      { ...duplicateLocales, detailLocales: ["zh", "zh"] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const unsupportedLocales = bossInput()
    expectFailure(
      {
        ...unsupportedLocales,
        detailLocales: ["zh", "ja"],
      } as unknown as IntegrateBossInput,
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const badEntityId = bossInput()
    expectFailure(
      { ...badEntityId, entityId: "0980001" },
      "input",
      "/entityId",
      "实体 ID 不是规范十进制 key",
    )

    const auxiliary = bossInput()
    change(auxiliary.details.zh, "locale", "zh")
    expectFailure(auxiliary, "zh", "/locale", "辅助字段重名")

    const renameCases: Array<[path: string, value: unknown, pointer: string]> =
      [
        ["zoneType", 1001, "/zoneType"],
        ["bossAdjust", {}, "/bossAdjust"],
        ["beginTime", "kept", "/beginTime"],
        ["endTime", "kept", "/endTime"],
        ["modes.0.zoneType", 1001, "/modes/0/zoneType"],
        ["modes.0.zone.9800101.stageNum", 1, "/modes/0/zone/9800101/stageNum"],
        [
          "modes.0.zone.9800101.selectableBuff",
          {},
          "/modes/0/zone/9800101/selectableBuff",
        ],
        [
          "modes.0.zone.9800101.layerRoom",
          {},
          "/modes/0/zone/9800101/layerRoom",
        ],
        [
          "modes.0.zone.9800101.layer_room.98001011.monsterList",
          {},
          "/modes/0/zone/9800101/layer_room/98001011/monsterList",
        ],
      ]
    for (const [path, value, pointer] of renameCases) {
      const caseInput = bossInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, "改名冲突")
    }
  })

  it("共享 JSON 保真边界沿用同一错误类型", () => {
    const nonFinite = bossInput()
    change(
      nonFinite.details.zh,
      "modes.0.zone.9800101.layer_room.98001011.monster_list.11818.stats.hp",
      Number.POSITIVE_INFINITY,
    )
    expect(() => integrateBoss(nonFinite)).toThrow(BossIntegrationError)

    const accessor = bossInput()
    Object.defineProperty(accessor.details.zh, "name", {
      get() {
        return "试炼"
      },
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateBoss(accessor)).toThrow(BossIntegrationError)

    const symbolKey = bossInput()
    Object.defineProperty(symbolKey.details, Symbol("zh"), {
      value: bossSource(),
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateBoss(symbolKey)).toThrow(BossIntegrationError)
  })

  it("纯函数允许显式语言子集，快照层完整性由调用方保证", () => {
    const input = bossInput()
    const zhOnly = integrateBoss({
      entityId: input.entityId,
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
      detailLocales: ["zh"],
    })
    expect(zhOnly.details).not.toHaveProperty("en")
    expect(zhOnly.data).toStrictEqual(expectedData)
    expect(zhOnly.details.zh!.modes).toHaveLength(2)
    expectBossRoundtrip(zhOnly, {
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
    })
  })
})

describe("单 Boss 纯整合的空值与特例语义", () => {
  it("空字符串、空字典、零值与负值按来源保留", () => {
    const input = bossInput()
    change(
      input.details.zh,
      "modes.0.zone.9800101.layer_buff.98010110.title",
      "",
    )
    change(
      input.details.en,
      "modes.0.zone.9800101.layer_buff.98010110.title",
      "",
    )
    change(input.details.zh, "modes.1.zone.9800201.layer_buff", {})
    change(input.details.en, "modes.1.zone.9800201.layer_buff", {})
    change(input.details.zh, "modes.1.zone.9800201.selectable_buff", {})
    change(input.details.en, "modes.1.zone.9800201.selectable_buff", {})
    change(input.details.zh, "boss_adjust.1002.hp", 0)
    change(input.details.en, "boss_adjust.1002.hp", 0)
    const result = integrateBoss(input)
    expect(
      result.details.zh!.modes![0]!.zone["9800101"]!.layerBuff["98010110"]!
        .title,
    ).toBe("")
    expect(
      result.details.zh!.modes![1]!.zone["9800201"]!.layerBuff,
    ).toStrictEqual({})
    expect(
      result.details.zh!.modes![1]!.zone["9800201"]!.selectableBuff,
    ).toStrictEqual({})
    expect(result.data.bossAdjust["1002"]!.hp).toBe(0)
    expect(result.data.bossAdjust["1001"]!.atk).toBe(-5000)
    expectBossRoundtrip(result, input)
  })

  it.each(["constructor", "__proto__", "toString"])(
    "还原辅助函数不把特殊自有字段 %s 误判为登记改名",
    (field) => {
      const input = bossInput()
      // modes 与 zone 各层都是本语言结构：特殊自有字段按普通数据保留，不改名、不改值。
      // change 经 Object.defineProperty 写入自有属性，避开 __proto__ 的字面量语义。
      change(input.details.zh, `modes.0.${field}`, { nested: [1] })
      change(input.details.en, `modes.0.${field}`, { nested: [1] })
      change(
        input.details.zh,
        `modes.0.zone.9800101.layer_room.98001011.monster_list.11818.${field}`,
        "encounter-value",
      )
      change(
        input.details.en,
        `modes.0.zone.9800101.layer_room.98001011.monster_list.11818.${field}`,
        "encounter-value",
      )
      const result = integrateBoss(input)
      expect(Object.hasOwn(result.details.zh!.modes![0]!, field)).toBe(true)
      expect(result.details.zh!.modes![0]![field]).toEqual({ nested: [1] })
      expect(
        Object.hasOwn(
          result.details.zh!.modes![0]!.zone["9800101"]!.layerRoom["98001011"]!
            .monsterList["11818"]!,
          field,
        ),
      ).toBe(true)
      // 还原辅助函数须按登记表命中与否改名，不读取登记表原型链。
      expectBossRoundtrip(result, input)
    },
  )
})

describe("Boss 还原辅助函数的路径边界", () => {
  it("未知扩展内容原样保留：内部 camelCase/snake_case key 与数组内容不被改写；篡改必须失败", () => {
    const input = bossInput()
    // 未知字段的整个值原样保留：内部字段名不做登记表推断，数组内容同样不改写；
    // 同一对象内的 snake_case 与 camelCase key 同时保留。
    change(input.details.zh, "future_extension", {
      zoneType: "camel",
      zone_type: "snake",
      nested: [{ stageNum: 2, layerBuff: {} }],
    })
    change(input.details.zh, "future_snake", { selectable_buff: "kept" })
    const result = integrateBoss(input)
    expect(result.details.zh!.future_extension).toStrictEqual({
      zoneType: "camel",
      zone_type: "snake",
      nested: [{ stageNum: 2, layerBuff: {} }],
    })
    expect(result.details.zh!.future_snake).toStrictEqual({
      selectable_buff: "kept",
    })
    expectBossRoundtrip(result, input)
    // 人为把未知字段内部的 snake_case key 篡改成 camelCase 后，还原校验必须失败：
    // 不得把 selectableBuff 误还原成 selectable_buff 掩盖损坏。
    const corrupted = structuredClone(result)
    corrupted.details.zh!.future_snake = { selectableBuff: "kept" }
    expect(() => expectBossRoundtrip(corrupted, input)).toThrow()
  })

  it("字典 key 与登记字段名相同时原样保留，值仍按阶段结构还原", () => {
    const input = bossInput()
    const stage = structuredClone(input.details.zh.modes[0]!.zone["9800101"])
    // 阶段 key 恰好与登记字段同名：字典 key 原样保留，不按登记表改名。
    change(input.details.zh, "modes.0.zone.selectableBuff", stage)
    const result = integrateBoss(input)
    expect(Object.keys(result.details.zh!.modes![0]!.zone)).toContain(
      "selectableBuff",
    )
    expect(result.details.zh!.modes![0]!.zone["selectableBuff"]!.stageNum).toBe(
      1,
    )
    expectBossRoundtrip(result, input)
  })
})
