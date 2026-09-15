import type { AgentData } from "../src/integration/agent-types.ts"
import { describe, expect, it } from "vitest"
import { integrateAgent } from "../src/integration/integrate-agent.ts"
import type { IntegrateAgentInput } from "../src/integration/integrate-agent.ts"
import { AgentIntegrationError } from "../src/integration/source-json.ts"
import { agentInput, agentSource, parameter } from "./fixtures/agent-source.ts"
import { expectRoundtrip, resolvePointer } from "./fixtures/agent-roundtrip.ts"
import {
  agentResourceVariants,
  attackDataVariants,
  codeNameVariants,
  emptyPartnerInfo,
  extraPropertyVariants,
  potentialDetailVariants,
  potentialVariants,
  specialElementVariants,
  strategyVariants,
  textOnlyParameterRow,
} from "./fixtures/agent-variants.ts"

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
  input: IntegrateAgentInput,
  locale: string,
  pointer: string,
  reason?: string,
): void {
  expect(() => integrateAgent(input)).toThrow(AgentIntegrationError)
  try {
    integrateAgent(input)
  } catch (error) {
    expect(error).toMatchObject({
      location: { entityId: input.entityId, locale, pointer },
    })
    if (reason) expect((error as Error).message).toContain(reason)
  }
}

const expectedData = {
  id: 900001,
  codeName: "Example",
  icon: "raw_icon",
  rarity: 0,
  gender: 0,
  classificationIds: {
    weaponType: ["2", "10"],
    elementType: ["203"],
    hitType: ["101"],
    camp: ["1"],
  },
  partnerInfo: { interKnotIcon: "raw/path.png" },
  stats: {
    armor: 0,
    armorGrowth: 0,
    attack: 0,
    attackGrowth: 0,
    avatarPieceId: 0,
    breakStun: 0,
    crit: 0,
    critDamage: 0,
    critDmgRes: 0,
    critRes: 0,
    defence: 0,
    defenceGrowth: 0,
    elementAbnormalPower: 0,
    elementMystery: 0,
    endurance: 0,
    hpGrowth: 0,
    hpMax: 0,
    penDelta: 0,
    penRate: 0,
    rbl: 0,
    rblCorrectionFactor: 0,
    rblProbability: 0,
    shield: 0,
    shieldGrowth: 0,
    spBarPoint: 0,
    spRecover: 0,
    stun: 0,
    tags: ["raw_tag", "raw_tag"],
    rpMax: 0,
    rpRecover: 0,
  },
  level: {
    low_stage: {
      hpMax: 0,
      attack: 0,
      defence: 0,
      levelMax: 0,
      levelMin: 0,
      materials: { "1": 0 },
    },
  },
  levelExp: [10, 0],
  skin: { "1": { image: "original_image" } },
  extraLevel: {
    stage_key: { maxLevel: 0, extra: { prop_key: { prop: 0, value: 0 } } },
  },
  skill: { "g/~": { material: { stage_key: { "1": 0 } } } },
  skillPriority: [
    {
      id: 0,
      avatarId: 900001,
      firstPriority: [2, 1, 2],
      secondPriority: [],
      thirdPriority: [],
      potentialLevels: [0],
    },
  ],
  skillList: { "1": { elementType: 203, hitType: 101, potential: [] } },
  passive: { materials: {}, level: { "1": { id: 1, level: 0 } } },
  talent: { stage_key: { level: 0 } },
  fairyRecommend: {
    slot4: 0,
    slot2: 0,
    slotSub: 0,
    partSubList: [2, 1, 2],
    part4: { prop: 0, icon: "" },
    part5: { prop: 0, icon: "" },
    part6: { prop: 0, icon: "" },
    partSub: { prop: 0, icon: "" },
  },
  potential: [0],
} satisfies AgentData

