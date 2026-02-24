import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"
import { chromium } from "playwright"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, "../../data/crawl")

fs.mkdirSync(outputDir, { recursive: true })

interface CrawlTask {
  /** 任务名称，用于输出文件名 */
  name: string
  /** 目标 URL */
  url: string
  /** 是否需要 JS 渲染（动态页面） */
  dynamic?: boolean
  /** 从 HTML 中提取数据 */
  extract: ($: cheerio.CheerioAPI) => unknown
}

const tasks: CrawlTask[] = [
  // 在此添加爬取任务
  // {
  //   name: "example",
  //   url: "https://example.com",
  //   dynamic: false,
  //   extract: ($) => $("h1").text(),
  // },
]

async function fetchStatic(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`)
  return res.text()
}

async function fetchDynamic(url: string): Promise<string> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: "networkidle" })
    return await page.content()
  } finally {
    await browser.close()
  }
}

async function run() {
  if (tasks.length === 0) {
    console.log("No crawl tasks configured.")
    return
  }

  for (const task of tasks) {
    console.log(`Crawling: ${task.name} (${task.url})`)
    const html = task.dynamic
      ? await fetchDynamic(task.url)
      : await fetchStatic(task.url)

    const $ = cheerio.load(html)
    const data = task.extract($)

    const outPath = path.join(outputDir, `${task.name}.json`)
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8")
    console.log(`  → ${outPath}`)
  }

  console.log("Done.")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
