import { describe, expect, it } from "vitest"
import type { BangbooData } from "../src/integration/bangboo-types.ts"
import { integrateBangboo } from "../src/integration/integrate-bangboo.ts"
import type { IntegrateBangbooInput } from "../src/integration/integrate-bangboo.ts"
import { BangbooIntegrationError } from "../src/integration/source-json.ts"
import {
  bangbooEmptyValueInput,
  bangbooInput,
  bangbooSource,
} from "./fixtures/bangboo-source.ts"
import { expectBangbooRoundtrip } from "./fixtures/bangboo-roundtrip.ts"

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
  input: IntegrateBangbooInput,
  locale: string,
  pointer: string,
  reason?: string,
): void {
  expect(() => integrateBangboo(input)).toThrow(BangbooIntegrationError)
  try {
    integrateBangboo(input)
  } catch (error) {
    expect(error).toMatchObject({
      location: { entityId: input.entityId, locale, pointer },
    })
    if (reason) expect((error as Error).message).toContain(reason)
  }
}

const expectedData = {
  id: 950001,
  rarity: 3,
  icon: "UI/Sprite/A1DynamicLoad/BangbooModGarage/UnPacker/BangbooRole/BangbooGarageRoleExample.png",
  stats: {
    endurance: 180,
    hpMax: 360,
    hpupgrade: 428397,
    attack: 50,
    attackUpgrade: 252034,
    breakStun: 90,
    elementAbnormalPower: 120,
    defence: 30,
    defUpgrade: 85729,
    crit: 500,
    penRatio: 0,
    critDmg: 5000,
  },
  skillProp: {
    "9500101": {
      "1001": { main: 46200, growth: 4620, format: "%" },
      "1002": { main: 27000, growth: 2700, format: "%" },
      "elementAccumulationValue": 34600,
    },
    "9500102": {
      "1001": { main: 95700, growth: 9570, format: "%" },
      "elementAccumulationValue": 41000,
    },
  },
  level: {
    "1": {
      hpMax: 0,
      attack: 0,
      defence: 0,
      levelMax: 10,
      levelMin: 0,
      materials: { "10": 15000, "102010": 4 },
      extra: { "20101": { prop: 20101, value: 0 } },
    },
    "2": {
      hpMax: 188,
      attack: 47,
      defence: 38,
      levelMax: 20,
      levelMin: 10,
      materials: {},
      extra: { "20101": { prop: 20101, value: 450 } },
    },
  },
} satisfies BangbooData

