import { describe, expect, it } from "vitest"
import type { WEngineData } from "../src/integration/w-engine-types.ts"
import { integrateWEngine } from "../src/integration/integrate-w-engine.ts"
import type { IntegrateWEngineInput } from "../src/integration/integrate-w-engine.ts"
import { WEngineIntegrationError } from "../src/integration/source-json.ts"
import { wEngineInput, wEngineSource } from "./fixtures/w-engine-source.ts"
import { expectWEngineRoundtrip } from "./fixtures/w-engine-roundtrip.ts"

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

/** 只读取实际自有成员；特殊 key 不通过继承链或属性访问解析。 */
function ownValue(value: unknown, key: string): unknown {
  expect(Object.hasOwn(value as object, key)).toBe(true)
  return Object.getOwnPropertyDescriptor(value as object, key)!.value
}

function expectFailure(
  input: IntegrateWEngineInput,
  locale: string,
  pointer: string,
  reason?: string,
): void {
  expect(() => integrateWEngine(input)).toThrow(WEngineIntegrationError)
  try {
    integrateWEngine(input)
  } catch (error) {
    expect(error).toMatchObject({
      location: { entityId: input.entityId, locale, pointer },
    })
    if (reason) expect((error as Error).message).toContain(reason)
  }
}

const expectedData = {
  id: 940001,
  codeName: "Weapon_B_Common_Example",
  rarity: 2,
  icon: "Assets/NapResources/UI/Sprite/Example/Weapon_Example.png",
  level: {
    "0": { exp: 30, rate: 0, rate2: 10000 },
    "1": { exp: 60, rate: 1568, rate2: 10000 },
  },
  stars: {
    "0": { starRate: 0, randRate: 0 },
    "1": { starRate: 8922, randRate: 3000 },
  },
  materials: "10:7200,101010:2|10:16800,101020:7",
  baseProperty: { value: 32 },
  randProperty: { value: 800 },
  classificationIds: { weaponType: ["1"] },
} satisfies WEngineData

const requiredDetailFields = [
  "id",
  "code_name",
  "name",
  "desc",
  "desc2",
  "desc3",
  "rarity",
  "icon",
  "weapon_type",
  "base_property",
  "rand_property",
  "level",
  "stars",
  "materials",
  "talents",
] as const

