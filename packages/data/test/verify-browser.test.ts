import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { gzipSync } from "node:zlib"
import { chromium } from "playwright"
import type { Page } from "playwright"
import { build, createServer, preview } from "vite"
import { expect, it } from "vitest"
import { installPackedConsumer, listFiles } from "./fixtures/packed-consumer.ts"

/** 单个浏览器请求的证据：阶段、状态、字节数与来源 JSON 模块。 */
interface RequestEvidence {
  phase: string
  url: string
  status: number
  bytes: number
  gzipBytes: number
  sources: string[]
}

/** 一个验收阶段：动作结束后该阶段新增请求的 JSON 来源必须等于 sources（排序比较；空数组表示零请求；省略表示只做附加断言）。 */
interface ScenarioStep {
  name: string
  act: (page: Page) => Promise<void>
  sources?: string[]
  /** settle 后对该上下文全部请求的附加断言（跨阶段组合计数等）。 */
  after?: (requests: RequestEvidence[]) => void
}

it("consumes the offline-installed package in real Vite development and production browsers", async () => {
  const temporaryDirectory = realpathSync(
    mkdtempSync(join(tmpdir(), "fairy-browser-consumer-")),
  )
  const evidenceDirectory = process.env.FAIRY_CONSUMER_EVIDENCE_DIRECTORY
  const chunkSources: Record<string, string[]> = {}
  const reports: unknown[] = []
  try {
    const { consumerDirectory, packedRoot, tarballPath } =
      installPackedConsumer(temporaryDirectory, undefined, true)
    const integratedIndex = JSON.parse(
      readFileSync(join(packedRoot, "dist/integrated/index.json"), "utf8"),
    )
    const agentCount: number = integratedIndex.entities.agents.memberIds.length
    const driveDiscMemberIds: string[] =
      integratedIndex.entities["drive-discs"].memberIds
    const driveDiscCount = driveDiscMemberIds.length
    const directDiscId = driveDiscMemberIds[1] ?? driveDiscMemberIds[0]
    const wEngineMemberIds: string[] =
      integratedIndex.entities["w-engines"].memberIds
    const wEngineCount = wEngineMemberIds.length
    const directWEngineId = wEngineMemberIds[1] ?? wEngineMemberIds[0]
    const bangbooMemberIds: string[] =
      integratedIndex.entities["bangboos"].memberIds
    const bangbooCount = bangbooMemberIds.length
    const directBangbooId = bangbooMemberIds[1] ?? bangbooMemberIds[0]
    const monsterMemberIds: string[] =
      integratedIndex.entities["monsters"].memberIds
    const monsterCount = monsterMemberIds.length
    const directMonsterId = monsterMemberIds[1] ?? monsterMemberIds[0]
    const shiyuMemberIds: string[] = integratedIndex.entities["shiyu"].memberIds
    const shiyuCount = shiyuMemberIds.length
    const directShiyuId = shiyuMemberIds[1] ?? shiyuMemberIds[0]
    const bossMemberIds: string[] = integratedIndex.entities["boss"].memberIds
    const bossCount = bossMemberIds.length
    const directBossId = bossMemberIds[1] ?? bossMemberIds[0]
    const simulMemberIds: string[] = integratedIndex.entities["simul"].memberIds
    const simulCount = simulMemberIds.length
    const directSimulId = simulMemberIds[1] ?? simulMemberIds[0]
    // 构建模块图应包含两类导入表引用的全部 JSON：按已验证索引逐类别推导，不使用固定文件总数。
    const publishedEntities = integratedIndex.entities as Record<
      string,
      { memberIds: string[]; detailLocales: string[] }
    >
    const expectedGraph = [
      "index.json",
      "definitions/effects/starter.json",
      "definitions/effects/automatic.json",
      "definitions/effects/static.json",
      "definitions/effects/static-catalog.json",
      "definitions/effects/static-coverage.json",
      ...Object.entries(publishedEntities).flatMap(([category, entity]) =>
        entity.memberIds.flatMap((id) => [
          `${category}/${id}/data.json`,
          ...entity.detailLocales.map(
            (locale) => `${category}/${id}/details.${locale}.json`,
          ),
        ]),
      ),
    ].toSorted()
    writeFileSync(
      join(consumerDirectory, "index.html"),
      '<!doctype html><html><head><title>Fairy consumer</title><link rel="icon" href="data:,"></head><body><script type="module" src="/main.js"></script></body></html>',
    )
    writeFileSync(
      join(consumerDirectory, "main.js"),
      `import * as api from "@randomplay/data"
globalThis.fairy = api
globalThis.fairyStatic = async () => {
  const [definitions, catalog, coverage, engine] = await Promise.all([
    import("@randomplay/data/definitions/effects/static.json"),
    import("@randomplay/data/definitions/effects/static-catalog.json"),
    import("@randomplay/data/definitions/effects/static-coverage.json"),
    import("@randomplay/effects"),
  ])
  const result = engine.calculateStaticDamageFromCatalog({ ...${readFileSync(new URL("./fixtures/static-catalog-consumer.json", import.meta.url), "utf8")}, definitions: definitions.default, catalog: catalog.default })
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return { rate: result.value.criticalRate, expected: result.value.expected, nonCritical: result.value.nonCritical, records: coverage.default.summary.rawEffects }
}
globalThis.fairyDefinitions = {
  starter: () => import("@randomplay/data/definitions/effects/starter.json"),
  automatic: () => import("@randomplay/data/definitions/effects/automatic.json"),
}
globalThis.fairyDirectDriveDisc = {
  data: () => import("@randomplay/data/integrated/drive-discs/${directDiscId}/data.json"),
  zh: () => import("@randomplay/data/integrated/drive-discs/${directDiscId}/details.zh.json"),
}
globalThis.fairyDirectWEngine = {
  data: () => import("@randomplay/data/integrated/w-engines/${directWEngineId}/data.json"),
  zh: () => import("@randomplay/data/integrated/w-engines/${directWEngineId}/details.zh.json"),
}
globalThis.fairyDirectBangboo = {
  data: () => import("@randomplay/data/integrated/bangboos/${directBangbooId}/data.json"),
  zh: () => import("@randomplay/data/integrated/bangboos/${directBangbooId}/details.zh.json"),
}
globalThis.fairyDirectMonster = {
  data: () => import("@randomplay/data/integrated/monsters/${directMonsterId}/data.json"),
  zh: () => import("@randomplay/data/integrated/monsters/${directMonsterId}/details.zh.json"),
}
globalThis.fairyDirectShiyu = {
  data: () => import("@randomplay/data/integrated/shiyu/${directShiyuId}/data.json"),
  zh: () => import("@randomplay/data/integrated/shiyu/${directShiyuId}/details.zh.json"),
}
globalThis.fairyDirectBoss = {
  data: () => import("@randomplay/data/integrated/boss/${directBossId}/data.json"),
  zh: () => import("@randomplay/data/integrated/boss/${directBossId}/details.zh.json"),
}
globalThis.fairyDirectSimul = {
  data: () => import("@randomplay/data/integrated/simul/${directSimulId}/data.json"),
  zh: () => import("@randomplay/data/integrated/simul/${directSimulId}/details.zh.json"),
}
document.body.append("ready")
`,
    )
    await build({
      root: consumerDirectory,
      configFile: false,
      logLevel: "error",
      build: { manifest: true },
      plugins: [
        {
          name: "record-json-chunks",
          generateBundle(_options, bundle) {
            for (const [file, output] of Object.entries(bundle)) {
              if (output.type === "chunk")
                chunkSources[file] = Object.keys(output.modules).flatMap(
                  (id) => {
                    const match = id.match(
                      /\/dist\/(integrated|definitions)\/(.+\.json)$/u,
                    )
                    return match
                      ? [
                          match[1] === "definitions"
                            ? `definitions/${match[2]}`
                            : match[2],
                        ]
                      : []
                  },
                )
            }
          },
        },
      ],
    })
    expect(Object.values(chunkSources).flat().toSorted()).toEqual(expectedGraph)
    const browser = await chromium.launch({ headless: true })
    try {
      for (const mode of ["development", "production"] as const) {
        const server =
          mode === "development"
            ? await createServer({
                root: consumerDirectory,
                configFile: false,
                logLevel: "error",
                server: { host: "127.0.0.1", port: 0 },
              })
            : await preview({
                root: consumerDirectory,
                configFile: false,
                logLevel: "error",
                preview: { host: "127.0.0.1", port: 0 },
              })
        if ("listen" in server) await server.listen()
        const url = server.resolvedUrls!.local[0]
        try {
          // 两个独立上下文各自冷启动：本类别首个有效调用之前未加载另一类别任何文件，
          // 已加载缓存不会掩盖串读；上下文整体请求集合分别证明类别边界。
          for (const scenario of defineScenarios({
            agentCount,
            driveDiscCount,
            directDiscId,
            wEngineCount,
            directWEngineId,
            bangbooCount,
            directBangbooId,
            monsterCount,
            directMonsterId,
            shiyuCount,
            directShiyuId,
            bossCount,
            directBossId,
            simulCount,
            directSimulId,
          })) {
            const context = await browser.newContext()
            const page = await context.newPage()
            const errors: string[] = []
            page.on("pageerror", (error) => errors.push(error.message))
            const requests: RequestEvidence[] = []
            const pending: Promise<void>[] = []
            let phase = "initial"
            page.on("response", (response) => {
              const responsePhase = phase
              pending.push(
                (async () => {
                  const body = await response.body()
                  const path = new URL(response.url()).pathname
                  // Production uses build module provenance. Dev pre-bundled chunks
                  // preserve source comments; raw module requests (direct subpath
                  // imports) carry no comment and are identified by request path.
                  const sources =
                    mode === "production"
                      ? (chunkSources[path.replace(/^\//u, "")] ?? [])
                      : devModuleSources(body.toString(), path)
                  requests.push({
                    phase: responsePhase,
                    url: response.url(),
                    status: response.status(),
                    bytes: body.length,
                    gzipBytes: gzipSync(body).length,
                    sources,
                  })
                })(),
              )
            })
            async function settle() {
              await page.waitForLoadState("networkidle")
              await Promise.all(pending)
              expect(errors).toEqual([])
              expect(requests.every((request) => request.status === 200)).toBe(
                true,
              )
            }
            try {
              await page.goto(url)
              await page.waitForFunction(() => "fairy" in globalThis)
              for (const step of scenario.steps) {
                phase = step.name
                await step.act(page)
                await settle()
                if (step.sources !== undefined) {
                  expect(
                    requests
                      .filter((request) => request.phase === step.name)
                      .flatMap((request) => request.sources)
                      .toSorted(),
                  ).toEqual(step.sources.toSorted())
                }
                step.after?.(requests)
              }
              const phases = [
                ...new Set(requests.map((request) => request.phase)),
              ].map((name) => {
                const entries = requests.filter(
                  (request) => request.phase === name,
                )
                return {
                  phase: name,
                  requests: entries.length,
                  bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
                  gzipBytes: entries.reduce(
                    (sum, entry) => sum + entry.gzipBytes,
                    0,
                  ),
                  jsonModules: entries.flatMap((entry) => entry.sources).length,
                }
              })
              reports.push({ mode, scenario: scenario.name, phases, requests })
              console.log(
                JSON.stringify({ mode, scenario: scenario.name, phases }),
              )
            } finally {
              await context.close()
            }
          }
        } finally {
          await server.close()
        }
      }
    } finally {
      await browser.close()
    }
    const result = {
      npmBytes: statSync(tarballPath).size,
      unpackedBytes: listFiles(packedRoot).reduce(
        (sum, path) => sum + statSync(join(packedRoot, path)).size,
        0,
      ),
      chunks: Object.entries(chunkSources).map(([path, sources]) => ({
        path,
        sources,
        bytes: statSync(join(consumerDirectory, "dist", path)).size,
        gzipBytes: gzipSync(readFileSync(join(consumerDirectory, "dist", path)))
          .length,
      })),
      reports,
    }
    if (evidenceDirectory) {
      mkdirSync(evidenceDirectory, { recursive: true })
      writeFileSync(
        join(evidenceDirectory, "browser-evidence.json"),
        JSON.stringify(result, null, 2),
      )
      writeFileSync(
        join(evidenceDirectory, "artifact-location.txt"),
        `${temporaryDirectory}\n${basename(tarballPath)}\n`,
      )
    }
    console.log(
      JSON.stringify({
        npmBytes: result.npmBytes,
        unpackedBytes: result.unpackedBytes,
        productionChunks: result.chunks.length,
      }),
    )
  } finally {
    if (!evidenceDirectory)
      rmSync(temporaryDirectory, { recursive: true, force: true })
    else console.log(`Consumer artifacts retained at ${temporaryDirectory}`)
  }
}, 120_000)

/** Dev 响应的来源 JSON 模块：预构建分块带来源注释；未预构建的原始模块请求按路径识别。 */
function devModuleSources(body: string, pathname: string): string[] {
  const comments = [
    ...body.matchAll(
      /^\/\/(?:#region)? .*\/dist\/(integrated|definitions)\/(.+\.json)\s*$/gmu,
    ),
  ].map((match) =>
    match[1] === "definitions" ? `definitions/${match[2]}` : match[2],
  )
  if (comments.length) return comments
  const match = pathname.match(/\/dist\/(integrated|definitions)\/(.+\.json)$/u)
  return match
    ? [match[1] === "definitions" ? `definitions/${match[2]}` : match[2]]
    : []
}

/** 各类别实体各自的冷启动验收步骤；有效读取只触达本类别，非法参数不触发任何数据加载。 */
function defineScenarios(counts: {
  agentCount: number
  driveDiscCount: number
  directDiscId: string
  wEngineCount: number
  directWEngineId: string
  bangbooCount: number
  directBangbooId: string
  monsterCount: number
  directMonsterId: string
  shiyuCount: number
  directShiyuId: string
  bossCount: number
  directBossId: string
  simulCount: number
  directSimulId: string
}): Array<{ name: string; steps: ScenarioStep[] }> {
  const {
    agentCount,
    driveDiscCount,
    directDiscId,
    wEngineCount,
    directWEngineId,
    bangbooCount,
    directBangbooId,
    monsterCount,
    directMonsterId,
    shiyuCount,
    directShiyuId,
    bossCount,
    directBossId,
    simulCount,
    directSimulId,
  } = counts
  async function checkNameCatalogs(page: Page) {
    const catalogs = await page.evaluate(() => {
      const api = (globalThis as any).fairy
      return {
        agentNames: api.agentNames.length,
        driveDiscNames: api.driveDiscNames.length,
        wEngineNames: api.wEngineNames.length,
        bangbooNames: api.bangbooNames.length,
        monsterIds: api.monsterIds.length,
        shiyuIds: api.shiyuIds.length,
        bossIds: api.bossIds.length,
        simulIds: api.simulIds.length,
        frozen:
          Object.isFrozen(api.agentNames) &&
          Object.isFrozen(api.driveDiscNames) &&
          Object.isFrozen(api.wEngineNames) &&
          Object.isFrozen(api.bangbooNames) &&
          Object.isFrozen(api.monsterIds) &&
          Object.isFrozen(api.shiyuIds) &&
          Object.isFrozen(api.bossIds) &&
          Object.isFrozen(api.simulIds),
      }
    })
    expect(catalogs).toEqual({
      agentNames: agentCount,
      driveDiscNames: driveDiscCount,
      wEngineNames: wEngineCount,
      bangbooNames: bangbooCount,
      monsterIds: monsterCount,
      shiyuIds: shiyuCount,
      bossIds: bossCount,
      simulIds: simulCount,
      frozen: true,
    })
  }
  return [
    {
      name: "definitions",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "static-catalog-calculation",
          act: async (page) => {
            const result = await page.evaluate(() =>
              (globalThis as any).fairyStatic(),
            )
            expect(result.rate).toBeCloseTo(0.13)
            expect(result.expected).toBeGreaterThan(result.nonCritical)
            expect(result.records).toBe(1290)
          },
          sources: [
            "definitions/effects/static.json",
            "definitions/effects/static-catalog.json",
            "definitions/effects/static-coverage.json",
          ],
        },
        ...(["automatic", "starter"] as const).map(
          (name): ScenarioStep => ({
            name,
            act: async (page) => {
              expect(
                await page.evaluate(async (ruleSetName) => {
                  const rules = (
                    await (globalThis as any).fairyDefinitions[ruleSetName]()
                  ).default
                  return {
                    schemaVersion: rules.schemaVersion,
                    ruleSetId: rules.ruleSetId,
                    revision: rules.revision,
                    effects: rules.effects.map(
                      (effect: any) => effect.effectId,
                    ),
                  }
                }, name),
              ).toEqual({
                schemaVersion: 1,
                ruleSetId: `${name}-effects`,
                revision: "1",
                effects:
                  name === "automatic"
                    ? ["w-engine:14131:energy-on-entry"]
                    : [
                        "agent:1311:core:attack-conversion",
                        "agent:1311:mindscape-2:core-enhancement",
                        "disc:31000:two-piece:critical-rate",
                      ],
              })
            },
            sources: [`definitions/effects/${name}.json`],
          }),
        ),
        {
          name: "repeat",
          act: async (page) => {
            await page.evaluate(async () => {
              await (globalThis as any).fairyDefinitions.automatic()
              await (globalThis as any).fairyDefinitions.starter()
            })
          },
          sources: [],
        },
      ],
    },
    {
      name: "agents",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "data",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (await (globalThis as any).fairy.loadAgentData("Astra Yao"))
                    .id,
              ),
            ).toBe(1311)
          },
          sources: ["agents/1311/data.json"],
        },
        {
          name: "details-en",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadAgentDetails(
                      "Astra Yao",
                      "en",
                    )
                  ).locale,
              ),
            ).toBe("en")
          },
          sources: ["agents/1311/details.en.json"],
        },
        {
          name: "details-zh",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadAgentDetails(
                      "Soldier 0 - Anby",
                      "zh",
                    )
                  ).locale,
              ),
            ).toBe("zh")
          },
          sources: ["agents/1381/details.zh.json"],
        },
        {
          name: "index",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  Object.keys(
                    (await (globalThis as any).fairy.loadIndex()).entities
                      .agents.members,
                  ).length,
              ),
            ).toBe(agentCount)
          },
          sources: ["index.json"],
        },
        {
          name: "all-en",
          act: async (page) => {
            expect(
              await page.evaluate(async (expected) => {
                const all = await (globalThis as any).fairy.loadAllAgents("en")
                return {
                  count: Object.keys(all).length,
                  locales: [
                    ...new Set(
                      Object.values(all).map(
                        (agent: any) => agent.details.locale,
                      ),
                    ),
                  ],
                  keysMatch:
                    Object.keys(all).length === expected &&
                    Object.keys(all).every(
                      (name, position) =>
                        name === (globalThis as any).fairy.agentNames[position],
                    ),
                }
              }, agentCount),
            ).toEqual({
              count: agentCount,
              locales: ["en"],
              keysMatch: true,
            })
          },
          after: (requests) => {
            const fullSources = requests
              .filter((request) =>
                ["data", "details-en", "all-en"].includes(request.phase),
              )
              .flatMap((request) => request.sources)
            expect(fullSources).toHaveLength(agentCount * 2)
            expect(new Set(fullSources).size).toBe(agentCount * 2)
            expect(
              fullSources.every(
                (path) =>
                  path.endsWith("/data.json") ||
                  path.endsWith("/details.en.json"),
              ),
            ).toBe(true)
          },
        },
        {
          name: "repeat-and-invalid",
          act: async (page) => {
            await page.evaluate(async () => {
              const api = (globalThis as any).fairy
              const one = await api.loadAgentData("Astra Yao")
              one.stats.tags.push("browser mutation")
              if (
                (await api.loadAgentData("Astra Yao")).stats.tags.includes(
                  "browser mutation",
                )
              )
                throw new Error("shared object")
              if ((await api.loadAgentData("astra yao")) !== undefined)
                throw new Error("inexact name")
              try {
                await api.loadAllAgents("zh-CN")
                throw new Error("invalid locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadAgentData(1311)
                throw new Error("numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              // 另一类别的非法参数同样立即拒绝，不触发任何数据加载。
              try {
                await api.loadDriveDiscData(31000)
                throw new Error("drive disc numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              if (
                (await api.loadDriveDiscData("woodpecker electro")) !==
                undefined
              )
                throw new Error("drive disc inexact name")
              try {
                await api.loadWEngineData(12001)
                throw new Error("w-engine numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              if ((await api.loadWEngineData("lunar pleniluna")) !== undefined)
                throw new Error("w-engine inexact name")
              try {
                await api.loadBangbooData(53001)
                throw new Error("bangboo numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              if ((await api.loadBangbooData("penguinboo")) !== undefined)
                throw new Error("bangboo inexact name")
            })
          },
          sources: [],
          after: (requests) => {
            // 代理人上下文全程不请求驱动盘、WEngine、邦布、怪物、Shiyu、Boss 或 Simul JSON。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every(
                  (path) =>
                    !path.startsWith("drive-discs/") &&
                    !path.startsWith("w-engines/") &&
                    !path.startsWith("bangboos/") &&
                    !path.startsWith("monsters/") &&
                    !path.startsWith("shiyu/") &&
                    !path.startsWith("boss/") &&
                    !path.startsWith("simul/"),
                ),
            ).toBe(true)
          },
        },
      ],
    },
    {
      name: "drive-discs",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "disc-data",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadDriveDiscData(
                      "Woodpecker Electro",
                    )
                  ).id,
              ),
            ).toBe(31000)
          },
          sources: ["drive-discs/31000/data.json"],
        },
        {
          name: "disc-details-en",
          act: async (page) => {
            expect(
              await page.evaluate(async () => {
                const details = await (
                  globalThis as any
                ).fairy.loadDriveDiscDetails("Woodpecker Electro", "en")
                return { locale: details.locale, name: details.name }
              }),
            ).toEqual({ locale: "en", name: "Woodpecker Electro" })
          },
          sources: ["drive-discs/31000/details.en.json"],
        },
        {
          name: "disc-details-zh",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadDriveDiscDetails(
                      "Woodpecker Electro",
                      "zh",
                    )
                  ).locale,
              ),
            ).toBe("zh")
          },
          sources: ["drive-discs/31000/details.zh.json"],
        },
        {
          name: "all-discs-en",
          act: async (page) => {
            expect(
              await page.evaluate(async (expected) => {
                const api = (globalThis as any).fairy
                const all = await api.loadAllDriveDiscs("en")
                const keys = Object.keys(all)
                return {
                  count: keys.length,
                  locales: [
                    ...new Set(
                      Object.values(all).map(
                        (disc: any) => disc.details.locale,
                      ),
                    ),
                  ],
                  keysMatch:
                    keys.length === expected &&
                    keys.every(
                      (name, position) => name === api.driveDiscNames[position],
                    ),
                  dataKeysSeparated: Object.values(all).every(
                    (disc: any) =>
                      Object.keys(disc).length === 2 &&
                      "data" in disc &&
                      "details" in disc,
                  ),
                }
              }, driveDiscCount),
            ).toEqual({
              count: driveDiscCount,
              locales: ["en"],
              keysMatch: true,
              dataKeysSeparated: true,
            })
          },
          after: (requests) => {
            const discSources = requests
              .filter((request) =>
                ["disc-data", "disc-details-en", "all-discs-en"].includes(
                  request.phase,
                ),
              )
              .flatMap((request) => request.sources)
            expect(discSources).toHaveLength(driveDiscCount * 2)
            expect(new Set(discSources).size).toBe(driveDiscCount * 2)
            expect(
              discSources.every(
                (path) =>
                  path.startsWith("drive-discs/") &&
                  (path.endsWith("/data.json") ||
                    path.endsWith("/details.en.json")),
              ),
            ).toBe(true)
          },
        },
        {
          name: "direct-subpath",
          act: async (page) => {
            expect(
              await page.evaluate(async (id) => {
                const data = await (
                  globalThis as any
                ).fairyDirectDriveDisc.data()
                const zh = await (globalThis as any).fairyDirectDriveDisc.zh()
                if (data.default.id !== Number(id))
                  throw new Error("direct drive disc data id mismatch")
                if (zh.default.id !== Number(id) || zh.default.locale !== "zh")
                  throw new Error("direct drive disc details mismatch")
                return { id: data.default.id, locale: zh.default.locale }
              }, directDiscId),
            ).toEqual({ id: Number(directDiscId), locale: "zh" })
          },
          // 直接导入只触达该成员的两个 JSON：生产构建与懒加载表共享分块（data 已缓存），
          // dev 中原始模块请求与预构建分块是不同实例（data 也会请求），因此按集合断言。
          after: (requests) => {
            const directSources = requests
              .filter((request) => request.phase === "direct-subpath")
              .flatMap((request) => request.sources)
            expect(directSources).toContain(
              `drive-discs/${directDiscId}/details.zh.json`,
            )
            expect(
              directSources.every(
                (path) =>
                  path === `drive-discs/${directDiscId}/data.json` ||
                  path === `drive-discs/${directDiscId}/details.zh.json`,
              ),
            ).toBe(true)
          },
        },
        {
          name: "disc-repeat-and-invalid",
          act: async (page) => {
            await page.evaluate(async () => {
              const api = (globalThis as any).fairy
              const one = await api.loadDriveDiscData("Woodpecker Electro")
              one.icon2 = "browser mutation"
              if (
                (await api.loadDriveDiscData("Woodpecker Electro")).icon2 ===
                "browser mutation"
              )
                throw new Error("shared object")
              const details = await api.loadDriveDiscDetails(
                "Woodpecker Electro",
                "zh",
              )
              details.story = "browser mutation"
              if (
                (await api.loadDriveDiscDetails("Woodpecker Electro", "zh"))
                  .story === "browser mutation"
              )
                throw new Error("shared details")
              if (
                (await api.loadDriveDiscData("woodpecker electro")) !==
                undefined
              )
                throw new Error("inexact name")
              if ((await api.loadDriveDiscData("31000")) !== undefined)
                throw new Error("numeric id string accepted")
              try {
                await api.loadAllDriveDiscs("zh-CN")
                throw new Error("invalid locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadDriveDiscDetails("Woodpecker Electro")
                throw new Error("missing locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              // 其余类别的非法参数同样立即拒绝，不触发任何数据加载。
              try {
                await api.loadAgentData(1311)
                throw new Error("agent numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              if ((await api.loadAgentData("astra yao")) !== undefined)
                throw new Error("agent inexact name")
              try {
                await api.loadWEngineData(12001)
                throw new Error("w-engine numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              if ((await api.loadWEngineData("lunar pleniluna")) !== undefined)
                throw new Error("w-engine inexact name")
              try {
                await api.loadBangbooData(53001)
                throw new Error("bangboo numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              if ((await api.loadBangbooData("penguinboo")) !== undefined)
                throw new Error("bangboo inexact name")
            })
          },
          sources: [],
          after: (requests) => {
            // 驱动盘上下文全程只请求驱动盘 JSON：不触达代理人、WEngine、邦布、怪物、Shiyu、Boss、Simul 文件或索引。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every((path) => path.startsWith("drive-discs/")),
            ).toBe(true)
          },
        },
      ],
    },
    {
      name: "w-engines",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "engine-data",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadWEngineData(
                      "[Lunar] Pleniluna",
                    )
                  ).id,
              ),
            ).toBe(12001)
          },
          sources: ["w-engines/12001/data.json"],
        },
        {
          name: "engine-details-en",
          act: async (page) => {
            expect(
              await page.evaluate(async () => {
                const details = await (
                  globalThis as any
                ).fairy.loadWEngineDetails("[Lunar] Pleniluna", "en")
                return { locale: details.locale, name: details.name }
              }),
            ).toEqual({ locale: "en", name: "[Lunar] Pleniluna" })
          },
          sources: ["w-engines/12001/details.en.json"],
        },
        {
          name: "engine-details-zh",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadWEngineDetails(
                      "[Lunar] Pleniluna",
                      "zh",
                    )
                  ).locale,
              ),
            ).toBe("zh")
          },
          sources: ["w-engines/12001/details.zh.json"],
        },
        {
          name: "all-engines-en",
          act: async (page) => {
            expect(
              await page.evaluate(async (expected) => {
                const api = (globalThis as any).fairy
                const all = await api.loadAllWEngines("en")
                const keys = Object.keys(all)
                return {
                  count: keys.length,
                  locales: [
                    ...new Set(
                      Object.values(all).map(
                        (engine: any) => engine.details.locale,
                      ),
                    ),
                  ],
                  keysMatch:
                    keys.length === expected &&
                    keys.every(
                      (name, position) => name === api.wEngineNames[position],
                    ),
                  dataKeysSeparated: Object.values(all).every(
                    (engine: any) =>
                      Object.keys(engine).length === 2 &&
                      "data" in engine &&
                      "details" in engine,
                  ),
                }
              }, wEngineCount),
            ).toEqual({
              count: wEngineCount,
              locales: ["en"],
              keysMatch: true,
              dataKeysSeparated: true,
            })
          },
          after: (requests) => {
            const engineSources = requests
              .filter((request) =>
                ["engine-data", "engine-details-en", "all-engines-en"].includes(
                  request.phase,
                ),
              )
              .flatMap((request) => request.sources)
            expect(engineSources).toHaveLength(wEngineCount * 2)
            expect(new Set(engineSources).size).toBe(wEngineCount * 2)
            expect(
              engineSources.every(
                (path) =>
                  path.startsWith("w-engines/") &&
                  (path.endsWith("/data.json") ||
                    path.endsWith("/details.en.json")),
              ),
            ).toBe(true)
          },
        },
        {
          name: "direct-subpath",
          act: async (page) => {
            expect(
              await page.evaluate(async (id) => {
                const data = await (globalThis as any).fairyDirectWEngine.data()
                const zh = await (globalThis as any).fairyDirectWEngine.zh()
                if (data.default.id !== Number(id))
                  throw new Error("direct w-engine data id mismatch")
                if (zh.default.id !== Number(id) || zh.default.locale !== "zh")
                  throw new Error("direct w-engine details mismatch")
                return { id: data.default.id, locale: zh.default.locale }
              }, directWEngineId),
            ).toEqual({ id: Number(directWEngineId), locale: "zh" })
          },
          after: (requests) => {
            const directSources = requests
              .filter((request) => request.phase === "direct-subpath")
              .flatMap((request) => request.sources)
            expect(directSources).toContain(
              `w-engines/${directWEngineId}/details.zh.json`,
            )
            expect(
              directSources.every(
                (path) =>
                  path === `w-engines/${directWEngineId}/data.json` ||
                  path === `w-engines/${directWEngineId}/details.zh.json`,
              ),
            ).toBe(true)
          },
        },
        {
          name: "engine-repeat-and-invalid",
          act: async (page) => {
            await page.evaluate(async () => {
              const api = (globalThis as any).fairy
              const one = await api.loadWEngineData("[Lunar] Pleniluna")
              one.materials = "browser mutation"
              if (
                (await api.loadWEngineData("[Lunar] Pleniluna")).materials ===
                "browser mutation"
              )
                throw new Error("shared object")
              const details = await api.loadWEngineDetails(
                "[Lunar] Pleniluna",
                "zh",
              )
              details.desc3 = "browser mutation"
              if (
                (await api.loadWEngineDetails("[Lunar] Pleniluna", "zh"))
                  .desc3 === "browser mutation"
              )
                throw new Error("shared details")
              if ((await api.loadWEngineData("lunar pleniluna")) !== undefined)
                throw new Error("inexact name")
              if ((await api.loadWEngineData("12001")) !== undefined)
                throw new Error("numeric id string accepted")
              try {
                await api.loadAllWEngines("zh-CN")
                throw new Error("invalid locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadWEngineDetails("[Lunar] Pleniluna")
                throw new Error("missing locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              // 其余类别的非法参数同样立即拒绝，不触发任何数据加载。
              try {
                await api.loadAgentData(1311)
                throw new Error("agent numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadDriveDiscData(31000)
                throw new Error("drive disc numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
            })
          },
          sources: [],
          after: (requests) => {
            // WEngine 上下文全程只请求 WEngine JSON：不触达代理人、驱动盘、邦布、怪物、Shiyu、Boss、Simul 文件或索引。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every((path) => path.startsWith("w-engines/")),
            ).toBe(true)
          },
        },
      ],
    },
    {
      name: "bangboos",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "bangboo-data",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadBangbooData(
                      "Penguinboo",
                    )
                  ).id,
              ),
            ).toBe(53001)
          },
          sources: ["bangboos/53001/data.json"],
        },
        {
          name: "bangboo-details-en",
          act: async (page) => {
            expect(
              await page.evaluate(async () => {
                const details = await (
                  globalThis as any
                ).fairy.loadBangbooDetails("Penguinboo", "en")
                return { locale: details.locale, name: details.name }
              }),
            ).toEqual({ locale: "en", name: "Penguinboo" })
          },
          sources: ["bangboos/53001/details.en.json"],
        },
        {
          name: "bangboo-details-zh",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadBangbooDetails(
                      "Penguinboo",
                      "zh",
                    )
                  ).locale,
              ),
            ).toBe("zh")
          },
          sources: ["bangboos/53001/details.zh.json"],
        },
        {
          name: "all-bangboos-en",
          act: async (page) => {
            expect(
              await page.evaluate(async (expected) => {
                const api = (globalThis as any).fairy
                const all = await api.loadAllBangboos("en")
                const keys = Object.keys(all)
                return {
                  count: keys.length,
                  locales: [
                    ...new Set(
                      Object.values(all).map(
                        (bangboo: any) => bangboo.details.locale,
                      ),
                    ),
                  ],
                  keysMatch:
                    keys.length === expected &&
                    keys.every(
                      (name, position) => name === api.bangbooNames[position],
                    ),
                  dataKeysSeparated: Object.values(all).every(
                    (bangboo: any) =>
                      Object.keys(bangboo).length === 2 &&
                      "data" in bangboo &&
                      "details" in bangboo,
                  ),
                }
              }, bangbooCount),
            ).toEqual({
              count: bangbooCount,
              locales: ["en"],
              keysMatch: true,
              dataKeysSeparated: true,
            })
          },
          after: (requests) => {
            const bangbooSources = requests
              .filter((request) =>
                [
                  "bangboo-data",
                  "bangboo-details-en",
                  "all-bangboos-en",
                ].includes(request.phase),
              )
              .flatMap((request) => request.sources)
            expect(bangbooSources).toHaveLength(bangbooCount * 2)
            expect(new Set(bangbooSources).size).toBe(bangbooCount * 2)
            expect(
              bangbooSources.every(
                (path) =>
                  path.startsWith("bangboos/") &&
                  (path.endsWith("/data.json") ||
                    path.endsWith("/details.en.json")),
              ),
            ).toBe(true)
          },
        },
        {
          name: "direct-subpath",
          act: async (page) => {
            expect(
              await page.evaluate(async (id) => {
                const data = await (globalThis as any).fairyDirectBangboo.data()
                const zh = await (globalThis as any).fairyDirectBangboo.zh()
                if (data.default.id !== Number(id))
                  throw new Error("direct bangboo data id mismatch")
                if (zh.default.id !== Number(id) || zh.default.locale !== "zh")
                  throw new Error("direct bangboo details mismatch")
                return { id: data.default.id, locale: zh.default.locale }
              }, directBangbooId),
            ).toEqual({ id: Number(directBangbooId), locale: "zh" })
          },
          after: (requests) => {
            const directSources = requests
              .filter((request) => request.phase === "direct-subpath")
              .flatMap((request) => request.sources)
            expect(directSources).toContain(
              `bangboos/${directBangbooId}/details.zh.json`,
            )
            expect(
              directSources.every(
                (path) =>
                  path === `bangboos/${directBangbooId}/data.json` ||
                  path === `bangboos/${directBangbooId}/details.zh.json`,
              ),
            ).toBe(true)
          },
        },
        {
          name: "bangboo-repeat-and-invalid",
          act: async (page) => {
            await page.evaluate(async () => {
              const api = (globalThis as any).fairy
              const one = await api.loadBangbooData("Penguinboo")
              one.stats.hpMax = -1
              if ((await api.loadBangbooData("Penguinboo")).stats.hpMax === -1)
                throw new Error("shared object")
              const details = await api.loadBangbooDetails("Penguinboo", "zh")
              details.desc = "browser mutation"
              if (
                (await api.loadBangbooDetails("Penguinboo", "zh")).desc ===
                "browser mutation"
              )
                throw new Error("shared details")
              if ((await api.loadBangbooData("penguinboo")) !== undefined)
                throw new Error("inexact name")
              if ((await api.loadBangbooData("53001")) !== undefined)
                throw new Error("numeric id string accepted")
              try {
                await api.loadAllBangboos("zh-CN")
                throw new Error("invalid locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadBangbooDetails("Penguinboo")
                throw new Error("missing locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              // 其余类别的非法参数同样立即拒绝，不触发任何数据加载。
              try {
                await api.loadAgentData(1311)
                throw new Error("agent numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadDriveDiscData(31000)
                throw new Error("drive disc numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadWEngineData(12001)
                throw new Error("w-engine numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
            })
          },
          sources: [],
          after: (requests) => {
            // 邦布上下文全程只请求邦布 JSON：不触达代理人、驱动盘、WEngine、怪物、Shiyu、Boss、Simul 文件或索引。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every((path) => path.startsWith("bangboos/")),
            ).toBe(true)
          },
        },
      ],
    },
    {
      name: "monsters",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "monster-data",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (await (globalThis as any).fairy.loadMonsterData("10000")).id,
              ),
            ).toBe(10000)
          },
          sources: ["monsters/10000/data.json"],
        },
        {
          name: "monster-details-en",
          act: async (page) => {
            expect(
              await page.evaluate(async () => {
                const details = await (
                  globalThis as any
                ).fairy.loadMonsterDetails("10000", "en")
                return { locale: details.locale, id: String(details.id) }
              }),
            ).toEqual({ locale: "en", id: "10000" })
          },
          sources: ["monsters/10000/details.en.json"],
        },
        {
          name: "monster-details-zh",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadMonsterDetails(
                      "10000",
                      "zh",
                    )
                  ).locale,
              ),
            ).toBe("zh")
          },
          sources: ["monsters/10000/details.zh.json"],
        },
        {
          name: "all-monsters-en",
          act: async (page) => {
            expect(
              await page.evaluate(async (expected) => {
                const api = (globalThis as any).fairy
                const all = await api.loadAllMonsters("en")
                const keys = Object.keys(all)
                return {
                  count: keys.length,
                  locales: [
                    ...new Set(
                      Object.values(all).map(
                        (monster: any) => monster.details.locale,
                      ),
                    ),
                  ],
                  keysMatch:
                    keys.length === expected &&
                    keys.every(
                      (id, position) => id === api.monsterIds[position],
                    ),
                  dataKeysSeparated: Object.values(all).every(
                    (monster: any) =>
                      Object.keys(monster).length === 2 &&
                      "data" in monster &&
                      "details" in monster,
                  ),
                }
              }, monsterCount),
            ).toEqual({
              count: monsterCount,
              locales: ["en"],
              keysMatch: true,
              dataKeysSeparated: true,
            })
          },
          after: (requests) => {
            const monsterSources = requests
              .filter((request) =>
                [
                  "monster-data",
                  "monster-details-en",
                  "all-monsters-en",
                ].includes(request.phase),
              )
              .flatMap((request) => request.sources)
            expect(monsterSources).toHaveLength(monsterCount * 2)
            expect(new Set(monsterSources).size).toBe(monsterCount * 2)
            expect(
              monsterSources.every(
                (path) =>
                  path.startsWith("monsters/") &&
                  (path.endsWith("/data.json") ||
                    path.endsWith("/details.en.json")),
              ),
            ).toBe(true)
          },
        },
        {
          name: "direct-subpath",
          act: async (page) => {
            expect(
              await page.evaluate(async (id) => {
                const data = await (globalThis as any).fairyDirectMonster.data()
                const zh = await (globalThis as any).fairyDirectMonster.zh()
                if (String(data.default.id) !== id)
                  throw new Error("direct monster data id mismatch")
                if (String(zh.default.id) !== id || zh.default.locale !== "zh")
                  throw new Error("direct monster details mismatch")
                return { id: data.default.id, locale: zh.default.locale }
              }, directMonsterId),
            ).toEqual({ id: Number(directMonsterId), locale: "zh" })
          },
          after: (requests) => {
            const directSources = requests
              .filter((request) => request.phase === "direct-subpath")
              .flatMap((request) => request.sources)
            expect(directSources).toContain(
              `monsters/${directMonsterId}/details.zh.json`,
            )
            expect(
              directSources.every(
                (path) =>
                  path === `monsters/${directMonsterId}/data.json` ||
                  path === `monsters/${directMonsterId}/details.zh.json`,
              ),
            ).toBe(true)
          },
        },
        {
          name: "monster-repeat-and-invalid",
          act: async (page) => {
            await page.evaluate(async () => {
              const api = (globalThis as any).fairy
              const one = await api.loadMonsterData("10000")
              const unitKey = Object.keys(one.monsterInfo)[0]
              one.monsterInfo[unitKey].curves.hp.curve.push(-1)
              const again = await api.loadMonsterData("10000")
              if (again.monsterInfo[unitKey].curves.hp.curve.includes(-1))
                throw new Error("shared object")
              const details = await api.loadMonsterDetails("10000", "zh")
              details.desc = "browser mutation"
              if (
                (await api.loadMonsterDetails("10000", "zh")).desc ===
                "browser mutation"
              )
                throw new Error("shared details")
              if ((await api.loadMonsterData("010000")) !== undefined)
                throw new Error("zero-padded id accepted")
              if ((await api.loadMonsterData("1e4")) !== undefined)
                throw new Error("scientific notation accepted")
              if ((await api.loadMonsterData("Penguinboo")) !== undefined)
                throw new Error("other category id accepted")
              try {
                await api.loadAllMonsters("zh-CN")
                throw new Error("invalid locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadMonsterDetails("10000")
                throw new Error("missing locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadMonsterData(10000)
                throw new Error("numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              // 其余类别的非法参数同样立即拒绝，不触发任何数据加载。
              try {
                await api.loadAgentData(1311)
                throw new Error("agent numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadDriveDiscData(31000)
                throw new Error("drive disc numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadWEngineData(12001)
                throw new Error("w-engine numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadBangbooData(53001)
                throw new Error("bangboo numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
            })
          },
          sources: [],
          after: (requests) => {
            // 怪物上下文全程只请求怪物 JSON：不触达代理人、驱动盘、WEngine、邦布、Shiyu、Boss、Simul 文件或索引。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every((path) => path.startsWith("monsters/")),
            ).toBe(true)
          },
        },
      ],
    },
    {
      name: "shiyu",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "shiyu-data",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (await (globalThis as any).fairy.loadShiyuData("61001")).id,
              ),
            ).toBe(61001)
          },
          sources: ["shiyu/61001/data.json"],
        },
        {
          name: "shiyu-details-en",
          act: async (page) => {
            expect(
              await page.evaluate(async () => {
                const details = await (
                  globalThis as any
                ).fairy.loadShiyuDetails("61001", "en")
                return { locale: details.locale, id: String(details.id) }
              }),
            ).toEqual({ locale: "en", id: "61001" })
          },
          sources: ["shiyu/61001/details.en.json"],
        },
        {
          name: "shiyu-details-zh",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadShiyuDetails(
                      "61001",
                      "zh",
                    )
                  ).locale,
              ),
            ).toBe("zh")
          },
          sources: ["shiyu/61001/details.zh.json"],
        },
        {
          name: "all-shiyu-en",
          act: async (page) => {
            expect(
              await page.evaluate(async (expected) => {
                const api = (globalThis as any).fairy
                const all = await api.loadAllShiyu("en")
                const keys = Object.keys(all)
                return {
                  count: keys.length,
                  locales: [
                    ...new Set(
                      Object.values(all).map(
                        (shiyu: any) => shiyu.details.locale,
                      ),
                    ),
                  ],
                  keysMatch:
                    keys.length === expected &&
                    keys.every((id, position) => id === api.shiyuIds[position]),
                  dataKeysSeparated: Object.values(all).every(
                    (shiyu: any) =>
                      Object.keys(shiyu).length === 2 &&
                      "data" in shiyu &&
                      "details" in shiyu,
                  ),
                }
              }, shiyuCount),
            ).toEqual({
              count: shiyuCount,
              locales: ["en"],
              keysMatch: true,
              dataKeysSeparated: true,
            })
          },
          after: (requests) => {
            const shiyuSources = requests
              .filter((request) =>
                ["shiyu-data", "shiyu-details-en", "all-shiyu-en"].includes(
                  request.phase,
                ),
              )
              .flatMap((request) => request.sources)
            expect(shiyuSources).toHaveLength(shiyuCount * 2)
            expect(new Set(shiyuSources).size).toBe(shiyuCount * 2)
            expect(
              shiyuSources.every(
                (path) =>
                  path.startsWith("shiyu/") &&
                  (path.endsWith("/data.json") ||
                    path.endsWith("/details.en.json")),
              ),
            ).toBe(true)
          },
        },
        {
          name: "direct-subpath",
          act: async (page) => {
            expect(
              await page.evaluate(async (id) => {
                const data = await (globalThis as any).fairyDirectShiyu.data()
                const zh = await (globalThis as any).fairyDirectShiyu.zh()
                if (String(data.default.id) !== id)
                  throw new Error("direct shiyu data id mismatch")
                if (String(zh.default.id) !== id || zh.default.locale !== "zh")
                  throw new Error("direct shiyu details mismatch")
                return { id: data.default.id, locale: zh.default.locale }
              }, directShiyuId),
            ).toEqual({ id: Number(directShiyuId), locale: "zh" })
          },
          after: (requests) => {
            const directSources = requests
              .filter((request) => request.phase === "direct-subpath")
              .flatMap((request) => request.sources)
            expect(directSources).toContain(
              `shiyu/${directShiyuId}/details.zh.json`,
            )
            expect(
              directSources.every(
                (path) =>
                  path === `shiyu/${directShiyuId}/data.json` ||
                  path === `shiyu/${directShiyuId}/details.zh.json`,
              ),
            ).toBe(true)
          },
        },
        {
          name: "shiyu-repeat-and-invalid",
          act: async (page) => {
            await page.evaluate(async () => {
              const api = (globalThis as any).fairy
              const one = await api.loadShiyuData("61001")
              one.priority = -1
              if ((await api.loadShiyuData("61001")).priority === -1)
                throw new Error("shared object")
              const details = await api.loadShiyuDetails("61001", "zh")
              const stageKey = Object.keys(details.zone)[0]
              details.zone[stageKey].stageNum = -1
              details.name = "browser mutation"
              const reread = await api.loadShiyuDetails("61001", "zh")
              if (reread.zone[stageKey].stageNum === -1)
                throw new Error("shared zone")
              if (reread.name === "browser mutation")
                throw new Error("shared details")
              if ((await api.loadShiyuData("061001")) !== undefined)
                throw new Error("zero-padded id accepted")
              if ((await api.loadShiyuData("Tyrfing")) !== undefined)
                throw new Error("other category name accepted")
              try {
                await api.loadAllShiyu("zh-CN")
                throw new Error("invalid locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadShiyuDetails("61001")
                throw new Error("missing locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadShiyuData(61001)
                throw new Error("numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              // 其余类别的非法参数同样立即拒绝，不触发任何数据加载。
              try {
                await api.loadAgentData(1311)
                throw new Error("agent numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadDriveDiscData(31000)
                throw new Error("drive disc numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadWEngineData(12001)
                throw new Error("w-engine numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadBangbooData(53001)
                throw new Error("bangboo numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadMonsterData(10000)
                throw new Error("monster numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
            })
          },
          sources: [],
          after: (requests) => {
            // Shiyu 上下文全程只请求 Shiyu JSON：不触达代理人、驱动盘、WEngine、邦布、怪物、Boss、Simul 文件或索引。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every((path) => path.startsWith("shiyu/")),
            ).toBe(true)
          },
        },
      ],
    },
    {
      name: "boss",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "boss-data",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (await (globalThis as any).fairy.loadBossData("69001")).id,
              ),
            ).toBe(69001)
          },
          sources: ["boss/69001/data.json"],
        },
        {
          name: "boss-details-en",
          act: async (page) => {
            expect(
              await page.evaluate(async () => {
                const details = await (globalThis as any).fairy.loadBossDetails(
                  "69001",
                  "en",
                )
                return { locale: details.locale, id: String(details.id) }
              }),
            ).toEqual({ locale: "en", id: "69001" })
          },
          sources: ["boss/69001/details.en.json"],
        },
        {
          name: "boss-details-zh",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadBossDetails(
                      "69001",
                      "zh",
                    )
                  ).locale,
              ),
            ).toBe("zh")
          },
          sources: ["boss/69001/details.zh.json"],
        },
        {
          name: "all-bosses-en",
          act: async (page) => {
            expect(
              await page.evaluate(async (expected) => {
                const api = (globalThis as any).fairy
                const all = await api.loadAllBosses("en")
                const keys = Object.keys(all)
                return {
                  count: keys.length,
                  locales: [
                    ...new Set(
                      Object.values(all).map(
                        (boss: any) => boss.details.locale,
                      ),
                    ),
                  ],
                  keysMatch:
                    keys.length === expected &&
                    keys.every((id, position) => id === api.bossIds[position]),
                  dataKeysSeparated: Object.values(all).every(
                    (boss: any) =>
                      Object.keys(boss).length === 2 &&
                      "data" in boss &&
                      "details" in boss,
                  ),
                }
              }, bossCount),
            ).toEqual({
              count: bossCount,
              locales: ["en"],
              keysMatch: true,
              dataKeysSeparated: true,
            })
          },
          after: (requests) => {
            const bossSources = requests
              .filter((request) =>
                ["boss-data", "boss-details-en", "all-bosses-en"].includes(
                  request.phase,
                ),
              )
              .flatMap((request) => request.sources)
            expect(bossSources).toHaveLength(bossCount * 2)
            expect(new Set(bossSources).size).toBe(bossCount * 2)
            expect(
              bossSources.every(
                (path) =>
                  path.startsWith("boss/") &&
                  (path.endsWith("/data.json") ||
                    path.endsWith("/details.en.json")),
              ),
            ).toBe(true)
          },
        },
        {
          name: "direct-subpath",
          act: async (page) => {
            expect(
              await page.evaluate(async (id) => {
                const data = await (globalThis as any).fairyDirectBoss.data()
                const zh = await (globalThis as any).fairyDirectBoss.zh()
                if (String(data.default.id) !== id)
                  throw new Error("direct boss data id mismatch")
                if (String(zh.default.id) !== id || zh.default.locale !== "zh")
                  throw new Error("direct boss details mismatch")
                return { id: data.default.id, locale: zh.default.locale }
              }, directBossId),
            ).toEqual({ id: Number(directBossId), locale: "zh" })
          },
          after: (requests) => {
            const directSources = requests
              .filter((request) => request.phase === "direct-subpath")
              .flatMap((request) => request.sources)
            expect(directSources).toContain(
              `boss/${directBossId}/details.zh.json`,
            )
            expect(
              directSources.every(
                (path) =>
                  path === `boss/${directBossId}/data.json` ||
                  path === `boss/${directBossId}/details.zh.json`,
              ),
            ).toBe(true)
          },
        },
        {
          name: "boss-repeat-and-invalid",
          act: async (page) => {
            await page.evaluate(async () => {
              const api = (globalThis as any).fairy
              const one = await api.loadBossData("69001")
              one.priority = -1
              if ((await api.loadBossData("69001")).priority === -1)
                throw new Error("shared object")
              const details = await api.loadBossDetails("69001", "zh")
              const mode = details.modes[0]
              const stageKey = Object.keys(mode.zone)[0]
              mode.zone[stageKey].stageNum = -1
              details.name = "browser mutation"
              const reread = await api.loadBossDetails("69001", "zh")
              if (reread.modes[0].zone[stageKey].stageNum === -1)
                throw new Error("shared zone")
              if (reread.name === "browser mutation")
                throw new Error("shared details")
              if ((await api.loadBossData("069001")) !== undefined)
                throw new Error("zero-padded id accepted")
              try {
                await api.loadAllBosses("zh-CN")
                throw new Error("invalid locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadBossDetails("69001")
                throw new Error("missing locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadBossData(69001)
                throw new Error("numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              // 其余类别的非法参数同样立即拒绝，不触发任何数据加载。
              try {
                await api.loadAgentData(1311)
                throw new Error("agent numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadMonsterData(10000)
                throw new Error("monster numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadShiyuData(61001)
                throw new Error("shiyu numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadSimulData(101)
                throw new Error("simul numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
            })
          },
          sources: [],
          after: (requests) => {
            // Boss 上下文全程只请求 Boss JSON：不触达代理人、驱动盘、WEngine、邦布、怪物、Shiyu、Simul 文件或索引。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every((path) => path.startsWith("boss/")),
            ).toBe(true)
          },
        },
      ],
    },
    {
      name: "simul",
      steps: [
        {
          name: "initial",
          act: async (page) => checkNameCatalogs(page),
          sources: [],
        },
        {
          name: "simul-data",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (await (globalThis as any).fairy.loadSimulData("101")).id,
              ),
            ).toBe(101)
          },
          sources: ["simul/101/data.json"],
        },
        {
          name: "simul-details-en",
          act: async (page) => {
            expect(
              await page.evaluate(async () => {
                const details = await (
                  globalThis as any
                ).fairy.loadSimulDetails("101", "en")
                return { locale: details.locale, id: String(details.id) }
              }),
            ).toEqual({ locale: "en", id: "101" })
          },
          sources: ["simul/101/details.en.json"],
        },
        {
          name: "simul-details-zh",
          act: async (page) => {
            expect(
              await page.evaluate(
                async () =>
                  (
                    await (globalThis as any).fairy.loadSimulDetails(
                      "101",
                      "zh",
                    )
                  ).locale,
              ),
            ).toBe("zh")
          },
          sources: ["simul/101/details.zh.json"],
        },
        {
          name: "all-simul-en",
          act: async (page) => {
            expect(
              await page.evaluate(async (expected) => {
                const api = (globalThis as any).fairy
                const all = await api.loadAllSimul("en")
                const keys = Object.keys(all)
                return {
                  count: keys.length,
                  locales: [
                    ...new Set(
                      Object.values(all).map(
                        (simul: any) => simul.details.locale,
                      ),
                    ),
                  ],
                  keysMatch:
                    keys.length === expected &&
                    keys.every((id, position) => id === api.simulIds[position]),
                  dataKeysSeparated: Object.values(all).every(
                    (simul: any) =>
                      Object.keys(simul).length === 2 &&
                      "data" in simul &&
                      "details" in simul,
                  ),
                }
              }, simulCount),
            ).toEqual({
              count: simulCount,
              locales: ["en"],
              keysMatch: true,
              dataKeysSeparated: true,
            })
          },
          after: (requests) => {
            const simulSources = requests
              .filter((request) =>
                ["simul-data", "simul-details-en", "all-simul-en"].includes(
                  request.phase,
                ),
              )
              .flatMap((request) => request.sources)
            expect(simulSources).toHaveLength(simulCount * 2)
            expect(new Set(simulSources).size).toBe(simulCount * 2)
            expect(
              simulSources.every(
                (path) =>
                  path.startsWith("simul/") &&
                  (path.endsWith("/data.json") ||
                    path.endsWith("/details.en.json")),
              ),
            ).toBe(true)
          },
        },
        {
          name: "direct-subpath",
          act: async (page) => {
            expect(
              await page.evaluate(async (id) => {
                const data = await (globalThis as any).fairyDirectSimul.data()
                const zh = await (globalThis as any).fairyDirectSimul.zh()
                if (String(data.default.id) !== id)
                  throw new Error("direct simul data id mismatch")
                if (String(zh.default.id) !== id || zh.default.locale !== "zh")
                  throw new Error("direct simul details mismatch")
                return { id: data.default.id, locale: zh.default.locale }
              }, directSimulId),
            ).toEqual({ id: Number(directSimulId), locale: "zh" })
          },
          after: (requests) => {
            const directSources = requests
              .filter((request) => request.phase === "direct-subpath")
              .flatMap((request) => request.sources)
            expect(directSources).toContain(
              `simul/${directSimulId}/details.zh.json`,
            )
            expect(
              directSources.every(
                (path) =>
                  path === `simul/${directSimulId}/data.json` ||
                  path === `simul/${directSimulId}/details.zh.json`,
              ),
            ).toBe(true)
          },
        },
        {
          name: "simul-repeat-and-invalid",
          act: async (page) => {
            await page.evaluate(async () => {
              const api = (globalThis as any).fairy
              const one = await api.loadSimulData("101")
              one.endTime = "modified"
              if ((await api.loadSimulData("101")).endTime === "modified")
                throw new Error("shared object")
              const details = await api.loadSimulDetails("101", "zh")
              const node = details.node["10101"]
              node.prevNode = -1
              details.record = { modified: true }
              const reread = await api.loadSimulDetails("101", "zh")
              if (reread.node["10101"].prevNode === -1)
                throw new Error("shared node")
              if (reread.record.modified === true)
                throw new Error("shared details")
              if ((await api.loadSimulData("0101")) !== undefined)
                throw new Error("zero-padded id accepted")
              try {
                await api.loadAllSimul("zh-CN")
                throw new Error("invalid locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadSimulDetails("101")
                throw new Error("missing locale accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadSimulData(101)
                throw new Error("numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              // 其余类别的非法参数同样立即拒绝，不触发任何数据加载。
              try {
                await api.loadAgentData(1311)
                throw new Error("agent numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadMonsterData(10000)
                throw new Error("monster numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
              try {
                await api.loadBossData(69001)
                throw new Error("boss numeric id accepted")
              } catch (error) {
                if (!(error instanceof TypeError)) throw error
              }
            })
          },
          sources: [],
          after: (requests) => {
            // Simul 上下文全程只请求 Simul JSON：不触达代理人、驱动盘、WEngine、邦布、怪物、Shiyu、Boss 文件或索引。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every((path) => path.startsWith("simul/")),
            ).toBe(true)
          },
        },
      ],
    },
  ]
}
