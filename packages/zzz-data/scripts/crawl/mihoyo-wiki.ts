import type { CrawlTask } from "./shared.js"
import * as cheerio from "cheerio"
import { batchProcess } from "./shared.js"

const LIST_API =
  "https://act-api-takumi-static.mihoyo.com/common/blackboard/zzz_wiki/v1/home/content/list"
const ENTRY_API =
  "https://act-api-takumi-static.mihoyo.com/hoyowiki/zzz/wapi/entry_page"
const CHANNEL_ID_DA = 108
const FETCH_HEADERS = {
  "x-rpc-wiki_app": "zzz",
  "User-Agent": "Mozilla/5.0",
}

// ---- API 响应类型 ----

interface ApiResponse<T> {
  retcode: number
  data: T
}

interface ContentListData {
  list: Array<{
    id: number
    name: string
    list: Array<{ content_id: number; title: string }>
  }>
}

interface EntryModule {
  name: string
  components: Array<{ component_id: string; data: string }>
}

interface EntryPageData {
  page: {
    id: string
    name: string
    modules: EntryModule[]
  }
}

// ---- 输出数据类型 ----

export interface DABuff {
  name: string
  iconUrl: string
  effect: string
}

export interface DABoss {
  name: string
  weaknesses: string[]
  resistances: string[]
  mechanics: string
}

export interface DAEntry {
  id: string
  title: string
  period: number
  buffs: DABuff[]
  bosses: DABoss[]
}