describe("单 WEngine 纯整合 nanoka-w-engine-reference/1", () => {
  it("按独立预期拆分双语，保留索引，冻结输入仍可整合且不修改来源", () => {
    const input = wEngineInput()
    const before = structuredClone(input)
    freeze(input)
    const result = integrateWEngine(input)
    expect(result.data).toStrictEqual(expectedData)
    expect(result.details.zh).toStrictEqual({
      id: 940001,
      locale: "zh",
      name: "示例音擎",
      desc: "示例音擎的完整介绍。\n第二段保留换行。",
      desc2: "装备后可提升[强攻]代理人的战斗能力",
      desc3: "示例音擎的简短介绍。",
      weaponType: { "1": "强攻" },
      baseProperty: {
        name: "基础攻击力",
        name2: "基础攻击力",
        format: "{0:0.#}",
      },
      randProperty: {
        name: "攻击力",
        name2: "攻击力百分比",
        format: "{0:0.#%}",
      },
      talents: {
        "1": {
          name: "满月",
          desc: "<color=#FFFFFF>[普通攻击]</color>造成的伤害提升<color=#2BAD00>12%</color>。",
        },
        "2": {
          name: "满月",
          desc: "<color=#FFFFFF>[普通攻击]</color>造成的伤害提升<color=#2BAD00>14%</color>。",
        },
      },
    })
    expect(result.details.zh).not.toHaveProperty("code_name")
    expect(result.details.zh).not.toHaveProperty("rarity")
    expect(result.details.zh).not.toHaveProperty("icon")
    expect(result.details.zh).not.toHaveProperty("level")
    expect(result.details.zh).not.toHaveProperty("stars")
    expect(result.details.zh).not.toHaveProperty("materials")
    expect(result.details.en!.name).toBe("Example W-Engine")
    expect(result.details.en!.weaponType).toStrictEqual({ "1": "Attack" })
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectWEngineRoundtrip(result, input)
    expect(input).toStrictEqual(before)
    result.data.icon = "modified"
    result.sourceRecord.en = "modified"
    result.details.zh!.desc3 = "modified"
    expect(input).toStrictEqual(before)
  })

  it("索引记录与详情独立保留，不要求相等也不互相回退", () => {
    const input = wEngineInput()
    // 索引 `en` 与详情英文名称故意不同；详情名称不得被索引摘要名覆盖。
    expect(input.sourceRecord.en).toBe("Index Example W-Engine")
    change(input.sourceRecord, "en", "changed index name")
    change(input.sourceRecord, "desc", "changed index desc")
    const result = integrateWEngine(input)
    expect(result.details.en!.name).toBe("Example W-Engine")
    expect(ownValue(result.sourceRecord, "en")).toBe("changed index name")
    expect(ownValue(result.sourceRecord, "desc")).toBe("changed index desc")
    expect(result.maintenance.diagnostics).toEqual([])
    expectWEngineRoundtrip(result, input)
  })

  it("来源索引的未知顶层字段生成 index 诊断，已知字段不误报", () => {
    const input = wEngineInput()
    change(input.sourceRecord, "future_field", { nested: [1, 2] })
    change(input.sourceRecord, "a/b~c", 0)
    change(input.sourceRecord, "__proto__", { polluted: true })
    change(input.sourceRecord, "constructor", "raw")
    const before = structuredClone(input)
    const result = integrateWEngine(input)
    // 已知索引字段全部保留且不产生诊断；未知字段按来源 key 顺序生成 index 诊断并转义 Pointer。
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "940001",
        locale: "index",
        pointer: "/__proto__",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "index",
        pointer: "/a~1b~0c",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "index",
        pointer: "/constructor",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "index",
        pointer: "/future_field",
        kind: "unknown-field",
      },
    ])
    expect(Object.getPrototypeOf(result.sourceRecord)).toBe(Object.prototype)
    expect(ownValue(result.sourceRecord, "future_field")).toStrictEqual({
      nested: [1, 2],
    })
    expect(ownValue(result.sourceRecord, "a/b~c")).toBe(0)
    expect(ownValue(result.sourceRecord, "__proto__")).toStrictEqual({
      polluted: true,
    })
    expect(ownValue(result.sourceRecord, "constructor")).toBe("raw")
    expect(ownValue(result.sourceRecord, "icon")).toBe(
      "Weapon_B_Common_Example",
    )
    expect(ownValue(result.sourceRecord, "atk")).toBe(475)
    expect(input).toStrictEqual(before)
    expectWEngineRoundtrip(result, input)
    // 对象 key 排列不影响诊断集合与顺序。
    const reordered = integrateWEngine(
      reverseKeys(input) as IntegrateWEngineInput,
    )
    expect(reordered.maintenance.diagnostics).toEqual(
      result.maintenance.diagnostics,
    )
  })

  it("两次整合互不影响，结果对象树独立", () => {
    const input = wEngineInput()
    const first = integrateWEngine(input)
    const second = integrateWEngine(input)
    expect(second).toStrictEqual(first)
    expect(second.data).not.toBe(first.data)
    expect(second.details.zh).not.toBe(first.details.zh)
    first.details.zh!.name = "modified"
    first.data.level["0"] = { exp: 0, rate: 0, rate2: 0 }
    first.sourceRecord.en = "modified"
    expect(second.details.zh!.name).toBe("示例音擎")
    expect(second.data.level["0"]).toStrictEqual({
      exp: 30,
      rate: 0,
      rate2: 10000,
    })
    expect(second.sourceRecord.en).toBe("Index Example W-Engine")
    expect(input.details.zh.name).toBe("示例音擎")
  })

  it("对象 key 排列不影响整个结果与维护记录", () => {
    const input = wEngineInput()
    change(input.details.zh, "unknown_b", { z: 0, a: 1 })
    change(input.details.zh, "unknown_a", [])
    for (const locale of ["zh", "en"] as const)
      change(input.details[locale].stars["0"], "unknown_stage", 0)
    change(input.sourceRecord, "future", null)
    const result = integrateWEngine(input)
    const reordered = integrateWEngine(
      reverseKeys(input) as IntegrateWEngineInput,
    )
    expect(reordered).toStrictEqual(result)
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(result))
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "940001",
        locale: "index",
        pointer: "/future",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/stars/0/unknown_stage",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/unknown_a",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/unknown_b",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "en",
        pointer: "/stars/0/unknown_stage",
        kind: "unknown-field",
      },
    ])
    expectWEngineRoundtrip(result, input)
  })

  it("保留未知嵌套字段、零空值与富文本，并报告待登记路径", () => {
    const input = wEngineInput()
    for (const source of Object.values(input.details)) {
      change(source, "untouched", {
        snake_key: { attack_growth: 0 },
        zero: 0,
        empty: "",
        nil: null,
        array: [3, 1, 2],
        object: {},
        boolean: false,
      })
      change(source.base_property, "extra_member", 0)
      change(source.talents["1"], "extra_talent", "")
    }
    change(input.sourceRecord, "future_field", [null, "", {}, [], 0])
    const result = integrateWEngine(input)
    expect(result.details.zh!.untouched).toStrictEqual({
      snake_key: { attack_growth: 0 },
      zero: 0,
      empty: "",
      nil: null,
      array: [3, 1, 2],
      object: {},
      boolean: false,
    })
    expect(result.details.zh!.baseProperty).toStrictEqual({
      name: "基础攻击力",
      name2: "基础攻击力",
      format: "{0:0.#}",
      extra_member: 0,
    })
    expect(result.details.zh!.talents["1"]).toStrictEqual({
      name: "满月",
      desc: "<color=#FFFFFF>[普通攻击]</color>造成的伤害提升<color=#2BAD00>12%</color>。",
      extra_talent: "",
    })
    expect(ownValue(result.sourceRecord, "future_field")).toStrictEqual([
      null,
      "",
      {},
      [],
      0,
    ])
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "940001",
        locale: "index",
        pointer: "/future_field",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/base_property/extra_member",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/talents/1/extra_talent",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/untouched",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "en",
        pointer: "/base_property/extra_member",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "en",
        pointer: "/talents/1/extra_talent",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "en",
        pointer: "/untouched",
        kind: "unknown-field",
      },
    ])
    expectWEngineRoundtrip(result, input)
  })

  it.each([
    ["name", "  保留两侧空格  "],
    ["desc", ""],
    ["desc2", "<color=#FFFFFF>[普通攻击]</color>\n{CAL:1+2} 100%"],
    ["desc3", "第一段\n\n第二段\t制表符与 emoji 🎵"],
  ] as const)("按来源保留 %s 的原值与空字符串", (field, value) => {
    const input = wEngineInput()
    change(input.details.zh, field, value)
    change(input.details.en, field, value)
    const result = integrateWEngine(input)
    expect(result.details.zh![field]).toBe(value)
    expect(result.details.en![field]).toBe(value)
    expect(result.maintenance.diagnostics).toEqual([])
    expectWEngineRoundtrip(result, input)
  })

  it("保留材料字符串、数值尺度与显示格式原值", () => {
    const input = wEngineInput()
    const materials =
      "10:120000,101030:12|10:240000,101040:6|10:360000,101040:12"
    for (const locale of ["zh", "en"] as const) {
      change(input.details[locale], "materials", materials)
      change(input.details[locale].base_property, "value", 0)
      change(input.details[locale].rand_property, "value", 1920)
      change(input.details[locale].rand_property, "format", "{0:0.##%}")
      change(input.details[locale].level["1"], "rate2", 0)
    }
    const result = integrateWEngine(input)
    expect(result.data.materials).toBe(materials)
    expect(result.data.baseProperty.value).toBe(0)
    expect(result.data.randProperty.value).toBe(1920)
    expect(result.data.level["1"]).toStrictEqual({
      exp: 60,
      rate: 1568,
      rate2: 0,
    })
    expect(result.details.zh!.randProperty.format).toBe("{0:0.##%}")
    expect(result.details.zh!.baseProperty.name2).toBe("基础攻击力")
    expectWEngineRoundtrip(result, input)
  })

  it("保留特殊自有 key 并生成 RFC 6901 转义 Pointer，不污染原型", () => {
    const input = wEngineInput()
    change(input.details.zh, "__proto__", { polluted: true })
    change(input.details.zh, "constructor", "raw")
    change(input.details.zh, "a/b~c", 0)
    const result = integrateWEngine(input)
    expect(Object.getPrototypeOf(result.details.zh)).toBe(Object.prototype)
    expect(ownValue(result.details.zh, "__proto__")).toStrictEqual({
      polluted: true,
    })
    expect(ownValue(result.details.zh, "constructor")).toBe("raw")
    expect(ownValue(result.details.zh, "a/b~c")).toBe(0)
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/__proto__",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/a~1b~0c",
        kind: "unknown-field",
      },
      {
        entityId: "940001",
        locale: "zh",
        pointer: "/constructor",
        kind: "unknown-field",
      },
    ])
    expectWEngineRoundtrip(result, input)
  })
})

