import { describe, expect, it, vi } from "vitest"
import { NanokaHttpClient } from "../scripts/nanoka/http.ts"
import { loadSourcePolicy } from "../scripts/nanoka/policy.ts"

describe("Nanoka HTTP client", () => {
  it("fetches raw bytes with the required request policy", async () => {
    const policy = await testPolicy()
    const fetchImplementation = vi.fn<typeof fetch>(async (_url, options) => {
      expect(options?.redirect).toBe("manual")
      const headers = new Headers(options?.headers)
      expect(headers.get("User-Agent")).toBe(policy.userAgent)
      expect(headers.get("If-None-Match")).toBe('W/"abc"')
      expect(headers.get("If-Modified-Since")).toBe("yesterday")
      return new Response(new Uint8Array([0, 1, 2]), {
        status: 200,
        headers: {
          "ETag": 'W/"def"',
          "Content-Type": "application/json",
        },
      })
    })
    const client = new NanokaHttpClient(policy, {
      fetchImplementation,
      sleep: async () => {},
    })
    const response = await client.fetchAsset(
      new URL("https://static.nanoka.cc/manifest.json"),
      { etag: 'W/"abc"', lastModified: "yesterday" },
    )
    expect(response.result).toBe("fetched")
    expect(response.bytes).toEqual(new Uint8Array([0, 1, 2]))
    expect(response.etag).toBe('W/"def"')
  })

  it("returns 304 without replacing stored metadata", async () => {
    const policy = await testPolicy()
    const client = new NanokaHttpClient(policy, {
      fetchImplementation: async () => new Response(null, { status: 304 }),
      sleep: async () => {},
    })
    expect(
      await client.fetchAsset(
        new URL("https://static.nanoka.cc/manifest.json"),
      ),
    ).toMatchObject({ result: "not-modified", bytes: null, etag: null })
  })

  it("cancels open error bodies before releasing concurrency slots", async () => {
    const policy = await loadSourcePolicy()
    const events: string[] = []
    let releaseCancellation!: () => void
    const cancellationBarrier = new Promise<void>((resolve) => {
      releaseCancellation = resolve
    })
    const errorBody = new ReadableStream({
      cancel: async () => {
        events.push("cancel-start")
        await cancellationBarrier
        events.push("cancel-finish")
      },
    })
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: {
          ...policy.requestPolicy,
          maxConcurrency: 1,
          minimumStartIntervalMs: 0,
        },
      },
      {
        fetchImplementation: async (_input) => {
          events.push("request-start")
          if (
            events.filter((event) => event === "request-start").length === 1
          ) {
            return new Response(errorBody, { status: 404 })
          }
          return new Response("{}", { status: 200 })
        },
        sleep: async () => {},
      },
    )

    const first = client.fetchAsset(
      new URL("https://static.nanoka.cc/manifest.json?request=error"),
    )
    const second = client.fetchAsset(
      new URL("https://static.nanoka.cc/manifest.json?request=success"),
    )
    await vi.waitFor(() => expect(events).toContain("cancel-start"))
    expect(events.filter((event) => event === "request-start")).toHaveLength(1)
    releaseCancellation()
    await expect(first).rejects.toThrow("返回 404")
    await expect(second).resolves.toMatchObject({ result: "fetched" })
    expect(events).toEqual([
      "request-start",
      "cancel-start",
      "cancel-finish",
      "request-start",
    ])
  })

  it("retries configured statuses and honors Retry-After", async () => {
    const policy = await testPolicy()
    const sleep = vi.fn(async () => {})
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("busy", {
          status: 429,
          headers: { "Retry-After": "1" },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
    const client = new NanokaHttpClient(policy, {
      fetchImplementation,
      sleep,
    })
    await client.fetchAsset(new URL("https://static.nanoka.cc/manifest.json"))
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(1000)
  })

  it("uses configured retry delays and the injected clock", async () => {
    const policy = await testPolicy()
    const clock = Date.parse("2026-07-26T00:00:00.000Z")
    const sleep = vi.fn(async () => {})
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(
        new Response("busy", {
          status: 429,
          headers: {
            "Retry-After": new Date(clock + 1500).toUTCString(),
          },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: {
          ...policy.requestPolicy,
          initialRetryDelayMs: 375,
        },
      },
      { fetchImplementation, sleep, now: () => clock },
    )

    await client.fetchAsset(new URL("https://static.nanoka.cc/manifest.json"))
    expect(sleep).toHaveBeenNthCalledWith(1, 375)
    expect(sleep).toHaveBeenNthCalledWith(2, 1000)
  })

  it("reports oversized Retry-After as retry exhaustion", async () => {
    const policy = await testPolicy()
    const fetchImplementation = vi.fn<typeof fetch>(
      async () =>
        new Response("busy", {
          status: 429,
          headers: { "Retry-After": "3" },
        }),
    )
    const client = new NanokaHttpClient(policy, {
      fetchImplementation,
      sleep: async () => {},
    })

    await expect(
      client.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
    ).rejects.toThrow(/请求重试耗尽.*429.*尝试 1\/3/u)
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
  })

  it("rejects response bodies above the configured byte limit", async () => {
    const policy = await testPolicy()
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: {
          ...policy.requestPolicy,
          maximumResponseBytes: 3,
        },
      },
      {
        fetchImplementation: async () => new Response("four", { status: 200 }),
        sleep: async () => {},
      },
    )

    await expect(
      client.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
    ).rejects.toThrow("响应体超过大小上限")
  })

  it("does not retry ordinary 4xx or follow redirects", async () => {
    const policy = await testPolicy()
    const notFound = new NanokaHttpClient(policy, {
      fetchImplementation: async () => new Response("missing", { status: 404 }),
      sleep: async () => {},
    })
    await expect(
      notFound.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
    ).rejects.toThrow("返回 404")

    const redirect = new NanokaHttpClient(policy, {
      fetchImplementation: async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "https://example.com/" },
        }),
      sleep: async () => {},
    })
    await expect(
      redirect.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
    ).rejects.toThrow("拒绝重定向")
  })

  it("serializes concurrent request-start reservations", async () => {
    const policy = await loadSourcePolicy()
    const starts: number[] = []
    const initialClock = Date.now()
    let clock = initialClock
    let releaseFetch!: () => void
    const fetchBarrier = new Promise<void>((resolve) => {
      releaseFetch = resolve
    })
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: {
          ...policy.requestPolicy,
          maxConcurrency: 3,
          minimumStartIntervalMs: 10,
        },
      },
      {
        fetchImplementation: async () => {
          starts.push(clock)
          await fetchBarrier
          return new Response("{}", { status: 200 })
        },
        sleep: async (milliseconds) => {
          clock += milliseconds
        },
        now: () => clock,
      },
    )

    const requests = Promise.all([
      client.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
      client.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
      client.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
    ])
    await vi.waitFor(() => expect(starts).toHaveLength(3))
    expect(starts).toEqual([initialClock, initialClock + 10, initialClock + 20])
    releaseFetch()
    await requests
  })

  it("holds concurrency slots through response body consumption", async () => {
    const policy = await loadSourcePolicy()
    let releaseFirstBody!: () => void
    const firstBodyBarrier = new Promise<void>((resolve) => {
      releaseFirstBody = resolve
    })
    const starts: string[] = []
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: {
          ...policy.requestPolicy,
          maxConcurrency: 1,
          minimumStartIntervalMs: 0,
        },
      },
      {
        fetchImplementation: async (input) => {
          const url = String(input)
          starts.push(url)
          if (starts.length === 1) {
            return {
              status: 200,
              headers: new Headers(),
              arrayBuffer: async () => {
                await firstBodyBarrier
                return new TextEncoder().encode("first").buffer
              },
            } as unknown as Response
          }
          return new Response("second", { status: 200 })
        },
        sleep: async () => {},
      },
    )

    const first = client.fetchAsset(
      new URL("https://static.nanoka.cc/manifest.json?request=first"),
    )
    const second = client.fetchAsset(
      new URL("https://static.nanoka.cc/manifest.json?request=second"),
    )
    const third = client.fetchAsset(
      new URL("https://static.nanoka.cc/manifest.json?request=third"),
    )
    await vi.waitFor(() => expect(starts).toHaveLength(1))
    releaseFirstBody()
    await Promise.all([first, second, third])
    expect(starts).toHaveLength(3)
  })

  it("retries response-body transport failures after releasing the slot", async () => {
    const policy = await testPolicy()
    const events: string[] = []
    const brokenBody = {
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => {
        events.push("body-failed")
        throw new Error("socket closed")
      },
    } as unknown as Response
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => {
        events.push("first-start")
        return brokenBody
      })
      .mockImplementationOnce(async () => {
        events.push("second-start")
        return new Response("{}", { status: 200 })
      })
    const client = new NanokaHttpClient(policy, {
      fetchImplementation,
      sleep: async (milliseconds) => {
        events.push(`retry-sleep:${milliseconds}`)
      },
    })

    expect(
      await client.fetchAsset(
        new URL("https://static.nanoka.cc/manifest.json"),
      ),
    ).toMatchObject({ result: "fetched" })
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(events).toEqual([
      "first-start",
      "body-failed",
      "retry-sleep:250",
      "second-start",
    ])
  })

  it("rejects empty bodies and reports retry exhaustion", async () => {
    const policy = await testPolicy()
    const empty = new NanokaHttpClient(policy, {
      fetchImplementation: async () =>
        new Response(new Uint8Array(), { status: 200 }),
      sleep: async () => {},
    })
    await expect(
      empty.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
    ).rejects.toThrow("响应体为空")

    const unavailable = new NanokaHttpClient(policy, {
      fetchImplementation: async () => new Response("busy", { status: 503 }),
      sleep: async () => {},
    })
    await expect(
      unavailable.fetchAsset(new URL("https://static.nanoka.cc/manifest.json")),
    ).rejects.toThrow(/503.*尝试 3\/3/u)
  })
})

async function testPolicy() {
  const policy = await loadSourcePolicy()
  return {
    ...policy,
    requestPolicy: {
      ...policy.requestPolicy,
      minimumStartIntervalMs: 0,
      timeoutMs: 100,
      maximumRetryDelayMs: 2000,
    },
  }
}
