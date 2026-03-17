import type { CrawlTask } from "./shared.js"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"
import {
  buildDeadlyAssaultPageData,
  DEADLY_ASSAULT_PAGE_DATA_TASK_NAME,
} from "./buhflipexplode-deadly-assault.js"
import { tasks as buhflipexplodeTasks } from "./buhflipexplode.js"
import { tasks as gachabaseTasks } from "./gachabase.js"
import { tasks as mihoyoWikiTasks } from "./mihoyo-wiki.js"
import { fetchDynamic, fetchStatic } from "./shared.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, "../../data/raw")

fs.mkdirSync(outputDir, { recursive: true })

const filter = process.argv[2] // e.g. "gachabase" | "buhflipexplode"
const allTasks = [...gachabaseTasks, ...buhflipexplodeTasks, ...mihoyoWikiTasks]
const tasks: CrawlTask[] = filter
  ? allTasks.filter((t) => t.name.includes(filter))
  : allTasks

function getRelativeOutputPath(task: CrawlTask): string {
  return `${task.name}.json`
}

function getOutputDirs(tasks: CrawlTask[]): string[] {
  return [
    ...new Set(tasks.map((task) => path.dirname(getRelativeOutputPath(task)))),
  ]
}

function createStageDir(): string {
  fs.mkdirSync(outputDir, { recursive: true })
  return fs.mkdtempSync(path.join(outputDir, ".crawl-stage-"))
}

function getStageOutputPath(stageDir: string, task: CrawlTask): string {
  return path.join(stageDir, getRelativeOutputPath(task))
}

function getStageJsonPath(stageDir: string, name: string): string {
  return path.join(stageDir, `${name}.json`)
}

function readStageJson<T>(stageDir: string, name: string): T {
  return JSON.parse(
    fs.readFileSync(getStageJsonPath(stageDir, name), "utf-8"),
  ) as T
}

function writeStageJson(stageDir: string, name: string, data: unknown): void {
  const outPath = getStageJsonPath(stageDir, name)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8")
  console.log(`  → ${outPath}`)
}

function writeDerivedOutputs(stageDir: string, tasks: CrawlTask[]): void {
  const taskNames = new Set(tasks.map((task) => task.name))
  const deadlyAssaultInputs = [
    "en/buhflipexplode/deadly-assault",
    "en/buhflipexplode/enemies",
    "en/buhflipexplode/buffs",
  ]

  if (!deadlyAssaultInputs.every((name) => taskNames.has(name))) {
    return
  }

  const pageData = buildDeadlyAssaultPageData(
    readStageJson(stageDir, "en/buhflipexplode/deadly-assault"),
    readStageJson(stageDir, "en/buhflipexplode/enemies"),
    readStageJson(stageDir, "en/buhflipexplode/buffs"),
  )

  console.log(`Deriving: ${DEADLY_ASSAULT_PAGE_DATA_TASK_NAME}`)
  writeStageJson(stageDir, DEADLY_ASSAULT_PAGE_DATA_TASK_NAME, pageData)
}

function commitStageDir(stageDir: string, tasks: CrawlTask[]): void {
  const outputDirs = getOutputDirs(tasks)

  outputDirs.forEach((relativeDir) => {
    const stageOutputDir = path.join(stageDir, relativeDir)
    const finalOutputDir = path.join(outputDir, relativeDir)

    fs.rmSync(finalOutputDir, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(finalOutputDir), { recursive: true })
    fs.renameSync(stageOutputDir, finalOutputDir)
  })
}

async function run() {
  if (tasks.length === 0) {
    console.log("No crawl tasks configured.")
    return
  }

  const stageDir = createStageDir()

  try {
    for (const task of tasks) {
      console.log(`Crawling: ${task.name} (${task.url})`)
      const html = task.dynamic
        ? await fetchDynamic(task.url)
        : await fetchStatic(task.url, task.headers)

      const $ = cheerio.load(html)
      const data = await task.extract($, html)

      const outPath = getStageOutputPath(stageDir, task)
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8")
      console.log(`  → ${outPath}`)
    }

    writeDerivedOutputs(stageDir, tasks)
    commitStageDir(stageDir, tasks)
  } finally {
    fs.rmSync(stageDir, { recursive: true, force: true })
  }

  console.log("Done.")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
