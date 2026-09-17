import { describe, expect, it } from "vitest"
import type { DriveDiscData } from "../src/integration/drive-disc-types.ts"
import { integrateDriveDisc } from "../src/integration/integrate-drive-disc.ts"
import type { IntegrateDriveDiscInput } from "../src/integration/integrate-drive-disc.ts"
import { DriveDiscIntegrationError } from "../src/integration/source-json.ts"
import {
  driveDiscInput,
  driveDiscSource,
} from "./fixtures/drive-disc-source.ts"
import { expectDriveDiscRoundtrip } from "./fixtures/drive-disc-roundtrip.ts"

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
  input: IntegrateDriveDiscInput,
  locale: string,
  pointer: string,
  reason?: string,
): void {
  expect(() => integrateDriveDisc(input)).toThrow(DriveDiscIntegrationError)
  try {
    integrateDriveDisc(input)
  } catch (error) {
    expect(error).toMatchObject({
      location: { entityId: input.entityId, locale, pointer },
    })
    if (reason) expect((error as Error).message).toContain(reason)
  }
}

const expectedData = {
  id: 930001,
  icon: "UI/Sprite/IconSuit/ExampleIcon.png",
  icon2: "UI/Sprite/IconSuit/ExampleIcon2.png",
} satisfies DriveDiscData

const requiredDetailFields = [
  "id",
  "name",
  "desc2",
  "desc4",
  "story",
  "icon",
  "icon2",
] as const

