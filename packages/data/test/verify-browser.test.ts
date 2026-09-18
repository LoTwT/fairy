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
      installPackedConsumer(temporaryDirectory)
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
    // 构建模块图应包含两类导入表引用的全部 JSON：按已验证索引逐类别推导，不使用固定文件总数。
    const publishedEntities = integratedIndex.entities as Record<
      string,
      { memberIds: string[]; detailLocales: string[] }
    >
    const expectedGraph = [
      "index.json",
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
globalThis.fairyDirectDriveDisc = {
  data: () => import("@randomplay/data/integrated/drive-discs/${directDiscId}/data.json"),
  zh: () => import("@randomplay/data/integrated/drive-discs/${directDiscId}/details.zh.json"),
}
globalThis.fairyDirectWEngine = {
  data: () => import("@randomplay/data/integrated/w-engines/${directWEngineId}/data.json"),
  zh: () => import("@randomplay/data/integrated/w-engines/${directWEngineId}/details.zh.json"),
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
                    const match = id.match(/\/dist\/integrated\/(.+\.json)$/u)
                    return match ? [match[1]] : []
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
      /^\/\/(?:#region)? .*\/dist\/integrated\/(.+\.json)\s*$/gmu,
    ),
  ].map((match) => match[1])
  if (comments.length) return comments
  const match = pathname.match(/\/dist\/integrated\/(.+\.json)$/u)
  return match ? [match[1]] : []
}

/** 各类别实体各自的冷启动验收步骤；有效读取只触达本类别，非法参数不触发任何数据加载。 */
function defineScenarios(counts: {
  agentCount: number
  driveDiscCount: number
  directDiscId: string
  wEngineCount: number
  directWEngineId: string
}): Array<{ name: string; steps: ScenarioStep[] }> {
  const {
    agentCount,
    driveDiscCount,
    directDiscId,
    wEngineCount,
    directWEngineId,
  } = counts
  async function checkNameCatalogs(page: Page) {
    const catalogs = await page.evaluate(() => {
      const api = (globalThis as any).fairy
      return {
        agentNames: api.agentNames.length,
        driveDiscNames: api.driveDiscNames.length,
        wEngineNames: api.wEngineNames.length,
        frozen:
          Object.isFrozen(api.agentNames) &&
          Object.isFrozen(api.driveDiscNames) &&
          Object.isFrozen(api.wEngineNames),
      }
    })
    expect(catalogs).toEqual({
      agentNames: agentCount,
      driveDiscNames: driveDiscCount,
      wEngineNames: wEngineCount,
      frozen: true,
    })
  }
  return [
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
            })
          },
          sources: [],
          after: (requests) => {
            // 代理人上下文全程不请求驱动盘或 WEngine JSON。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every(
                  (path) =>
                    !path.startsWith("drive-discs/") &&
                    !path.startsWith("w-engines/"),
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
            })
          },
          sources: [],
          after: (requests) => {
            // 驱动盘上下文全程只请求驱动盘 JSON：不触达代理人、WEngine 文件或索引。
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
            // WEngine 上下文全程只请求 WEngine JSON：不触达代理人、驱动盘文件或索引。
            expect(
              requests
                .flatMap((request) => request.sources)
                .every((path) => path.startsWith("w-engines/")),
            ).toBe(true)
          },
        },
      ],
    },
  ]
}
