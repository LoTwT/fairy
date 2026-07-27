import { setTimeout as delay } from "node:timers/promises"
import type { SourcePolicy } from "./policy.ts"

export interface ExistingAssetValidators {
  etag: string | null
  lastModified: string | null
}

export interface FetchedHttpAsset {
  status: number
  result: "fetched" | "not-modified"
  bytes: Uint8Array | null
  etag: string | null
  lastModified: string | null
  contentType: string | null
  cacheControl: string | null
  contentFetchedAt?: string
  checkedAt: string
}

export type FetchImplementation = typeof fetch

export class NanokaHttpClient {
  readonly #policy: SourcePolicy
  readonly #fetchImplementation: FetchImplementation
  readonly #sleep: (milliseconds: number) => Promise<unknown>
  readonly #now: () => number
  #nextRequestStart: number | undefined
  #startReservation: Promise<void> = Promise.resolve()
  #activeRequests = 0
  readonly #waiters: Array<() => void> = []

  constructor(
    policy: SourcePolicy,
    options: {
      fetchImplementation?: FetchImplementation
      sleep?: (milliseconds: number) => Promise<unknown>
      now?: () => number
    } = {},
  ) {
    this.#policy = policy
    this.#fetchImplementation = options.fetchImplementation ?? fetch
    this.#sleep = options.sleep ?? ((milliseconds) => delay(milliseconds))
    this.#now = options.now ?? Date.now
  }

  async fetchAsset(
    url: URL,
    validators?: ExistingAssetValidators,
  ): Promise<FetchedHttpAsset> {
    const headers = new Headers({ "User-Agent": this.#policy.userAgent })
    if (validators?.etag !== null && validators?.etag !== undefined) {
      headers.set("If-None-Match", validators.etag)
    }
    if (
      validators?.lastModified !== null &&
      validators?.lastModified !== undefined
    ) {
      headers.set("If-Modified-Since", validators.lastModified)
    }

    let lastStatus: number | undefined
    let attemptsPerformed = 0
    let redirectLocation: string | null = null
    for (
      let attempt = 1;
      attempt <= this.#policy.requestPolicy.maximumAttempts;
      attempt += 1
    ) {
      attemptsPerformed = attempt
      await this.#acquireSlot()
      let response: Response | undefined
      let retryAfter: string | null = null
      let shouldRetry = false
      try {
        try {
          response = await this.#startRequest(url, headers)
        } catch (error) {
          if (attempt === this.#policy.requestPolicy.maximumAttempts) {
            throw new Error(
              `请求失败：${url.href}（尝试 ${attempt}/${this.#policy.requestPolicy.maximumAttempts}）`,
              { cause: error },
            )
          }
          shouldRetry = true
        }

        if (response !== undefined) {
          lastStatus = response.status
          redirectLocation = response.headers.get("location")
          const checkedAt = new Date().toISOString()
          if (response.status === 304) {
            await disposeResponseBody(response)
            return {
              status: response.status,
              result: "not-modified",
              bytes: null,
              etag: null,
              lastModified: null,
              contentType: null,
              cacheControl: null,
              checkedAt,
            }
          }
          if (response.status >= 200 && response.status < 300) {
            let bytes: Uint8Array | undefined
            try {
              bytes = await readResponseBytes(
                response,
                this.#policy.requestPolicy.maximumResponseBytes,
                url,
              )
            } catch (error) {
              if (error instanceof ResponseSizeLimitError) throw error
              if (attempt === this.#policy.requestPolicy.maximumAttempts) {
                throw new Error(
                  `响应体读取失败：${url.href}（尝试 ${attempt}/${this.#policy.requestPolicy.maximumAttempts}）`,
                  { cause: error },
                )
              }
              shouldRetry = true
            }
            if (bytes !== undefined) {
              if (bytes.byteLength === 0) {
                throw new Error(`响应体为空：${url.href}`)
              }
              return {
                status: response.status,
                result: "fetched",
                bytes,
                etag: response.headers.get("etag"),
                lastModified: response.headers.get("last-modified"),
                contentType: response.headers.get("content-type"),
                cacheControl: response.headers.get("cache-control"),
                checkedAt,
              }
            }
          } else if (response.status >= 300 && response.status < 400) {
            await disposeResponseBody(response)
            throw new Error(
              `拒绝重定向：${url.href} 返回 ${response.status}${redirectLocation === null ? "" : `，Location: ${redirectLocation}`}`,
            )
          } else if (
            !this.#policy.requestPolicy.retryableStatuses.includes(
              response.status,
            )
          ) {
            await disposeResponseBody(response)
            throw new Error(`请求失败：${url.href} 返回 ${response.status}`)
          } else {
            await disposeResponseBody(response)
            if (attempt < this.#policy.requestPolicy.maximumAttempts) {
              retryAfter = response.headers.get("retry-after")
              shouldRetry = true
            }
          }
        }
      } finally {
        this.#releaseSlot()
      }

      if (shouldRetry) {
        const retryAfterDelay = this.#retryAfterDelay(retryAfter)
        if (retryAfterDelay === "exhausted") break
        await this.#sleep(
          retryAfterDelay ?? this.#exponentialRetryDelay(attempt),
        )
      }
    }

    throw new Error(
      `请求重试耗尽：${url.href} 返回 ${lastStatus ?? "网络错误"}（尝试 ${attemptsPerformed}/${this.#policy.requestPolicy.maximumAttempts}）${redirectLocation === null ? "" : `，Location: ${redirectLocation}`}`,
    )
  }

