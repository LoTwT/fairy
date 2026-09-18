import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  AgentName,
  BangbooName,
  DetailLocale,
  DriveDiscName,
  WEngineName,
} from "../src/index.ts"
import { supportedLanguages } from "../src/nanoka-identity.ts"

const loaders = vi.hoisted(() => ({
  data: vi.fn(),
  zh: vi.fn(),
  en: vi.fn(),
  index: vi.fn(),
  otherData: vi.fn(),
  otherZh: vi.fn(),
  otherEn: vi.fn(),
  discData: vi.fn(),
  discZh: vi.fn(),
  discEn: vi.fn(),
  otherDiscData: vi.fn(),
  otherDiscZh: vi.fn(),
  otherDiscEn: vi.fn(),
  wEngineData: vi.fn(),
  wEngineZh: vi.fn(),
  wEngineEn: vi.fn(),
  otherWEngineData: vi.fn(),
  otherWEngineZh: vi.fn(),
  otherWEngineEn: vi.fn(),
  bangbooData: vi.fn(),
  bangbooZh: vi.fn(),
  bangbooEn: vi.fn(),
  otherBangbooData: vi.fn(),
  otherBangbooZh: vi.fn(),
  otherBangbooEn: vi.fn(),
}))
vi.mock("../.generated/catalog.ts", () => ({
  agentNames: Object.freeze(["Astra Yao", "Soldier 0 - Anby"]),
  agentSourceIds: Object.freeze({
    "Astra Yao": "1311",
    "Soldier 0 - Anby": "1381",
  }),
  agentLoaders: {
    "1311": { data: loaders.data, zh: loaders.zh, en: loaders.en },
    "1381": {
      data: loaders.otherData,
      zh: loaders.otherZh,
      en: loaders.otherEn,
    },
  },
  driveDiscNames: Object.freeze(["Woodpecker Electro", "Puffer Electro"]),
  driveDiscSourceIds: Object.freeze({
    "Woodpecker Electro": "31000",
    "Puffer Electro": "31100",
  }),
  driveDiscLoaders: {
    "31000": {
      data: loaders.discData,
      zh: loaders.discZh,
      en: loaders.discEn,
    },
    "31100": {
      data: loaders.otherDiscData,
      zh: loaders.otherDiscZh,
      en: loaders.otherDiscEn,
    },
  },
  wEngineNames: Object.freeze(["[Lunar] Pleniluna", "[Reverb] Mark I"]),
  wEngineSourceIds: Object.freeze({
    "[Lunar] Pleniluna": "12001",
    "[Reverb] Mark I": "12004",
  }),
  wEngineLoaders: {
    "12001": {
      data: loaders.wEngineData,
      zh: loaders.wEngineZh,
      en: loaders.wEngineEn,
    },
    "12004": {
      data: loaders.otherWEngineData,
      zh: loaders.otherWEngineZh,
      en: loaders.otherWEngineEn,
    },
  },
  bangbooNames: Object.freeze(["Penguinboo", "Eous"]),
  bangbooSourceIds: Object.freeze({
    Penguinboo: "53001",
    Eous: "55098",
  }),
  bangbooLoaders: {
    "53001": {
      data: loaders.bangbooData,
      zh: loaders.bangbooZh,
      en: loaders.bangbooEn,
    },
    "55098": {
      data: loaders.otherBangbooData,
      zh: loaders.otherBangbooZh,
      en: loaders.otherBangbooEn,
    },
  },
  indexLoader: loaders.index,
}))
import {
  agentNames,
  bangbooNames,
  driveDiscNames,
  wEngineNames,
  loadIndex,
  loadAgentData,
  loadAgentDetails,
  loadAllAgents,
  loadBangbooData,
  loadBangbooDetails,
  loadAllBangboos,
  loadDriveDiscData,
  loadDriveDiscDetails,
  loadAllDriveDiscs,
  loadWEngineData,
  loadWEngineDetails,
  loadAllWEngines,
} from "../src/index.ts"