describe("单代理人纯整合 v4", () => {
  it("按独立预期拆分双语，保留索引，冻结输入仍可整合且不修改来源", () => {
    const input = agentInput()
    const before = structuredClone(input)
    freeze(input)
    const result = integrateAgent(input)
    expect(result.data).toStrictEqual(expectedData)
    expect(result.details.zh!.partnerInfo).toStrictEqual(emptyPartnerInfo)
    expect(result.details.en!.name).toBe("Example Agent")
    expect(result.maintenance).toEqual({
      diagnostics: [],
      codeNameDifferences: [],
    })
    expectRoundtrip(result, input)
    expect(input).toStrictEqual(before)
    result.data.stats.attack = 999
    result.sourceRecord.zh = "modified"
    result.details.zh!.skill["g/~"].description[0].name = "modified"
    expect(input).toStrictEqual(before)
  })

  it("保留未知成员、原字典 key、零空值和完整共享块", () => {
    const input = agentInput()
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
      change(source, "stats.unknown_block", { raw_key: [null, "", {}, [], 0] })
      change(source, "level.low_stage.unknown_member", null)
      change(source, "skill_priority.0.unknown_field", [])
      change(source, "partner_info.trust_lv", {
        basic_attack: "",
        constructor: "raw",
        __custom_key: "原文",
      })
      change(source, "skill.basic_attack", { material: {}, description: [] })
      change(source, "extra_level.stage_key.extra.prop_key.new_field", {
        max_level: 0,
      })
    }
    const result = integrateAgent(input)
    expect(result.data.stats).toHaveProperty("unknown_block", {
      raw_key: [null, "", {}, [], 0],
    })
    expect(result.data.skill).toHaveProperty("basic_attack")
    expect(result.details.zh!.partnerInfo.trustLv).toStrictEqual({
      basic_attack: "",
      constructor: "raw",
      __custom_key: "原文",
    })
    expect(result.maintenance.diagnostics).toContainEqual({
      entityId: "900001",
      locale: "zh",
      pointer: "/stats/unknown_block",
      kind: "unknown-field",
    })
    expect(
      result.maintenance.diagnostics.some((item) =>
        item.pointer.includes("raw_key"),
      ),
    ).toBe(false)
    expectRoundtrip(result, input)
  })

  it("对象 key 排列不影响整个结果与维护记录，来源数组顺序原样保留", () => {
    const input = agentInput()
    change(input.details.zh, "unknown_b", { z: 0, a: 1 })
    change(input.details.zh, "unknown_a", [])
    const result = integrateAgent(input)
    const reordered = integrateAgent(reverseKeys(input) as IntegrateAgentInput)
    expect(reordered).toStrictEqual(result)
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(result))
    expect(result.data.skillPriority[0].firstPriority).toEqual([2, 1, 2])
    expect(result.data.levelExp).toEqual([10, 0])
    expectRoundtrip(result, input)
  })

  it("多 ID、重复用途、纯文本与单语言条目保持独立身份并逐语言生成完整行 Pointer", () => {
    const input = agentInput()
    change(input.details.zh, "skill_list.3", {
      name: "仅元数据",
      desc: "",
      element_type: 999,
      hit_type: 0,
      potential: [0],
    })
    const result = integrateAgent(input)
    expect(result.data.skillList).not.toHaveProperty("3")
    expect(result.details.zh!.skillList["3"]).toEqual({
      name: "仅元数据",
      desc: "",
      elementType: 999,
      hitType: 0,
      potential: [0],
    })
    for (const locale of ["zh", "en"] as const) {
      const section = locale === "zh" ? 1 : 0
      const row = `/skill/g~1~0/description/${section}/param/0`
      expect(result.details[locale]!.navigation).toEqual({
        parameterIdsByGroup: { "g/~": ["1", "2"] },
        parameterRowsById: {
          "1": [row, `/skill/g~1~0/description/${section}/param/1`],
          "2": [row],
        },
      })
      expect(resolvePointer(result.details[locale], row)).toMatchObject({
        name: "倍率",
        desc: "{Skill:1}+{Skill:2}",
        potential: [],
        param: {
          "1": { main: 100, growth: 0, format: "%" },
          "2": { main: 200 },
        },
      })
      expect(
        resolvePointer(
          result.details[locale],
          `/skill/g~1~0/description/${section}/param/2`,
        ),
      ).toEqual({ name: "消耗", desc: "60点", potential: [] })
      expect(
        result.details[locale]!.navigation.parameterRowsById,
      ).not.toHaveProperty("3")
    }
    expectRoundtrip(result, input)
  })

  it.each([
    ["skin", "only_skin", { image: "only", name: "", desc: "" }, "skin"],
    [
      "skill",
      "only_group",
      { material: { "1": { "1": 5 } }, description: [] },
      "skill",
    ],
    [
      "skill_list",
      "3",
      { name: "", desc: "", element_type: 0, hit_type: 0, potential: [] },
      "skillList",
    ],
    ["extra_level", "only_stage", { max_level: 9, extra: {} }, "extraLevel"],
    [
      "extra_level.stage_key.extra",
      "only_prop",
      { prop: 9, value: 9, name: "", format: "" },
      "extraLevel.stage_key.extra",
    ],
    [
      "passive.level",
      "9",
      {
        id: 9,
        level: 9,
        name: [],
        desc: [],
        extra_property: {},
        potential: [],
      },
      "passive.level",
    ],
    [
      "talent",
      "only_stage",
      { level: 9, name: "", desc: "", desc2: "" },
      "talent",
    ],
  ])(
    "%s 的单语言独有 key %s 完整留在本语言",
    (container, key, value, outputContainer) => {
      const input = agentInput()
      change(input.details.zh, `${container}.${key}`, value)
      const result = integrateAgent(input)
      expect(result.data).not.toHaveProperty(`${outputContainer}.${key}`)
      expect(result.details.zh).toHaveProperty(`${outputContainer}.${key}`)
      expectRoundtrip(result, input)
    },
  )

  it.each([
    "icon",
    "rarity",
    "gender",
    "stats.attack",
    "level.low_stage.attack",
    "level_exp",
    "skill_priority.0.first_priority",
    "potential",
    "skin.1.image",
    "skill.g/~.material",
    "skill_list.1.element_type",
    "skill_list.1.hit_type",
    "skill_list.1.potential",
    "extra_level.stage_key.max_level",
    "extra_level.stage_key.extra.prop_key.value",
    "passive.materials",
    "passive.level.1.level",
    "talent.stage_key.level",
    "fairy_recommend.slot_sub",
    "fairy_recommend.part4.icon",
    "partner_info.inter_knot_icon",
  ])("共享冲突明确失败：%s", (path) => {
    const input = agentInput()
    const oldValue = path
      .split(".")
      .reduce<unknown>(
        (current, key) => (current as Record<string, unknown>)[key],
        input.details.en,
      )
    const value =
      typeof oldValue === "number"
        ? 9
        : typeof oldValue === "string"
          ? "different"
          : Array.isArray(oldValue)
            ? [999]
            : { "9": { "9": 9 } }
    change(input.details.en, path, value)
    expect(() => integrateAgent(input)).toThrow("共享冲突")
  })

  it("整块共享中的未知差异也冲突，codeName 特例不能豁免", () => {
    const input = agentInput()
    input.details.en.code_name = "Different"
    change(input.details.zh, "stats.new_member", { untouched_key: null })
    expectFailure(input, "en", "/stats", "共享冲突")
  })
})

