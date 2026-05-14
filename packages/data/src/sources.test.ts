import { describe, expect, it } from "vitest"
import {
  assertDiscoveryOnlyGameData,
  buildSourceDocument,
  buildSourceRef,
  createEmptyGameData,
  dataSourceDescriptors,
  getDataSourceDescriptor,
} from "./index"

const parsedAt = "2026-05-05T03:30:00.000Z"

function createDiscoveryGameData() {
  const sources = dataSourceDescriptors.map((descriptor, index) => {
    const options = {
      sourceVersion: `discovery-${index}`,
      parsedAt,
    }

    if (descriptor.kind !== "excel")
      return buildSourceDocument(descriptor, options)

    return buildSourceDocument(descriptor, {
      ...options,
      fileName: "data/source/excel/data.xlsx",
    })
  })

  return createEmptyGameData({
    gameVersion: "ZZZ-live",
    dataVersion: "data-discovery-v0.1.0",
    sourceVersion: "source-discovery-v0.1.0",
    generatedAt: parsedAt,
    sources,
  })
}

describe("@randomplay/data source discovery skeleton", () => {
  it("keeps source descriptor ids unique", () => {
    const ids = dataSourceDescriptors.map(source => source.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("marks every current source as not formal-data ready", () => {
    expect(dataSourceDescriptors).not.toHaveLength(0)
    expect(dataSourceDescriptors.every(source => !source.formalDataReady)).toBe(true)
  })

  it("builds SourceDocument metadata that validates against @randomplay/core", () => {
    const descriptor = getDataSourceDescriptor("mihoyo-zzz-critical-assault")
    const sourceDocument = buildSourceDocument(descriptor, {
      sourceVersion: "etag:0E83857DC32EB629AC2FE1208C88796E",
      fetchedAt: "2026-05-05T03:03:12.000Z",
      parsedAt,
      gameVersion: "ZZZ-live",
      licenseNote: "cleaned data only; source review required before redistribution",
    })

    expect(sourceDocument).toMatchObject({
      id: "mihoyo-zzz-critical-assault",
      kind: "mihoyoWiki",
      url: "https://baike.mihoyo.com/zzz/wiki/channel/map/13/108",
      parserVersion: "@randomplay/data-source-skeleton-v0.1.0",
    })
  })

  it("builds SourceRef anchors for future cleaned rows", () => {
    const sourceRef = buildSourceRef(
      getDataSourceDescriptor("buhflipexplode-zzz-da"),
      {
        sourceVersion: "etag:69f8c67e-13c0",
        sourceAnchor: "da-versions.json#versionEnemies[0]",
        dataPath: "enemies.deadlyAssault[0]",
      },
    )

    expect(sourceRef).toEqual({
      sourceId: "buhflipexplode-zzz-da",
      sourceVersion: "etag:69f8c67e-13c0",
      sourceAnchor: "da-versions.json#versionEnemies[0]",
      dataPath: "enemies.deadlyAssault[0]",
    })
  })

  it("creates schema-valid discovery-only GameData without formal rows", () => {
    const gameData = createDiscoveryGameData()

    expect(gameData.sources).toHaveLength(dataSourceDescriptors.length)
    expect(() => assertDiscoveryOnlyGameData(gameData)).not.toThrow()
  })

  it.each([
    [
      "formal row",
      (gameData: ReturnType<typeof createDiscoveryGameData>) => {
        gameData.agents.handWrittenAgent = {} as (typeof gameData.agents)[string]
      },
      "agents=1",
    ],
    [
      "Bangboo row",
      (gameData: ReturnType<typeof createDiscoveryGameData>) => {
        gameData.bangboos.handWrittenBangboo = {} as (typeof gameData.bangboos)[string]
      },
      "bangboos=1",
    ],
    [
      "Bangboo skill row",
      (gameData: ReturnType<typeof createDiscoveryGameData>) => {
        gameData.bangbooSkills.handWrittenBangbooSkill = {} as (typeof gameData.bangbooSkills)[string]
      },
      "bangbooSkills=1",
    ],
    [
      "rule table",
      (gameData: ReturnType<typeof createDiscoveryGameData>) => {
        gameData.rules.manualRule = { multiplier: 1.2 }
      },
      "rules=1",
    ],
    [
      "field alias",
      (gameData: ReturnType<typeof createDiscoveryGameData>) => {
        gameData.aliases.fields.hpMax = "maxHp"
      },
      "aliases.fields=1",
    ],
    [
      "enum alias",
      (gameData: ReturnType<typeof createDiscoveryGameData>) => {
        gameData.aliases.enumValues.physicalAnomaly = "assault"
      },
      "aliases.enumValues=1",
    ],
    [
      "source term alias",
      (gameData: ReturnType<typeof createDiscoveryGameData>) => {
        gameData.aliases.sourceTerms["暴击率"] = "critRate"
      },
      "aliases.sourceTerms=1",
    ],
  ])("rejects discovery-only GameData with a %s", (_, mutate, detail) => {
    const gameData = createDiscoveryGameData()

    mutate(gameData)

    expect(() => assertDiscoveryOnlyGameData(gameData)).toThrow(detail)
  })

  it("documents buhflipexplode retained live source assets for the next adapter", () => {
    const descriptor = getDataSourceDescriptor("buhflipexplode-zzz-da")

    expect(descriptor.discoveredAssets).toEqual(
      expect.arrayContaining([
        "data/source/raw/buhflipexplode/2026-05-05T0445Z/da/da-versions.live.json",
        "data/source/raw/buhflipexplode/2026-05-05T0445Z/assets/zzz/enemies.live.json",
        "data/source/raw/buhflipexplode/2026-05-05T0445Z/assets/zzz/buffs.live.json",
        "data/source/raw/buhflipexplode/2026-05-05T0445Z/algorithm-manifest.json",
      ]),
    )
    expect(descriptor.compliance.redistribution).toBe("cleanedDataOnly")
  })

  it("documents Mihoyo retained Deadly Assault detail assets for the next adapter", () => {
    const descriptor = getDataSourceDescriptor("mihoyo-zzz-critical-assault")

    expect(descriptor.status).toBe("readyForAdapter")
    expect(descriptor.discoveredAssets).toEqual(
      expect.arrayContaining([
        "data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/channel-108/periods.json",
        "data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/parsed/period-details.json",
        "data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/alignment/mihoyo-buhflipexplode.json",
      ]),
    )
    expect(descriptor.compliance.notes.join("\n")).toContain(
      "x-rpc-wiki_app: zzz",
    )
  })

  it("documents the retained Excel workbook audit without marking formal rows ready", () => {
    const descriptor = getDataSourceDescriptor("lo-user-excel")

    expect(descriptor.status).toBe("readyForAdapter")
    expect(descriptor.formalDataReady).toBe(false)
    expect(descriptor.discoveredAssets).toEqual(
      expect.arrayContaining([
        "data/source/excel/data.xlsx",
        "data/source/excel/workbook-audit.json",
      ]),
    )
    expect(descriptor.compliance.redistribution).toBe("cleanedDataOnly")
    expect(descriptor.compliance.notes.join("\n")).toContain(
      "do not infer typed modifiers",
    )
  })
})
