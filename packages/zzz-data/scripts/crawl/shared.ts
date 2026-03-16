import type * as cheerio from "cheerio"
import { chromium } from "playwright"

export type CrawlTaskName = string

export type CrawlTargetUrl = string

export type CrawlHtmlText = string

export type CrawlDelayMilliseconds = number

export type CrawlBatchSize = number

export type CrawlSvelteKitData = unknown[]

export type CrawlExtractedPayload = unknown

export type CrawlExtractor = (
  $: cheerio.CheerioAPI,
  html: CrawlHtmlText,
) => CrawlExtractedPayload | Promise<CrawlExtractedPayload>

export interface CrawlTask {
  /** 任务名称，用于输出文件名 */
  name: CrawlTaskName
  /** 目标 URL */
  url: CrawlTargetUrl
  /** 是否需要 JS 渲染（动态页面） */
  dynamic?: boolean
  /** 从 HTML 中提取数据，支持 async（用于多步爬取）。html 为原始响应文本，适合 JSON 端点直接解析 */
  extract: CrawlExtractor
}

export async function fetchStatic(url: CrawlTargetUrl): Promise<CrawlHtmlText> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`)
  return res.text()
}

export async function fetchJson<T = unknown>(url: CrawlTargetUrl): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchDynamic(
  url: CrawlTargetUrl,
): Promise<CrawlHtmlText> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: "networkidle" })
    return await page.content()
  } finally {
    await browser.close()
  }
}

/**
 * 解码 SvelteKit __data.json 压缩格式。
 * 规则：对象/数组中的整数值均为 data[] 的索引引用；递归时追踪当前解析路径，
 * 检测到循环直接返回 data[N] 原始值（可正确处理字面数字，如 rarity=4）。
 */
export function decodeSvelteKitData(data: CrawlSvelteKitData): unknown {
  const resolving = new Set<number>()
  function resolve(value: unknown): unknown {
    if (typeof value === "number") {
      if (resolving.has(value)) return value
      resolving.add(value)
      const result = resolve(data[value])
      resolving.delete(value)
      return result
    }
    if (Array.isArray(value)) return value.map(resolve)
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          resolve(v),
        ]),
      )
    }
    return value
  }
  return resolve(data[0])
}

/** 等待指定毫秒 */
export function delay(ms: CrawlDelayMilliseconds): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 批量处理，每批次间加延迟，避免频繁请求
 * @param items 待处理列表
 * @param handler 处理单项的异步函数
 * @param batchSize 每批数量
 * @param delayMs 批次间等待时间（毫秒）
 */
export async function batchProcess<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  batchSize: CrawlBatchSize = 5,
  delayMs: CrawlDelayMilliseconds = 1000,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(handler))
    results.push(...batchResults)
    if (i + batchSize < items.length) {
      await delay(delayMs)
    }
  }
  return results
}