/** 代理人与驱动盘读取共享的成员档案：嵌套未知字段用于对象隔离检查。 */
function mockMemberRecords() {
  for (const [data, zh, en, id] of [
    [loaders.data, loaders.zh, loaders.en, 1311],
    [loaders.otherData, loaders.otherZh, loaders.otherEn, 1381],
  ] as const) {
    data.mockResolvedValue({ id, stats: { tags: ["original"] } })
    zh.mockResolvedValue({
      id,
      locale: "zh",
      name: "中文",
      skill: { entries: ["原文"] },
    })
    en.mockResolvedValue({
      id,
      locale: "en",
      name: "English",
      skill: { entries: ["original"] },
    })
  }
  for (const [data, zh, en, id] of [
    [loaders.discData, loaders.discZh, loaders.discEn, 31000],
    [loaders.otherDiscData, loaders.otherDiscZh, loaders.otherDiscEn, 31100],
  ] as const) {
    data.mockResolvedValue({
      id,
      icon: "icon.png",
      icon2: "icon2.png",
      unknown: { tags: ["original"] },
    })
    zh.mockResolvedValue({
      id,
      locale: "zh",
      name: "啄木鸟电音",
      desc2: "原文二件套",
      desc4: "原文四件套",
      story: "原文故事",
      extra: { entries: ["原文"] },
    })
    en.mockResolvedValue({
      id,
      locale: "en",
      name: "English Drive Disc",
      desc2: "original two-piece",
      desc4: "original four-piece",
      story: "original story",
      extra: { entries: ["original"] },
    })
  }
  for (const [data, zh, en, id] of [
    [loaders.wEngineData, loaders.wEngineZh, loaders.wEngineEn, 12001],
    [
      loaders.otherWEngineData,
      loaders.otherWEngineZh,
      loaders.otherWEngineEn,
      12004,
    ],
  ] as const) {
    data.mockResolvedValue({
      id,
      codeName: `Weapon_Example_${id}`,
      rarity: 2,
      icon: "icon.png",
      level: { "0": { exp: 30, rate: 0, rate2: 10000 } },
      stars: { "0": { starRate: 0, randRate: 0 } },
      materials: "10:7200",
      baseProperty: { value: 32 },
      randProperty: { value: 800 },
      classificationIds: { weaponType: ["1"] },
      unknown: { tags: ["original"] },
    })
    zh.mockResolvedValue({
      id,
      locale: "zh",
      name: "「月相」-望",
      desc: "原文介绍",
      desc2: "原文说明二",
      desc3: "原文说明三",
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
      talents: { "1": { name: "满月", desc: "原文天赋" } },
      extra: { entries: ["原文"] },
    })
    en.mockResolvedValue({
      id,
      locale: "en",
      name: "English W-Engine",
      desc: "original introduction",
      desc2: "original description two",
      desc3: "original description three",
      weaponType: { "1": "Attack" },
      baseProperty: { name: "Base ATK", name2: "Base ATK", format: "{0:0.#}" },
      randProperty: { name: "ATK", name2: "Percent ATK", format: "{0:0.#%}" },
      talents: { "1": { name: "Full Moon", desc: "original talent" } },
      extra: { entries: ["original"] },
    })
  }

  for (const [data, zh, en, id] of [
    [loaders.bangbooData, loaders.bangbooZh, loaders.bangbooEn, 53001],
    [
      loaders.otherBangbooData,
      loaders.otherBangbooZh,
      loaders.otherBangbooEn,
      55098,
    ],
  ] as const) {
    data.mockResolvedValue({
      id,
      rarity: 3,
      icon: "UI/Sprite/A1DynamicLoad/BangbooModGarage/UnPacker/BangbooRole/BangbooGarageRole12.png",
      stats: { endurance: 180, hpMax: 360, hpupgrade: 428397, attack: 50 },
      skillProp: {
        "5300101": {
          "1001": { main: 46200, growth: 4620, format: "%" },
          "elementAccumulationValue": 34600,
        },
      },
      level: {
        "1": {
          hpMax: 0,
          attack: 0,
          defence: 0,
          levelMax: 10,
          levelMin: 0,
          materials: { "10": 15000 },
          extra: { "20101": { prop: 20101, value: 0 } },
        },
      },
      unknown: { tags: ["original"] },
    })
    zh.mockResolvedValue({
      id,
      locale: "zh",
      codeName: "Penguinboo",
      name: "企鹅布",
      desc: "摇摇，晃晃。冰冰，凉凉。",
      skill: {
        a: {
          level: {
            "1": {
              name: "冰刀舞",
              desc: "原文说明",
              property: ["伤害倍率"],
              param: "{Skill:5300101, Prop:1001}|20秒",
            },
          },
        },
      },
      level: {
        "1": { extra: { "20101": { name: "暴击率", format: "{0:0.#%}" } } },
      },
      extra: { entries: ["原文"] },
    })
    en.mockResolvedValue({
      id,
      locale: "en",
      codeName: "Penguinboo",
      name: "Penguinboo",
      desc: "Widdly-waddly, icy and chilly.",
      skill: {
        a: {
          level: {
            "1": {
              name: "Ice Blade Dance",
              desc: "original description",
              property: ["DMG Multiplier"],
              param: "{Skill:5300101, Prop:1001}|20s",
            },
          },
        },
      },
      level: {
        "1": { extra: { "20101": { name: "CRIT Rate", format: "{0:0.#%}" } } },
      },
      extra: { entries: ["original"] },
    })
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  loaders.index.mockResolvedValue({
    format: "fairy-nanoka-integrated/v3",
    source: { inputs: [{ resource: "untouched" }] },
    entities: {
      agents: { members: { "1311": { sourceRecord: { code: "Astra" } } } },
    },
  })
  mockMemberRecords()
})

