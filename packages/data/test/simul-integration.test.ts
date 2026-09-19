import { describe, expect, it } from "vitest"
import type { SimulData } from "../src/integration/simul-types.ts"
import { integrateSimul } from "../src/integration/integrate-simul.ts"
import type { IntegrateSimulInput } from "../src/integration/integrate-simul.ts"
import { SimulIntegrationError } from "../src/integration/source-json.ts"
import {
  simulInput,
  simulSecondInput,
  simulSource,
} from "./fixtures/simul-source.ts"
import { expectSimulRoundtrip } from "./fixtures/simul-roundtrip.ts"

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
  input: IntegrateSimulInput,
  locale: string,
  pointer: string,
  reason?: string,
): void {
  expect(() => integrateSimul(input)).toThrow(SimulIntegrationError)
  try {
    integrateSimul(input)
  } catch (error) {
    expect(error).toMatchObject({
      location: { entityId: input.entityId, locale, pointer },
    })
    if (reason) expect((error as Error).message).toContain(reason)
  }
}

const expectedData = {
  id: 990001,
  endTime: "2025-12-31 03:59:59",
  bossAdjust: {
    "1001": { hp: 1200, atk: -5000, points: 1000 },
    "1002": { hp: 1700, atk: -2500, points: 1200 },
  },
} satisfies SimulData