// ---- 工具函数 ----

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: FETCH_HEADERS })
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`)
  const json = (await res.json()) as ApiResponse<T>
  if (json.retcode !== 0)
    throw new Error(`API retcode ${json.retcode} for ${url}`)
  return json.data
}

function stripHtml(html: string): string {
  const $ = cheerio.load(html)
  return $.text().replace(/\s+/g, " ").trim()
}

// ---- 解析函数 ----

/**
 * 解析增益表（module[0] 的 multi_table 组件）。
 * 每行格式：[图标+名称 HTML, 效果 HTML]
 */
function parseBuffTable(compData: string): DABuff[] {
  const { tables } = JSON.parse(compData) as {
    tables: Array<{ row?: string[][] }>
  }
  const rows = tables[0]?.row ?? []

  return rows.map(([nameHtml, effectHtml]) => {
    const $n = cheerio.load(nameHtml)
    const iconUrl = $n("[data-image-url]").first().attr("data-image-url") ?? ""
    // 增益名称在末尾不含图片的 <p> 标签中
    const nameParagraphs = $n("p")
      .toArray()
      .filter((el) => !$n(el).find("img, .custom-image-view").length)
    const name = nameParagraphs.length
      ? $n(nameParagraphs[nameParagraphs.length - 1])
          .text()
          .trim()
      : stripHtml(nameHtml)

    return { name, iconUrl, effect: stripHtml(effectHtml) }
  })
}

/**
 * 解析 Boss 信息卡头（rich_row_base_info 组件）。
 * 包含 Boss 名称、元素弱点、元素抗性。
 * 返回 null 表示该模块不是 Boss 信息卡。
 */
function parseBossHeader(
  richText: string,
): { name: string; weaknesses: string[]; resistances: string[] } | null {
  const $ = cheerio.load(richText)
  const text = $.text().replace(/\s+/g, " ").trim()
  if (!text.includes("敌人弱点")) return null

  const name = $("a").first().text().trim() || text.split("敌人弱点")[0].trim()

  const weakIdx = text.indexOf("敌人弱点：")
  const resIdx = text.indexOf("敌人抗性：")

  const weakStr =
    weakIdx >= 0
      ? text.slice(weakIdx + 5, resIdx >= 0 ? resIdx : undefined)
      : ""
  const resStr = resIdx >= 0 ? text.slice(resIdx + 5) : ""

  // 匹配 "XX属性" 形式的中文元素名（最多3个汉字前缀，避免贪婪合并相邻元素）
  // 如 "冰属性以太属性" → ["冰属性", "以太属性"]
  const parseElements = (s: string): string[] =>
    s.match(/[\u4E00-\u9FA5]{1,3}属性/g) ?? []

  return {
    name,
    weaknesses: parseElements(weakStr),
    resistances: parseElements(resStr),
  }
}

/**
 * 解析敌情详解表（header 含 "敌情详解" 的 multi_table 组件）。
 * row[0][0] = 机制文本 HTML，row[1][0] = 挑战目标文本 HTML。
 */
function parseMechanicsTable(compData: string): string | null {
  const { tables } = JSON.parse(compData) as {
    tables: Array<{ header?: string[]; row?: string[][] }>
  }
  const table = tables.find((t) => t.header?.includes("敌情详解")) ?? null
  if (!table?.row) return null

  return stripHtml(table.row[0]?.[0] ?? "")
}

/**
 * 解析单条危局强袭战词条。
 *
 * 模块布局规律（index 从 1 起）：
 *   h0, h1, m_h1, h2, m_h2, m_h0, strategy, 奖励表
 *
 * 使用状态机将 Boss 信息卡头（rich_row_base_info）与
 * 敌情详解表（multi_table[header=敌情详解]）贪心配对：
 *   - 遇到信息卡头时，将当前待配对 Boss 压入队列，设新 Boss 为当前；
 *   - 遇到敌情详解表时，优先与当前 Boss 配对，否则取队列头部。
 * 最后按原始出现顺序排列。
 */
function parseEntry(
  id: string,
  title: string,
  modules: EntryModule[],
): DAEntry {
  const buffs = parseBuffTable(modules[0].components[0].data)

  interface PendingBoss {
    order: number
    name: string
    weaknesses: string[]
    resistances: string[]
  }

  const pairedBosses: Array<PendingBoss & DABoss> = []
  const queue: PendingBoss[] = []
  let current: PendingBoss | null = null
  let headerCount = 0

  for (let i = 1; i < modules.length; i++) {
    const comp = modules[i].components[0]

    if (comp.component_id === "rich_row_base_info") {
      const compObj = JSON.parse(comp.data) as { rich_text?: string }
      if (!compObj.rich_text) continue
      const parsed = parseBossHeader(compObj.rich_text)
      if (!parsed) continue
      if (current) queue.push(current)
      current = { order: headerCount++, ...parsed }
    } else if (comp.component_id === "multi_table") {
      const mechanics = parseMechanicsTable(comp.data)
      if (!mechanics) continue
      const boss = current ?? queue.shift() ?? null
      if (boss) {
        pairedBosses.push({ ...boss, mechanics })
        current = null
      }
    }
  }

  // 按信息卡头的原始出现顺序排列
  pairedBosses.sort((a, b) => a.order - b.order)
  const bosses: DABoss[] = pairedBosses.map(
    ({ order: _order, ...boss }) => boss,
  )

  const periodMatch = title.match(/第(\d+)期/)
  const period = periodMatch ? Number.parseInt(periodMatch[1]) : 0

  return { id, title, period, buffs, bosses }
}

// ---- 爬取入口 ----

async function fetchAllDAEntries(): Promise<DAEntry[]> {
  const listData = await fetchApi<ContentListData>(
    `${LIST_API}?app_sn=zzz_wiki&channel_id=${CHANNEL_ID_DA}`,
  )
  const items = listData.list[0]?.list ?? []

  const entries = await batchProcess(
    items,
    async (item) => {
      const entryData = await fetchApi<EntryPageData>(
        `${ENTRY_API}?entry_page_id=${item.content_id}&app_sn=zzz_wiki`,
      )
      return parseEntry(
        String(item.content_id),
        item.title,
        entryData.page.modules,
      )
    },
    5,
    1000,
  )

  return entries.sort((a, b) => b.period - a.period)
}

// ---- 任务导出 ----

export const tasks: CrawlTask[] = [
  {
    name: "zh-CN/mihoyo-wiki/deadly-assault",
    url: `${LIST_API}?app_sn=zzz_wiki&channel_id=${CHANNEL_ID_DA}`,
    extract: () => fetchAllDAEntries(),
  },
]
