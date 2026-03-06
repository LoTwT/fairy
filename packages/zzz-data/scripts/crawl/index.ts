import type { CrawlTask } from "./shared.js"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"
import { tasks as buhflipexplodeTasks } from "./buhflipexplode.js"
import { tasks as gachabaseTasks } from "./gachabase.js"
import { fetchDynamic, fetchStatic } from "./shared.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, "../../data/crawl")

fs.mkdirSync(outputDir, { recursive: true })

const filter = process.argv[2] // e.g. "gachabase" | "buhflipexplode"
const allTasks = [...gachabaseTasks, ...buhflipexplodeTasks]
const tasks: CrawlTask[] = filter
  ? allTasks.filter((t) => t.name.includes(filter))
  : allTasks

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
    const data = await task.extract($, html)

    const outPath = path.join(outputDir, `${task.name}.json`)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8")
    console.log(`  → ${outPath}`)
  }

  console.log("Done.")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