describe("单 Simul 纯整合 nanoka-simul-reference/1", () => {
  it("按独立预期拆分双语，保留索引，冻结输入仍可整合且不修改来源", () => {
    const input = simulInput()
    const before = structuredClone(input)
    freeze(input)
    const result = integrateSimul(input)
    expect(result.data).toStrictEqual(expectedData)
    // record 与 node 完整留在各语言：不提取共享关卡图，不跨语言数组对齐。
    expect(result.data).not.toHaveProperty("node")
    expect(result.data).not.toHaveProperty("record")
    const zh = result.details.zh!
    expect(zh.id).toBe(990001)
    expect(zh.locale).toBe("zh")
    // Simul 无顶层 name：不要求也不补造。
    expect(zh).not.toHaveProperty("name")
    expect(Object.keys(zh.node)).toEqual(["99001", "99002"])
    expect(zh.node["99001"]!.storyEvent["9900101"]!["9900001"]!.name).toBe(
      "危机四伏的旅程",
    )
    expect(zh.node["99001"]!.battle).toStrictEqual({})
    expect(zh.node["99002"]!.storyEvent).toStrictEqual({})
    const battle = zh.node["99002"]!.battle["9900201"]!
    expect(battle.name).toBe("STAGE 01")
    expect(battle.tagType).toBe(1)
    expect(battle.layer.monsterLevel).toBe(60)
    expect(battle.layer.layerRoom).toStrictEqual({})
    expect(battle.layerRoom["70799001"]!.monsterList["11818"]).toMatchObject({
      id: 30024,
      name: "示例首领",
    })
    expect(zh.record["1"]!.name).toBe("结局一·示例")
    const en = result.details.en!
    expect(en.node["99001"]!.storyEvent["9900101"]!["9900001"]!.name).toBe(
      "A Perilous Journey",
    )
    expect(en.node["99002"]!.battle["9900201"]!.name).toBe("BATTLE 01")
    expect(
      en.node["99002"]!.battle["9900201"]!.layerRoom["70799001"]!.monsterList[
        "11818"
      ],
    ).toMatchObject({ id: 30024, name: "Example Overlord" })
    expect(result.details.zh).not.toHaveProperty("end_time")
    expect(result.details.zh).not.toHaveProperty("boss_adjust")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectSimulRoundtrip(result, input)
    expect(input).toStrictEqual(before)
    result.data.endTime = "modified"
    result.sourceRecord.end = "modified"
    result.details.zh!.node["99001"]!.name = "modified"
    expect(input).toStrictEqual(before)
  })

  it("第二个成员：空字符串 endTime 与空 record 是合法原值", () => {
    const input = simulSecondInput()
    const before = structuredClone(input)
    const result = integrateSimul(input)
    expect(result.data.endTime).toBe("")
    expect(result.data.bossAdjust).toStrictEqual(expectedData.bossAdjust)
    expect(result.details.zh!.record).toStrictEqual({})
    expect(Object.keys(result.details.zh!.node)).toEqual(["99003"])
    expect(result.details.zh!.node["99003"]!.battle).toStrictEqual({})
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectSimulRoundtrip(result, input)
    expect(input).toStrictEqual(before)
  })

  it("boss_adjust 是完整共享块：负值原样保留，未知成员随块参与完整值比较", () => {
    const input = simulInput()
    // 未知成员两语言一致：随块提取到 data 并进入诊断。
    change(input.details.zh, "boss_adjust.1001.note", "说明")
    change(input.details.en, "boss_adjust.1001.note", "说明")
    const result = integrateSimul(input)
    expect(result.data.bossAdjust["1001"]).toMatchObject({
      hp: 1200,
      atk: -5000,
      points: 1000,
      note: "说明",
    })
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "990001",
        locale: "zh",
        pointer: "/boss_adjust/1001/note",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "en",
        pointer: "/boss_adjust/1001/note",
        kind: "unknown-field",
      },
    ])
    expectSimulRoundtrip(result, input)
    // 未知成员跨语言不一致仍按共享冲突处理。
    const conflict = simulInput()
    change(conflict.details.en, "boss_adjust.1001.note", "different")
    change(conflict.details.zh, "boss_adjust.1001.note", "说明")
    expectFailure(conflict, "en", "/boss_adjust", "共享冲突")
    // 已登记成员的冲突同样失败。
    const memberConflict = simulInput()
    change(memberConflict.details.en, "boss_adjust.1001.atk", -4999)
    expectFailure(memberConflict, "en", "/boss_adjust", "共享冲突")
  })

  it("encounter 与弱点完整保留；monster_list 外层 key 不是 Monster ID", () => {
    const input = simulInput()
    const result = integrateSimul(input)
    const room =
      result.details.zh!.node["99002"]!.battle["9900201"]!.layerRoom[
        "70799001"
      ]!
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
        hp: 9123456.78,
        attack: 4104.5939393939398,
        defence: 987.8000000000001,
        stun: 17247.4,
        attribute_infliction: 0,
      },
    })
    expect(room.monsterWeakness).toStrictEqual({ "202": "冰属性" })
    expectSimulRoundtrip(result, input)
  })

  it("解锁目标集合分别保留：next_page、next_node_unlock、next_record_unlock 不混用", () => {
    const input = simulInput()
    const page =
      input.details.zh.node["99001"]!.story_event["9900101"]!["9900001"]!
    expect(page.next_page).toEqual([9900002])
    expect(page.next_node_unlock).toEqual([99002])
    expect(page.next_record_unlock).toEqual([9900801])
    // next_page 指向的页面不在本事件字典内、next_node_unlock 指向的节点不存在于 node 字典：
    // 不做图闭合校验，也不要求非零引用落在猜测的集合中。
    const result = integrateSimul(input)
    const restoredPage =
      result.details.zh!.node["99001"]!.storyEvent["9900101"]!["9900001"]!
    expect(restoredPage.nextPage).toEqual([9900002])
    expect(restoredPage.nextNodeUnlock).toEqual([99002])
    expect(restoredPage.nextRecordUnlock).toEqual([9900801])
    // prev_node 是不透明来源值：不要求落在当前 node 字典中。
    expect(result.details.zh!.node["99002"]!.prevNode).toBe(99001)
    expectSimulRoundtrip(result, input)
  })

  it("索引记录与详情独立保留，不要求相等也不互相回退", () => {
    const input = simulInput()
    change(input.sourceRecord, "end", "2099-01-01 00:00:00")
    const result = integrateSimul(input)
    expect(result.data.endTime).toBe("2025-12-31 03:59:59")
    expect(result.sourceRecord.end).toBe("2099-01-01 00:00:00")
    expect(result.maintenance.diagnostics).toEqual([])
    expectSimulRoundtrip(result, input)
  })

  it("来源索引的未知顶层字段生成 index 诊断，已知字段不误报", () => {
    const input = simulInput()
    change(input.sourceRecord, "future_field", { nested: [1, 2] })
    change(input.sourceRecord, "a/b~c", 0)
    change(input.sourceRecord, "__proto__", { polluted: true })
    change(input.sourceRecord, "constructor", "raw")
    const result = integrateSimul(input)
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "990001",
        locale: "index",
        pointer: "/__proto__",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "index",
        pointer: "/a~1b~0c",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "index",
        pointer: "/constructor",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "index",
        pointer: "/future_field",
        kind: "unknown-field",
      },
    ])
    expect(result.sourceRecord).toStrictEqual(input.sourceRecord)
    expectSimulRoundtrip(result, input)
  })

  it("node、battle、layer 各层未知字段留在本语言并诊断；诊断顺序确定", () => {
    const input = simulInput()
    change(input.details.zh, "future_field", { nested: [1, 2] })
    change(input.details.zh, "node.99001.future_node_field", 0)
    change(
      input.details.zh,
      "node.99001.story_event.9900101.9900001.future_page_field",
      0,
    )
    change(
      input.details.zh,
      "node.99001.story_event.9900101.9900001.choice.0.future_choice_field",
      0,
    )
    change(input.details.zh, "node.99002.battle.9900201.future_battle_field", 0)
    change(
      input.details.zh,
      "node.99002.battle.9900201.layer.future_layer_field",
      0,
    )
    change(
      input.details.zh,
      "node.99002.battle.9900201.layer_room.70799001.future_room_field",
      0,
    )
    change(
      input.details.zh,
      "node.99002.battle.9900201.selectable_buff.99010301.future_buff_field",
      0,
    )
    change(input.details.zh, "record.1.future_record_entry_field", 0)
    const result = integrateSimul(input)
    expect(result.details.zh).toMatchObject({
      future_field: { nested: [1, 2] },
    })
    expect(result.details.zh!.node["99001"]).toMatchObject({
      future_node_field: 0,
    })
    expect(result.details.zh!.record["1"]).toMatchObject({
      future_record_entry_field: 0,
    })
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "990001",
        locale: "zh",
        pointer: "/future_field",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "zh",
        pointer: "/node/99001/future_node_field",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "zh",
        pointer:
          "/node/99001/story_event/9900101/9900001/choice/0/future_choice_field",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "zh",
        pointer: "/node/99001/story_event/9900101/9900001/future_page_field",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "zh",
        pointer: "/node/99002/battle/9900201/future_battle_field",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "zh",
        pointer: "/node/99002/battle/9900201/layer/future_layer_field",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "zh",
        pointer:
          "/node/99002/battle/9900201/layer_room/70799001/future_room_field",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "zh",
        pointer:
          "/node/99002/battle/9900201/selectable_buff/99010301/future_buff_field",
        kind: "unknown-field",
      },
      {
        entityId: "990001",
        locale: "zh",
        pointer: "/record/1/future_record_entry_field",
        kind: "unknown-field",
      },
    ])
    expectSimulRoundtrip(result, input)
  })

  it("对象成员排列不影响输出", () => {
    const input = simulInput()
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
    const expected = integrateSimul(input)
    const result = integrateSimul(reversed as IntegrateSimulInput)
    expect(result).toStrictEqual(expected)
  })

  it("已登记公共值冲突明确失败并定位来源", () => {
    const cases: Array<[path: string, value: unknown, pointer: string]> = [
      ["end_time", "2025-12-31 04:00:00", "/end_time"],
      ["boss_adjust.1002.hp", 1701, "/boss_adjust"],
    ]
    for (const [path, value, pointer] of cases) {
      const input = simulInput()
      change(input.details.en, path, value)
      expectFailure(input, "en", pointer, "共享冲突")
    }
  })

  it("身份、必需字段与结构类型违规明确失败", () => {
    const input = simulInput()
    change(input.details.zh, "id", 990002)
    expectFailure(input, "zh", "/id", "详情身份与实体 ID 不一致")

    const wrongId = simulInput()
    change(wrongId.details.en, "id", "990001")
    expectFailure(wrongId, "en", "/id", "字段类型必须为 number")

    const missingCases: Array<[path: string, pointer: string]> = [
      ["end_time", "/end_time"],
      ["boss_adjust", "/boss_adjust"],
      ["record", "/record"],
      ["node", "/node"],
      ["node.99001.id", "/node/99001/id"],
      ["node.99001.name", "/node/99001/name"],
      ["node.99001.prev_node", "/node/99001/prev_node"],
      ["node.99001.story_event", "/node/99001/story_event"],
      ["node.99001.battle", "/node/99001/battle"],
      [
        "node.99001.story_event.9900101.9900001.choice",
        "/node/99001/story_event/9900101/9900001/choice",
      ],
      [
        "node.99001.story_event.9900101.9900001.next_page",
        "/node/99001/story_event/9900101/9900001/next_page",
      ],
      [
        "node.99001.story_event.9900101.9900001.choice.0.name",
        "/node/99001/story_event/9900101/9900001/choice/0/name",
      ],
      ["node.99002.battle.9900201.id", "/node/99002/battle/9900201/id"],
      ["node.99002.battle.9900201.layer", "/node/99002/battle/9900201/layer"],
      [
        "node.99002.battle.9900201.layer.monster_level",
        "/node/99002/battle/9900201/layer/monster_level",
      ],
      [
        "node.99002.battle.9900201.selectable_buff",
        "/node/99002/battle/9900201/selectable_buff",
      ],
      [
        "node.99002.battle.9900201.selectable_buff.99010301.title",
        "/node/99002/battle/9900201/selectable_buff/99010301/title",
      ],
      [
        "node.99002.battle.9900201.layer_room.70799001.monster_list.11818.image",
        "/node/99002/battle/9900201/layer_room/70799001/monster_list/11818/image",
      ],
      ["record.1.text", "/record/1/text"],
      ["boss_adjust.1001.atk", "/boss_adjust/1001/atk"],
    ]
    for (const [path, pointer] of missingCases) {
      const caseInput = simulInput()
      remove(caseInput.details.zh, path)
      expectFailure(caseInput, "zh", pointer, "缺失必需字段")
    }

    const cases: Array<
      [path: string, value: unknown, pointer: string, reason: string]
    > = [
      ["end_time", 0, "/end_time", "字段类型必须为 string"],
      ["node", [], "/node", "字段类型必须为普通对象"],
      ["record", [], "/record", "字段类型必须为普通对象"],
      ["node.99001", "text", "/node/99001", "字段类型必须为普通对象"],
      [
        "node.99001.prev_node",
        "0",
        "/node/99001/prev_node",
        "字段类型必须为 number",
      ],
      [
        "node.99001.story_event",
        [],
        "/node/99001/story_event",
        "字段类型必须为普通对象",
      ],
      [
        "node.99001.story_event.9900101.9900001.next_page",
        "9900002",
        "/node/99001/story_event/9900101/9900001/next_page",
        "字段类型必须为 number[]",
      ],
      [
        "node.99001.story_event.9900101.9900001.choice",
        {},
        "/node/99001/story_event/9900101/9900001/choice",
        "字段类型必须为 array",
      ],
      [
        "node.99001.story_event.9900101.9900001.choice.0",
        "text",
        "/node/99001/story_event/9900101/9900001/choice/0",
        "字段类型必须为普通对象",
      ],
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
        "node.99002.battle.9900201.layer",
        "text",
        "/node/99002/battle/9900201/layer",
        "字段类型必须为普通对象",
      ],
      [
        "node.99002.battle.9900201.layer.s_rank_goal",
        "40000",
        "/node/99002/battle/9900201/layer/s_rank_goal",
        "字段类型必须为 number",
      ],
      [
        "node.99002.battle.9900201.layer_room.70799001.waves_num",
        "1",
        "/node/99002/battle/9900201/layer_room/70799001/waves_num",
        "字段类型必须为 number",
      ],
      [
        "node.99002.battle.9900201.layer_room.70799001.monster_list.11818.stats.hp",
        "9123456",
        "/node/99002/battle/9900201/layer_room/70799001/monster_list/11818/stats/hp",
        "关卡数值必须为 number",
      ],
      [
        "node.99002.battle.9900201.layer_room.70799001.monster_weakness.202",
        0,
        "/node/99002/battle/9900201/layer_room/70799001/monster_weakness/202",
        "弱点文本必须为 string",
      ],
    ]
    for (const [path, value, pointer, reason] of cases) {
      const caseInput = simulInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, reason)
    }
  })

  it("语言配置违规与辅助字段、改名冲突明确失败", () => {
    const extraLocale = simulInput()
    change(extraLocale.details, "ja", simulSource())
    expectFailure(extraLocale, "input", "/ja", "未配置的详情语言")

    const missingLocale = simulInput()
    const withoutEn: Record<string, unknown> = { zh: missingLocale.details.zh }
    expectFailure(
      { ...missingLocale, details: withoutEn },
      "en",
      "",
      "缺失详情",
    )

    const emptyLocales = simulInput()
    expectFailure(
      { ...emptyLocales, detailLocales: [] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const duplicateLocales = simulInput()
    expectFailure(
      { ...duplicateLocales, detailLocales: ["zh", "zh"] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const unsupportedLocales = simulInput()
    expectFailure(
      {
        ...unsupportedLocales,
        detailLocales: ["zh", "ja"],
      } as unknown as IntegrateSimulInput,
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const badEntityId = simulInput()
    expectFailure(
      { ...badEntityId, entityId: "0990001" },
      "input",
      "/entityId",
      "实体 ID 不是规范十进制 key",
    )

    const auxiliary = simulInput()
    change(auxiliary.details.zh, "locale", "zh")
    expectFailure(auxiliary, "zh", "/locale", "辅助字段重名")

    const renameCases: Array<[path: string, value: unknown, pointer: string]> =
      [
        ["endTime", "kept", "/endTime"],
        ["bossAdjust", {}, "/bossAdjust"],
        ["node.99001.prevNode", 0, "/node/99001/prevNode"],
        ["node.99001.storyEvent", {}, "/node/99001/storyEvent"],
        [
          "node.99001.story_event.9900101.9900001.nextPage",
          [],
          "/node/99001/story_event/9900101/9900001/nextPage",
        ],
        [
          "node.99001.story_event.9900101.9900001.nextNodeUnlock",
          [],
          "/node/99001/story_event/9900101/9900001/nextNodeUnlock",
        ],
        [
          "node.99001.story_event.9900101.9900001.nextRecordUnlock",
          [],
          "/node/99001/story_event/9900101/9900001/nextRecordUnlock",
        ],
        [
          "node.99002.battle.9900201.tagType",
          1,
          "/node/99002/battle/9900201/tagType",
        ],
        [
          "node.99002.battle.9900201.sRankScoreLayerBuff",
          {},
          "/node/99002/battle/9900201/sRankScoreLayerBuff",
        ],
        [
          "node.99002.battle.9900201.layer.monsterLevel",
          60,
          "/node/99002/battle/9900201/layer/monsterLevel",
        ],
        [
          "node.99002.battle.9900201.selectableBuff",
          {},
          "/node/99002/battle/9900201/selectableBuff",
        ],
        [
          "node.99002.battle.9900201.layerRoom",
          {},
          "/node/99002/battle/9900201/layerRoom",
        ],
        [
          "node.99002.battle.9900201.layer_room.70799001.monsterList",
          {},
          "/node/99002/battle/9900201/layer_room/70799001/monsterList",
        ],
      ]
    for (const [path, value, pointer] of renameCases) {
      const caseInput = simulInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, "改名冲突")
    }
  })

  it("共享 JSON 保真边界沿用同一错误类型", () => {
    const nonFinite = simulInput()
    change(
      nonFinite.details.zh,
      "node.99002.battle.9900201.layer_room.70799001.monster_list.11818.stats.hp",
      Number.POSITIVE_INFINITY,
    )
    expect(() => integrateSimul(nonFinite)).toThrow(SimulIntegrationError)

    const accessor = simulInput()
    Object.defineProperty(accessor.details.zh, "end_time", {
      get() {
        return "2025-12-31 03:59:59"
      },
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateSimul(accessor)).toThrow(SimulIntegrationError)

    const symbolKey = simulInput()
    Object.defineProperty(symbolKey.details, Symbol("zh"), {
      value: simulSource(),
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateSimul(symbolKey)).toThrow(SimulIntegrationError)
  })

  it("纯函数允许显式语言子集，快照层完整性由调用方保证", () => {
    const input = simulInput()
    const zhOnly = integrateSimul({
      entityId: input.entityId,
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
      detailLocales: ["zh"],
    })
    expect(zhOnly.details).not.toHaveProperty("en")
    expect(zhOnly.data).toStrictEqual(expectedData)
    expect(Object.keys(zhOnly.details.zh!.node)).toEqual(["99001", "99002"])
    expectSimulRoundtrip(zhOnly, {
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
    })
  })
})

describe("单 Simul 纯整合的空值与特例语义", () => {
  it("空字符串、空字典、零值与负值按来源保留", () => {
    const input = simulInput()
    change(
      input.details.zh,
      "node.99002.battle.9900201.layer.layer_buff.69013010.title",
      "",
    )
    change(
      input.details.en,
      "node.99002.battle.9900201.layer.layer_buff.69013010.title",
      "",
    )
    change(input.details.zh, "node.99002.battle.9900201.selectable_buff", {})
    change(input.details.en, "node.99002.battle.9900201.selectable_buff", {})
    change(
      input.details.zh,
      "node.99002.battle.9900201.b_rank_score_layer_buff",
      {},
    )
    change(
      input.details.en,
      "node.99002.battle.9900201.b_rank_score_layer_buff",
      {},
    )
    change(input.details.zh, "boss_adjust.1002.hp", 0)
    change(input.details.en, "boss_adjust.1002.hp", 0)
    change(input.details.zh, "node.99001.story_event.9900101.9900001.icon", "")
    change(input.details.en, "node.99001.story_event.9900101.9900001.icon", "")
    const result = integrateSimul(input)
    expect(
      result.details.zh!.node["99002"]!.battle["9900201"]!.layer.layerBuff[
        "69013010"
      ]!.title,
    ).toBe("")
    expect(
      result.details.zh!.node["99002"]!.battle["9900201"]!.selectableBuff,
    ).toStrictEqual({})
    expect(
      result.details.zh!.node["99002"]!.battle["9900201"]!.bRankScoreLayerBuff,
    ).toStrictEqual({})
    expect(
      result.details.zh!.node["99001"]!.storyEvent["9900101"]!["9900001"]!.icon,
    ).toBe("")
    expect(result.data.bossAdjust["1002"]!.hp).toBe(0)
    expect(result.data.bossAdjust["1001"]!.atk).toBe(-5000)
    expectSimulRoundtrip(result, input)
  })

  it.each(["constructor", "__proto__", "toString"])(
    "还原辅助函数不把特殊自有字段 %s 误判为登记改名",
    (field) => {
      const input = simulInput()
      // node、battle、story 页与 encounter 各层都是本语言结构：特殊自有字段按普通数据保留，不改名、不改值。
      // change 经 Object.defineProperty 写入自有属性，避开 __proto__ 的字面量语义。
      change(input.details.zh, `node.99002.${field}`, { nested: [1] })
      change(input.details.en, `node.99002.${field}`, { nested: [1] })
      change(
        input.details.zh,
        `node.99002.battle.9900201.layer_room.70799001.monster_list.11818.${field}`,
        "encounter-value",
      )
      change(
        input.details.en,
        `node.99002.battle.9900201.layer_room.70799001.monster_list.11818.${field}`,
        "encounter-value",
      )
      const result = integrateSimul(input)
      expect(Object.hasOwn(result.details.zh!.node["99002"]!, field)).toBe(true)
      expect(result.details.zh!.node["99002"]![field]).toEqual({ nested: [1] })
      expect(
        Object.hasOwn(
          result.details.zh!.node["99002"]!.battle["9900201"]!.layerRoom[
            "70799001"
          ]!.monsterList["11818"]!,
          field,
        ),
      ).toBe(true)
      // 还原辅助函数须按登记表命中与否改名，不读取登记表原型链。
      expectSimulRoundtrip(result, input)
    },
  )
})

describe("Simul 还原辅助函数的路径边界", () => {
  it("未知扩展内容原样保留：内部 camelCase/snake_case key 与数组内容不被改写；篡改必须失败", () => {
    const input = simulInput()
    // 未知字段的整个值原样保留：内部字段名不做登记表推断，数组内容同样不改写；
    // 同一对象内的 snake_case 与 camelCase key 同时保留。
    change(input.details.zh, "future_extension", {
      prevNode: 1,
      prev_node: 2,
      nested: [{ nextPage: [1], storyEvent: {} }],
    })
    change(input.details.zh, "future_snake", { next_page: "kept" })
    const result = integrateSimul(input)
    expect(result.details.zh!.future_extension).toStrictEqual({
      prevNode: 1,
      prev_node: 2,
      nested: [{ nextPage: [1], storyEvent: {} }],
    })
    expect(result.details.zh!.future_snake).toStrictEqual({
      next_page: "kept",
    })
    expectSimulRoundtrip(result, input)
    // 人为把未知字段内部的 snake_case key 篡改成 camelCase 后，还原校验必须失败：
    // 不得把 nextPage 误还原成 next_page 掩盖损坏。
    const corrupted = structuredClone(result)
    corrupted.details.zh!.future_snake = { nextPage: "kept" }
    expect(() => expectSimulRoundtrip(corrupted, input)).toThrow()
  })

  it("字典 key 与登记字段名相同时原样保留，值仍按登记结构还原", () => {
    const input = simulInput()
    const room =
      input.details.zh.node["99002"]!.battle["9900201"]!.layer_room["70799001"]!
    const encounter = structuredClone(room.monster_list["11818"]!)
    // encounter 字典 key 恰好与登记字段同名：字典 key 原样保留，值仍按 encounter 结构还原。
    change(
      input.details.zh,
      "node.99002.battle.9900201.layer_room.70799001.monster_list.nextPage",
      encounter,
    )
    // 同一层的 battle 字典 key 与 battle 成员输出名同名：key 原样保留，值仍按 battle 结构还原。
    const battle = structuredClone(
      input.details.zh.node["99002"]!.battle["9900201"],
    )
    change(input.details.zh, "node.99002.battle.tagType", battle)
    const result = integrateSimul(input)
    const restoredBattle = result.details.zh!.node["99002"]!.battle["9900201"]!
    expect(Object.keys(result.details.zh!.node["99002"]!.battle)).toContain(
      "tagType",
    )
    expect(result.details.zh!.node["99002"]!.battle["tagType"]!.tagType).toBe(1)
    const restoredRoom = restoredBattle.layerRoom["70799001"]!
    expect(Object.keys(restoredRoom.monsterList)).toContain("nextPage")
    expect(restoredRoom.monsterList["nextPage"]!.id).toBe(30024)
    expectSimulRoundtrip(result, input)
  })
})