describe("单驱动盘纯整合 nanoka-drive-disc-reference/1", () => {
  it("按独立预期拆分双语，保留索引，冻结输入仍可整合且不修改来源", () => {
    const input = driveDiscInput()
    const before = structuredClone(input)
    freeze(input)
    const result = integrateDriveDisc(input)
    expect(result.data).toStrictEqual(expectedData)
    expect(result.details.zh).toStrictEqual({
      id: 930001,
      locale: "zh",
      name: "示例驱动盘",
      desc2: "暴击率+8%。",
      desc4:
        "<color=#FFFFFF>[强化特殊技]</color>命中时，攻击力提升9%，持续6秒。",
      story: "刻录在示例驱动盘里的合成故事。\n第二段保留换行。",
    })
    expect(result.details.zh).not.toHaveProperty("icon")
    expect(result.details.zh).not.toHaveProperty("icon2")
    expect(result.details.en!.name).toBe("Example Drive Disc")
    expect(result.maintenance).toEqual({ diagnostics: [] })
    expectDriveDiscRoundtrip(result, input)
    expect(input).toStrictEqual(before)
    result.data.icon = "modified"
    result.sourceRecord.zh = "modified"
    result.details.zh!.desc4 = "modified"
    expect(input).toStrictEqual(before)
  })

  it("索引与详情的同名字段各自保留，不要求相等也不互相回退", () => {
    const input = driveDiscInput()
    change(input.details.zh, "name", "详情名称")
    change(input.sourceRecord.zh, "name", "索引名称")
    const result = integrateDriveDisc(input)
    expect(result.details.zh!.name).toBe("详情名称")
    expect(ownValue(result.sourceRecord.zh, "name")).toBe("索引名称")
    expect(ownValue(result.sourceRecord, "icon")).toBe(expectedData.icon)
    change(input.sourceRecord.zh, "desc2", "索引说明")
    change(input.sourceRecord, "icon", "UI/Sprite/IconSuit/IndexIcon.png")
    const second = integrateDriveDisc(input)
    expect(second.details.zh!.desc2).toBe("暴击率+8%。")
    expect(second.data.icon).toBe(expectedData.icon)
    expect(second.sourceRecord).toStrictEqual(input.sourceRecord)
    expectDriveDiscRoundtrip(second, input)
  })

  it("两次整合互不影响，结果对象树独立", () => {
    const input = driveDiscInput()
    const first = integrateDriveDisc(input)
    const second = integrateDriveDisc(input)
    expect(second).toStrictEqual(first)
    expect(second.data).not.toBe(first.data)
    expect(second.details.zh).not.toBe(first.details.zh)
    first.details.zh!.name = "modified"
    first.sourceRecord.icon = "modified"
    expect(second.details.zh!.name).toBe("示例驱动盘")
    expect(second.sourceRecord.icon).toBe(expectedData.icon)
    expect(input.details.zh.name).toBe("示例驱动盘")
  })

  it("对象 key 排列不影响整个结果与维护记录", () => {
    const input = driveDiscInput()
    change(input.details.zh, "unknown_b", { z: 0, a: 1 })
    change(input.details.zh, "unknown_a", [])
    change(input.sourceRecord, "future", null)
    const result = integrateDriveDisc(input)
    const reordered = integrateDriveDisc(
      reverseKeys(input) as IntegrateDriveDiscInput,
    )
    expect(reordered).toStrictEqual(result)
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(result))
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "930001",
        locale: "zh",
        pointer: "/unknown_a",
        kind: "unknown-field",
      },
      {
        entityId: "930001",
        locale: "zh",
        pointer: "/unknown_b",
        kind: "unknown-field",
      },
      {
        entityId: "930001",
        locale: "index",
        pointer: "/future",
        kind: "unknown-field",
      },
    ])
    expectDriveDiscRoundtrip(result, input)
  })

  it("保留未知嵌套字段、零空值与富文本，并报告待登记路径", () => {
    const input = driveDiscInput()
    for (const source of Object.values(input.details)) {
      change(source, "untouched", {
        snake_key: { attack_growth: 0 },
        zero: 0,
        empty: "",
        nil: null,
        array: [],
        object: {},
        boolean: false,
      })
    }
    change(input.sourceRecord, "future_field", [null, "", {}, [], 0])
    change(input.sourceRecord.zh, "extra", { nested: { deep: 0 } })
    change(input.sourceRecord.ja, "extra", "")
    const result = integrateDriveDisc(input)
    expect(result.details.zh!.untouched).toStrictEqual({
      snake_key: { attack_growth: 0 },
      zero: 0,
      empty: "",
      nil: null,
      array: [],
      object: {},
      boolean: false,
    })
    expect(ownValue(result.sourceRecord, "future_field")).toStrictEqual([
      null,
      "",
      {},
      [],
      0,
    ])
    expect(ownValue(result.sourceRecord.zh, "extra")).toStrictEqual({
      nested: { deep: 0 },
    })
    expect(ownValue(result.sourceRecord.ja, "extra")).toBe("")
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "930001",
        locale: "zh",
        pointer: "/untouched",
        kind: "unknown-field",
      },
      {
        entityId: "930001",
        locale: "en",
        pointer: "/untouched",
        kind: "unknown-field",
      },
      {
        entityId: "930001",
        locale: "index",
        pointer: "/future_field",
        kind: "unknown-field",
      },
      {
        entityId: "930001",
        locale: "index",
        pointer: "/ja/extra",
        kind: "unknown-field",
      },
      {
        entityId: "930001",
        locale: "index",
        pointer: "/zh/extra",
        kind: "unknown-field",
      },
    ])
    expectDriveDiscRoundtrip(result, input)
  })

  it.each([
    ["name", "  保留两侧空格  "],
    ["desc2", ""],
    ["desc4", "<color=#FFFFFF>[普通攻击]</color>\n{CAL:1+2} 100%"],
    ["story", "第一段\n\n第二段\t制表符与 emoji 🎵"],
  ] as const)("按来源保留 %s 的原值与空字符串", (field, value) => {
    const input = driveDiscInput()
    change(input.details.zh, field, value)
    change(input.details.en, field, value)
    const result = integrateDriveDisc(input)
    expect(result.details.zh![field]).toBe(value)
    expect(result.details.en![field]).toBe(value)
    expect(result.maintenance.diagnostics).toEqual([])
    expectDriveDiscRoundtrip(result, input)
  })

  it("保留特殊自有 key 并生成 RFC 6901 转义 Pointer，不污染原型", () => {
    const input = driveDiscInput()
    change(input.details.zh, "__proto__", { polluted: true })
    change(input.details.zh, "constructor", "raw")
    change(input.details.zh, "a/b~c", 0)
    const result = integrateDriveDisc(input)
    expect(Object.getPrototypeOf(result.details.zh)).toBe(Object.prototype)
    expect(ownValue(result.details.zh, "__proto__")).toStrictEqual({
      polluted: true,
    })
    expect(ownValue(result.details.zh, "constructor")).toBe("raw")
    expect(ownValue(result.details.zh, "a/b~c")).toBe(0)
    expect(result.maintenance.diagnostics).toEqual([
      {
        entityId: "930001",
        locale: "zh",
        pointer: "/__proto__",
        kind: "unknown-field",
      },
      {
        entityId: "930001",
        locale: "zh",
        pointer: "/a~1b~0c",
        kind: "unknown-field",
      },
      {
        entityId: "930001",
        locale: "zh",
        pointer: "/constructor",
        kind: "unknown-field",
      },
    ])
    expectDriveDiscRoundtrip(result, input)
  })
})