describe("codeName 与显式语言顺序", () => {
  it.each([
    ["Equal", "Equal", ["zh", "en"], "Equal", 0],
    ["Original", "Different", ["zh", "en"], "Original", 1],
    ["", "Different", ["zh", "en"], "", 1],
    ["Original", "", ["en", "zh"], "", 1],
    ["Original", "Different", ["en", "zh"], "Different", 1],
  ] as const)(
    "取原值 %j / %j，按 %j 配置",
    (zh, en, order, selected, differences) => {
      const input = { ...agentInput(), detailLocales: order }
      input.details.zh.code_name = zh
      input.details.en.code_name = en
      const result = integrateAgent(input)
      expect(result.data.codeName).toBe(selected)
      expect(result.maintenance.codeNameDifferences).toHaveLength(differences)
      if (differences)
        expect(result.maintenance.codeNameDifferences[0]).toEqual({
          entityId: "900001",
          locale: order[1],
          pointer: "/code_name",
          selectedLocale: order[0],
          selectedValue: selected,
          value: order[1] === "zh" ? zh : en,
        })
      expect(result.details.zh).not.toHaveProperty("codeName")
      expect(result.details.en).not.toHaveProperty("codeName")
      expectRoundtrip(result, input)
    },
  )

  it.each(["zh", "en"] as const)("%s 每种语言都必须提供字符串", (locale) => {
    const input = agentInput()
    remove(input.details[locale], "code_name")
    expectFailure(input, locale, "/code_name", "缺失必需")
    for (const value of [0, null, {}, [], true, undefined]) {
      change(input.details[locale], "code_name", value)
      expectFailure(input, locale, "/code_name")
    }
  })

  it.each(codeNameVariants)("保留已确认名称变体 $codeName", ({ codeName }) => {
    const input = agentInput()
    input.details.zh.code_name = codeName
    const result = integrateAgent(input)
    expect(result.data.codeName).toBe(codeName)
    expectRoundtrip(result, input)
  })

  it("仅处理显式取得的语言，不把索引语言当作详情", () => {
    const input = agentInput()
    const single = {
      ...input,
      detailLocales: ["en"] as const,
      details: { en: input.details.en },
    }
    const result = integrateAgent(single)
    expect(Object.keys(result.details)).toEqual(["en"])
    expectRoundtrip(result, single)
    expectFailure(
      { ...input, details: { zh: input.details.zh } },
      "en",
      "",
      "缺失详情",
    )
    expectFailure({ ...input, detailLocales: ["zh"] }, "input", "/en", "未配置")
  })

  it.each([[], ["zh", "zh"], ["ja"], null, ["en", "zh", "en"]])(
    "拒绝非法语言配置 %j",
    (locales) => {
      expectFailure(
        {
          ...agentInput(),
          detailLocales: locales as IntegrateAgentInput["detailLocales"],
        },
        "input",
        "/detailLocales",
      )
    },
  )
})