describe("public readers", () => {
  it("loads only the requested index/data/locale without prerequisites", async () => {
    expect(await loadAgentData("Astra Yao")).toMatchObject({ id: 1311 })
    expect(loaders.index).not.toHaveBeenCalled()
    expect(loaders.zh).not.toHaveBeenCalled()
    expect(await loadAgentDetails("Soldier 0 - Anby", "en")).toMatchObject({
      id: 1381,
      locale: "en",
    })
    expect(loaders.otherData).not.toHaveBeenCalled()
    expect(loaders.otherZh).not.toHaveBeenCalled()
    vi.clearAllMocks()
    expect(await loadIndex()).toMatchObject({
      entities: {
        agents: { members: { "1311": { sourceRecord: { code: "Astra" } } } },
      },
    })
    for (const [key, loader] of Object.entries(loaders))
      if (key !== "index") expect(loader).not.toHaveBeenCalled()
  })
  it("loads only the requested drive disc data/locale without prerequisites or agent reads", async () => {
    expect(await loadDriveDiscData("Woodpecker Electro")).toMatchObject({
      id: 31000,
    })
    expect(loaders.index).not.toHaveBeenCalled()
    expect(loaders.discZh).not.toHaveBeenCalled()
    expect(loaders.discEn).not.toHaveBeenCalled()
    expect(await loadDriveDiscDetails("Puffer Electro", "en")).toMatchObject({
      id: 31100,
      locale: "en",
    })
    expect(loaders.otherDiscData).not.toHaveBeenCalled()
    expect(loaders.otherDiscZh).not.toHaveBeenCalled()
    for (const [key, loader] of Object.entries(loaders))
      if (key !== "discData" && key !== "otherDiscEn")
        expect(loader).not.toHaveBeenCalled()
  })
  it("loads only the requested WEngine data/locale without prerequisites or other categories", async () => {
    expect(await loadWEngineData("[Lunar] Pleniluna")).toMatchObject({
      id: 12001,
    })
    expect(loaders.index).not.toHaveBeenCalled()
    expect(loaders.wEngineZh).not.toHaveBeenCalled()
    expect(loaders.wEngineEn).not.toHaveBeenCalled()
    expect(await loadWEngineDetails("[Reverb] Mark I", "en")).toMatchObject({
      id: 12004,
      locale: "en",
    })
    expect(loaders.otherWEngineData).not.toHaveBeenCalled()
    expect(loaders.otherWEngineZh).not.toHaveBeenCalled()
    for (const [key, loader] of Object.entries(loaders))
      if (key !== "wEngineData" && key !== "otherWEngineEn")
        expect(loader).not.toHaveBeenCalled()
  })
  it("loads only the requested bangboo data/locale without prerequisites or other categories", async () => {
    expect(await loadBangbooData("Penguinboo")).toMatchObject({ id: 53001 })
    expect(loaders.index).not.toHaveBeenCalled()
    expect(loaders.bangbooZh).not.toHaveBeenCalled()
    expect(loaders.bangbooEn).not.toHaveBeenCalled()
    expect(await loadBangbooDetails("Eous", "en")).toMatchObject({
      id: 55098,
      locale: "en",
    })
    expect(loaders.otherBangbooData).not.toHaveBeenCalled()
    expect(loaders.otherBangbooZh).not.toHaveBeenCalled()
    for (const [key, loader] of Object.entries(loaders))
      if (key !== "bangbooData" && key !== "otherBangbooEn")
        expect(loader).not.toHaveBeenCalled()
  })
  it.each([
    "unknown",
    "1311",
    "31000",
    "12001",
    "53001",
    "astra yao",
    " Astra Yao",
    "Astra Yao ",
    "Astra",
    "__proto__",
    "constructor",
  ])("returns undefined for exact unknown string %s", async (name) => {
    expect(await loadAgentData(name as AgentName)).toBeUndefined()
    expect(await loadAgentDetails(name as AgentName, "zh")).toBeUndefined()
    expect(await loadDriveDiscData(name as DriveDiscName)).toBeUndefined()
    expect(
      await loadDriveDiscDetails(name as DriveDiscName, "zh"),
    ).toBeUndefined()
    expect(await loadWEngineData(name as WEngineName)).toBeUndefined()
    expect(await loadWEngineDetails(name as WEngineName, "zh")).toBeUndefined()
    expect(await loadBangbooData(name as BangbooName)).toBeUndefined()
    expect(await loadBangbooDetails(name as BangbooName, "zh")).toBeUndefined()
    for (const loader of Object.values(loaders))
      expect(loader).not.toHaveBeenCalled()
  })
  it.each([
    undefined,
    null,
    1311,
    31000,
    12001,
    {},
    ["Astra Yao"],
    new String("Astra Yao"),
  ])("rejects non-string name %s asynchronously", async (name) => {
    for (const read of [
      () => loadAgentData(name as AgentName),
      () => loadAgentDetails(name as AgentName, "zh"),
      () => loadDriveDiscData(name as DriveDiscName),
      () => loadDriveDiscDetails(name as DriveDiscName, "zh"),
      () => loadWEngineData(name as WEngineName),
      () => loadWEngineDetails(name as WEngineName, "zh"),
      () => loadBangbooData(name as BangbooName),
      () => loadBangbooDetails(name as BangbooName, "zh"),
    ])
      await expect(read()).rejects.toBeInstanceOf(TypeError)
  })
  it.each([undefined, null, "zh-CN", "EN", "", 1, {}])(
    "rejects invalid locale %s even with unknown name",
    async (locale) => {
      await expect(
        loadAgentDetails("unknown" as AgentName, locale as DetailLocale),
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        loadAllAgents(locale as DetailLocale),
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        loadDriveDiscDetails(
          "unknown" as DriveDiscName,
          locale as DetailLocale,
        ),
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        loadAllDriveDiscs(locale as DetailLocale),
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        loadWEngineDetails("unknown" as WEngineName, locale as DetailLocale),
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        loadAllWEngines(locale as DetailLocale),
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        loadBangbooDetails("unknown" as BangbooName, locale as DetailLocale),
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        loadAllBangboos(locale as DetailLocale),
      ).rejects.toBeInstanceOf(TypeError)
      for (const loader of Object.values(loaders))
        expect(loader).not.toHaveBeenCalled()
    },
  )
  it.each(supportedLanguages)(
    "loads the full separated %s view with English keys",
    async (locale) => {
      const all = await loadAllAgents(locale)
      expect(Object.keys(all)).toEqual(agentNames)
      expect(Object.keys(all["Astra Yao"])).toEqual(["data", "details"])
      expect(all["Astra Yao"].details.locale).toBe(locale)
      expect(loaders.index).not.toHaveBeenCalled()
      expect(loaders.data).toHaveBeenCalledTimes(1)
      expect(loaders.otherData).toHaveBeenCalledTimes(1)
      expect(loaders[locale]).toHaveBeenCalledTimes(1)
      expect(loaders[locale === "zh" ? "en" : "zh"]).not.toHaveBeenCalled()
      // 代理人全量不得顺带加载驱动盘或索引。
      for (const [key, loader] of Object.entries(loaders))
        if (key.toLowerCase().includes("disc") || key === "index")
          expect(loader).not.toHaveBeenCalled()
    },
  )
  it.each(supportedLanguages)(
    "loads the full separated drive disc %s view with English keys",
    async (locale) => {
      const all = await loadAllDriveDiscs(locale)
      expect(Object.keys(all)).toEqual(driveDiscNames)
      expect(Object.keys(all["Woodpecker Electro"])).toEqual([
        "data",
        "details",
      ])
      expect(all["Woodpecker Electro"].details.locale).toBe(locale)
      expect(loaders.index).not.toHaveBeenCalled()
      expect(loaders.discData).toHaveBeenCalledTimes(1)
      expect(loaders.otherDiscData).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "discZh" : "discEn"],
      ).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "otherDiscZh" : "otherDiscEn"],
      ).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "discEn" : "discZh"],
      ).not.toHaveBeenCalled()
      // 驱动盘全量不得顺带加载代理人、WEngine 或索引。
      for (const [key, loader] of Object.entries(loaders))
        if (
          !key.toLowerCase().includes("disc") &&
          !key.toLowerCase().includes("wengine")
        )
          expect(loader).not.toHaveBeenCalled()
    },
  )
  it.each(supportedLanguages)(
    "loads the full separated WEngine %s view with English keys",
    async (locale) => {
      const all = await loadAllWEngines(locale)
      expect(Object.keys(all)).toEqual(wEngineNames)
      expect(Object.keys(all["[Lunar] Pleniluna"])).toEqual(["data", "details"])
      expect(all["[Lunar] Pleniluna"].details.locale).toBe(locale)
      expect(loaders.index).not.toHaveBeenCalled()
      expect(loaders.wEngineData).toHaveBeenCalledTimes(1)
      expect(loaders.otherWEngineData).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "wEngineZh" : "wEngineEn"],
      ).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "otherWEngineZh" : "otherWEngineEn"],
      ).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "wEngineEn" : "wEngineZh"],
      ).not.toHaveBeenCalled()
      // WEngine 全量不得顺带加载代理人、驱动盘或索引。
      for (const [key, loader] of Object.entries(loaders))
        if (!key.toLowerCase().includes("wengine"))
          expect(loader).not.toHaveBeenCalled()
    },
  )
  it.each(supportedLanguages)(
    "loads the full separated bangboo %s view with English keys",
    async (locale) => {
      const all = await loadAllBangboos(locale)
      expect(Object.keys(all)).toEqual(bangbooNames)
      expect(Object.keys(all["Penguinboo"])).toEqual(["data", "details"])
      expect(all["Penguinboo"].details.locale).toBe(locale)
      expect(all["Penguinboo"].details.name).toBe(
        locale === "zh" ? "企鹅布" : "Penguinboo",
      )
      expect(all["Eous"].details.locale).toBe(locale)
      expect(loaders.index).not.toHaveBeenCalled()
      expect(loaders.bangbooData).toHaveBeenCalledTimes(1)
      expect(loaders.otherBangbooData).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "bangbooZh" : "bangbooEn"],
      ).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "otherBangbooZh" : "otherBangbooEn"],
      ).toHaveBeenCalledTimes(1)
      expect(
        loaders[locale === "zh" ? "bangbooEn" : "bangbooZh"],
      ).not.toHaveBeenCalled()
      // 邦布全量不得顺带加载代理人、驱动盘、WEngine 或索引。
      for (const [key, loader] of Object.entries(loaders))
        if (!key.toLowerCase().includes("bangboo"))
          expect(loader).not.toHaveBeenCalled()
    },
  )
  it("isolates deeply nested mutations across sequential/concurrent and full/single calls", async () => {
    const [one, two] = await Promise.all([
      loadAgentData("Astra Yao"),
      loadAgentData("Astra Yao"),
    ])
    one!.stats.tags.push("changed")
    expect(two!.stats.tags).toEqual(["original"])
    const index = await loadIndex()
    index.source.inputs[0].resource = "changed"
    index.entities.agents.members["1311"].sourceRecord.code = "changed"
    const reloaded = await loadIndex()
    expect(reloaded.source.inputs[0].resource).toBe("untouched")
    expect(reloaded.entities.agents.members["1311"].sourceRecord.code).toBe(
      "Astra",
    )
    const details = await loadAgentDetails("Astra Yao", "zh")
    ;(details!.skill as any).entries.push("changed")
    const all = await loadAllAgents("zh")
    expect((all["Astra Yao"].details.skill as any).entries).toEqual(["原文"])
    all["Astra Yao"].data.stats.tags.push("changed")
    ;(all["Astra Yao"].details.skill as any).entries.push("changed")
    expect((await loadAgentData("Astra Yao"))!.stats.tags).toEqual(["original"])
    expect((await loadAllAgents("zh"))["Astra Yao"]).toEqual({
      data: two,
      details: await loadAgentDetails("Astra Yao", "zh"),
    })
    expect(() => (agentNames as AgentName[]).pop()).toThrow(TypeError)
  })
  it("isolates drive disc mutations across sequential/concurrent and full/single calls", async () => {
    const [one, two] = await Promise.all([
      loadDriveDiscData("Woodpecker Electro"),
      loadDriveDiscData("Woodpecker Electro"),
    ])
    ;(one!.unknown as { tags: string[] }).tags.push("changed")
    expect((two!.unknown as { tags: string[] }).tags).toEqual(["original"])
    const details = await loadDriveDiscDetails("Woodpecker Electro", "zh")
    ;(details!.extra as any).entries.push("changed")
    const all = await loadAllDriveDiscs("zh")
    expect((all["Woodpecker Electro"].details.extra as any).entries).toEqual([
      "原文",
    ])
    ;(all["Woodpecker Electro"].data.unknown as { tags: string[] }).tags.push(
      "changed",
    )
    ;(all["Woodpecker Electro"].details.extra as any).entries.push("changed")
    expect(
      (await loadDriveDiscData("Woodpecker Electro"))!.unknown,
    ).toMatchObject({ tags: ["original"] })
    expect((await loadAllDriveDiscs("zh"))["Woodpecker Electro"]).toEqual({
      data: two,
      details: await loadDriveDiscDetails("Woodpecker Electro", "zh"),
    })
    expect(() => (driveDiscNames as DriveDiscName[]).pop()).toThrow(TypeError)
  })
  it("isolates WEngine mutations across sequential/concurrent and full/single calls", async () => {
    const [one, two] = await Promise.all([
      loadWEngineData("[Lunar] Pleniluna"),
      loadWEngineData("[Lunar] Pleniluna"),
    ])
    ;(one!.unknown as { tags: string[] }).tags.push("changed")
    expect((two!.unknown as { tags: string[] }).tags).toEqual(["original"])
    one!.level["0"].exp = 0
    expect((await loadWEngineData("[Lunar] Pleniluna"))!.level["0"].exp).toBe(
      30,
    )
    const details = await loadWEngineDetails("[Lunar] Pleniluna", "zh")
    ;(details!.extra as any).entries.push("changed")
    const all = await loadAllWEngines("zh")
    expect((all["[Lunar] Pleniluna"].details.extra as any).entries).toEqual([
      "原文",
    ])
    ;(all["[Lunar] Pleniluna"].data.unknown as { tags: string[] }).tags.push(
      "changed",
    )
    ;(all["[Lunar] Pleniluna"].details.extra as any).entries.push("changed")
    expect((await loadAllWEngines("zh"))["[Lunar] Pleniluna"]).toEqual({
      data: two,
      details: await loadWEngineDetails("[Lunar] Pleniluna", "zh"),
    })
    expect(() => (wEngineNames as WEngineName[]).pop()).toThrow(TypeError)
  })
  it("isolates bangboo mutations across sequential/concurrent and full/single calls", async () => {
    const [one, two] = await Promise.all([
      loadBangbooData("Penguinboo"),
      loadBangbooData("Penguinboo"),
    ])
    ;(one!.unknown as { tags: string[] }).tags.push("changed")
    expect((two!.unknown as { tags: string[] }).tags).toEqual(["original"])
    one!.level["1"].hpMax = 1
    expect((await loadBangbooData("Penguinboo"))!.level["1"].hpMax).toBe(0)
    const details = await loadBangbooDetails("Penguinboo", "zh")
    ;(details!.extra as any).entries.push("changed")
    const all = await loadAllBangboos("zh")
    expect((all["Penguinboo"].details.extra as any).entries).toEqual(["原文"])
    ;(all["Penguinboo"].data.unknown as { tags: string[] }).tags.push("changed")
    ;(all["Penguinboo"].details.extra as any).entries.push("changed")
    expect((await loadAllBangboos("zh"))["Penguinboo"]).toEqual({
      data: two,
      details: await loadBangbooDetails("Penguinboo", "zh"),
    })
    expect(() => (bangbooNames as BangbooName[]).pop()).toThrow(TypeError)
  })
  it.each([
    new Error("missing file"),
    new SyntaxError("invalid JSON"),
    new Error("module load failed"),
  ])("propagates necessary load failure: %s", async (error) => {
    loaders.index.mockRejectedValue(error)
    loaders.data.mockRejectedValue(error)
    loaders.zh.mockRejectedValue(error)
    loaders.discData.mockRejectedValue(error)
    loaders.discZh.mockRejectedValue(error)
    loaders.wEngineData.mockRejectedValue(error)
    loaders.wEngineZh.mockRejectedValue(error)
    loaders.bangbooData.mockRejectedValue(error)
    loaders.bangbooZh.mockRejectedValue(error)
    await expect(loadIndex()).rejects.toBe(error)
    await expect(loadAgentData("Astra Yao")).rejects.toBe(error)
    await expect(loadAgentDetails("Astra Yao", "zh")).rejects.toBe(error)
    await expect(loadAllAgents("zh")).rejects.toBe(error)
    await expect(loadDriveDiscData("Woodpecker Electro")).rejects.toBe(error)
    await expect(loadDriveDiscDetails("Woodpecker Electro", "zh")).rejects.toBe(
      error,
    )
    await expect(loadAllDriveDiscs("zh")).rejects.toBe(error)
    await expect(loadWEngineData("[Lunar] Pleniluna")).rejects.toBe(error)
    await expect(loadWEngineDetails("[Lunar] Pleniluna", "zh")).rejects.toBe(
      error,
    )
    await expect(loadAllWEngines("zh")).rejects.toBe(error)
    await expect(loadBangbooData("Penguinboo")).rejects.toBe(error)
    await expect(loadBangbooDetails("Penguinboo", "zh")).rejects.toBe(error)
    await expect(loadAllBangboos("zh")).rejects.toBe(error)
  })
  it("rejects the full view if a later member's necessary detail fails", async () => {
    const agentError = new Error("missing later member")
    loaders.otherEn.mockRejectedValue(agentError)
    await expect(loadAllAgents("en")).rejects.toBe(agentError)
    const discError = new Error("missing later drive disc")
    loaders.otherDiscEn.mockRejectedValue(discError)
    await expect(loadAllDriveDiscs("en")).rejects.toBe(discError)
    const wEngineError = new Error("missing later WEngine")
    loaders.otherWEngineEn.mockRejectedValue(wEngineError)
    await expect(loadAllWEngines("en")).rejects.toBe(wEngineError)
    const bangbooError = new Error("missing later bangboo")
    loaders.otherBangbooEn.mockRejectedValue(bangbooError)
    await expect(loadAllBangboos("en")).rejects.toBe(bangbooError)
  })
})