describe("驱动盘共享资源与来源摘要", () => {
  it("icon 与 icon2 分别核对跨语言一致性，冲突即失败", () => {
    const input = driveDiscInput()
    let result = integrateDriveDisc(input)
    expect(result.data).toHaveProperty("icon", expectedData.icon)
    expect(result.data).toHaveProperty("icon2", expectedData.icon2)
    change(input.details.en, "icon", "UI/Sprite/IconSuit/Other.png")
    expectFailure(input, "en", "/icon", "共享冲突（与 zh 的完整值不同）")
    change(input.details.en, "icon", input.details.zh.icon)
    change(input.details.en, "icon2", "UI/Sprite/IconSuit/Other2.png")
    expectFailure(input, "en", "/icon2", "共享冲突（与 zh 的完整值不同）")
    change(input.details.en, "icon2", input.details.zh.icon2)
    const reversed = { ...input, detailLocales: ["en", "zh"] as const }
    change(reversed.details.zh, "icon", "UI/Sprite/IconSuit/Other.png")
    expectFailure(reversed, "zh", "/icon", "共享冲突（与 en 的完整值不同）")
    change(input.details.zh, "icon", expectedData.icon)
    change(input.details.zh, "icon2", input.details.zh.icon)
    change(input.details.en, "icon2", input.details.en.icon)
    result = integrateDriveDisc(input)
    expect(result.data).toStrictEqual({
      id: 930001,
      icon: expectedData.icon,
      icon2: expectedData.icon,
    })
    expect(result.details.zh).not.toHaveProperty("icon2")
    expectDriveDiscRoundtrip(result, input)
  })

  it("空字符串仍是可共享的资源原值", () => {
    const input = driveDiscInput()
    for (const locale of ["zh", "en"] as const) {
      change(input.details[locale], "icon", "")
      change(input.details[locale], "icon2", "")
    }
    const result = integrateDriveDisc(input)
    expect(result.data).toStrictEqual({ id: 930001, icon: "", icon2: "" })
    expectDriveDiscRoundtrip(result, input)
  })

  it("来源摘要校验 icon 与 zh/en 结构，ja/ko 缺失时不补造", () => {
    const input = driveDiscInput()
    for (const locale of ["ja", "ko"]) remove(input.sourceRecord, locale)
    const result = integrateDriveDisc(input)
    expect(result.sourceRecord).not.toHaveProperty("ja")
    expect(result.sourceRecord).not.toHaveProperty("ko")
    expect(result.maintenance.diagnostics).toEqual([])
    expectDriveDiscRoundtrip(result, input)
  })

  it.each(["icon", "zh", "en"])("来源摘要缺失 %s 即失败", (path) => {
    const input = driveDiscInput()
    remove(input.sourceRecord, path)
    expectFailure(input, "index", `/${path}`, "缺失必需字段")
  })

  it.each([
    ["icon", 0],
    ["icon", null],
    ["zh", []],
    ["zh", "text"],
    ["en", null],
    ["ja", []],
    ["ko", 0],
  ] as const)("来源摘要 %s 结构不符即失败 %#", (path, value) => {
    const input = driveDiscInput()
    change(input.sourceRecord, path, value)
    expectFailure(input, "index", `/${path}`)
  })

  it("摘要语言对象缺字段或类型错误即失败，可选语言同样核对", () => {
    for (const field of ["name", "desc2", "desc4"]) {
      const missing = driveDiscInput()
      remove(missing.sourceRecord.zh, field)
      expectFailure(missing, "index", `/zh/${field}`, "缺失必需字段")
      const wrong = driveDiscInput()
      change(wrong.sourceRecord.zh, field, 0)
      expectFailure(wrong, "index", `/zh/${field}`, "字段类型必须为 string")
      const optional = driveDiscInput()
      change(optional.sourceRecord.ko, field, null)
      expectFailure(optional, "index", `/ko/${field}`, "字段类型必须为 string")
    }
  })

  it("摘要与详情的同名字段不要求相等，也不触发共享冲突", () => {
    const input = driveDiscInput()
    change(input.sourceRecord.zh, "desc2", "完全不同的索引说明")
    change(input.sourceRecord.en, "desc4", "A different index description.")
    const result = integrateDriveDisc(input)
    expect(result.details.zh!.desc2).toBe("暴击率+8%。")
    expect(ownValue(result.sourceRecord.zh, "desc2")).toBe("完全不同的索引说明")
    expect(result.maintenance.diagnostics).toEqual([])
    expectDriveDiscRoundtrip(result, input)
  })
})

