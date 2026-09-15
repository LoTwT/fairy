import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AgentName, DetailLocale } from "../src/index.ts"
import { supportedLanguages } from "../src/nanoka-identity.ts"

const loaders = vi.hoisted(() => ({
  data: vi.fn(),
  zh: vi.fn(),
  en: vi.fn(),
  index: vi.fn(),
  otherData: vi.fn(),
  otherZh: vi.fn(),
  otherEn: vi.fn(),
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
  indexLoader: loaders.index,
}))
import {
  agentNames,
  loadIndex,
  loadAgentData,
  loadAgentDetails,
  loadAllAgents,
} from "../src/index.ts"

beforeEach(() => {
  vi.resetAllMocks()
  loaders.index.mockResolvedValue({
    source: { inputs: [{ resource: "untouched" }] },
    agents: { "1311": { sourceRecord: { code: "Astra" } } },
  })
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
      agents: { "1311": { sourceRecord: { code: "Astra" } } },
    })
    for (const [key, loader] of Object.entries(loaders))
      if (key !== "index") expect(loader).not.toHaveBeenCalled()
  })
  it.each([
    "unknown",
    "1311",
    "astra yao",
    " Astra Yao",
    "Astra Yao ",
    "Astra",
    "__proto__",
    "constructor",
  ])("returns undefined for exact unknown string %s", async (name) => {
    expect(await loadAgentData(name as AgentName)).toBeUndefined()
    expect(await loadAgentDetails(name as AgentName, "zh")).toBeUndefined()
    for (const loader of Object.values(loaders))
      expect(loader).not.toHaveBeenCalled()
  })
  it.each([undefined, null, 1311, {}, ["Astra Yao"], new String("Astra Yao")])(
    "rejects non-string name %s asynchronously",
    async (name) => {
      await expect(loadAgentData(name as AgentName)).rejects.toBeInstanceOf(
        TypeError,
      )
      await expect(
        loadAgentDetails(name as AgentName, "zh"),
      ).rejects.toBeInstanceOf(TypeError)
    },
  )
  it.each([undefined, null, "zh-CN", "EN", "", 1, {}])(
    "rejects invalid locale %s even with unknown name",
    async (locale) => {
      await expect(
        loadAgentDetails("unknown" as AgentName, locale as DetailLocale),
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        loadAllAgents(locale as DetailLocale),
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
    expect((await loadIndex()).source.inputs[0].resource).toBe("untouched")
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
  it.each([
    new Error("missing file"),
    new SyntaxError("invalid JSON"),
    new Error("module load failed"),
  ])("propagates necessary load failure: %s", async (error) => {
    loaders.index.mockRejectedValue(error)
    loaders.data.mockRejectedValue(error)
    loaders.zh.mockRejectedValue(error)
    await expect(loadIndex()).rejects.toBe(error)
    await expect(loadAgentData("Astra Yao")).rejects.toBe(error)
    await expect(loadAgentDetails("Astra Yao", "zh")).rejects.toBe(error)
    await expect(loadAllAgents("zh")).rejects.toBe(error)
  })
  it("rejects the full view if a later member's necessary detail fails", async () => {
    const error = new Error("missing later member")
    loaders.otherEn.mockRejectedValue(error)
    await expect(loadAllAgents("en")).rejects.toBe(error)
  })
})
