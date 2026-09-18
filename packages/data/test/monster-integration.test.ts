import { describe, expect, it } from "vitest"
import type { MonsterData } from "../src/integration/monster-types.ts"
import { integrateMonster } from "../src/integration/integrate-monster.ts"
import type { IntegrateMonsterInput } from "../src/integration/integrate-monster.ts"
import { MonsterIntegrationError } from "../src/integration/source-json.ts"
import {
  monsterEmptyInfoInput,
  monsterInput,
  monsterSource,
} from "./fixtures/monster-source.ts"
import { expectMonsterRoundtrip } from "./fixtures/monster-roundtrip.ts"

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
  input: IntegrateMonsterInput,
  locale: string,
  pointer: string,
  reason?: string,
): void {
  expect(() => integrateMonster(input)).toThrow(MonsterIntegrationError)
  try {
    integrateMonster(input)
  } catch (error) {
    expect(error).toMatchObject({
      location: { entityId: input.entityId, locale, pointer },
    })
    if (reason) expect((error as Error).message).toContain(reason)
  }
}

const expectedData = {
  id: 960001,
  monsterId: 960100,
  imagePath:
    "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
  rarity: 1,
  groupId: 201,
  monsterInfo: {
    "960101": {
      id: 960101,
      codeName: "Monster_ExampleA",
      icon: "",
      tag: ["Ether", "Demote", "Small"],
      type: "Monster",
      element: { ice: 1, fire: 0, electric: 0, ether: 1, physical: 0, wind: 0 },
      stats: {
        hp: 80,
        attack: 48,
        defence: 45,
        crit: 0,
        crit_damage: 5000,
        crit_dmg_res: 0,
        is_stun: false,
        can_interrupt_stun_recover: true,
        ether_damage_res: -2000,
      },
      curves: {
        hp: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
        attack: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
        defence: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
        stun: { curve: [100, 100, 100, 103, 103, 103], ratio: 100 },
      },
    },
    "960102": {
      id: 960102,
      codeName: "Monster_ExampleB",
      icon: "",
      tag: ["Ether", "Demote", "Small"],
      type: "Monster",
      element: { ice: 1, fire: 0, electric: 0, ether: 1, physical: 0, wind: 0 },
      stats: {
        hp: 80,
        attack: 48,
        defence: 45,
        crit: 0,
        crit_damage: 5000,
        crit_dmg_res: 0,
        is_stun: false,
        can_interrupt_stun_recover: true,
        ether_damage_res: -2000,
      },
      curves: {
        hp: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
        attack: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
        defence: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
        stun: { curve: [100, 100, 100, 103, 103, 103], ratio: 100 },
      },
    },
  },
  elementAbnormal: { "10001": 600, "20001": 2250, "30005": 3000 },
} satisfies MonsterData