describe("驱动盘身份、字段与语言集合校验", () => {
  it.each([
    "",
    "01",
    "1.0",
    " 930001",
    "930001 ",
    "-1",
    "930001000000000000000000000000000000",
    930001,
    null,
    undefined,
  ])("拒绝非法实体 ID %j", (entityId) => {
    expectFailure(
      { ...driveDiscInput(), entityId: entityId as string },
      "input",
      "/entityId",
      "实体 ID 不是规范十进制 key",
    )
  })

  it.each(["zh", "en"] as const)("%s 详情 ID 必须与实体 ID 一致", (locale) => {
    const input = driveDiscInput()
    change(input.details[locale], "id", 930002)
    expectFailure(input, locale, "/id", "详情身份与实体 ID 不一致")
    change(input.details[locale], "id", 930001.5)
    expectFailure(input, locale, "/id", "详情身份与实体 ID 不一致")
    change(input.details[locale], "id", Number.MAX_SAFE_INTEGER + 1)
    expectFailure(input, locale, "/id", "非法数值")
  })

  it.each(["zh", "en"] as const)("%s 详情的必需字段缺失即失败", (locale) => {
    for (const field of requiredDetailFields) {
      const input = driveDiscInput()
      remove(input.details[locale], field)
      expectFailure(input, locale, `/${field}`, "缺失必需字段")
    }
  })

  it.each([
    ["id", "930001", "number"],
    ["name", 0, "string"],
    ["desc2", [], "string"],
    ["desc4", {}, "string"],
    ["story", null, "string"],
    ["icon", false, "string"],
    ["icon2", ["x"], "string"],
  ] as const)("详情 %s 类型不符即失败", (field, value, kind) => {
    const input = driveDiscInput()
    change(input.details.zh, field, value)
    expectFailure(input, "zh", `/${field}`, `字段类型必须为 ${kind}`)
  })

  it.each([[], ["zh", "zh"], ["ja"], ["en", "zh", "en"], null, "zh"])(
    "拒绝非法语言配置 %j",
    (locales) => {
      expectFailure(
        {
          ...driveDiscInput(),
          detailLocales: locales as IntegrateDriveDiscInput["detailLocales"],
        },
        "input",
        "/detailLocales",
        "详情语言列表须非空、受支持且不重复",
      )
    },
  )

  it("只处理显式取得的语言子集，不补语言也不回退", () => {
    const input = driveDiscInput()
    const single = {
      ...input,
      detailLocales: ["en"] as const,
      details: { en: input.details.en },
    }
    const result = integrateDriveDisc(single)
    expect(Object.keys(result.details)).toEqual(["en"])
    expect(result.data.icon).toBe(expectedData.icon)
    expect(result.details.en!.locale).toBe("en")
    expectDriveDiscRoundtrip(result, single)
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
    const reversed = integrateDriveDisc({
      ...input,
      detailLocales: ["en", "zh"] as const,
    })
    expect(Object.keys(reversed.details)).toEqual(["en", "zh"])
    expectDriveDiscRoundtrip(reversed, input)
  })
})