  async #startRequest(url: URL, headers: Headers): Promise<Response> {
    const previousReservation = this.#startReservation
    let releaseReservation!: () => void
    this.#startReservation = new Promise<void>((resolve) => {
      releaseReservation = resolve
    })
    await previousReservation
    try {
      const now = this.#now()
      const wait =
        this.#nextRequestStart === undefined
          ? 0
          : Math.max(0, this.#nextRequestStart - now)
      if (wait > 0) await this.#sleep(wait)
      this.#nextRequestStart =
        this.#now() + this.#policy.requestPolicy.minimumStartIntervalMs
      return this.#fetchImplementation(url, {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(this.#policy.requestPolicy.timeoutMs),
      })
    } finally {
      releaseReservation()
    }
  }

  async #acquireSlot(): Promise<void> {
    if (this.#activeRequests < this.#policy.requestPolicy.maxConcurrency) {
      this.#activeRequests += 1
      return
    }
    await new Promise<void>((resolve) => this.#waiters.push(resolve))
  }

  #releaseSlot(): void {
    const nextWaiter = this.#waiters.shift()
    if (nextWaiter === undefined) {
      this.#activeRequests -= 1
    } else {
      nextWaiter()
    }
  }

  #retryAfterDelay(retryAfter: string | null): number | null | "exhausted" {
    if (retryAfter === null) return null
    const configuredMaximum = this.#policy.requestPolicy.maximumRetryDelayMs
    const seconds = Number(retryAfter)
    const parsedDate = Date.parse(retryAfter)
    const milliseconds = Number.isFinite(seconds)
      ? seconds * 1000
      : Number.isNaN(parsedDate)
        ? configuredMaximum + 1
        : Math.max(0, parsedDate - this.#now())
    return milliseconds > configuredMaximum ? "exhausted" : milliseconds
  }

  #exponentialRetryDelay(attempt: number): number {
    return Math.min(
      this.#policy.requestPolicy.initialRetryDelayMs * 2 ** (attempt - 1),
      this.#policy.requestPolicy.maximumRetryDelayMs,
    )
  }
}

class ResponseSizeLimitError extends Error {}

async function readResponseBytes(
  response: Response,
  maximumBytes: number,
  url: URL,
): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length")
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength)
    if (Number.isFinite(declaredBytes) && declaredBytes > maximumBytes) {
      await disposeResponseBody(response)
      throw new ResponseSizeLimitError(
        `响应体超过大小上限：${url.href}（${declaredBytes} > ${maximumBytes} 字节）`,
      )
    }
  }
  if (response.body === undefined) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > maximumBytes) {
      throw new ResponseSizeLimitError(
        `响应体超过大小上限：${url.href}（${bytes.byteLength} > ${maximumBytes} 字节）`,
      )
    }
    return bytes
  }
  if (response.body === null) return new Uint8Array()

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maximumBytes) {
        await reader.cancel()
        throw new ResponseSizeLimitError(
          `响应体超过大小上限：${url.href}（超过 ${maximumBytes} 字节）`,
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function disposeResponseBody(response: Response): Promise<void> {
  if (response.body === null) return
  try {
    await response.body.cancel()
  } catch (error) {
    throw new Error(`响应体取消失败：HTTP ${response.status}`, { cause: error })
  }
}