describe("v4 结构变体与可选资源", () => {
  it.each([
    ["live2_d", "live2D"],
    ["partner_info.icon_path", "partnerInfo.iconPath"],
    ["partner_info.role_icon", "partnerInfo.roleIcon"],
  ])("%s 缺失、双侧同值、单侧空字符串及冲突", (sourcePath, outputPath) => {
    const input = agentInput()
    let result = integrateAgent(input)
    expect(result.data).not.toHaveProperty(outputPath)
    expect(result.details.zh).not.toHaveProperty(outputPath)
    for (const locale of ["zh", "en"] as const)
      change(input.details[locale], sourcePath, "")
    result = integrateAgent(input)
    expect(result.data).toHaveProperty(outputPath, "")
    expectRoundtrip(result, input)
    remove(input.details.en, sourcePath)
    result = integrateAgent(input)
    expect(result.data).not.toHaveProperty(outputPath)
    expect(result.details.zh).toHaveProperty(outputPath, "")
    expect(result.details.en).not.toHaveProperty(outputPath)
    expectRoundtrip(result, input)
    change(input.details.en, sourcePath, "different")
    expectFailure(
      input,
      "en",
      `/${sourcePath.replaceAll(".", "/")}`,
      "共享冲突",
    )
    for (const value of [0, null, [], {}, false]) {
      change(input.details.en, sourcePath, value)
      expectFailure(
        input,
        "en",
        `/${sourcePath.replaceAll(".", "/")}`,
        "string",
      )
    }
  })

  it.each(agentResourceVariants)(
    "原资源结构变体 $id 参与整合校验",
    (variant) => {
      const input = agentInput()
      for (const source of Object.values(input.details)) {
        if ("live2D" in variant) change(source, "live2_d", variant.live2D)
        change(
          source,
          "partner_info.inter_knot_icon",
          variant.partnerInfo.interKnotIcon,
        )
        if ("iconPath" in variant.partnerInfo)
          change(source, "partner_info.icon_path", variant.partnerInfo.iconPath)
        if ("roleIcon" in variant.partnerInfo)
          change(source, "partner_info.role_icon", variant.partnerInfo.roleIcon)
      }
      const result = integrateAgent(input)
      expect(result.data.partnerInfo).toEqual(variant.partnerInfo)
      expect(result.details.zh!.partnerInfo).toEqual({})
      expectRoundtrip(result, input)
    },
  )

  it("档案可缺失字段与原空数组、空字符串分别保留", () => {
    const input = agentInput()
    change(input.details.zh, "partner_info", {
      inter_knot_icon: "raw/path.png",
      birthday: "",
      full_name: "",
      gender: "",
      impression_f: "",
      impression_m: "",
      impressions: [],
      profile_desc: "",
      stature: "",
      unlock_condition: [],
      trust_lv: {},
    })
    const result = integrateAgent(input)
    expect(result.details.en!.partnerInfo).toEqual({})
    expect(result.details.zh!.partnerInfo).toEqual({
      birthday: "",
      fullName: "",
      gender: "",
      impressionF: "",
      impressionM: "",
      impressions: [],
      profileDesc: "",
      stature: "",
      unlockCondition: [],
      trustLv: {},
    })
    expectRoundtrip(result, input)
  })

  it.each(strategyVariants.map((value) => ({ value })))(
    "strategy 变体 %# 原样保留",
    ({ value }) => {
      const input = agentInput()
      change(input.details.zh, "strategy", value)
      const result = integrateAgent(input)
      expect(result.details.zh!.strategy).toEqual(value)
      expectRoundtrip(result, input)
    },
  )

  it.each(specialElementVariants.map((value) => ({ value })))(
    "特殊属性变体 %# 不生成分类 ID",
    ({ value }) => {
      const input = agentInput()
      change(input.details.zh, "special_element_type", value)
      const result = integrateAgent(input)
      expect(result.details.zh!.specialElementType).toEqual(value)
      expect(result.data.classificationIds).not.toHaveProperty(
        "specialElementType",
      )
      expectRoundtrip(result, input)
    },
  )

  it.each(potentialVariants.map((value) => ({ value })))(
    "potential 变体 %# 原样保留",
    ({ value }) => {
      const input = agentInput()
      Object.values(input.details).forEach((source) =>
        change(source, "potential", value),
      )
      const result = integrateAgent(input)
      expect(result.data.potential).toEqual(value)
      expectRoundtrip(result, input)
    },
  )

  it.each(potentialDetailVariants.map((value) => ({ value })))(
    "potentialDetail 变体 %# 使用完整材料数组",
    ({ value }) => {
      const input = agentInput()
      const raw = Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          {
            id: entry.id,
            name: entry.name,
            desc: entry.desc,
            image: entry.image,
            level_show_name: entry.levelShowName,
            level: entry.level,
            ability_list: entry.abilityList,
            potential_materials: entry.potentialMaterials.map((item) => ({
              item_id: item.itemId,
              number: item.number,
            })),
          },
        ]),
      )
      change(input.details.zh, "potential_detail", raw)
      const result = integrateAgent(input)
      expect(result.details.zh!.potentialDetail).toEqual(value)
      expectRoundtrip(result, input)
    },
  )

  it.each(extraPropertyVariants.map((value) => ({ value })))(
    "extraProperty 变体 %# 不解释编码或换算",
    ({ value }) => {
      const input = agentInput()
      change(input.details.zh, "passive.level.1.extra_property", value)
      const result = integrateAgent(input)
      expect(result.details.zh!.passive.level["1"].extraProperty).toEqual(value)
      expectRoundtrip(result, input)
    },
  )

  it.each(attackDataVariants.map((value) => ({ value })))(
    "attackData 变体 %# 保留长度、原序和零",
    ({ value }) => {
      const input = agentInput()
      change(
        input.details.zh,
        "skill.g/~.description.1.param.0.param.1.attack_data",
        value,
      )
      const result = integrateAgent(input)
      expect(
        result.details.zh!.skill["g/~"].description[1].param![0].param!["1"]
          .attackData,
      ).toEqual(value)
      expectRoundtrip(result, input)
    },
  )

  it("仅模板参数行无数值表时完整保留，不计算文本", () => {
    const input = agentInput()
    change(
      input.details.zh,
      "skill.g/~.description.1.param.2",
      textOnlyParameterRow,
    )
    const result = integrateAgent(input)
    expect(result.details.zh!.skill["g/~"].description[1].param![2]).toEqual(
      textOnlyParameterRow,
    )
    expectRoundtrip(result, input)
  })
})

