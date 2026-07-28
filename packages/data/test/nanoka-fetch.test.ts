import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  fetchNanokaData,
  fetchUpstreamManifest,
} from "../scripts/nanoka/fetch.ts"
import { NanokaHttpClient } from "../scripts/nanoka/http.ts"
import {
  loadSourcePolicy,
  type NanokaManifest,
  type SourcePolicy,
} from "../scripts/nanoka/policy.ts"

const temporaryDirectories: string[] = []
const manifest: NanokaManifest = {
  zzz: {
    live: "3.0",
    latest: "3.0",
    available: ["3.0"],
  },
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe("Nanoka fetch cache", () => {
  it("fetches the selected resources as raw bytes without a snapshot manifest", async () => {
    const policy = await testPolicy()
    const cacheRoot = await temporaryDirectory()
    const indexBytes = bytes('{"20":{"name":"Billy"},"3":{"name":"Anby"}}\n')
    const detailBytes = new Map([
      ["zh/3", bytes('{"id":3,"name":"安比"}\n')],
      ["en/3", bytes('{"id":3,"name":"Anby"}\n')],
      ["zh/20", bytes('{"id":20,"name":"比利"}\n')],
      ["en/20", bytes('{"id":20,"name":"Billy"}\n')],
    ])
    const fetchImplementation = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith("/character.json"))
        return jsonResponse(indexBytes)
      const match = /\/(zh|en)\/character\/(\d+)\.json$/u.exec(url.pathname)
      if (match !== null) {
        const body = detailBytes.get(`${match[1]}/${match[2]}`)
        if (body !== undefined) return jsonResponse(body)
      }
      return new Response("missing", { status: 404 })
    })
    const progress: string[] = []
    const result = await fetchNanokaData({
      policy,
      httpClient: new NanokaHttpClient(policy, {
        fetchImplementation,
        sleep: async () => {},
      }),
      upstreamManifestBytes: bytes(JSON.stringify(manifest)),
      upstreamManifest: manifest,
      version: "3.0",
      entities: ["character"],
      cacheRoot,
      onProgress(event) {
        progress.push(event.stage)
      },
    })

    expect(result).toMatchObject({
      entities: ["character"],
      fetchedAssetCount: 6,
      recordCounts: { character: 2 },
    })
    expect(await readFile(join(cacheRoot, "3.0", "character.json"))).toEqual(
      Buffer.from(indexBytes),
    )
    expect(
      await readFile(join(cacheRoot, "3.0", "zh", "character", "3.json")),
    ).toEqual(Buffer.from(detailBytes.get("zh/3")!))
    expect(await readdir(join(cacheRoot, "3.0"))).not.toContain(
      "fetch-manifest.json",
    )
    expect(progress).toContain("preparing")
    expect(progress.filter((stage) => stage === "entity-details")).toHaveLength(
      4,
    )
  })

  it("fetches and validates the upstream version manifest", async () => {
    const policy = await testPolicy()
    const manifestBytes = bytes(
      '{"zzz":{"live":"3.0","latest":"3.0","available":["3.0"]}}\n',
    )
    const client = new NanokaHttpClient(policy, {
      fetchImplementation: async () => jsonResponse(manifestBytes),
      sleep: async () => {},
    })

    const result = await fetchUpstreamManifest(policy, client)

    expect(result.manifest).toEqual(manifest)
    expect(result.bytes).toEqual(manifestBytes)
  })

  it("does not publish an entity index when one of its details is invalid", async () => {
    const policy = await testPolicy()
    const cacheRoot = await temporaryDirectory()
    const client = new NanokaHttpClient(policy, {
      fetchImplementation: async (input) => {
        const path = new URL(String(input)).pathname
        if (path.endsWith("/character.json"))
          return jsonResponse(bytes('{"3":{"name":"Anby"}}'))
        if (path.includes("/zh/")) return jsonResponse(bytes("{"))
        return jsonResponse(bytes('{"id":3}'))
      },
      sleep: async () => {},
    })

    await expect(
      fetchNanokaData({
        policy,
        httpClient: client,
        upstreamManifestBytes: bytes(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        entities: ["character"],
        cacheRoot,
      }),
    ).rejects.toThrow("不是有效 JSON")
    await expect(
      stat(join(cacheRoot, "3.0", "character.json")),
    ).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("bounds discovered records and rejects unsupported entities", async () => {
    const basePolicy = await testPolicy()
    const policy: SourcePolicy = {
      ...basePolicy,
      fetchLimits: {
        ...basePolicy.fetchLimits,
        maximumRecordsPerEntity: 1,
      },
    }
    const cacheRoot = await temporaryDirectory()
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      jsonResponse(bytes('{"1":{},"2":{}}')),
    )

    await expect(
      fetchNanokaData({
        policy,
        httpClient: new NanokaHttpClient(policy, {
          fetchImplementation,
          sleep: async () => {},
        }),
        upstreamManifestBytes: bytes(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        entities: ["character"],
        cacheRoot,
      }),
    ).rejects.toThrow("记录数 2 超过单实体上限 1")
    expect(fetchImplementation).toHaveBeenCalledTimes(1)

    await expect(
      fetchNanokaData({
        policy,
        httpClient: new NanokaHttpClient(policy, {
          fetchImplementation,
          sleep: async () => {},
        }),
        upstreamManifestBytes: bytes(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        entities: ["unknown"],
        cacheRoot,
      }),
    ).rejects.toThrow("未知或未实现")
  })

  it("rejects runs whose discovered assets exceed the configured budget", async () => {
    const basePolicy = await testPolicy()
    const policy: SourcePolicy = {
      ...basePolicy,
      fetchLimits: {
        ...basePolicy.fetchLimits,
        maximumAssetsPerRun: 3,
      },
    }
    const cacheRoot = await temporaryDirectory()
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      jsonResponse(bytes('{"3":{"name":"Anby"}}')),
    )

    await expect(
      fetchNanokaData({
        policy,
        httpClient: new NanokaHttpClient(policy, {
          fetchImplementation,
          sleep: async () => {},
        }),
        upstreamManifestBytes: bytes(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        entities: ["character"],
        cacheRoot,
      }),
    ).rejects.toThrow("本次抓取资源数量超过上限 3")
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    await expect(
      stat(join(cacheRoot, "3.0", "character.json")),
    ).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("rejects runs whose cumulative bytes exceed the configured budget", async () => {
    const upstreamManifestBytes = bytes(JSON.stringify(manifest))
    const indexBytes = bytes('{"3":{"name":"Anby"}}')
    const detailBytes = bytes('{"id":3}')
    const basePolicy = await testPolicy()
    const policy: SourcePolicy = {
      ...basePolicy,
      requestPolicy: {
        ...basePolicy.requestPolicy,
        maxConcurrency: 1,
      },
      fetchLimits: {
        ...basePolicy.fetchLimits,
        maximumBytesPerRun:
          upstreamManifestBytes.byteLength + indexBytes.byteLength,
      },
    }
    const cacheRoot = await temporaryDirectory()
    const fetchImplementation = vi.fn<typeof fetch>(async (input) =>
      new URL(String(input)).pathname.endsWith("/character.json")
        ? jsonResponse(indexBytes)
        : jsonResponse(detailBytes),
    )

    await expect(
      fetchNanokaData({
        policy,
        httpClient: new NanokaHttpClient(policy, {
          fetchImplementation,
          sleep: async () => {},
        }),
        upstreamManifestBytes,
        upstreamManifest: manifest,
        version: "3.0",
        entities: ["character"],
        cacheRoot,
      }),
    ).rejects.toThrow("本次抓取总字节数超过上限")
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    await expect(
      stat(join(cacheRoot, "3.0", "character.json")),
    ).rejects.toMatchObject({ code: "ENOENT" })
    await expect(
      stat(join(cacheRoot, "3.0", "zh", "character", "3.json")),
    ).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("rejects non-object indexes and detail documents", async () => {
    const policy = await testPolicy()
    const cacheRoot = await temporaryDirectory()
    const indexClient = new NanokaHttpClient(policy, {
      fetchImplementation: async () => jsonResponse(bytes("[]")),
      sleep: async () => {},
    })
    await expect(
      fetchNanokaData({
        policy,
        httpClient: indexClient,
        upstreamManifestBytes: bytes(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        entities: ["character"],
        cacheRoot,
      }),
    ).rejects.toThrow("索引必须是普通对象")

    const detailClient = new NanokaHttpClient(policy, {
      fetchImplementation: async (input) =>
        new URL(String(input)).pathname.endsWith("/character.json")
          ? jsonResponse(bytes('{"3":{}}'))
          : jsonResponse(bytes("[]")),
      sleep: async () => {},
    })
    await expect(
      fetchNanokaData({
        policy,
        httpClient: detailClient,
        upstreamManifestBytes: bytes(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        entities: ["character"],
        cacheRoot,
      }),
    ).rejects.toThrow("详情必须是普通对象")
  })

  it("rejects impractically long entity IDs before creating detail tasks", async () => {
    const policy = await testPolicy()
    const cacheRoot = await temporaryDirectory()
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      jsonResponse(bytes(`{"${"1".repeat(33)}":{}}`)),
    )

    await expect(
      fetchNanokaData({
        policy,
        httpClient: new NanokaHttpClient(policy, {
          fetchImplementation,
          sleep: async () => {},
        }),
        upstreamManifestBytes: bytes(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        entities: ["character"],
        cacheRoot,
      }),
    ).rejects.toThrow("非法实体 ID")
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
  })
})

async function testPolicy(): Promise<SourcePolicy> {
  const policy = await loadSourcePolicy()
  return {
    ...policy,
    requestPolicy: {
      ...policy.requestPolicy,
      minimumStartIntervalMs: 0,
      timeoutMs: 100,
    },
  }
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "nanoka-fetch-"))
  temporaryDirectories.push(directory)
  return directory
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function jsonResponse(value: Uint8Array): Response {
  return new Response(value, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