describe("WEngine 共享字段与分类派生", () => {
  it("codeName 是严格公共字段，跨语言不一致即失败", () => {
    const input = wEngineInput()
    change(input.details.en, "code_name", "Weapon_B_Common_Other")
    expectFailure(input, "en", "/code_name", "共享冲突（与 zh 的完整值不同）")
    change(input.details.en, "code_name", input.details.zh.code_name)
    const result = integrateWEngine(input)
    expect(result.data.codeName).toBe("Weapon_B_Common_Example")
    expectWEngineRoundtrip(result, input)
  })

  it.each([
    ["rarity", 3],
    ["icon", "Assets/NapResources/UI/Sprite/Other.png"],
    ["materials", "10:1"],
    ["level", { "0": { exp: 1, rate: 1, rate2: 1 } }],
    ["stars", { "0": { star_rate: 1, rand_rate: 1 } }],
  ] as const)("共享字段 %s 跨语言不一致即失败", (field, value) => {
    const input = wEngineInput()
    change(input.details.en, field, value)
    expectFailure(input, "en", `/${field}`, "共享冲突（与 zh 的完整值不同）")
  })

  it("属性数值跨语言不一致即失败，文本成员不参与共享核对", () => {
    const input = wEngineInput()
    change(input.details.en.base_property, "value", 33)
    expectFailure(
      input,
      "en",
      "/base_property",
      "共享冲突（与 zh 的完整值不同）",
    )
    change(input.details.en.base_property, "value", 32)
    change(input.details.en.rand_property, "value", 801)
    expectFailure(
      input,
      "en",
      "/rand_property",
      "共享冲突（与 zh 的完整值不同）",
    )
    change(input.details.en.rand_property, "value", 800)
    // 名称、第二名称与显示格式是本地化文本：即使跨语言不同也不报共享冲突。
    change(input.details.en.base_property, "name", "Base Attack")
    change(input.details.en.base_property, "name2", "Base Attack")
    change(input.details.en.base_property, "format", "{0:0.#}")
    const result = integrateWEngine(input)
    expect(result.data.baseProperty).toStrictEqual({ value: 32 })
    expect(result.details.en!.baseProperty.name).toBe("Base Attack")
    expectWEngineRoundtrip(result, input)
  })

  it("classificationIds 从 weapon_type key 派生，按数值升序且完整字典留在详情", () => {
    const input = wEngineInput()
    change(input.details.zh, "weapon_type", { "4": "防护", "1": "强攻" })
    change(input.details.en, "weapon_type", { "1": "Attack", "4": "Defense" })
    const result = integrateWEngine(input)
    expect(result.data.classificationIds).toStrictEqual({
      weaponType: ["1", "4"],
    })
    expect(result.details.zh!.weaponType).toStrictEqual({
      "1": "强攻",
      "4": "防护",
    })
    expect(result.details.en!.weaponType).toStrictEqual({
      "1": "Attack",
      "4": "Defense",
    })
    expectWEngineRoundtrip(result, input)
  })

  it("weapon_type ID 集合跨语言不一致即失败，不靠译名判断", () => {
    const input = wEngineInput()
    change(input.details.en, "weapon_type", { "2": "Attack" })
    expectFailure(input, "en", "/weapon_type", "分类 ID 集合冲突")
    change(input.details.en, "weapon_type", { "1": "Attack", "4": "Defense" })
    expectFailure(input, "en", "/weapon_type", "分类 ID 集合冲突")
  })

  it("weapon_type 为空对象时保留空字典并派生空 ID 集合", () => {
    const input = wEngineInput()
    change(input.details.zh, "weapon_type", {})
    change(input.details.en, "weapon_type", {})
    const result = integrateWEngine(input)
    expect(result.data.classificationIds).toStrictEqual({ weaponType: [] })
    expect(result.details.zh!.weaponType).toStrictEqual({})
    expectWEngineRoundtrip(result, input)
  })

  it("weapon_type 的 key 必须为规范十进制 ID，值必须为字符串", () => {
    const input = wEngineInput()
    change(input.details.zh, "weapon_type", { "01": "强攻" })
    expectFailure(
      input,
      "zh",
      "/weapon_type/01",
      "字典 key 必须为规范十进制 ID",
    )
    change(input.details.zh, "weapon_type", { "1": 1 })
    expectFailure(input, "zh", "/weapon_type/1", "字段类型必须为 string")
  })
})