describe("驱动盘保真边界与容器校验", () => {
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
      const input = driveDiscInput()
      change(input.details[locale], field, value)
      expectFailure(input, locale, pointer, reason)
    },
  )

  it("拒绝详情中的数组空洞", () => {
    const input = driveDiscInput()
    const sparse: unknown[] = [0, 1, 2]
    delete sparse[1]
    change(input.details.zh, "extra", sparse)
    expectFailure(input, "zh", "/extra/1", "JSON 数组不能有空洞")
  })

  it("拒绝访问器、不可枚举成员、Symbol key 与循环引用", () => {
    const accessor = driveDiscInput()
    Object.defineProperty(accessor.details.zh, "name", {
      get: () => "x",
      enumerable: true,
      configurable: true,
    })
    expectFailure(accessor, "zh", "/name", "JSON 成员必须是可枚举数据属性")

    const hidden = driveDiscInput()
    Object.defineProperty(hidden.details.zh, "name", {
      value: "x",
      enumerable: false,
      configurable: true,
    })
    expectFailure(hidden, "zh", "/name", "JSON 成员必须是可枚举数据属性")

    const symbolic = driveDiscInput()
    Object.defineProperty(symbolic.details.zh, Symbol("hidden"), {
      value: 0,
      enumerable: true,
      configurable: true,
    })
    expectFailure(symbolic, "zh", "", "JSON 值不能包含 Symbol key")

    const circular = driveDiscInput()
    change(circular.details.zh, "extra", circular.details.zh)
    expectFailure(circular, "zh", "/extra", "JSON 值不能循环引用")

    const indexCircular = driveDiscInput()
    change(indexCircular.sourceRecord, "self", indexCircular.sourceRecord)
    expectFailure(indexCircular, "index", "/self", "JSON 值不能循环引用")
  })

  it("拒绝 details 与来源摘要的容器结构错误", () => {
    expectFailure(
      { ...driveDiscInput(), details: [] },
      "input",
      "",
      "details 必须是语言记录对象",
    )
    expectFailure(
      { ...driveDiscInput(), details: "zh" },
      "input",
      "",
      "details 必须是语言记录对象",
    )
    const languageRecord = driveDiscInput()
    change(languageRecord.details, "ja", driveDiscSource())
    expectFailure(languageRecord, "input", "/ja", "未配置的详情语言")

    const symbolic = driveDiscInput()
    Object.defineProperty(symbolic.details, Symbol("hidden"), {
      value: driveDiscSource(),
      enumerable: true,
      configurable: true,
    })
    expectFailure(symbolic, "input", "", "语言记录不能包含 Symbol key")

    const accessor = driveDiscInput()
    Object.defineProperty(accessor.details, "zh", {
      get: () => driveDiscSource(),
      enumerable: true,
      configurable: true,
    })
    expectFailure(accessor, "input", "/zh", "语言记录必须是可枚举数据属性")

    const arrayDetail = driveDiscInput()
    change(arrayDetail.details, "zh", [])
    expectFailure(arrayDetail, "zh", "", "详情必须是普通对象")

    const derivedCollision = driveDiscInput()
    change(derivedCollision.details.zh, "locale", "zh")
    expectFailure(derivedCollision, "zh", "/locale", "辅助字段重名")

    for (const value of [null, [], "record", 0]) {
      expectFailure(
        { ...driveDiscInput(), sourceRecord: value },
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
      { ...driveDiscInput(), detailLocales: sparse },
      "input",
      "/detailLocales/1",
      "JSON 数组不能有空洞",
    )
    expectFailure(
      {
        ...driveDiscInput(),
        detailLocales: ["zh", undefined] as unknown as ("zh" | "en")[],
      },
      "input",
      "/detailLocales/1",
      "要求普通 JSON 对象或可往返的 JSON 值",
    )
  })
})