describe("运行时结构、身份、冲突与特殊自有 key", () => {
  it.each(["01", "-1", "1.0", "x", "1".repeat(33)])(
    "拒绝非法实体 ID %s",
    (entityId) => {
      expectFailure({ ...agentInput(), entityId }, "input", "/entityId")
    },
  )

  it.each([undefined, "900001", 900002, 900001.5, -1])(
    "拒绝错误详情身份 %j",
    (id) => {
      const input = agentInput()
      if (id === undefined) remove(input.details.en, "id")
      else change(input.details.en, "id", id)
      expectFailure(input, "en", "/id")
    },
  )

  it.each([null, [], "index", 0])(
    "索引记录要求普通对象：%j",
    (sourceRecord) => {
      expectFailure({ ...agentInput(), sourceRecord }, "index", "")
    },
  )

  it.each(["weapon_type", "element_type", "hit_type", "camp"])(
    "%s 校验分类 ID 集合与规范 key，不比较译名",
    (key) => {
      const input = agentInput()
      change(input.details.en, key, { "3": "different" })
      expectFailure(input, "en", `/${key}`, "分类 ID 集合")
      for (const invalid of ["01", "-1", "1e2", "1.0", "__proto__", "x"]) {
        change(input.details.en, key, Object.fromEntries([[invalid, "name"]]))
        expectFailure(input, "en", `/${key}/${invalid}`, "规范十进制")
      }
    },
  )

  it("分类与参数 ID 按数值排序，包括超出 JS 安全整数的合法字符串 key", () => {
    const input = agentInput()
    for (const source of Object.values(input.details))
      change(source, "camp", {
        "99999999999999999999999999999999": "",
        "9007199254740993": "",
        "10": "",
        "2": "",
      })
    const result = integrateAgent(input)
    expect(result.data.classificationIds.camp).toEqual([
      "2",
      "10",
      "9007199254740993",
      "99999999999999999999999999999999",
    ])
    expectRoundtrip(result, input)
  })

  it("单语言独有条目的已知字段可通过正式类型读取", () => {
    const input = agentInput()
    for (const path of [
      "skin.1",
      "skill.g/~",
      "skill_list.1",
      "extra_level.stage_key",
      "passive.level.1",
      "talent.stage_key",
    ])
      remove(input.details.en, path)
    const result = integrateAgent(input)
    const details = result.details.zh!
    expect(details.skin["1"].image).toBe("original_image")
    expect(details.skill["g/~"].material).toEqual({ stage_key: { "1": 0 } })
    expect(details.skillList["1"].elementType).toBe(203)
    expect(details.skillList["1"].hitType).toBe(101)
    expect(details.skillList["1"].potential).toEqual([])
    expect(details.extraLevel.stage_key.maxLevel).toBe(0)
    expect(details.extraLevel.stage_key.extra.prop_key.prop).toBe(0)
    expect(details.extraLevel.stage_key.extra.prop_key.value).toBe(0)
    expect(details.passive.level["1"].id).toBe(1)
    expect(details.passive.level["1"].level).toBe(0)
    expect(details.talent.stage_key.level).toBe(0)
    expectRoundtrip(result, input)
  })

  it.each(["locale", "navigation", "classification_ids", "classificationIds"])(
    "拒绝辅助字段 %s 重名",
    (key) => {
      const input = agentInput()
      change(input.details.en, key, {})
      expectFailure(input, "en", `/${key}`, "辅助字段重名")
    },
  )

  it.each([
    "codeName",
    "live2D",
    "partner_info.interKnotIcon",
    "partner_info.iconPath",
    "stats.critDmgRes",
    "level.low_stage.levelMax",
    "extra_level.stage_key.maxLevel",
    "skill_priority.0.avatarId",
    "skill_list.1.elementType",
    "passive.level.1.extraProperty",
    "fairy_recommend.partSub",
    "skill.g/~.description.1.param.0.param.1.attackData",
  ])("拒绝已登记目标名冲突 %s，即使原可选字段缺失", (path) => {
    const input = agentInput()
    change(input.details.zh, path, null)
    expectFailure(
      input,
      "zh",
      `/${path
        .split(".")
        .map((key) => key.replaceAll("~", "~0").replaceAll("/", "~1"))
        .join("/")}`,
      "改名冲突",
    )
  })

  it.each([
    ["strategy", { key: "x" }],
    ["strategy", null],
    ["strategy", [0]],
    ["special_element_type", []],
    ["special_element_type", { name: "x" }],
    ["special_element_type", null],
    ["potential", {}],
    ["potential", ["0"]],
    ["potential_detail", []],
    ["passive.level.1.extra_property", { "111": 0 }],
    ["passive.level.1.extra_property", { "111": { target: 0 } }],
    ["passive.level.1.potential", ["0"]],
    ["skill_list.1.potential", {}],
    ["skill.g/~.description", {}],
    ["skill.g/~.description", [null]],
    ["skill.g/~.description.1.param", {}],
    ["skill.g/~.description.1.param", [null]],
    ["skill.g/~.description.1.param.0.param", []],
    ["skill.g/~.description.1.param.0.param", { "01": parameter() }],
    ["skill.g/~.description.1.param.0.param", { "1": null }],
    ["skill.g/~.description.1.param.0.param.1.attack_data", ["0"]],
    ["partner_info.birthday", null],
    ["partner_info.impressions", ""],
    ["partner_info.trust_lv", []],
  ])("拒绝结构异常 %s %#", (path, value) => {
    const input = agentInput()
    change(input.details.zh, path, value)
    expect(() => integrateAgent(input)).toThrow(AgentIntegrationError)
  })

  it.each([
    "name",
    "icon",
    "rarity",
    "gender",
    "stats",
    "stats.attack",
    "stats.armor_growth",
    "level",
    "level.low_stage.materials",
    "level_exp",
    "skin",
    "skin.1.image",
    "skin.1.name",
    "extra_level",
    "extra_level.stage_key.max_level",
    "extra_level.stage_key.extra.prop_key.prop",
    "skill",
    "skill.g/~.material",
    "skill.g/~.description.0.name",
    "skill.g/~.description.0.potential",
    "skill.g/~.description.1.param.0.desc",
    "skill.g/~.description.1.param.0.potential",
    "skill.g/~.description.1.param.0.param.1.main",
    "skill.g/~.description.1.param.0.param.1.ether_purify",
    "skill_priority",
    "skill_priority.0.avatar_id",
    "skill_list",
    "skill_list.1.desc",
    "passive",
    "passive.materials",
    "passive.level.1.extra_property",
    "talent",
    "talent.stage_key.desc2",
    "fairy_recommend",
    "fairy_recommend.part4.format",
    "strategy",
    "potential",
    "potential_detail",
    "partner_info",
    "partner_info.inter_knot_icon",
    "special_element_type",
    "weapon_type",
    "element_type",
    "hit_type",
    "camp",
  ])("拒绝缺失必需字段 %s", (path) => {
    const input = agentInput()
    remove(input.details.zh, path)
    expectFailure(
      input,
      "zh",
      `/${path
        .split(".")
        .map((key) => key.replaceAll("~", "~0").replaceAll("/", "~1"))
        .join("/")}`,
      "缺失必需",
    )
  })

  it.each([
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    -0,
    undefined,
    1n,
    () => 1,
    Symbol("x"),
    new Date(),
    /x/u,
  ])("未知成员同样拒绝不可无损 JSON 往返值 %#", (value) => {
    const input = agentInput()
    change(input.details.en, "unknown_value", value)
    expectFailure(input, "en", "/unknown_value")
  })

  it("拒绝循环、稀疏数组、隐藏属性、访问器和继承来源，不执行 getter", () => {
    const input = agentInput()
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    change(input.details.zh, "unknown", cycle)
    expectFailure(input, "zh", "/unknown/self", "循环")
    change(input.details.zh, "unknown", Array.from({ length: 2 }))
    remove(input.details.zh, "unknown.0")
    expectFailure(input, "zh", "/unknown/0", "空洞")
    change(
      input.details.zh,
      "unknown",
      Object.defineProperty({}, "hidden", { value: 0 }),
    )
    expectFailure(input, "zh", "/unknown/hidden", "可枚举")
    let reads = 0
    change(
      input.details.zh,
      "unknown",
      Object.defineProperty({}, "getter", {
        enumerable: true,
        get() {
          reads++
          return 0
        },
      }),
    )
    expectFailure(input, "zh", "/unknown/getter", "数据属性")
    expect(reads).toBe(0)
    change(input.details.zh, "unknown", { [Symbol("hidden")]: 0 })
    expectFailure(input, "zh", "/unknown", "Symbol")
    change(input.details.zh, "unknown", Object.create({ inherited: 0 }))
    expectFailure(input, "zh", "/unknown", "普通 JSON")
    expectFailure(
      {
        ...agentInput(),
        details: Object.create({ zh: agentSource(), en: agentSource() }),
      },
      "input",
      "",
      "语言记录",
    )
  })

  it("特殊自有 key 不污染原型，未知容器不改名，导航 Pointer 正确转义", () => {
    const input = agentInput()
    for (const source of Object.values(input.details)) {
      for (const key of [
        "__proto__",
        "constructor",
        "toString",
        "a~1/~0",
        "basic_attack",
      ]) {
        change(source, `skill.${key}`, {
          material: {},
          description: [
            {
              name: "",
              potential: [],
              param: [
                {
                  name: "",
                  desc: "",
                  potential: [],
                  param: { "1": parameter() },
                },
              ],
            },
          ],
        })
        change(source, `extra_level.stage_key.extra.${key}`, {
          prop: 0,
          value: 0,
          name: "",
          format: "",
        })
      }
      change(
        source,
        "__proto__",
        JSON.parse('{"polluted":true,"attack_growth":0}'),
      )
      change(source, "stats.__proto__", { untouched_key: null })
      change(source, "constructor", null)
      change(source, "toString", [])
    }
    change(input.sourceRecord, "__proto__", { retained: true })
    const result = integrateAgent(input)
    expect(Object.hasOwn(result.details.zh!, "__proto__")).toBe(true)
    expect(Object.hasOwn(result.data.stats, "__proto__")).toBe(true)
    expect(Object.hasOwn(result.sourceRecord, "__proto__")).toBe(true)
    expect(Object.getPrototypeOf(result.details.zh!)).toBe(Object.prototype)
    expect(Object.prototype).not.toHaveProperty("polluted")
    const pointers = result.details.zh!.navigation.parameterRowsById["1"]
    expect(pointers).toEqual([
      "/skill/__proto__/description/0/param/0",
      "/skill/a~01~1~00/description/0/param/0",
      "/skill/basic_attack/description/0/param/0",
      "/skill/constructor/description/0/param/0",
      "/skill/g~1~0/description/1/param/0",
      "/skill/g~1~0/description/1/param/1",
      "/skill/toString/description/0/param/0",
    ])
    pointers.forEach((pointer) =>
      expect(resolvePointer(result.details.zh, pointer)).toHaveProperty(
        "param.1",
      ),
    )
    expectRoundtrip(result, input)
  })

  it("空段落参数数组和空行内参数表不产生伪参数", () => {
    const input = agentInput()
    change(input.details.zh, "skill.empty", {
      material: {},
      description: [
        { name: "", potential: [] },
        { name: "", potential: [], param: [] },
        {
          name: "",
          potential: [],
          param: [{ name: "", desc: "", potential: [], param: {} }],
        },
      ],
    })
    const result = integrateAgent(input)
    expect(result.details.zh!.navigation.parameterIdsByGroup.empty).toEqual([])
    expect(result.data.skill).not.toHaveProperty("empty")
    expectRoundtrip(result, input)
  })
})

