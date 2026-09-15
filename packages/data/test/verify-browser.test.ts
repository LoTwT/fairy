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
import { build, createServer, preview } from "vite"
import { expect, it } from "vitest"
import { installPackedConsumer, listFiles } from "./fixtures/packed-consumer.ts"

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
    writeFileSync(
      join(consumerDirectory, "index.html"),
      '<!doctype html><html><head><title>Fairy consumer</title><link rel="icon" href="data:,"></head><body><script type="module" src="/main.js"></script></body></html>',
    )
    writeFileSync(
      join(consumerDirectory, "main.js"),
      'import * as api from "@randomplay/data"; globalThis.fairy = api; document.body.append("ready");',
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
    expect(Object.values(chunkSources).flat()).toHaveLength(175)
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
        const context = await browser.newContext()
        const page = await context.newPage()
        const errors: string[] = []
        page.on("pageerror", (error) => errors.push(error.message))
        type RequestEvidence = {
          phase: string
          url: string
          status: number
          bytes: number
          gzipBytes: number
          sources: string[]
        }
        const requests: RequestEvidence[] = []
        const pending: Promise<void>[] = []
        let phase = "initial"
        page.on("response", (response) => {
          const responsePhase = phase
          pending.push(
            (async () => {
              const body = await response.body()
              const path = new URL(response.url()).pathname
              // Optimized dev chunks preserve source comments. Production uses build module provenance.
              const sources =
                mode === "production"
                  ? (chunkSources[path.replace(/^\//u, "")] ?? [])
                  : [
                      ...body
                        .toString()
                        .matchAll(
                          /^\/\/(?:#region)? .*\/dist\/integrated\/(.+\.json)\s*$/gmu,
                        ),
                    ].map((match) => match[1])
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
          expect(requests.every((request) => request.status === 200)).toBe(true)
        }
        try {
          await page.goto(url)
          await page.waitForFunction(() => "fairy" in globalThis)
          await settle()
          expect(requests.flatMap((request) => request.sources)).toEqual([])
          expect(
            await page.evaluate(
              () => (globalThis as any).fairy.agentNames.length,
            ),
          ).toBe(58)
          phase = "data"
          expect(
            await page.evaluate(
              async () =>
                (await (globalThis as any).fairy.loadAgentData("Astra Yao")).id,
            ),
          ).toBe(1311)
          await settle()
          expect(
            requests
              .filter((request) => request.phase === phase)
              .flatMap((request) => request.sources),
          ).toEqual(["agents/1311/data.json"])
          phase = "details-en"
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
          await settle()
          expect(
            requests
              .filter((request) => request.phase === phase)
              .flatMap((request) => request.sources),
          ).toEqual(["agents/1311/details.en.json"])
          phase = "details-zh"
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
          await settle()
          expect(
            requests
              .filter((request) => request.phase === phase)
              .flatMap((request) => request.sources),
          ).toEqual(["agents/1381/details.zh.json"])
          phase = "index"
          expect(
            await page.evaluate(
              async () =>
                Object.keys(
                  (await (globalThis as any).fairy.loadIndex()).agents,
                ).length,
            ),
          ).toBe(58)
          await settle()
          expect(
            requests
              .filter((request) => request.phase === phase)
              .flatMap((request) => request.sources),
          ).toEqual(["index.json"])
          phase = "all-en"
          expect(
            await page.evaluate(async () => {
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
              }
            }),
          ).toEqual({ count: 58, locales: ["en"] })
          await settle()
          const fullSources = requests
            .filter((request) =>
              ["data", "details-en", "all-en"].includes(request.phase),
            )
            .flatMap((request) => request.sources)
          expect(fullSources).toHaveLength(116)
          expect(new Set(fullSources).size).toBe(116)
          expect(
            fullSources.every(
              (path) =>
                path.endsWith("/data.json") ||
                path.endsWith("/details.en.json"),
            ),
          ).toBe(true)
          phase = "repeat-and-invalid"
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
          })
          await settle()
          expect(requests.filter((request) => request.phase === phase)).toEqual(
            [],
          )
          const phases = [
            ...new Set(requests.map((request) => request.phase)),
          ].map((name) => {
            const entries = requests.filter((request) => request.phase === name)
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
          reports.push({ mode, phases, requests })
          console.log(JSON.stringify({ mode, phases }))
        } finally {
          await context.close()
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