describe("单怪物纯整合 nanoka-monster-reference/1", () => {
  it("按独立预期拆分双语，保留索引，冻结输入仍可整合且不修改来源", () => {
    const input = monsterInput()
    const before = structuredClone(input)
    freeze(input)
    const result = integrateMonster(input)
    expect(result.data).toStrictEqual(expectedData)
    expect(result.details.zh).toStrictEqual({
      id: 960001,
      locale: "zh",
      name: "示例怪",
      desc: "示例怪物的完整介绍。\n第二段保留换行。",
      groupDesc: "以骸化 hostile 为原型的高级敌怪。",
      cardObtain: "空洞深潜获得",
      cardQuote: "「示例引语。」",
      cardSkillDesc: "技能说明原文。",
    })
    expect(result.details.en).toStrictEqual({
      id: 960001,
      locale: "en",
      name: "OfficialName_",
      desc: "A synthetic monster introduction.\nSecond paragraph.",
      groupDesc: "Ethereal hostile archetype.",
      cardObtain: "Obtained from Hollow Deep dives.",
      cardQuote: '"An example quote."',
      cardSkillDesc: "Original skill description.",
    })
    expect(result.details.zh).not.toHaveProperty("monster_id")
    expect(result.details.zh).not.toHaveProperty("image_path")
    expect(result.details.zh).not.toHaveProperty("rarity")
    expect(result.details.zh).not.toHaveProperty("group_id")
    expect(result.details.zh).not.toHaveProperty("monster_info")
    expect(result.details.zh).not.toHaveProperty("element_abnormal")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectMonsterRoundtrip(result, input)
    expect(input).toStrictEqual(before)
    result.data.monsterId = 0
    result.sourceRecord.en = "modified"
    result.details.zh!.desc = "modified"
    expect(input).toStrictEqual(before)
  })

  it("多内部单位与三个身份层次分开建模，monsterId 不要求出现在单位集合中", () => {
    const input = monsterInput()
    const result = integrateMonster(input)
    expect(Object.keys(result.data.monsterInfo)).toEqual(["960101", "960102"])
    // 顶层详情 ID、monsterId 分组编号与内部单位 ID 三者互不相等，也不互相推导。
    expect(result.data.id).toBe(960001)
    expect(result.data.monsterId).toBe(960100)
    expect(result.data.monsterInfo["960101"]!.id).toBe(960101)
    expect(Object.hasOwn(result.data.monsterInfo, "960100")).toBe(false)
    expectMonsterRoundtrip(result, input)
  })

  it("单位 key 必须是规范十进制 ID 且与其自身 id 一致", () => {
    const nonCanonical = monsterInput()
    for (const locale of ["zh", "en"] as const) {
      const info = nonCanonical.details[locale].monster_info
      const unit = info["960101"]!
      delete info["960101"]
      info["0960101"] = unit
    }
    expectFailure(
      nonCanonical,
      "zh",
      "/monster_info/0960101",
      "内部单位 key 不是规范十进制 ID",
    )

    const mismatched = monsterInput()
    change(mismatched.details.zh, "monster_info.960101.id", 960103)
    change(mismatched.details.en, "monster_info.960101.id", 960103)
    expectFailure(
      mismatched,
      "zh",
      "/monster_info/960101/id",
      "内部单位 id 与其 key 不一致",
    )
  })

  it("合法空 monster_info 完整保留，monsterId 不受单位集合影响", () => {
    const input = monsterEmptyInfoInput()
    const before = structuredClone(input)
    const result = integrateMonster(input)
    expect(result.data.monsterInfo).toStrictEqual({})
    expect(result.data.monsterId).toBe(960100)
    expect(result.data.elementAbnormal).toStrictEqual({
      "10001": 600,
      "20001": 2250,
      "30005": 3000,
    })
    expect(result.details.zh!.name).toBe("示例怪")
    expect(result.details.en!.name).toBe("OfficialName_")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectMonsterRoundtrip(result, input)
    expect(input).toStrictEqual(before)
  })

  it("占位名称与跨语言重名按字符串保留，不触发共享提取或名称校验", () => {
    const input = monsterInput()
    change(input.details.zh, "name", "OfficialName_")
    const result = integrateMonster(input)
    expect(result.data).not.toHaveProperty("name")
    expect(result.details.zh!.name).toBe("OfficialName_")
    expect(result.details.en!.name).toBe("OfficialName_")
    expectMonsterRoundtrip(result, input)
  })

  it("索引记录与详情独立保留，不要求相等也不互相回退", () => {
    const input = monsterInput()
    // 索引 `en` 与详情英文名称故意不同；详情名称不得被索引摘要名覆盖。
    expect(input.sourceRecord.en).toBe("OfficialName_")
    change(input.sourceRecord, "en", "changed index name")
    change(input.sourceRecord, "desc", "changed index desc")
    change(input.sourceRecord, "rarity", 5)
    const result = integrateMonster(input)
    expect(result.details.en!.name).toBe("OfficialName_")
    expect(result.sourceRecord.en).toBe("changed index name")
    expect(result.sourceRecord.desc).toBe("changed index desc")
    expect(result.data.rarity).toBe(1)
    expect(result.maintenance.diagnostics).toEqual([])
    expectMonsterRoundtrip(result, input)
  })

  it("来源索引的未知顶层字段生成 index 诊断，已知字段不误报", () => {
    const input = monsterInput()
    change(input.sourceRecord, "future_field", { nested: [1, 2] })
    change(input.sourceRecord, "a/b~c", 0)
    change(input.sourceRecord, "__proto__", { polluted: true })
    change(input.sourceRecord, "constructor", "raw")
    const result = integrateMonster(input)
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "960001",
        locale: "index",
        pointer: "/__proto__",
        kind: "unknown-field",
      },
      {
        entityId: "960001",
        locale: "index",
        pointer: "/a~1b~0c",
        kind: "unknown-field",
      },
      {
        entityId: "960001",
        locale: "index",
        pointer: "/constructor",
        kind: "unknown-field",
      },
      {
        entityId: "960001",
        locale: "index",
        pointer: "/future_field",
        kind: "unknown-field",
      },
    ])
    expect(result.sourceRecord).toStrictEqual(input.sourceRecord)
    expectMonsterRoundtrip(result, input)
  })

  it("未知详情字段留在本语言并诊断；共享块未知成员随块保留且参与完整值比较", () => {
    const input = monsterInput()
    change(input.details.zh, "future_field", { nested: [1, 2] })
    change(input.details.zh.monster_info, "960101", {
      ...(input.details.zh.monster_info["960101"] as object),
      future_unit_member: "说明",
    })
    change(input.details.en.monster_info, "960101", {
      ...(input.details.en.monster_info["960101"] as object),
      future_unit_member: "说明",
    })
    change(input.details.zh.monster_info, "960102", {
      ...(input.details.zh.monster_info["960102"] as object),
      curves: {
        ...(input.details.zh.monster_info["960102"] as { curves: object })
          .curves,
        hp: {
          ...(
            input.details.zh.monster_info["960102"] as {
              curves: Record<string, object>
            }
          ).curves["hp"]!,
          note: "曲线说明",
        },
      },
    })
    change(input.details.en.monster_info, "960102", {
      ...(input.details.en.monster_info["960102"] as object),
      curves: {
        ...(input.details.en.monster_info["960102"] as { curves: object })
          .curves,
        hp: {
          ...(
            input.details.en.monster_info["960102"] as {
              curves: Record<string, object>
            }
          ).curves["hp"]!,
          note: "曲线说明",
        },
      },
    })
    const result = integrateMonster(input)
    expect(result.data.monsterInfo["960101"]).toMatchObject({
      future_unit_member: "说明",
    })
    expect(result.data.monsterInfo["960102"]).toMatchObject({
      curves: {
        hp: { curve: expect.any(Array), ratio: 100, note: "曲线说明" },
      },
    })
    expect(result.details.zh).toMatchObject({
      future_field: { nested: [1, 2] },
    })
    expect(result.details.en).not.toHaveProperty("future_field")
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "960001",
        locale: "zh",
        pointer: "/future_field",
        kind: "unknown-field",
      },
      {
        entityId: "960001",
        locale: "zh",
        pointer: "/monster_info/960101/future_unit_member",
        kind: "unknown-field",
      },
      {
        entityId: "960001",
        locale: "zh",
        pointer: "/monster_info/960102/curves/hp/note",
        kind: "unknown-field",
      },
      {
        entityId: "960001",
        locale: "en",
        pointer: "/monster_info/960101/future_unit_member",
        kind: "unknown-field",
      },
      {
        entityId: "960001",
        locale: "en",
        pointer: "/monster_info/960102/curves/hp/note",
        kind: "unknown-field",
      },
    ])
    expectMonsterRoundtrip(result, input)
    // 共享块内部的未知成员跨语言不一致仍按公共冲突处理。
    const unitConflict = monsterInput()
    change(unitConflict.details.en.monster_info, "960101", {
      ...(unitConflict.details.en.monster_info["960101"] as object),
      future_unit_member: "different",
    })
    expectFailure(unitConflict, "en", "/monster_info", "共享冲突")
    const curveConflict = monsterInput()
    change(curveConflict.details.en.monster_info, "960102", {
      ...(curveConflict.details.en.monster_info["960102"] as object),
      curves: {
        ...(
          curveConflict.details.en.monster_info["960102"] as {
            curves: object
          }
        ).curves,
        hp: {
          ...(
            curveConflict.details.en.monster_info["960102"] as {
              curves: Record<string, object>
            }
          ).curves["hp"]!,
          ratio: 101,
        },
      },
    })
    expectFailure(curveConflict, "en", "/monster_info", "共享冲突")
  })

  it("对象成员排列不影响输出，诊断顺序确定", () => {
    const input = monsterInput()
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
    const expected = integrateMonster(input)
    const result = integrateMonster(reversed as IntegrateMonsterInput)
    expect(result).toStrictEqual(expected)
  })

  it("已登记公共值冲突明确失败并定位来源", () => {
    const cases: Array<[path: string, value: unknown, pointer: string]> = [
      ["monster_id", 960101, "/monster_id"],
      ["image_path", "other.png", "/image_path"],
      ["rarity", 2, "/rarity"],
      ["group_id", 202, "/group_id"],
      ["element_abnormal", { "10001": 601 }, "/element_abnormal"],
      ["element_abnormal.20001", 2251, "/element_abnormal"],
      ["monster_info.960101.stats.hp", 81, "/monster_info"],
      ["monster_info.960101.curves.hp.ratio", 101, "/monster_info"],
      ["monster_info.960101.tag", ["Ether"], "/monster_info"],
      // 曲线 key 是字典 key：单语言缺失整条曲线按共享块冲突处理，不是缺失必需字段。
      ["monster_info.960101.curves.stun", undefined, "/monster_info"],
    ]
    for (const [path, value, pointer] of cases) {
      const input = monsterInput()
      if (value === undefined) {
        const curves = input.details.en.monster_info["960101"]!.curves
        delete curves["stun"]
      } else change(input.details.en, path, value)
      expectFailure(input, "en", pointer, "共享冲突")
    }
  })

  it("身份、必需字段与结构类型违规明确失败", () => {
    const input = monsterInput()
    change(input.details.zh, "id", 960002)
    expectFailure(input, "zh", "/id", "详情身份与实体 ID 不一致")

    const wrongId = monsterInput()
    change(wrongId.details.en, "id", "960001")
    expectFailure(wrongId, "en", "/id", "字段类型必须为 number")

    const missingCases: Array<[path: string, pointer: string]> = [
      ["name", "/name"],
      ["group_desc", "/group_desc"],
      ["card_obtain", "/card_obtain"],
      ["card_quote", "/card_quote"],
      ["card_skill_desc", "/card_skill_desc"],
      ["monster_id", "/monster_id"],
      ["image_path", "/image_path"],
      ["group_id", "/group_id"],
      ["monster_info", "/monster_info"],
      ["element_abnormal", "/element_abnormal"],
      ["monster_info.960101.code_name", "/monster_info/960101/code_name"],
      ["monster_info.960101.tag", "/monster_info/960101/tag"],
      ["monster_info.960101.curves", "/monster_info/960101/curves"],
      [
        "monster_info.960101.curves.hp.ratio",
        "/monster_info/960101/curves/hp/ratio",
      ],
      ["monster_info.960101.element", "/monster_info/960101/element"],
      ["monster_info.960101.stats", "/monster_info/960101/stats"],
    ]
    for (const [path, pointer] of missingCases) {
      const caseInput = monsterInput()
      remove(caseInput.details.zh, path)
      expectFailure(caseInput, "zh", pointer, "缺失必需字段")
    }

    const cases: Array<
      [path: string, value: unknown, pointer: string, reason: string]
    > = [
      ["monster_id", "960100", "/monster_id", "字段类型必须为 number"],
      ["image_path", 3, "/image_path", "字段类型必须为 string"],
      ["rarity", "1", "/rarity", "字段类型必须为 number"],
      ["group_id", null, "/group_id", "字段类型必须为 number"],
      ["name", 3, "/name", "字段类型必须为 string"],
      ["desc", [], "/desc", "字段类型必须为 string"],
      ["group_desc", true, "/group_desc", "字段类型必须为 string"],
      ["card_obtain", 0, "/card_obtain", "字段类型必须为 string"],
      ["monster_info", [], "/monster_info", "字段类型必须为普通对象"],
      [
        "element_abnormal",
        "text",
        "/element_abnormal",
        "字段类型必须为普通对象",
      ],
      [
        "monster_info.960101",
        "text",
        "/monster_info/960101",
        "字段类型必须为普通对象",
      ],
      [
        "monster_info.960101.id",
        "960101",
        "/monster_info/960101/id",
        "字段类型必须为 number",
      ],
      [
        "monster_info.960101.code_name",
        0,
        "/monster_info/960101/code_name",
        "字段类型必须为 string",
      ],
      [
        "monster_info.960101.icon",
        0,
        "/monster_info/960101/icon",
        "字段类型必须为 string",
      ],
      [
        "monster_info.960101.tag",
        "Ether",
        "/monster_info/960101/tag",
        "字段类型必须为 string[]",
      ],
      [
        "monster_info.960101.type",
        0,
        "/monster_info/960101/type",
        "字段类型必须为 string",
      ],
      [
        "monster_info.960101.element",
        [],
        "/monster_info/960101/element",
        "字段类型必须为普通对象",
      ],
      [
        "monster_info.960101.element.ice",
        "1",
        "/monster_info/960101/element/ice",
        "元素数值必须为 number",
      ],
      [
        "monster_info.960101.stats",
        "text",
        "/monster_info/960101/stats",
        "字段类型必须为普通对象",
      ],
      [
        "monster_info.960101.stats.hp",
        "80",
        "/monster_info/960101/stats/hp",
        "属性数值必须为 number 或 boolean",
      ],
      [
        "monster_info.960101.stats.is_stun",
        "false",
        "/monster_info/960101/stats/is_stun",
        "属性数值必须为 number 或 boolean",
      ],
      [
        "monster_info.960101.curves",
        [],
        "/monster_info/960101/curves",
        "字段类型必须为普通对象",
      ],
      [
        "monster_info.960101.curves.hp",
        "text",
        "/monster_info/960101/curves/hp",
        "字段类型必须为普通对象",
      ],
      [
        "monster_info.960101.curves.hp.curve",
        [100, "116"],
        "/monster_info/960101/curves/hp/curve",
        "字段类型必须为 number[]",
      ],
      [
        "monster_info.960101.curves.hp.ratio",
        "100",
        "/monster_info/960101/curves/hp/ratio",
        "字段类型必须为 number",
      ],
      [
        "element_abnormal.10001",
        "600",
        "/element_abnormal/10001",
        "属性异常数值必须为 number",
      ],
    ]
    for (const [path, value, pointer, reason] of cases) {
      const caseInput = monsterInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, reason)
    }
  })

  it("语言配置违规与辅助字段、改名冲突明确失败", () => {
    const extraLocale = monsterInput()
    change(extraLocale.details, "ja", monsterSource())
    expectFailure(extraLocale, "input", "/ja", "未配置的详情语言")

    const missingLocale = monsterInput()
    const withoutEn: Record<string, unknown> = { zh: missingLocale.details.zh }
    expectFailure(
      { ...missingLocale, details: withoutEn },
      "en",
      "",
      "缺失详情",
    )

    const emptyLocales = monsterInput()
    expectFailure(
      { ...emptyLocales, detailLocales: [] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const duplicateLocales = monsterInput()
    expectFailure(
      { ...duplicateLocales, detailLocales: ["zh", "zh"] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const unsupportedLocales = monsterInput()
    expectFailure(
      {
        ...unsupportedLocales,
        detailLocales: ["zh", "ja"],
      } as unknown as IntegrateMonsterInput,
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const badEntityId = monsterInput()
    expectFailure(
      { ...badEntityId, entityId: "0960001" },
      "input",
      "/entityId",
      "实体 ID 不是规范十进制 key",
    )

    const auxiliary = monsterInput()
    change(auxiliary.details.zh, "locale", "zh")
    expectFailure(auxiliary, "zh", "/locale", "辅助字段重名")

    const renameCases: Array<[path: string, value: unknown, pointer: string]> =
      [
        ["monsterId", 1, "/monsterId"],
        ["imagePath", "kept", "/imagePath"],
        ["groupId", 1, "/groupId"],
        ["monsterInfo", {}, "/monsterInfo"],
        ["elementAbnormal", {}, "/elementAbnormal"],
        ["groupDesc", "kept", "/groupDesc"],
        ["cardObtain", "kept", "/cardObtain"],
        ["cardQuote", "kept", "/cardQuote"],
        ["cardSkillDesc", "kept", "/cardSkillDesc"],
        [
          "monster_info.960101.codeName",
          "kept",
          "/monster_info/960101/codeName",
        ],
      ]
    for (const [path, value, pointer] of renameCases) {
      const caseInput = monsterInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, "改名冲突")
    }
  })

  it("共享 JSON 保真边界沿用同一错误类型", () => {
    const nonFinite = monsterInput()
    change(
      nonFinite.details.zh,
      "monster_info.960101.stats.hp",
      Number.POSITIVE_INFINITY,
    )
    expect(() => integrateMonster(nonFinite)).toThrow(MonsterIntegrationError)

    const accessor = monsterInput()
    Object.defineProperty(accessor.details.zh, "name", {
      get() {
        return "示例怪"
      },
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateMonster(accessor)).toThrow(MonsterIntegrationError)

    const symbolKey = monsterInput()
    Object.defineProperty(symbolKey.details, Symbol("zh"), {
      value: monsterSource(),
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateMonster(symbolKey)).toThrow(MonsterIntegrationError)
  })

  it("纯函数允许显式语言子集，快照层完整性由调用方保证", () => {
    const input = monsterInput()
    const zhOnly = integrateMonster({
      entityId: input.entityId,
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
      detailLocales: ["zh"],
    })
    expect(zhOnly.details).not.toHaveProperty("en")
    expect(zhOnly.data.id).toBe(expectedData.id)
    expect(zhOnly.data.monsterId).toBe(expectedData.monsterId)
    expect(zhOnly.data.imagePath).toBe(expectedData.imagePath)
    expect(zhOnly.data.rarity).toBe(expectedData.rarity)
    expect(zhOnly.data.groupId).toBe(expectedData.groupId)
    expect(zhOnly.data.monsterInfo).toStrictEqual(expectedData.monsterInfo)
    expect(zhOnly.data.elementAbnormal).toStrictEqual(
      expectedData.elementAbnormal,
    )
    expectMonsterRoundtrip(zhOnly, {
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
    })
  })
})

describe("单怪物纯整合的空值与特例语义", () => {
  it("空字符串、空数组、零值与负值按来源保留", () => {
    const input = monsterInput()
    change(input.details.zh, "card_obtain", "")
    change(input.details.en, "card_obtain", "")
    change(input.details.zh, "desc", "")
    change(input.details.en, "desc", "")
    change(input.details.zh, "monster_info.960101.icon", "")
    change(input.details.en, "monster_info.960101.icon", "")
    change(input.details.zh, "monster_info.960101.tag", [])
    change(input.details.en, "monster_info.960101.tag", [])
    change(input.details.zh, "monster_info.960101.element.fire", -1)
    change(input.details.en, "monster_info.960101.element.fire", -1)
    change(input.details.zh, "element_abnormal.10001", 0)
    change(input.details.en, "element_abnormal.10001", 0)
    const result = integrateMonster(input)
    expect(result.details.zh!.cardObtain).toBe("")
    expect(result.details.zh!.desc).toBe("")
    expect(result.data.monsterInfo["960101"]!.icon).toBe("")
    expect(result.data.monsterInfo["960101"]!.tag).toStrictEqual([])
    expect(result.data.monsterInfo["960101"]!.element.fire).toBe(-1)
    expect(result.data.elementAbnormal["10001"]).toBe(0)
    expectMonsterRoundtrip(result, input)
  })

  it.each(["constructor", "__proto__", "toString"])(
    "还原辅助函数不把特殊自有字段 %s 误判为登记改名",
    (field) => {
      const input = monsterInput()
      // monster_info 是完整共享块：单位内未知成员两语言一致才随块提取到 data。
      // change 经 Object.defineProperty 写入自有属性，避开 __proto__ 的字面量语义。
      change(input.details.zh.monster_info as object, `960101.${field}`, {
        nested: [1],
      })
      change(input.details.en.monster_info as object, `960101.${field}`, {
        nested: [1],
      })
      // 曲线条目的未知成员同样随块保留；两语言值一致。
      change(
        input.details.zh.monster_info as object,
        `960102.curves.hp.${field}`,
        "curve-value",
      )
      change(
        input.details.en.monster_info as object,
        `960102.curves.hp.${field}`,
        "curve-value",
      )
      const result = integrateMonster(input)
      // 生产整合器按自有属性原样保留：不改名、不改值。
      expect(Object.hasOwn(result.data.monsterInfo["960101"]!, field)).toBe(
        true,
      )
      expect(result.data.monsterInfo["960101"]![field]).toEqual({ nested: [1] })
      expect(
        Object.hasOwn(result.data.monsterInfo["960102"]!.curves["hp"]!, field),
      ).toBe(true)
      expect(result.data.monsterInfo["960102"]!.curves["hp"]![field]).toBe(
        "curve-value",
      )
      // 还原辅助函数须按登记表命中与否改名，不读取登记表原型链。
      expectMonsterRoundtrip(result, input)
    },
  )
})