describe("单邦布纯整合 nanoka-bangboo-reference/1", () => {
  it("按独立预期拆分双语，保留索引，冻结输入仍可整合且不修改来源", () => {
    const input = bangbooInput()
    const before = structuredClone(input)
    freeze(input)
    const result = integrateBangboo(input)
    expect(result.data).toStrictEqual(expectedData)
    expect(result.details.zh).toStrictEqual({
      id: 950001,
      locale: "zh",
      codeName: "Bangboo_Example",
      name: "示例布",
      desc: "示例邦布的完整介绍。\n第二段保留换行。",
      skill: {
        a: {
          level: {
            "1": {
              name: "冰刀舞",
              desc: "<color=#FFFFFF>[主动技]</color>\n招式发动时，舞动冰刀对敌人进行连续斩击，造成<color=#98EFF0>冰属性伤害</color>。",
              property: ["伤害倍率", "失衡倍率", "冷却时间"],
              param:
                "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|20秒",
            },
            "2": {
              name: "冰刀舞",
              desc: "<color=#FFFFFF>[主动技]</color>\n招式发动时，舞动冰刀对敌人进行连续斩击，造成<color=#98EFF0>冰属性伤害</color>。",
              property: ["伤害倍率", "失衡倍率", "冷却时间"],
              param:
                "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|18秒",
            },
          },
        },
        b: {
          level: {
            "1": {
              name: "干冰场地",
              desc: "队伍中存在2名或以上<color=#98EFF0>[冰属性]</color>角色时触发：属性异常积蓄值提升60%。",
              property: ["属性异常积蓄值提升"],
              param: "60%",
            },
          },
        },
        c: { level: {} },
      },
      level: {
        "1": {
          extra: { "20101": { name: "暴击率", format: "{0:0.#%}" } },
        },
        "2": {
          extra: { "20101": { name: "暴击率", format: "{0:0.#%}" } },
        },
        "3": {
          hpMax: 376,
          attack: 233,
          defence: 75,
          levelMax: 30,
          levelMin: 20,
          materials: { "10": 75000 },
          extra: {
            "21101": {
              prop: 21101,
              name: "暴击伤害",
              format: "{0:0.#%}",
              value: 2500,
            },
          },
        },
      },
    })
    expect(result.details.en).toStrictEqual({
      id: 950001,
      locale: "en",
      codeName: "Bangboo Example",
      name: "Exampleboo",
      desc: "A synthetic bangboo introduction.\nSecond paragraph.",
      skill: {
        a: {
          level: {
            "1": {
              name: "Ice Blade Dance",
              desc: "<color=#FFFFFF>[Special Attack]</color>\nStrikes enemies with ice blades, dealing <color=#98EFF0>Ice DMG</color>.",
              property: ["DMG Multiplier", "Daze Multiplier", "Cooldown"],
              param:
                "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|20s",
            },
            "2": {
              name: "Ice Blade Dance",
              desc: "<color=#FFFFFF>[Special Attack]</color>\nStrikes enemies with ice blades, dealing <color=#98EFF0>Ice DMG</color>.",
              property: ["DMG Multiplier", "Daze Multiplier", "Cooldown"],
              param:
                "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|18s",
            },
          },
        },
        b: {
          level: {
            "1": {
              name: "Dry Ice Field",
              desc: "When 2 or more <color=#98EFF0>[Ice Attribute]</color> agents are in the squad: Anomaly Buildup increases by 60%.",
              property: ["Anomaly Buildup increase"],
              param: "60%",
            },
          },
        },
        c: { level: {} },
      },
      level: {
        "1": {
          extra: {
            "20101": { name: "CRIT Rate", format: "{0:0.#%}" },
            "21101": {
              prop: 21101,
              name: "CRIT DMG",
              format: "{0:0.#%}",
              value: 0,
            },
          },
        },
        "2": {
          extra: { "20101": { name: "CRIT Rate", format: "{0:0.#%}" } },
        },
      },
    })
    expect(result.details.zh).not.toHaveProperty("rarity")
    expect(result.details.zh).not.toHaveProperty("icon")
    expect(result.details.zh).not.toHaveProperty("stats")
    expect(result.details.zh).not.toHaveProperty("skill_prop")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectBangbooRoundtrip(result, input)
    expect(input).toStrictEqual(before)
    result.data.icon = "modified"
    result.sourceRecord.en = "modified"
    result.details.zh!.desc = "modified"
    expect(input).toStrictEqual(before)
  })

  it("codeName 差异保留在各自语言，不触发共享冲突也不进入 data", () => {
    const input = bangbooInput()
    const result = integrateBangboo(input)
    expect(result.data).not.toHaveProperty("codeName")
    expect(result.details.zh!.codeName).toBe("Bangboo_Example")
    expect(result.details.en!.codeName).toBe("Bangboo Example")
    expectBangbooRoundtrip(result, input)
  })

  it("索引记录与详情独立保留，不要求相等也不互相回退", () => {
    const input = bangbooInput()
    // 索引 `en` 与详情英文名称故意不同；详情名称不得被索引摘要名覆盖。
    expect(input.sourceRecord.en).toBe("Index Exampleboo")
    change(input.sourceRecord, "en", "changed index name")
    change(input.sourceRecord, "desc", "changed index desc")
    const result = integrateBangboo(input)
    expect(result.details.en!.name).toBe("Exampleboo")
    expect(result.details.en!.codeName).toBe("Bangboo Example")
    expect(result.sourceRecord.en).toBe("changed index name")
    expect(result.sourceRecord.desc).toBe("changed index desc")
    expect(result.maintenance.diagnostics).toEqual([])
    expectBangbooRoundtrip(result, input)
  })

  it("来源索引的未知顶层字段生成 index 诊断，已知字段不误报", () => {
    const input = bangbooInput()
    change(input.sourceRecord, "future_field", { nested: [1, 2] })
    change(input.sourceRecord, "a/b~c", 0)
    change(input.sourceRecord, "__proto__", { polluted: true })
    change(input.sourceRecord, "constructor", "raw")
    const result = integrateBangboo(input)
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "950001",
        locale: "index",
        pointer: "/__proto__",
        kind: "unknown-field",
      },
      {
        entityId: "950001",
        locale: "index",
        pointer: "/a~1b~0c",
        kind: "unknown-field",
      },
      {
        entityId: "950001",
        locale: "index",
        pointer: "/constructor",
        kind: "unknown-field",
      },
      {
        entityId: "950001",
        locale: "index",
        pointer: "/future_field",
        kind: "unknown-field",
      },
    ])
    expect(result.sourceRecord).toStrictEqual(input.sourceRecord)
    expectBangbooRoundtrip(result, input)
  })

  it("合法空值完整保留：空图标、空等级、空技能等级与空技能参数块", () => {
    const input = bangbooEmptyValueInput()
    const before = structuredClone(input)
    const result = integrateBangboo(input)
    expect(result.data.icon).toBe("")
    expect(result.data.level).toStrictEqual({})
    expect(result.data.skillProp).toStrictEqual({})
    expect(result.details.zh!.skill).toStrictEqual({
      a: { level: {} },
      b: { level: {} },
      c: { level: {} },
    })
    expect(result.details.en!.skill).toStrictEqual({
      a: { level: {} },
      b: { level: {} },
      c: { level: {} },
    })
    expect(result.details.zh!.level).toStrictEqual({})
    expect(result.details.en!.level).toStrictEqual({})
    expect(result.details.zh!.name).toBe("伊埃斯样例")
    expect(result.details.en!.name).toBe("Eous Example")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectBangbooRoundtrip(result, input)
    expect(input).toStrictEqual(before)
  })

  it("未知详情字段留在本语言并诊断；共享块未知成员随块保留且参与完整值比较", () => {
    const input = bangbooInput()
    change(input.details.zh, "future_field", { nested: [1, 2] })
    change(input.details.zh.stats, "future_stat", 7)
    change(input.details.en.stats, "future_stat", 7)
    change(input.details.zh.skill_prop["9500101"], "note", "说明")
    change(input.details.en.skill_prop["9500101"], "note", "说明")
    const result = integrateBangboo(input)
    expect(result.data.stats).toMatchObject({ future_stat: 7 })
    expect(result.data.skillProp["9500101"]).toMatchObject({ note: "说明" })
    expect(result.details.zh).toMatchObject({
      future_field: { nested: [1, 2] },
    })
    expect(result.details.en).not.toHaveProperty("future_field")
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "950001",
        locale: "zh",
        pointer: "/future_field",
        kind: "unknown-field",
      },
      {
        entityId: "950001",
        locale: "zh",
        pointer: "/skill_prop/9500101/note",
        kind: "unknown-field",
      },
      {
        entityId: "950001",
        locale: "zh",
        pointer: "/stats/future_stat",
        kind: "unknown-field",
      },
      {
        entityId: "950001",
        locale: "en",
        pointer: "/skill_prop/9500101/note",
        kind: "unknown-field",
      },
      {
        entityId: "950001",
        locale: "en",
        pointer: "/stats/future_stat",
        kind: "unknown-field",
      },
    ])
    expectBangbooRoundtrip(result, input)
    // 共享块内部的未知成员跨语言不一致仍按公共冲突处理。
    change(input.details.en.stats, "future_stat", 8)
    expectFailure(input, "en", "/stats", "共享冲突")
    const noteConflict = bangbooInput()
    change(noteConflict.details.zh.skill_prop["9500101"], "note", "说明")
    expectFailure(noteConflict, "en", "/skill_prop", "共享冲突")
  })

  it("语言独有阶段与属性条目完整留在该语言，共有条目才提取", () => {
    const input = bangbooInput()
    const result = integrateBangboo(input)
    // 阶段 3 仅 zh 提供：整段留在 zh，data 与 en 不包含。
    expect(result.data.level).not.toHaveProperty("3")
    expect(result.details.en!.level).not.toHaveProperty("3")
    expect(result.details.zh!.level["3"]).toStrictEqual({
      hpMax: 376,
      attack: 233,
      defence: 75,
      levelMax: 30,
      levelMin: 20,
      materials: { "10": 75000 },
      extra: {
        "21101": {
          prop: 21101,
          name: "暴击伤害",
          format: "{0:0.#%}",
          value: 2500,
        },
      },
    })
    // 属性 21101（阶段 1）仅 en 提供：整条留在 en，data 不包含。
    expect(result.data.level["1"].extra).not.toHaveProperty("21101")
    expect(result.details.zh!.level["1"].extra).not.toHaveProperty("21101")
    expect(result.details.en!.level["1"].extra["21101"]).toStrictEqual({
      prop: 21101,
      name: "CRIT DMG",
      format: "{0:0.#%}",
      value: 0,
    })
    // 共有属性 20101 只提取 prop/value，名称与格式留在各语言。
    expect(result.data.level["1"].extra["20101"]).toStrictEqual({
      prop: 20101,
      value: 0,
    })
    expect(result.details.zh!.level["1"].extra["20101"]).toStrictEqual({
      name: "暴击率",
      format: "{0:0.#%}",
    })
  })

  it("共有阶段无共有属性时保留拆分空壳，可独立还原", () => {
    const input = bangbooInput()
    change(input.details.zh, "level.2.extra", {})
    change(input.details.en, "level.2.extra", {})
    const result = integrateBangboo(input)
    expect(result.data.level["2"].extra).toStrictEqual({})
    expect(result.details.zh!.level["2"].extra).toStrictEqual({})
    expect(result.details.en!.level["2"].extra).toStrictEqual({})
    expectBangbooRoundtrip(result, input)
  })

  it("对象成员排列不影响输出，诊断顺序确定", () => {
    const input = bangbooInput()
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
    const expected = integrateBangboo(input)
    const result = integrateBangboo(reversed as IntegrateBangbooInput)
    expect(result).toStrictEqual(expected)
  })

  it("已登记公共值冲突明确失败并定位来源", () => {
    const cases: Array<[path: string, value: unknown, pointer: string]> = [
      ["rarity", 4, "/rarity"],
      ["icon", "other.png", "/icon"],
      ["stats.hpupgrade", 428398, "/stats"],
      ["stats.crit", 501, "/stats"],
      ["skill_prop.9500101.1001.main", 46201, "/skill_prop"],
      ["skill_prop.9500101.element_accumulation_value", 34601, "/skill_prop"],
      ["level.1.attack", 1, "/level/1/attack"],
      ["level.1.hp_max", 1, "/level/1/hp_max"],
      ["level.1.materials", { "10": 15001 }, "/level/1/materials"],
      ["level.1.extra.20101.prop", 20102, "/level/1/extra/20101/prop"],
      ["level.1.extra.20101.value", 1, "/level/1/extra/20101/value"],
      ["level.2.level_max", 21, "/level/2/level_max"],
    ]
    for (const [path, value, pointer] of cases) {
      const input = bangbooInput()
      change(input.details.en, path, value)
      expectFailure(input, "en", pointer, "共享冲突")
    }
  })

  it("身份、必需字段与结构类型违规明确失败", () => {
    const input = bangbooInput()
    change(input.details.zh, "id", 950002)
    expectFailure(input, "zh", "/id", "详情身份与实体 ID 不一致")

    const wrongId = bangbooInput()
    change(wrongId.details.en, "id", "950001")
    expectFailure(wrongId, "en", "/id", "字段类型必须为 number")

    const missing = bangbooInput()
    remove(missing.details.zh, "name")
    expectFailure(missing, "zh", "/name", "缺失必需字段")

    const missingSkillLevel = bangbooInput()
    remove(missingSkillLevel.details.zh, "skill.a.level")
    expectFailure(missingSkillLevel, "zh", "/skill/a/level", "缺失必需字段")

    const missingParam = bangbooInput()
    remove(missingParam.details.zh, "skill.a.level.1.param")
    expectFailure(missingParam, "zh", "/skill/a/level/1/param", "缺失必需字段")

    const missingExtra = bangbooInput()
    remove(missingExtra.details.zh, "level.1.extra")
    expectFailure(missingExtra, "zh", "/level/1/extra", "缺失必需字段")

    const missingExtraProp = bangbooInput()
    remove(missingExtraProp.details.en, "level.1.extra.20101.prop")
    expectFailure(
      missingExtraProp,
      "en",
      "/level/1/extra/20101/prop",
      "缺失必需字段",
    )

    const missingEav = bangbooInput()
    remove(
      missingEav.details.zh,
      "skill_prop.9500101.element_accumulation_value",
    )
    expectFailure(
      missingEav,
      "zh",
      "/skill_prop/9500101/element_accumulation_value",
      "缺失必需字段",
    )

    const cases: Array<
      [path: string, value: unknown, pointer: string, reason: string]
    > = [
      ["rarity", "3", "/rarity", "字段类型必须为 number"],
      ["icon", 3, "/icon", "字段类型必须为 string"],
      ["stats.attack", "50", "/stats/attack", "字段类型必须为 number"],
      ["level.1.materials", [], "/level/1/materials", "字段类型必须为普通对象"],
      [
        "level.1.materials.10",
        "15000",
        "/level/1/materials/10",
        "材料数量必须为 number",
      ],
      ["skill.a", "text", "/skill/a", "字段类型必须为普通对象"],
      [
        "skill.a.level.1.property",
        "伤害倍率",
        "/skill/a/level/1/property",
        "字段类型必须为 string[]",
      ],
      [
        "skill.a.level.1.param",
        20,
        "/skill/a/level/1/param",
        "字段类型必须为 string",
      ],
      [
        "skill_prop.9500101",
        [],
        "/skill_prop/9500101",
        "字段类型必须为普通对象",
      ],
      [
        "skill_prop.9500101.1001.main",
        "46200",
        "/skill_prop/9500101/1001/main",
        "字段类型必须为 number",
      ],
      ["level", [], "/level", "字段类型必须为普通对象"],
      ["level.1", "text", "/level/1", "字段类型必须为普通对象"],
    ]
    for (const [path, value, pointer, reason] of cases) {
      const caseInput = bangbooInput()
      change(caseInput.details.zh, path, value)
      expectFailure(caseInput, "zh", pointer, reason)
    }
  })

  it("语言配置违规与辅助字段、改名冲突明确失败", () => {
    const extraLocale = bangbooInput()
    change(extraLocale.details, "ja", bangbooSource())
    expectFailure(extraLocale, "input", "/ja", "未配置的详情语言")

    const missingLocale = bangbooInput()
    const withoutEn: Record<string, unknown> = { zh: missingLocale.details.zh }
    expectFailure(
      { ...missingLocale, details: withoutEn },
      "en",
      "",
      "缺失详情",
    )

    const emptyLocales = bangbooInput()
    expectFailure(
      { ...emptyLocales, detailLocales: [] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const duplicateLocales = bangbooInput()
    expectFailure(
      { ...duplicateLocales, detailLocales: ["zh", "zh"] },
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const unsupportedLocales = bangbooInput()
    expectFailure(
      {
        ...unsupportedLocales,
        detailLocales: ["zh", "ja"],
      } as unknown as IntegrateBangbooInput,
      "input",
      "/detailLocales",
      "详情语言列表须非空、受支持且不重复",
    )

    const badEntityId = bangbooInput()
    expectFailure(
      { ...badEntityId, entityId: "0950001" },
      "input",
      "/entityId",
      "实体 ID 不是规范十进制 key",
    )

    const auxiliary = bangbooInput()
    change(auxiliary.details.zh, "locale", "zh")
    expectFailure(auxiliary, "zh", "/locale", "辅助字段重名")

    const renameCases: Array<[path: string, value: unknown, pointer: string]> =
      [
        ["codeName", "kept", "/codeName"],
        ["skillProp", {}, "/skillProp"],
        ["stats.hpMax", 1, "/stats/hpMax"],
        [
          "skill_prop.9500101.elementAccumulationValue",
          1,
          "/skill_prop/9500101/elementAccumulationValue",
        ],
        ["level.1.levelMax", 11, "/level/1/levelMax"],
      ]
    for (const [path, value, pointer] of renameCases) {
      const input = bangbooInput()
      change(input.details.zh, path, value)
      expectFailure(input, "zh", pointer, "改名冲突")
    }
  })

  it("共享 JSON 保真边界沿用同一错误类型", () => {
    const nonFinite = bangbooInput()
    change(nonFinite.details.zh.stats, "crit", Number.POSITIVE_INFINITY)
    expect(() => integrateBangboo(nonFinite)).toThrow(BangbooIntegrationError)

    const accessor = bangbooInput()
    Object.defineProperty(accessor.details.zh, "name", {
      get() {
        return "示例布"
      },
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateBangboo(accessor)).toThrow(BangbooIntegrationError)

    const symbolKey = bangbooInput()
    Object.defineProperty(symbolKey.details, Symbol("zh"), {
      value: bangbooSource(),
      enumerable: true,
      configurable: true,
    })
    expect(() => integrateBangboo(symbolKey)).toThrow(BangbooIntegrationError)
  })

  it("纯函数允许显式语言子集，快照层完整性由调用方保证", () => {
    const input = bangbooInput()
    const zhOnly = integrateBangboo({
      entityId: input.entityId,
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
      detailLocales: ["zh"],
    })
    expect(zhOnly.details).not.toHaveProperty("en")
    expect(zhOnly.data.id).toBe(expectedData.id)
    expect(zhOnly.data.rarity).toBe(expectedData.rarity)
    expect(zhOnly.data.icon).toBe(expectedData.icon)
    expect(zhOnly.data.stats).toStrictEqual(expectedData.stats)
    expect(zhOnly.data.skillProp).toStrictEqual(expectedData.skillProp)
    // 单语言输入时所有阶段与属性条目都视为共有：数值提取到 data，
    // details 只保留各条目的名称与格式。
    expect(zhOnly.data.level).toHaveProperty("3")
    expect(zhOnly.data.level["1"].extra["20101"]).toStrictEqual({
      prop: 20101,
      value: 0,
    })
    expect(zhOnly.details.zh!.level["3"].extra["21101"]).toStrictEqual({
      name: "暴击伤害",
      format: "{0:0.#%}",
    })
    expect(zhOnly.details.zh!.level["1"].extra["20101"]).toStrictEqual({
      name: "暴击率",
      format: "{0:0.#%}",
    })
    expectBangbooRoundtrip(zhOnly, {
      sourceRecord: input.sourceRecord,
      details: { zh: input.details.zh },
    })
  })
})

describe("单邦布纯整合的空值与特例语义", () => {
  it("空字符串、零值与空数组按来源保留", () => {
    const input = bangbooInput()
    change(input.details.zh, "desc", "")
    change(input.details.en, "desc", "")
    change(input.details.zh.skill.a.level, "1", {
      name: "",
      desc: "",
      property: [],
      param: "",
    })
    change(input.details.en.skill.a.level, "1", {
      name: "",
      desc: "",
      property: [],
      param: "",
    })
    const result = integrateBangboo(input)
    expect(result.details.zh!.desc).toBe("")
    expect(result.details.en!.desc).toBe("")
    expect(result.details.zh!.skill.a.level["1"]).toStrictEqual({
      name: "",
      desc: "",
      property: [],
      param: "",
    })
    expect(result.data.stats.penRatio).toBe(0)
    expect(result.data.level["1"].hpMax).toBe(0)
    expectBangbooRoundtrip(result, input)
  })

  it("技能参数中的引用、分隔符与语言单位按字符串保留", () => {
    const input = bangbooInput()
    const result = integrateBangboo(input)
    expect(result.details.zh!.skill.a.level["1"].param).toBe(
      "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|20秒",
    )
    expect(result.details.en!.skill.a.level["1"].param).toBe(
      "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|20s",
    )
    expect(result.details.zh!.skill.b.level["1"].param).toBe("60%")
  })

  it.each(["constructor", "__proto__", "toString"])(
    "还原辅助函数不把特殊自有字段 %s 误判为登记改名",
    (field) => {
      const input = bangbooInput()
      // stats 是完整共享块：未知成员两语言一致才随块提取到 data，不触发共享冲突。
      // change 经 Object.defineProperty 写入自有属性，避开 __proto__ 的字面量语义。
      change(input.details.zh.stats, field, { nested: [1] })
      change(input.details.en.stats, field, { nested: [1] })
      // level 阶段的未知成员不被共享提取，完整留在各语言 details；两语言值可以不同。
      change(input.details.zh.level["1"], field, "zh-value")
      change(input.details.en.level["1"], field, "en-value")
      const result = integrateBangboo(input)
      // 生产整合器按自有属性原样保留：不改名、不改值。
      expect(Object.hasOwn(result.data.stats, field)).toBe(true)
      expect(result.data.stats[field]).toEqual({ nested: [1] })
      expect(Object.hasOwn(result.details.zh!.level["1"], field)).toBe(true)
      expect(result.details.zh!.level["1"][field]).toBe("zh-value")
      expect(Object.hasOwn(result.details.en!.level["1"], field)).toBe(true)
      expect(result.details.en!.level["1"][field]).toBe("en-value")
      // 还原辅助函数须按登记表命中与否改名，不读取登记表原型链。
      expectBangbooRoundtrip(result, input)
    },
  )
})
