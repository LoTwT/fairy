import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AgentName, DetailLocale, DriveDiscName } from "../src/index.ts"
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
  indexLoader: loaders.index,
}))
import {
  agentNames,
  driveDiscNames,
  loadIndex,
  loadAgentData,
  loadAgentDetails,
  loadAllAgents,
  loadDriveDiscData,
  loadDriveDiscDetails,
  loadAllDriveDiscs,
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
  it.each([
    "unknown",
    "1311",
    "31000",
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
    for (const loader of Object.values(loaders))
      expect(loader).not.toHaveBeenCalled()
  })
  it.each([
    undefined,
    null,
    1311,
    31000,
    {},
    ["Astra Yao"],
    new String("Astra Yao"),
  ])("rejects non-string name %s asynchronously", async (name) => {
    for (const read of [
      () => loadAgentData(name as AgentName),
      () => loadAgentDetails(name as AgentName, "zh"),
      () => loadDriveDiscData(name as DriveDiscName),
      () => loadDriveDiscDetails(name as DriveDiscName, "zh"),
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
      // 驱动盘全量不得顺带加载代理人或索引。
      for (const [key, loader] of Object.entries(loaders))
        if (!key.toLowerCase().includes("disc"))
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
    await expect(loadIndex()).rejects.toBe(error)
    await expect(loadAgentData("Astra Yao")).rejects.toBe(error)
    await expect(loadAgentDetails("Astra Yao", "zh")).rejects.toBe(error)
    await expect(loadAllAgents("zh")).rejects.toBe(error)
    await expect(loadDriveDiscData("Woodpecker Electro")).rejects.toBe(error)
    await expect(loadDriveDiscDetails("Woodpecker Electro", "zh")).rejects.toBe(
      error,
    )
    await expect(loadAllDriveDiscs("zh")).rejects.toBe(error)
  })
  it("rejects the full view if a later member's necessary detail fails", async () => {
    const agentError = new Error("missing later member")
    loaders.otherEn.mockRejectedValue(agentError)
    await expect(loadAllAgents("en")).rejects.toBe(agentError)
    const discError = new Error("missing later drive disc")
    loaders.otherDiscEn.mockRejectedValue(discError)
    await expect(loadAllDriveDiscs("en")).rejects.toBe(discError)
  })
})