describe("补充 JSON 与潜能边界", () => {
  it("可接受有限小数、null 原型对象及重复引用的 JSON 值", () => {
    const input = agentInput()
    const sharedReference = { own_key: 0.125 }
    change(
      input.details.zh,
      "unknown",
      Object.assign(Object.create(null), {
        a: sharedReference,
        b: sharedReference,
      }),
    )
    const result = integrateAgent(input)
    expect(result.details.zh).toHaveProperty("unknown", {
      a: { own_key: 0.125 },
      b: { own_key: 0.125 },
    })
    expectRoundtrip(result, {
      ...input,
      details: JSON.parse(JSON.stringify(input.details)),
    })
  })

  it("拒绝数组额外属性、自定义原型、配置空洞及语言记录访问器", () => {
    const input = agentInput()
    const array: number[] = []
    change(array, "extra", 0)
    change(input.details.zh, "unknown", array)
    expectFailure(input, "zh", "/unknown/extra", "额外成员")
    change(
      input.details.zh,
      "unknown",
      Object.setPrototypeOf([], {
        toJSON() {
          return 0
        },
      }),
    )
    expectFailure(input, "zh", "/unknown", "自定义原型")
    const sparse: string[] = ["zh", "en"]
    delete sparse[0]
    expectFailure(
      { ...agentInput(), detailLocales: sparse as ("zh" | "en")[] },
      "input",
      "/detailLocales/0",
      "空洞",
    )
    let reads = 0
    const details = Object.defineProperty({}, "zh", {
      enumerable: true,
      get() {
        reads++
        return agentSource()
      },
    })
    expectFailure({ ...agentInput(), details }, "input", "/zh", "数据属性")
    expect(reads).toBe(0)
  })

  it("潜能详情逐字段检查必需性、改名冲突与数组材料元素类型", () => {
    const raw = {
      id: 7,
      name: "",
      desc: "",
      image: "raw",
      level_show_name: "",
      level: 0,
      ability_list: [0, 1, 0],
      potential_materials: [
        { item_id: 9, number: 0 },
        { item_id: 9, number: 0 },
      ],
    }
    const input = agentInput()
    change(input.details.zh, "potential_detail.7", raw)
    let result = integrateAgent(input)
    expect(result.details.zh!.potentialDetail["7"].potentialMaterials).toEqual([
      { itemId: 9, number: 0 },
      { itemId: 9, number: 0 },
    ])
    expectRoundtrip(result, input)
    for (const path of [
      "id",
      "name",
      "desc",
      "image",
      "level_show_name",
      "level",
      "ability_list",
      "potential_materials",
      "potential_materials.0.item_id",
      "potential_materials.0.number",
    ]) {
      change(input.details.zh, "potential_detail.7", structuredClone(raw))
      remove(input.details.zh, `potential_detail.7.${path}`)
      expectFailure(
        input,
        "zh",
        `/potential_detail/7/${path.replaceAll(".", "/")}`,
        "缺失必需",
      )
    }
    for (const [path, value] of [
      ["ability_list", ["1"]],
      ["potential_materials", {}],
      ["potential_materials", [null]],
      ["potential_materials.0.item_id", "9"],
      ["potential_materials.0.number", null],
    ] as const) {
      change(input.details.zh, "potential_detail.7", structuredClone(raw))
      change(input.details.zh, `potential_detail.7.${path}`, value)
      expect(() => integrateAgent(input)).toThrow(AgentIntegrationError)
    }
    for (const key of [
      "levelShowName",
      "abilityList",
      "potentialMaterials",
      "potential_materials.0.itemId",
    ]) {
      change(input.details.zh, "potential_detail.7", structuredClone(raw))
      change(input.details.zh, `potential_detail.7.${key}`, null)
      expect(() => integrateAgent(input)).toThrow("改名冲突")
    }
    change(input.details.zh, "potential_detail.7", structuredClone(raw))
    change(input.details.zh, "potential_detail.7.unknown", { item_id: "keep" })
    change(
      input.details.zh,
      "potential_detail.7.potential_materials.0.new_key",
      [],
    )
    result = integrateAgent(input)
    expectRoundtrip(result, input)
  })
})