describe("WEngine 身份、字段与语言集合校验", () => {
  it.each([
    "",
    "01",
    "1.0",
    " 940001",
    "940001 ",
    "-1",
    "940001000000000000000000000000000000",
    940001,
    null,
    undefined,
  ])("拒绝非法实体 ID %j", (entityId) => {
    expectFailure(
      { ...wEngineInput(), entityId: entityId as string },
      "input",
      "/entityId",
      "实体 ID 不是规范十进制 key",
    )
  })

  it.each(["zh", "en"] as const)("%s 详情 ID 必须与实体 ID 一致", (locale) => {
    const input = wEngineInput()
    change(input.details[locale], "id", 940002)
    expectFailure(input, locale, "/id", "详情身份与实体 ID 不一致")
    change(input.details[locale], "id", 940001.5)
    expectFailure(input, locale, "/id", "详情身份与实体 ID 不一致")
    change(input.details[locale], "id", Number.MAX_SAFE_INTEGER + 1)
    expectFailure(input, locale, "/id", "非法数值")
  })

  it.each(["zh", "en"] as const)("%s 详情的必需字段缺失即失败", (locale) => {
    for (const field of requiredDetailFields) {
      const input = wEngineInput()
      remove(input.details[locale], field)
      expectFailure(input, locale, `/${field}`, "缺失必需字段")
    }
  })

  it.each([
    ["id", "940001", "number"],
    ["code_name", 0, "string"],
    ["name", 0, "string"],
    ["desc", [], "string"],
    ["desc2", {}, "string"],
    ["desc3", null, "string"],
    ["rarity", "2", "number"],
    ["icon", false, "string"],
    ["materials", 0, "string"],
  ] as const)("详情 %s 类型不符即失败", (field, value, kind) => {
    const input = wEngineInput()
    change(input.details.zh, field, value)
    expectFailure(input, "zh", `/${field}`, `字段类型必须为 ${kind}`)
  })

  it.each([
    ["level", []],
    ["stars", "text"],
    ["talents", null],
    ["base_property", []],
    ["rand_property", "text"],
  ] as const)("详情 %s 不是普通对象即失败", (field, value) => {
    const input = wEngineInput()
    change(input.details.zh, field, value)
    expectFailure(input, "zh", `/${field}`, "字段类型必须为普通对象")
  })

  it("阶段与属性条目内部字段类型不符即失败", () => {
    const cases = [
      ["level.0", 0, "/level/0", "字段类型必须为普通对象"],
      ["level.0.exp", "30", "/level/0/exp", "字段类型必须为 number"],
      ["stars.0.star_rate", "0", "/stars/0/star_rate", "字段类型必须为 number"],
      ["talents.1.name", 0, "/talents/1/name", "字段类型必须为 string"],
      [
        "base_property.value",
        "32",
        "/base_property/value",
        "字段类型必须为 number",
      ],
      ["base_property.name", 0, "/base_property/name", "字段类型必须为 string"],
    ] as const
    for (const [path, value, pointer, reason] of cases) {
      const input = wEngineInput()
      change(input.details.zh, path, value)
      expectFailure(input, "zh", pointer, reason)
    }
  })

  it("阶段条目缺少登记成员即失败", () => {
    for (const [path, pointer] of [
      ["level.0.exp", "/level/0/exp"],
      ["stars.0.rand_rate", "/stars/0/rand_rate"],
      ["talents.1.desc", "/talents/1/desc"],
      ["base_property.name2", "/base_property/name2"],
      ["rand_property.format", "/rand_property/format"],
      ["base_property.value", "/base_property/value"],
    ] as const) {
      const input = wEngineInput()
      remove(input.details.zh, path)
      expectFailure(input, "zh", pointer, "缺失必需字段")
    }
  })

  it("拒绝来源字段与输出名的改名冲突", () => {
    const codeName = wEngineInput()
    change(codeName.details.zh, "codeName", "冲突")
    expectFailure(codeName, "zh", "/codeName", "改名冲突：code_name → codeName")

    const weaponType = wEngineInput()
    change(weaponType.details.zh, "weaponType", {})
    expectFailure(
      weaponType,
      "zh",
      "/weaponType",
      "改名冲突：weapon_type → weaponType",
    )

    const baseProperty = wEngineInput()
    change(baseProperty.details.zh, "baseProperty", {})
    expectFailure(
      baseProperty,
      "zh",
      "/baseProperty",
      "改名冲突：base_property → baseProperty",
    )

    const starRate = wEngineInput()
    change(starRate.details.zh.stars["0"], "starRate", 0)
    expectFailure(
      starRate,
      "zh",
      "/stars/0/starRate",
      "改名冲突：star_rate → starRate",
    )
  })

  it.each([[], ["zh", "zh"], ["ja"], ["en", "zh", "en"], null, "zh"])(
    "拒绝非法语言配置 %j",
    (locales) => {
      expectFailure(
        {
          ...wEngineInput(),
          detailLocales: locales as IntegrateWEngineInput["detailLocales"],
        },
        "input",
        "/detailLocales",
        "详情语言列表须非空、受支持且不重复",
      )
    },
  )

  it("只处理显式取得的语言子集，不补语言也不回退", () => {
    const input = wEngineInput()
    const single = {
      ...input,
      detailLocales: ["en"] as const,
      details: { en: input.details.en },
    }
    const result = integrateWEngine(single)
    expect(Object.keys(result.details)).toEqual(["en"])
    expect(result.data.codeName).toBe("Weapon_B_Common_Example")
    expect(result.details.en!.locale).toBe("en")
    expectWEngineRoundtrip(result, single)
    expectFailure(
      { ...input, details: { zh: input.details.zh } },
      "en",
      "",
      "缺失详情",
    )
    expectFailure(
      { ...input, detailLocales: ["zh"] },
      "input",
      "/en",
      "未配置的详情语言",
    )
    const reversed = integrateWEngine({
      ...input,
      detailLocales: ["en", "zh"] as const,
    })
    expect(Object.keys(reversed.details)).toEqual(["en", "zh"])
    expectWEngineRoundtrip(reversed, input)
  })

  it("拒绝辅助字段重名", () => {
    for (const field of ["locale", "classificationIds"]) {
      const input = wEngineInput()
      change(input.details.zh, field, "zh")
      expectFailure(input, "zh", `/${field}`, "辅助字段重名")
    }
  })
})

describe("WEngine 保真边界与容器校验", () => {
  it.each([
    ["zh", "name", undefined, "/name", "要求普通 JSON 对象或可往返的 JSON 值"],
    ["zh", "name", () => "x", "/name", "要求普通 JSON 对象或可往返的 JSON 值"],
    [
      "zh",
      "name",
      new Date(0),
      "/name",
      "要求普通 JSON 对象或可往返的 JSON 值",
    ],
    ["zh", "extra", Number.NaN, "/extra", "非法数值"],
    ["zh", "extra", Number.POSITIVE_INFINITY, "/extra", "非法数值"],
    ["zh", "extra", -0, "/extra", "非法数值"],
    ["zh", "extra", Number.MAX_SAFE_INTEGER + 1, "/extra", "非法数值"],
  ] as const)(
    "拒绝非保真值 %s/%s %#",
    (locale, field, value, pointer, reason) => {
      const input = wEngineInput()
      change(input.details[locale], field, value)
      expectFailure(input, locale, pointer, reason)
    },
  )

  it("拒绝详情中的数组空洞", () => {
    const input = wEngineInput()
    const sparse: unknown[] = [0, 1, 2]
    delete sparse[1]
    change(input.details.zh, "extra", sparse)
    expectFailure(input, "zh", "/extra/1", "JSON 数组不能有空洞")
  })

  it("拒绝访问器、不可枚举成员、Symbol key 与循环引用", () => {
    const accessor = wEngineInput()
    Object.defineProperty(accessor.details.zh, "name", {
      get: () => "x",
      enumerable: true,
      configurable: true,
    })
    expectFailure(accessor, "zh", "/name", "JSON 成员必须是可枚举数据属性")

    const hidden = wEngineInput()
    Object.defineProperty(hidden.details.zh, "name", {
      value: "x",
      enumerable: false,
      configurable: true,
    })
    expectFailure(hidden, "zh", "/name", "JSON 成员必须是可枚举数据属性")

    const symbolic = wEngineInput()
    Object.defineProperty(symbolic.details.zh, Symbol("hidden"), {
      value: 0,
      enumerable: true,
      configurable: true,
    })
    expectFailure(symbolic, "zh", "", "JSON 值不能包含 Symbol key")

    const circular = wEngineInput()
    change(circular.details.zh, "extra", circular.details.zh)
    expectFailure(circular, "zh", "/extra", "JSON 值不能循环引用")

    const indexCircular = wEngineInput()
    change(indexCircular.sourceRecord, "self", indexCircular.sourceRecord)
    expectFailure(indexCircular, "index", "/self", "JSON 值不能循环引用")
  })

  it("拒绝 details 与来源索引记录的容器结构错误", () => {
    expectFailure(
      { ...wEngineInput(), details: [] },
      "input",
      "",
      "details 必须是语言记录对象",
    )
    expectFailure(
      { ...wEngineInput(), details: "zh" },
      "input",
      "",
      "details 必须是语言记录对象",
    )
    const languageRecord = wEngineInput()
    change(languageRecord.details, "ja", wEngineSource())
    expectFailure(languageRecord, "input", "/ja", "未配置的详情语言")

    const symbolic = wEngineInput()
    Object.defineProperty(symbolic.details, Symbol("hidden"), {
      value: wEngineSource(),
      enumerable: true,
      configurable: true,
    })
    expectFailure(symbolic, "input", "", "语言记录不能包含 Symbol key")

    const accessor = wEngineInput()
    Object.defineProperty(accessor.details, "zh", {
      get: () => wEngineSource(),
      enumerable: true,
      configurable: true,
    })
    expectFailure(accessor, "input", "/zh", "语言记录必须是可枚举数据属性")

    const arrayDetail = wEngineInput()
    change(arrayDetail.details, "zh", [])
    expectFailure(arrayDetail, "zh", "", "详情必须是普通对象")

    for (const value of [null, [], "record", 0]) {
      expectFailure(
        { ...wEngineInput(), sourceRecord: value },
        "index",
        "",
        "索引记录必须是普通对象",
      )
    }
  })

  it("拒绝 detailLocales 中的空洞与不可往返值", () => {
    const sparse = ["zh"] as ("zh" | "en")[]
    sparse[2] = "en"
    expectFailure(
      { ...wEngineInput(), detailLocales: sparse },
      "input",
      "/detailLocales/1",
      "JSON 数组不能有空洞",
    )
    expectFailure(
      {
        ...wEngineInput(),
        detailLocales: ["zh", undefined] as unknown as ("zh" | "en")[],
      },
      "input",
      "/detailLocales/1",
      "要求普通 JSON 对象或可往返的 JSON 值",
    )
  })
})
